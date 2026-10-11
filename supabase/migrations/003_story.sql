-- London Life v2: action menus, onboarding goals, careers, greetings.
-- Run after 002_seed.sql, then run 004_story_seed.sql.
-- lib/net/sandbox.ts mirrors every rule here for offline play.

alter table sims add column if not exists career jsonb;
alter table sims add column if not exists stats jsonb not null default '{}';
alter table sims add column if not exists goals_done text[] not null default '{}';
alter table sims add column if not exists allowance jsonb not null default '{}';
alter table sims add column if not exists last_call_minute bigint not null default 480;
alter table sims add column if not exists busy_until timestamptz not null default now();

alter table homes add column if not exists fixtures jsonb not null default '[]';
alter table jobs add column if not exists ladder text[] not null default '{}';

create table if not exists actions (
  id text primary key,
  cost_pence int not null check (cost_pence >= 0),
  minutes int not null check (minutes > 0),
  effects jsonb not null default '{}',
  skill text,
  xp numeric not null default 0,
  requires_skill text,
  requires_level int not null default 0,
  venue text references venues(id),
  anywhere boolean not null default false,
  heritage boolean not null default false,
  scales boolean not null default false
);

create table if not exists goals (
  id text primary key,
  ordinal int not null unique,
  stat text not null,
  count int not null default 1,
  reward_pence int not null check (reward_pence between 0 and 5000)
);

create table if not exists locals (
  id text primary key,
  venues text[] not null
);

alter table actions enable row level security;
alter table goals enable row level security;
alter table locals enable row level security;
grant select on actions, goals, locals to anon, authenticated;
create policy actions_read on actions for select using (true);
create policy goals_read on goals for select using (true);
create policy locals_read on locals for select using (true);

drop function if exists venue_purchase(text);

create or replace function bump_stat(p_stats jsonb, p_key text)
returns jsonb
language sql
immutable
as $$
  select coalesce(p_stats, '{}'::jsonb) || jsonb_build_object(p_key, coalesce((p_stats->>p_key)::int, 0) + 1)
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

  if total > 0 and p_sim.balance_pence - total < -20000 and weeks > 0 then
    p_sim.rent_misses := p_sim.rent_misses + weeks;
    insert into transactions (sim_id, amount_pence, kind, ref)
    values (p_sim.id, -least(total, p_sim.balance_pence + 20000), 'rent', 'missed');
    p_sim.balance_pence := -20000;
    if p_sim.rent_misses >= 2 then
      p_sim.sofa_surfing := true;
      p_sim.home_id := 'sofa';
    end if;
  elsif total > 0 then
    p_sim.balance_pence := greatest(-20000, p_sim.balance_pence - total);
    if weeks > 0 then
      p_sim.rent_misses := 0;
      p_sim.stats := bump_stat(p_sim.stats, 'rent');
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
  natural_gain numeric;
  key text;
  oldv numeric;
  newv numeric;
  floor_v numeric;
  ceiling_v numeric;
  clamped numeric;
  used numeric;
  allow numeric;
  rates jsonb := '{"hunger":4,"energy":3,"hygiene":2.5,"bladder":5,"fun":3,"social":2}';
  next_needs jsonb := '{}'::jsonb;
  next_allowance jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;

  wall_seconds := greatest(extract(epoch from (clock_timestamp() - row.updated_at)), 0);
  trusted := least(greatest(p_game_time, row.game_time), row.game_time + floor(wall_seconds * 3 + 2)::bigint);
  elapsed_hours := greatest(trusted - row.game_time, 0)::numeric / 60.0;
  natural_gain := least(80, (greatest(wall_seconds, 1) / 15.0) * 25);

  foreach key in array array['hunger','energy','hygiene','bladder','fun','social'] loop
    oldv := coalesce((row.needs->>key)::numeric, 80);
    newv := coalesce((p_needs->>key)::numeric, oldv);
    allow := coalesce((row.allowance->>key)::numeric, 0);
    floor_v := greatest(0, oldv - coalesce((rates->>key)::numeric, 3) * elapsed_hours * 1.25 - 1);
    ceiling_v := oldv + natural_gain + allow;
    clamped := least(100, greatest(0, least(greatest(newv, floor_v), ceiling_v)));
    used := greatest(0, clamped - oldv - natural_gain);
    next_needs := next_needs || jsonb_build_object(key, round(clamped, 2));
    next_allowance := next_allowance || jsonb_build_object(key, greatest(0, allow - used));
  end loop;

  row.needs := next_needs;
  row.allowance := next_allowance;
  row.heating_on := p_heating;
  row := apply_upkeep(row, trusted);
  row.updated_at := clock_timestamp();

  update sims set
    needs = row.needs,
    allowance = row.allowance,
    heating_on = row.heating_on,
    balance_pence = row.balance_pence,
    rent_misses = row.rent_misses,
    sofa_surfing = row.sofa_surfing,
    home_id = row.home_id,
    last_upkeep_minute = row.last_upkeep_minute,
    game_time = row.game_time,
    stats = row.stats,
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
    'last_upkeep_minute', row.last_upkeep_minute,
    'stats', row.stats
  );
