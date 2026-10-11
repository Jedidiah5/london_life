-- London Life schema. Run once in the Supabase SQL editor.
-- Also turn on Authentication → Sign In / Providers → Anonymous sign-ins.
-- Money changes only inside these security definer functions.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

create table if not exists homes (
  id text primary key,
  name text not null,
  zone int not null,
  width int not null,
  height int not null,
  rent_pence int not null,
  buy_pence int
);

create table if not exists venues (
  id text primary key,
  name text not null,
  zone int not null
);

create table if not exists catalogue_items (
  id text primary key,
  name text not null,
  category text not null,
  footprint int[],
  wall boolean not null default false,
  price_pence int not null,
  tier int not null,
  blocks boolean not null default true,
  effects jsonb not null default '{}'
);

create table if not exists jobs (
  id text primary key,
  name text not null,
  venue text not null,
  pay_per_hour_pence int not null,
  hours int not null,
  skill text,
  skill_required int not null default 0,
  energy_cost int not null,
  xp_skill text not null,
  tips boolean not null default false
);

create table if not exists sims (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references profiles(id) on delete cascade,
  name text not null,
  appearance jsonb not null,
  traits text[] not null default '{}',
  aspiration text not null,
  balance_pence bigint not null default 40000,
  home_id text not null default 'boxroom_z4' references homes(id),
  needs jsonb not null,
  skills jsonb not null default '{}',
  location text not null default 'home',
  game_time bigint not null default 480,
  heating_on boolean not null default true,
  rent_misses int not null default 0,
  last_upkeep_minute bigint not null default 0,
  sofa_surfing boolean not null default false,
  oyster_pence int not null default 2000,
  active_shift jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  sim_id uuid not null references sims(id) on delete cascade,
  item_id text not null references catalogue_items(id),
  placed boolean not null default false,
  x int not null default 0,
  y int not null default 0,
  rotation int not null default 0,
  colour text not null default '#f4f1ea'
);

create table if not exists transactions (
  id bigserial primary key,
  sim_id uuid not null references sims(id) on delete cascade,
  amount_pence bigint not null,
  kind text not null,
  ref text,
  created_at timestamptz not null default now()
);

create table if not exists relationships (
  a uuid not null references sims(id) on delete cascade,
  b uuid not null references sims(id) on delete cascade,
  score int not null default 0,
  kind text not null default 'friend',
  primary key (a, b),
  check (a < b)
);

create table if not exists daily (
  day date primary key,
  weather text,
  headline text,
  tip text
);

alter table profiles enable row level security;
alter table homes enable row level security;
alter table venues enable row level security;
alter table catalogue_items enable row level security;
alter table jobs enable row level security;
alter table sims enable row level security;
alter table inventory enable row level security;
alter table transactions enable row level security;
alter table relationships enable row level security;
alter table daily enable row level security;

revoke all on sims from anon, authenticated;
revoke all on inventory from anon, authenticated;
revoke all on transactions from anon, authenticated;
revoke all on relationships from anon, authenticated;
grant select on homes, venues, catalogue_items, jobs, daily to anon, authenticated;

create policy homes_read on homes for select using (true);
create policy venues_read on venues for select using (true);
create policy catalogue_read on catalogue_items for select using (true);
create policy jobs_read on jobs for select using (true);
create policy daily_read on daily for select using (true);

create or replace function week_index(t bigint)
returns int
language sql
immutable
as $$
  select case
    when t < 8640 then 0
    else 1 + floor((t - 8640)::numeric / 10080)::int
  end
$$;

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
        select id::text, amount_pence, kind, ref, created_at
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

create or replace function get_state()
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
  if sid is null then return null; end if;
  return pack_state(sid);
end;
$$;

