-- Wall paint and floors. Run after 004_story_seed.sql, then 006_finishes_seed.sql.

create table if not exists finishes (
  id text primary key,
  kind text not null check (kind in ('wall', 'floor')),
  name text not null,
  price_pence int not null check (price_pence >= 0)
);

alter table finishes enable row level security;
grant select on finishes to anon, authenticated;
drop policy if exists finishes_read on finishes;
create policy finishes_read on finishes for select using (true);

alter table sims add column if not exists finishes jsonb not null default '{"wall":"magnolia","floor":"oak_laminate"}';
alter table sims add column if not exists owned_finishes text[] not null default '{magnolia,oak_laminate}';

create or replace function buy_finish(p_finish text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  finish finishes%rowtype;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into finish from finishes where id = p_finish;
  if not found then raise exception 'Unknown paint or floor'; end if;

  if not (finish.id = any(row.owned_finishes)) then
    if row.balance_pence - finish.price_pence < -20000 then raise exception 'Overdraft is maxed out'; end if;
    row.balance_pence := row.balance_pence - finish.price_pence;
    row.owned_finishes := array_append(row.owned_finishes, finish.id);
    insert into transactions (sim_id, amount_pence, kind, ref)
    values (row.id, -finish.price_pence, 'purchase', finish.id);
  end if;

  row.finishes := row.finishes || jsonb_build_object(finish.kind, finish.id);

  update sims
  set balance_pence = row.balance_pence,
      owned_finishes = row.owned_finishes,
      finishes = row.finishes,
      updated_at = clock_timestamp()
  where id = row.id;

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'finishes', row.finishes,
    'owned_finishes', to_jsonb(row.owned_finishes)
  );
end;
$$;

revoke all on function buy_finish(text) from public;
grant execute on function buy_finish(text) to anon, authenticated;
