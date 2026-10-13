-- Read-only feeds for the Monad House spots.

create index if not exists transactions_settled_at on transactions (settled_at desc) where chain_status = 'settled';

-- Departures board: the last settled payments across London. First names only; gift refs (sim ids) are dropped.
create or replace function get_departures()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('departures', coalesce(jsonb_agg(row_to_json(d) order by d.settled_at desc, d.id desc), '[]'::jsonb))
  from (
    select
      t.id::text as id,
      split_part(trim(s.name), ' ', 1) as first_name,
      t.kind,
      case when t.kind = 'gift' then null else t.ref end as ref,
      t.amount_pence,
      t.chain_tx,
      t.settled_at
    from transactions t
    join sims s on s.id = t.sim_id
    where t.chain_status = 'settled'
    order by t.settled_at desc, t.id desc
    limit 20
  ) d;
$$;

revoke all on function get_departures() from public;
grant execute on function get_departures() to anon, authenticated;

-- Audit desk: one consistent snapshot of a player's game balance and what has not reached the chain yet.
create or replace function chain_audit(p_owner uuid)
returns table (sim_id uuid, balance_pence bigint, pending_pence bigint, pending_count int)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.balance_pence,
    coalesce(sum(t.amount_pence) filter (where t.chain_status <> 'settled'), 0)::bigint,
    (count(t.id) filter (where t.chain_status <> 'settled'))::int
  from sims s
  left join transactions t on t.sim_id = s.id
  where s.owner = p_owner
  group by s.id, s.balance_pence;
$$;

revoke all on function chain_audit(uuid) from public, anon, authenticated;
grant execute on function chain_audit(uuid) to service_role;