create or replace function create_sim(
  p_username text,
  p_name text,
  p_appearance jsonb,
  p_traits text[],
  p_aspiration text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Username must be 3-20 letters, numbers, or _'; end if;
  if char_length(trim(p_name)) < 1 or char_length(p_name) > 24 then raise exception 'Name is too long'; end if;
  if coalesce(array_length(p_traits, 1), 0) <> 2 then raise exception 'Pick two traits'; end if;
  if p_aspiration not in ('tech_founder', 'influencer', 'property_ladder', 'party_animal', 'artist') then
    raise exception 'Pick an aspiration';
  end if;

  insert into profiles (id, username) values (uid, p_username)
  on conflict (id) do update set username = excluded.username;

  select id into sid from sims where owner = uid;
  if sid is null then
    insert into sims (owner, name, appearance, traits, aspiration, needs, skills, game_time)
    values (
      uid,
      trim(p_name),
      p_appearance,
      p_traits,
      p_aspiration,
      '{"hunger":80,"energy":80,"hygiene":80,"bladder":80,"fun":70,"social":60}'::jsonb,
      '{"coding":0,"cooking":0,"charisma":0,"fitness":0,"music":0,"comedy":0,"style":0,"hustle":0,"photography":0}'::jsonb,
      480
    )
    returning id into sid;

    insert into inventory (sim_id, item_id, placed, x, y, rotation, colour) values
      (sid, 'mattress', true, 0, 0, 0, '#d9c7a6'),
      (sid, 'plastic_chair', true, 3, 3, 0, '#d7d7d4');

    insert into transactions (sim_id, amount_pence, kind, ref)
    values (sid, 40000, 'wage', 'arrival');
  end if;

  return pack_state(sid);
end;
$$;

create or replace function apply_upkeep(p_sim sims, p_time bigint)
returns sims
language plpgsql
security definer
set search_path = public
as $$
declare
  weeks int;
  days int;
  rent int;
  heating int;
  total bigint;
  interest bigint;
  home homes%rowtype;
begin
  select * into home from homes where id = p_sim.home_id;
  weeks := week_index(p_time) - week_index(p_sim.last_upkeep_minute);
  if weeks < 0 then weeks := 0; end if;
  days := floor(greatest(p_time - p_sim.game_time, 0)::numeric / 1440)::int;
  interest := 0;
  if p_sim.balance_pence < 0 and days > 0 then
    interest := ceil(abs(p_sim.balance_pence) * 0.02 * days);
  end if;
  rent := case when p_sim.sofa_surfing then 0 else home.rent_pence end;
  heating := case when p_sim.heating_on then 1200 else 400 end;
  total := (case when weeks > 0 then (rent + heating + 800 + 500) * weeks else 0 end) + interest;

  if total > 0 and p_sim.balance_pence - total < -20000 then
    if weeks > 0 then
      p_sim.rent_misses := p_sim.rent_misses + weeks;
      insert into transactions (sim_id, amount_pence, kind, ref)
      values (p_sim.id, -least(total, p_sim.balance_pence + 20000), 'rent', 'missed');
    end if;
    p_sim.balance_pence := -20000;
    if p_sim.rent_misses >= 2 then
      p_sim.sofa_surfing := true;
      p_sim.home_id := 'sofa';
    end if;
  elsif total > 0 then
    p_sim.balance_pence := p_sim.balance_pence - total;
    if weeks > 0 then
      p_sim.rent_misses := 0;
      insert into transactions (sim_id, amount_pence, kind, ref)
      values (p_sim.id, -(total - interest), 'rent', 'weekly');
    end if;
    if interest > 0 then
      insert into transactions (sim_id, amount_pence, kind, ref)
      values (p_sim.id, -interest, 'bill', 'overdraft');
    end if;
  end if;

  p_sim.last_upkeep_minute := p_time;
  p_sim.game_time := p_time;
  return p_sim;
end;
$$;

create or replace function checkpoint_needs(p_needs jsonb, p_game_time bigint, p_heating boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  wall_seconds numeric;
  trusted bigint;
  elapsed_hours numeric;
  max_gain numeric;
  key text;
  oldv numeric;
  newv numeric;
  decay numeric;
  clamped numeric;
  rates jsonb := '{"hunger":4,"energy":3,"hygiene":2.5,"bladder":5,"fun":3,"social":2}';
  next_needs jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;

  wall_seconds := extract(epoch from (clock_timestamp() - row.updated_at));
  if wall_seconds < 0 then wall_seconds := 0; end if;
  trusted := least(greatest(p_game_time, row.game_time), row.game_time + floor(wall_seconds * 3 + 2)::bigint);
  elapsed_hours := greatest(trusted - row.game_time, 0)::numeric / 60.0;
  max_gain := least(80, (greatest(wall_seconds, 1) / 15.0) * 25);

  foreach key in array array['hunger','energy','hygiene','bladder','fun','social'] loop
    oldv := coalesce((row.needs->>key)::numeric, 80);
    newv := coalesce((p_needs->>key)::numeric, oldv);
    decay := coalesce((rates->>key)::numeric, 3) * elapsed_hours * 1.25;
    clamped := least(100, greatest(0, least(greatest(newv, greatest(0, oldv - decay - 1)), oldv + max_gain)));
    next_needs := next_needs || jsonb_build_object(key, round(clamped, 2));
  end loop;

  row.needs := next_needs;
  row.heating_on := p_heating;
  row := apply_upkeep(row, trusted);
  row.updated_at := clock_timestamp();

  update sims set
    needs = row.needs,
    heating_on = row.heating_on,
    balance_pence = row.balance_pence,
    rent_misses = row.rent_misses,
    sofa_surfing = row.sofa_surfing,
    home_id = row.home_id,
    last_upkeep_minute = row.last_upkeep_minute,
    game_time = row.game_time,
    updated_at = row.updated_at
  where id = row.id;

  return jsonb_build_object(
    'needs', row.needs,
    'game_time', row.game_time,
    'balance_pence', row.balance_pence,
    'oyster_pence', row.oyster_pence,
    'rent_misses', row.rent_misses,
    'sofa_surfing', row.sofa_surfing,
    'home_id', row.home_id,
    'heating_on', row.heating_on,
    'last_upkeep_minute', row.last_upkeep_minute
  );
end;
$$;

create or replace function buy_item(p_item text, p_colour text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  item catalogue_items%rowtype;
  new_id uuid;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into item from catalogue_items where id = p_item;
  if not found then raise exception 'Unknown item'; end if;
  if row.balance_pence - item.price_pence < -20000 then raise exception 'Overdraft is maxed out'; end if;

  insert into inventory (sim_id, item_id, placed, colour)
  values (row.id, p_item, false, coalesce(nullif(p_colour, ''), '#f4f1ea'))
  returning id into new_id;

  update sims set balance_pence = balance_pence - item.price_pence, updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence into row.balance_pence;

  insert into transactions (sim_id, amount_pence, kind, ref)
  values (row.id, -item.price_pence, 'purchase', p_item);

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'item', (select to_jsonb(i) from inventory i where i.id = new_id)
  );
end;
$$;

create or replace function sell_item(p_inventory uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  owned inventory%rowtype;
  price int;
  refund int;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into owned from inventory where id = p_inventory and sim_id = row.id;
  if not found then raise exception 'You do not own that'; end if;
  select price_pence into price from catalogue_items where id = owned.item_id;
  refund := price / 2;
  delete from inventory where id = owned.id;
  update sims set balance_pence = balance_pence + refund, updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence into row.balance_pence;
  insert into transactions (sim_id, amount_pence, kind, ref)
  values (row.id, refund, 'sale', owned.item_id);
  return jsonb_build_object('balance_pence', row.balance_pence, 'refund_pence', refund);
end;
$$;

create or replace function place_item(p_inventory uuid, p_x int, p_y int, p_rotation int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  owned inventory%rowtype;
  item catalogue_items%rowtype;
  home homes%rowtype;
  fw int;
  fh int;
  swap int;
  other record;
  ofw int;
  ofh int;
begin
  if p_rotation < 0 or p_rotation > 3 then raise exception 'Bad rotation'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into owned from inventory where id = p_inventory and sim_id = row.id;
  if not found then raise exception 'You do not own that'; end if;
  select * into item from catalogue_items where id = owned.item_id;
  select * into home from homes where id = row.home_id;

  if item.wall then
    fw := 1; fh := 1;
    if p_y <> 0 then raise exception 'Wall lamps sit on the back wall'; end if;
  else
    fw := item.footprint[1];
    fh := item.footprint[2];
    if p_rotation % 2 = 1 then
      swap := fw; fw := fh; fh := swap;
    end if;
  end if;

  if p_x < 0 or p_y < 0 or p_x + fw > home.width or p_y + fh > home.height then
    raise exception 'That does not fit';
  end if;

  for other in
    select i.x, i.y, i.rotation, c.footprint, c.wall, c.blocks
    from inventory i
    join catalogue_items c on c.id = i.item_id
    where i.sim_id = row.id and i.placed and i.id <> owned.id and c.blocks
  loop
    if other.wall then
      ofw := 1; ofh := 1;
    else
      ofw := other.footprint[1];
      ofh := other.footprint[2];
      if other.rotation % 2 = 1 then
        swap := ofw; ofw := ofh; ofh := swap;
      end if;
    end if;
    if item.blocks and p_x < other.x + ofw and p_x + fw > other.x and p_y < other.y + ofh and p_y + fh > other.y then
      raise exception 'Something is already there';
    end if;
  end loop;

  if item.blocks and row.home_id in ('boxroom_z4', 'sofa')
     and p_x < 5 and p_x + fw > 4 and p_y < 1 and p_y + fh > 0 then
    raise exception 'The loo is already there';
  end if;
  if item.blocks and row.home_id = 'boxroom_z4'
     and p_x < 5 and p_x + fw > 4 and p_y < 2 and p_y + fh > 1 then
    raise exception 'The shower is already there';
  end if;

  update inventory set placed = true, x = p_x, y = p_y, rotation = p_rotation where id = owned.id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function set_heating(p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update sims set heating_on = p_on, updated_at = clock_timestamp() where owner = auth.uid();
  return jsonb_build_object('heating_on', p_on);
end;
$$;

create or replace function top_up_oyster(p_pence int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
begin
  if p_pence not in (500, 1000, 2000) then raise exception 'Top up £5, £10, or £20'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if row.balance_pence - p_pence < -20000 then raise exception 'Overdraft is maxed out'; end if;
  update sims set
    balance_pence = balance_pence - p_pence,
    oyster_pence = oyster_pence + p_pence,
    updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence, oyster_pence into row.balance_pence, row.oyster_pence;
  insert into transactions (sim_id, amount_pence, kind, ref)
  values (row.id, -p_pence, 'travel', 'oyster');
  return jsonb_build_object('balance_pence', row.balance_pence, 'oyster_pence', row.oyster_pence);
end;
$$;

create or replace function venue_purchase(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  price int;
begin
  price := case p_kind
    when 'meal_deal' then 385
    when 'coffee' then 280
    when 'pint' then 550
    when 'roast' then 900
    else null
  end;
  if price is null then raise exception 'Not on the menu'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if row.balance_pence - price < -20000 then raise exception 'Not enough money'; end if;
  update sims set balance_pence = balance_pence - price, updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence into row.balance_pence;
  insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, -price, 'purchase', p_kind);
  return jsonb_build_object('balance_pence', row.balance_pence);
end;
$$;

create or replace function mood_multiplier(p_needs jsonb, p_heating boolean)
returns numeric
language sql
immutable
as $$
  select 0.7 + (
    least(100, greatest(0,
      (
        coalesce((p_needs->>'hunger')::numeric, 0) +
        coalesce((p_needs->>'energy')::numeric, 0) +
        coalesce((p_needs->>'hygiene')::numeric, 0) +
        coalesce((p_needs->>'bladder')::numeric, 0) +
        coalesce((p_needs->>'fun')::numeric, 0) +
        coalesce((p_needs->>'social')::numeric, 0)
      ) / 6.0 + case when p_heating then 0 else -15 end
    )) / 100.0
  ) * 0.6
$$;

create or replace function start_shift(p_job text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  job jobs%rowtype;
  have numeric;
  mood numeric;
  shift jsonb;
begin
  select * into row from sims where owner = auth.uid() for update;
  if row.active_shift is not null then raise exception 'You are already on shift'; end if;
  select * into job from jobs where id = p_job;
  if not found then raise exception 'Unknown job'; end if;
  if row.location <> job.venue then raise exception 'Go there first'; end if;
  if job.skill is not null then
    have := coalesce((row.skills->>job.skill)::numeric, 0);
    if have < job.skill_required then raise exception 'Skill too low'; end if;
  end if;
  mood := least(100, greatest(0, (
    coalesce((row.needs->>'hunger')::numeric, 0) +
    coalesce((row.needs->>'energy')::numeric, 0) +
    coalesce((row.needs->>'hygiene')::numeric, 0) +
    coalesce((row.needs->>'bladder')::numeric, 0) +
    coalesce((row.needs->>'fun')::numeric, 0) +
    coalesce((row.needs->>'social')::numeric, 0)
  ) / 6.0 + case when row.heating_on then 0 else -15 end));
  shift := jsonb_build_object(
    'jobId', job.id,
    'startedAt', clock_timestamp(),
    'expectedSeconds', job.hours * 60,
    'moodScore', round(mood, 2)
  );
  update sims set active_shift = shift, updated_at = clock_timestamp() where id = row.id;
  return jsonb_build_object('shift', shift);
end;
$$;

create or replace function finish_shift()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  job jobs%rowtype;
  started timestamptz;
  expected numeric;
  elapsed numeric;
  mood numeric;
  mult numeric;
  wage bigint;
  xp numeric;
begin
  select * into row from sims where owner = auth.uid() for update;
  if row.active_shift is null then raise exception 'You are not on shift'; end if;
  select * into job from jobs where id = row.active_shift->>'jobId';
  started := (row.active_shift->>'startedAt')::timestamptz;
  expected := coalesce((row.active_shift->>'expectedSeconds')::numeric, job.hours * 60);
  elapsed := extract(epoch from (clock_timestamp() - started));
  if elapsed < expected * 0.9 then raise exception 'Shift is not finished'; end if;
  mood := coalesce((row.active_shift->>'moodScore')::numeric, 50);
  mult := 0.7 + (least(100, greatest(0, mood)) / 100.0) * 0.6;
  if job.tips then
    wage := 300 + floor(random() * 1701)::bigint;
  elsif job.id = 'delivery_rider' then
    wage := ((1000 + floor(random() * 601)) * job.hours)::bigint;
  else
    wage := round(job.pay_per_hour_pence * job.hours * mult)::bigint;
  end if;
  xp := least(10, coalesce((row.skills->>job.xp_skill)::numeric, 0) + 0.25);
  row.skills := jsonb_set(row.skills, array[job.xp_skill], to_jsonb(xp), true);
  row.needs := jsonb_set(
    row.needs,
    '{energy}',
    to_jsonb(greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - job.energy_cost))
  );
  update sims set
    balance_pence = balance_pence + wage,
    skills = row.skills,
    needs = row.needs,
    active_shift = null,
    updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence into row.balance_pence;
  insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, wage, 'wage', job.id);
  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'wage_pence', wage,
    'skills', row.skills,
    'needs', row.needs,
    'job_id', job.id
  );
end;
$$;

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
  if p_destination = 'home' then
    select zone into to_zone from homes h join sims s on s.home_id = h.id where s.owner = auth.uid();
  else
    select zone into to_zone from venues where id = p_destination;
  end if;
  if to_zone is null then raise exception 'Unknown place'; end if;

  select * into row from sims where owner = auth.uid() for update;
  if row.location = 'home' and p_destination = 'home' then raise exception 'You are already home'; end if;
  if row.location = p_destination then raise exception 'You are already there'; end if;
  if row.active_shift is not null then raise exception 'Finish your shift first'; end if;

  if row.location = 'home' then
    select zone into from_zone from homes where id = row.home_id;
  else
    select zone into from_zone from venues where id = row.location;
  end if;
  gap := greatest(abs(from_zone - to_zone), 1);

  if p_mode = 'walk' then
    cost := 0;
    energy := greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - (6 + gap * 2));
  elsif p_mode = 'bus' then
    cost := 175;
    energy := greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - 2);
  elsif p_mode = 'ride' then
    cost := 650 + abs(from_zone - to_zone) * 200;
    energy := greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - 1);
  else
    cost := greatest(280, 160 * gap);
    energy := greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - 2);
  end if;

  if p_mode = 'tube' then
    if row.oyster_pence < cost then raise exception 'Top up your Oyster'; end if;
    row.oyster_pence := row.oyster_pence - cost;
  elsif cost > 0 then
    if row.balance_pence - cost < -20000 then raise exception 'Not enough money'; end if;
    row.balance_pence := row.balance_pence - cost;
    insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, -cost, 'travel', p_mode);
  end if;

  row.location := case when p_destination = 'home' then 'home' else p_destination end;
  row.needs := jsonb_set(row.needs, '{energy}', to_jsonb(energy));
  update sims set
    balance_pence = row.balance_pence,
    oyster_pence = row.oyster_pence,
    location = row.location,
    needs = row.needs,
    updated_at = clock_timestamp()
  where id = row.id;

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'oyster_pence', row.oyster_pence,
    'location', row.location,
    'needs_energy', energy
  );