end;
$$;

create or replace function perform_action(p_action text, p_target text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  def actions%rowtype;
  key text;
  gain numeric;
  next_allowance jsonb;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into def from actions where id = p_action;
  if not found then raise exception 'Not on the menu'; end if;
  if row.active_shift is not null then raise exception 'You are on shift'; end if;
  if def.venue is not null and row.location <> def.venue then raise exception 'Go there first'; end if;
  if def.venue is null and not def.anywhere and row.location <> 'home' then raise exception 'Only at home'; end if;
  if def.requires_skill is not null
     and coalesce((row.skills->>def.requires_skill)::numeric, 0) < def.requires_level then
    raise exception 'Skill too low';
  end if;
  if row.busy_until > clock_timestamp() + interval '180 seconds' then raise exception 'Queue is full'; end if;
  if row.balance_pence - def.cost_pence < -20000 then raise exception 'Not enough money'; end if;

  row.balance_pence := row.balance_pence - def.cost_pence;
  if def.cost_pence > 0 then
    insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, -def.cost_pence, 'purchase', def.id);
  end if;

  if def.skill is not null and def.xp > 0 then
    row.skills := jsonb_set(
      row.skills,
      array[def.skill],
      to_jsonb(least(10, round(coalesce((row.skills->>def.skill)::numeric, 0) + def.xp, 2))),
      true
    );
  end if;

  next_allowance := coalesce(row.allowance, '{}'::jsonb);
  foreach key in array array['hunger','energy','hygiene','bladder','fun','social'] loop
    gain := coalesce((def.effects->>key)::numeric, 0);
    if gain > 0 then
      next_allowance := next_allowance || jsonb_build_object(
        key,
        least(200, coalesce((next_allowance->>key)::numeric, 0) + gain * case when def.scales then 1.6 else 1 end)
      );
    end if;
  end loop;
  row.allowance := next_allowance;

  if coalesce((def.effects->>'hunger')::numeric, 0) > 0 then row.stats := bump_stat(row.stats, 'eat'); end if;
  if coalesce((def.effects->>'hygiene')::numeric, 0) > 0 then row.stats := bump_stat(row.stats, 'shower'); end if;
  if def.heritage then row.stats := bump_stat(row.stats, 'heritage'); end if;
  if def.id = 'call_home' then
    row.stats := bump_stat(row.stats, 'call');
    row.last_call_minute := row.game_time;
  end if;

  row.busy_until := greatest(row.busy_until, clock_timestamp()) + make_interval(secs => def.minutes / 3.0);

  update sims set
    balance_pence = row.balance_pence,
    skills = row.skills,
    allowance = row.allowance,
    stats = row.stats,
    last_call_minute = row.last_call_minute,
    busy_until = row.busy_until
  where id = row.id;

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'skills', row.skills,
    'stats', row.stats,
    'last_call_minute', row.last_call_minute
  );
end;
$$;

