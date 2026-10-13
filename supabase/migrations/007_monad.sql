-- Mirror every ledger row onto Monad testnet as a public receipt.
-- The database stays the source of truth; /api/chain/flush (service role) settles rows in batches.

alter table transactions
  add column if not exists chain_status text not null default 'pending'
    check (chain_status in ('pending', 'sending', 'settled', 'failed')),
  add column if not exists chain_tx text,
  add column if not exists settled_at timestamptz,
  add column if not exists claimed_at timestamptz;

create index if not exists transactions_unsettled on transactions (id) where chain_status in ('pending', 'sending');

-- Rows claimed by a flush that never came back (timeout, crash) are retried after this long.
-- Safe to resend: the contract skips any txId it has already settled.
create or replace function claim_unsettled(p_limit int)
returns table (id bigint, sim_id uuid, amount_pence bigint, kind text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update transactions t
  set chain_status = 'sending', claimed_at = clock_timestamp()
  where t.id in (
    select u.id from transactions u
    where u.chain_status = 'pending'
       or (u.chain_status = 'sending' and u.claimed_at < clock_timestamp() - interval '2 minutes')
    order by u.id
    limit greatest(1, least(p_limit, 200))
    for update skip locked
  )
  returning t.id, t.sim_id, t.amount_pence, t.kind;
end;
$$;

create or replace function mark_settled(p_ids bigint[], p_tx text)
returns void
language sql
security definer
set search_path = public
as $$
  update transactions
  set chain_status = 'settled', chain_tx = p_tx, settled_at = clock_timestamp()
  where id = any(p_ids) and chain_status = 'sending';
$$;

create or replace function mark_pending(p_ids bigint[])
returns void
language sql
security definer
set search_path = public
as $$
  update transactions
  set chain_status = 'pending', claimed_at = null
  where id = any(p_ids) and chain_status = 'sending';
$$;

revoke all on function claim_unsettled(int) from public, anon, authenticated;
revoke all on function mark_settled(bigint[], text) from public, anon, authenticated;
revoke all on function mark_pending(bigint[]) from public, anon, authenticated;
grant execute on function claim_unsettled(int) to service_role;
grant execute on function mark_settled(bigint[], text) to service_role;
grant execute on function mark_pending(bigint[]) to service_role;

-- Same as 001, plus chain_status / chain_tx on each ledger row.
create or replace function pack_state(p_sim uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'username', p.username,
    'sim', to_jsonb(s),
    'inventory', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.placed desc, i.item_id)
      from inventory i where i.sim_id = s.id
    ), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(row_to_json(l))
      from (
        select id::text, amount_pence, kind, ref, created_at, chain_status, chain_tx
        from transactions
        where sim_id = s.id
        order by id desc
        limit 30
      ) l
    ), '[]'::jsonb),
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'simId', other.id,
        'username', op.username,
        'name', other.name
      ))
      from relationships r
      join sims other on other.id = case when r.a = s.id then r.b else r.a end
      join profiles op on op.id = other.owner
      where r.a = s.id or r.b = s.id
    ), '[]'::jsonb)
  ) into result
  from sims s
  join profiles p on p.id = s.owner
  where s.id = p_sim;
  return result;
end;
$$;

-- The Bank app polls this while it is open, so new rows and their receipts show up without a reload.
create or replace function get_ledger()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into sid from sims where owner = auth.uid();
  if sid is null then return jsonb_build_object('ledger', '[]'::jsonb); end if;
  return jsonb_build_object('ledger', coalesce((
    select jsonb_agg(row_to_json(l))
    from (
      select id::text, amount_pence, kind, ref, created_at, chain_status, chain_tx
      from transactions
      where sim_id = sid
      order by id desc
      limit 30
    ) l
  ), '[]'::jsonb));
end;
$$;

revoke all on function get_ledger() from public;
grant execute on function get_ledger() to anon, authenticated;