end;
$$;

create or replace function send_gift(p_to uuid, p_pence int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sender sims%rowtype;
  receiver sims%rowtype;
begin
  if p_pence < 100 or p_pence > 2000 then raise exception 'Gifts are £1 to £20'; end if;
  select * into sender from sims where owner = auth.uid() for update;
  if sender.id = p_to then raise exception 'That is your own pocket'; end if;
  select * into receiver from sims where id = p_to for update;
  if not found then raise exception 'No such Londoner'; end if;
  if sender.balance_pence - p_pence < -20000 then raise exception 'Not enough money'; end if;
  update sims set balance_pence = balance_pence - p_pence, updated_at = clock_timestamp() where id = sender.id
  returning balance_pence into sender.balance_pence;
  update sims set balance_pence = balance_pence + p_pence, updated_at = clock_timestamp() where id = receiver.id;
  insert into transactions (sim_id, amount_pence, kind, ref) values
    (sender.id, -p_pence, 'gift', receiver.id::text),
    (receiver.id, p_pence, 'gift', sender.id::text);
  return jsonb_build_object('balance_pence', sender.balance_pence);
end;
$$;

create or replace function add_friend(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  other uuid;
  left_id uuid;
  right_id uuid;
begin
  select id into me from sims where owner = auth.uid();
  select s.id into other
  from sims s join profiles p on p.id = s.owner
  where lower(p.username) = lower(p_username);
  if other is null then raise exception 'No Londoner with that name'; end if;
  if other = me then raise exception 'That is you'; end if;
  if me < other then left_id := me; right_id := other; else left_id := other; right_id := me; end if;
  insert into relationships (a, b) values (left_id, right_id) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function get_home(p_sim uuid)
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
    'name', s.name,
    'home_id', s.home_id,
    'appearance', s.appearance,
    'items', coalesce((
      select jsonb_agg(to_jsonb(i)) from inventory i where i.sim_id = s.id and i.placed
    ), '[]'::jsonb)
  ) into result
  from sims s where s.id = p_sim;
  if result is null then raise exception 'No such home'; end if;
  return result;
end;
$$;

grant execute on function get_state() to anon, authenticated;
grant execute on function create_sim(text, text, jsonb, text[], text) to anon, authenticated;
grant execute on function checkpoint_needs(jsonb, bigint, boolean) to anon, authenticated;
grant execute on function buy_item(text, text) to anon, authenticated;
grant execute on function sell_item(uuid) to anon, authenticated;
grant execute on function place_item(uuid, int, int, int) to anon, authenticated;
grant execute on function set_heating(boolean) to anon, authenticated;
grant execute on function top_up_oyster(int) to anon, authenticated;
grant execute on function venue_purchase(text) to anon, authenticated;
grant execute on function start_shift(text) to anon, authenticated;
grant execute on function finish_shift() to anon, authenticated;
grant execute on function travel(text, text) to anon, authenticated;
grant execute on function send_gift(uuid, int) to anon, authenticated;
grant execute on function add_friend(text) to anon, authenticated;
grant execute on function get_home(uuid) to anon, authenticated;

revoke execute on function apply_upkeep(sims, bigint) from public, anon, authenticated;
revoke execute on function pack_state(uuid) from public, anon, authenticated;
revoke execute on function week_index(bigint) from public, anon, authenticated;
revoke execute on function mood_multiplier(jsonb, boolean) from public, anon, authenticated;
