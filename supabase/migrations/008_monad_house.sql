-- Monad House: a new venue, its regulars, and one optional goal after onboarding.

insert into venues (id, name, zone) values
('monad_house', 'Monad House', 1) on conflict (id) do update set name = excluded.name, zone = excluded.zone;

insert into locals (id, venues) values
('folake', array['monad_house']::text[]),
('arjun', array['monad_house']::text[]),
('marta', array['monad_house']::text[]),
('kofi', array['monad_house']::text[]),
('aoife', array['monad_house']::text[]) on conflict (id) do update set venues = excluded.venues;

insert into goals (id, ordinal, stat, count, reward_pence) values
('monad_receipts', 8, 'monad', 1, 500) on conflict (id) do update set ordinal = excluded.ordinal, stat = excluded.stat, count = excluded.count, reward_pence = excluded.reward_pence;

-- Same as 003, plus a 'monad' stat when arriving at Monad House.
create or replace function travel(p_destination text, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  from_zone int;
  to_zone int;
  gap int;
  cost int;
  energy numeric;
begin
  if p_mode not in ('tube', 'bus', 'walk', 'ride') then raise exception 'Unknown way to travel'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  if p_destination = 'home' then
    select zone into to_zone from homes where id = row.home_id;
  else
    select zone into to_zone from venues where id = p_destination;
  end if;
  if to_zone is null then raise exception 'Unknown place'; end if;
  if row.location = p_destination then
    if p_destination = 'home' then raise exception 'You are already home'; end if;
    raise exception 'You are already there';
  end if;
  if row.active_shift is not null then raise exception 'Finish your shift first'; end if;

  if row.location = 'home' then
    select zone into from_zone from homes where id = row.home_id;
  else
    select zone into from_zone from venues where id = row.location;
  end if;
  gap := greatest(abs(coalesce(from_zone, 1) - to_zone), 1);
  energy := coalesce((row.needs->>'energy')::numeric, 0);

  if p_mode = 'walk' then
    cost := 0;
    energy := greatest(0, energy - (6 + gap * 2));
  elsif p_mode = 'bus' then
    cost := 175;
    energy := greatest(0, energy - 2);
  elsif p_mode = 'ride' then
    cost := 650 + abs(coalesce(from_zone, 1) - to_zone) * 200;
    energy := greatest(0, energy - 1);
  else
    cost := greatest(280, 160 * gap);
    energy := greatest(0, energy - 2);
  end if;

  if p_mode = 'tube' then
    if row.oyster_pence < cost then raise exception 'Top up your Oyster'; end if;
    row.oyster_pence := row.oyster_pence - cost;
  elsif cost > 0 then
    if row.balance_pence - cost < -20000 then raise exception 'Not enough money'; end if;
    row.balance_pence := row.balance_pence - cost;
    insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, -cost, 'travel', p_mode);
  end if;

  row.location := p_destination;
  row.needs := jsonb_set(row.needs, '{energy}', to_jsonb(energy));
  if p_destination <> 'home' then row.stats := bump_stat(row.stats, 'travel'); end if;
  if p_destination = 'monad_house' then row.stats := bump_stat(row.stats, 'monad'); end if;
  update sims set
    balance_pence = row.balance_pence,
    oyster_pence = row.oyster_pence,
    location = row.location,
    needs = row.needs,
    stats = row.stats,
    updated_at = clock_timestamp()
  where id = row.id;

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'oyster_pence', row.oyster_pence,
    'location', row.location,
    'needs_energy', energy,
    'stats', row.stats
  );
end;
$$;