create or replace function claim_goal(p_goal text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  goal goals%rowtype;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into goal from goals where not (id = any(row.goals_done)) order by ordinal limit 1;
  if not found then raise exception 'All goals done'; end if;
  if goal.id <> p_goal then raise exception 'Do the goals in order'; end if;
  if coalesce((row.stats->>goal.stat)::int, 0) < goal.count then raise exception 'Not done yet'; end if;

  update sims set
    goals_done = array_append(goals_done, goal.id),
    balance_pence = balance_pence + goal.reward_pence
  where id = row.id
  returning balance_pence, goals_done into row.balance_pence, row.goals_done;
  insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, goal.reward_pence, 'goal', goal.id);

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'goals_done', to_jsonb(row.goals_done),
    'reward_pence', goal.reward_pence
  );
end;
$$;

create or replace function apply_job(p_job text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  job jobs%rowtype;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  select * into job from jobs where id = p_job;
  if not found then raise exception 'Unknown job'; end if;
  if row.active_shift is not null then raise exception 'Finish your shift first'; end if;
  if row.career->>'job_id' = job.id then raise exception 'You already work there'; end if;
  if job.skill is not null and coalesce((row.skills->>job.skill)::numeric, 0) < job.skill_required then
    raise exception 'Skill too low';
  end if;
  row.career := jsonb_build_object('job_id', job.id, 'level', 0, 'shifts_done', 0);
  row.stats := bump_stat(row.stats, 'job');
  update sims set career = row.career, stats = row.stats where id = row.id;
  return jsonb_build_object('career', row.career, 'stats', row.stats);
end;
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
  mood numeric;
  shift jsonb;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  if row.active_shift is not null then raise exception 'You are already on shift'; end if;
  select * into job from jobs where id = p_job;
  if not found then raise exception 'Unknown job'; end if;
  if coalesce(row.career->>'job_id', '') <> job.id then raise exception 'Apply for this job first'; end if;
  if row.location <> job.venue then raise exception 'Go there first'; end if;
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
  mood numeric;
  wage numeric;
  level_now int;
  shifts int;
  level_next int;
  title text;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  if row.active_shift is null then raise exception 'You are not on shift'; end if;
  select * into job from jobs where id = row.active_shift->>'jobId';
  started := (row.active_shift->>'startedAt')::timestamptz;
  expected := coalesce((row.active_shift->>'expectedSeconds')::numeric, job.hours * 60);
  if extract(epoch from (clock_timestamp() - started)) < expected * 0.9 then
    raise exception 'Shift is not finished';
  end if;
  mood := coalesce((row.active_shift->>'moodScore')::numeric, 50);
  level_now := coalesce((row.career->>'level')::int, 0);
  shifts := coalesce((row.career->>'shifts_done')::int, 0) + 1;
  level_next := least(greatest(coalesce(array_length(job.ladder, 1), 1) - 1, 0), shifts / 3);

  if job.tips then
    wage := 300 + floor(random() * 1701);
  elsif job.id = 'delivery_rider' then
    wage := (1000 + floor(random() * 601)) * job.hours;
  else
    wage := job.pay_per_hour_pence * job.hours * (0.7 + (least(100, greatest(0, mood)) / 100.0) * 0.6);
  end if;
  wage := round(wage * (1 + 0.15 * level_now));
  title := coalesce(job.ladder[level_next + 1], job.name);

  row.skills := jsonb_set(
    row.skills,
    array[job.xp_skill],
    to_jsonb(least(10, coalesce((row.skills->>job.xp_skill)::numeric, 0) + 0.25)),
    true
  );
  row.needs := jsonb_set(
    row.needs,
    '{energy}',
    to_jsonb(greatest(0, coalesce((row.needs->>'energy')::numeric, 0) - job.energy_cost))
  );
  row.career := jsonb_build_object('job_id', job.id, 'level', level_next, 'shifts_done', shifts);
  row.stats := bump_stat(row.stats, 'shift');

  update sims set
    balance_pence = balance_pence + wage::bigint,
    skills = row.skills,
    needs = row.needs,
    career = row.career,
    stats = row.stats,
    active_shift = null,
    updated_at = clock_timestamp()
  where id = row.id
  returning balance_pence into row.balance_pence;
  insert into transactions (sim_id, amount_pence, kind, ref) values (row.id, wage::bigint, 'wage', job.id);

  return jsonb_build_object(
    'balance_pence', row.balance_pence,
    'wage_pence', wage::bigint,
    'skills', row.skills,
    'needs', row.needs,
    'job_id', job.id,
    'career', row.career,
    'promoted', level_next > level_now,
    'title', title,
    'stats', row.stats
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
  fixture jsonb;
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
    if p_rotation % 2 = 1 then swap := fw; fw := fh; fh := swap; end if;
  end if;

  if p_x < 0 or p_y < 0 or p_x + fw > home.width or p_y + fh > home.height then
    raise exception 'That does not fit';
  end if;

  if item.blocks then
    for other in
      select i.x, i.y, i.rotation, c.footprint, c.wall
      from inventory i join catalogue_items c on c.id = i.item_id
      where i.sim_id = row.id and i.placed and i.id <> owned.id and c.blocks
    loop
      if other.wall then
        ofw := 1; ofh := 1;
      else
        ofw := other.footprint[1];
        ofh := other.footprint[2];
        if other.rotation % 2 = 1 then swap := ofw; ofw := ofh; ofh := swap; end if;
      end if;
      if p_x < other.x + ofw and p_x + fw > other.x and p_y < other.y + ofh and p_y + fh > other.y then
        raise exception 'Something is already there';
      end if;
    end loop;

    for fixture in select * from jsonb_array_elements(home.fixtures) loop
      if coalesce((fixture->>'blocks')::boolean, true) then
        ofw := coalesce((fixture->'footprint'->>0)::int, 1);
        ofh := coalesce((fixture->'footprint'->>1)::int, 1);
        if coalesce((fixture->>'rotation')::int, 0) % 2 = 1 then swap := ofw; ofw := ofh; ofh := swap; end if;
        if p_x < (fixture->>'x')::int + ofw and p_x + fw > (fixture->>'x')::int
           and p_y < (fixture->>'y')::int + ofh and p_y + fh > (fixture->>'y')::int then
          raise exception 'The % is already there', lower(coalesce(fixture->>'label', 'fixture'));
        end if;
      end if;
    end loop;
  end if;

  if not owned.placed then
    row.stats := bump_stat(row.stats, 'place');
    update sims set stats = row.stats where id = row.id;
  end if;
  update inventory set placed = true, x = p_x, y = p_y, rotation = p_rotation where id = owned.id;
  return jsonb_build_object('ok', true, 'stats', row.stats);
end;
$$;

create or replace function greet(p_target text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row sims%rowtype;
  other sims%rowtype;
begin
  select * into row from sims where owner = auth.uid() for update;
  if not found then raise exception 'No sim'; end if;
  if exists (select 1 from locals where id = p_target and row.location = any(venues)) then
    null;
  else
    begin
      select * into other from sims where id = p_target::uuid;
    exception when invalid_text_representation then
      raise exception 'They''re not here';
    end;
    if other.id is null or other.id = row.id or other.location <> row.location
       or other.location = 'home' or other.updated_at < clock_timestamp() - interval '10 minutes' then
      raise exception 'They''re not here';
    end if;
  end if;
  row.stats := bump_stat(row.stats, 'hello');
  update sims set stats = row.stats where id = row.id;
  return jsonb_build_object('stats', row.stats);
end;
$$;

grant execute on function perform_action(text, text) to anon, authenticated;
grant execute on function claim_goal(text) to anon, authenticated;
grant execute on function apply_job(text) to anon, authenticated;
grant execute on function greet(text) to anon, authenticated;
grant execute on function start_shift(text) to anon, authenticated;
grant execute on function finish_shift() to anon, authenticated;
grant execute on function travel(text, text) to anon, authenticated;
grant execute on function place_item(uuid, int, int, int) to anon, authenticated;
grant execute on function checkpoint_needs(jsonb, bigint, boolean) to anon, authenticated;
revoke execute on function bump_stat(jsonb, text) from public, anon, authenticated;
revoke execute on function apply_upkeep(sims, bigint) from public, anon, authenticated;
