-- Direct messages between real players. Two players can message once they have been in the same venue at the same
-- time (a contact) or are friends. Reads go through RPCs; the select policy exists only so Realtime can push a new
-- message to its recipient.

create table if not exists contacts (
  a uuid not null references sims(id) on delete cascade,
  b uuid not null references sims(id) on delete cascade,
  met_where text not null,
  met_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create table if not exists messages (
  id bigserial primary key,
  from_sim uuid not null references sims(id) on delete cascade,
  to_sim uuid not null references sims(id) on delete cascade,
  from_owner uuid not null,
  to_owner uuid not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_pair on messages (least(from_sim, to_sim), greatest(from_sim, to_sim), id desc);
create index if not exists messages_unread on messages (to_sim, from_sim) where read_at is null;
create index if not exists messages_sender_recent on messages (from_sim, created_at desc);

alter table contacts enable row level security;
alter table messages enable row level security;
revoke all on contacts from anon, authenticated;
revoke all on messages from anon, authenticated;
grant select on messages to authenticated;

drop policy if exists messages_own on messages;
create policy messages_own on messages for select to authenticated
  using (auth.uid() = to_owner or auth.uid() = from_owner);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table messages;
  end if;
end;
$$;

create or replace function linked(p_me uuid, p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from contacts where a = least(p_me, p_other) and b = greatest(p_me, p_other))
      or exists (select 1 from relationships where a = least(p_me, p_other) and b = greatest(p_me, p_other))
$$;

create or replace function meet(p_other uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me sims%rowtype;
  other sims%rowtype;
  fresh int;
begin
  select * into me from sims where owner = auth.uid();
  if not found then raise exception 'No sim'; end if;
  select * into other from sims where id = p_other;
  if other.id is null or other.id = me.id or me.location = 'home' or other.location <> me.location
     or other.updated_at < clock_timestamp() - interval '10 minutes' then
    raise exception 'They''re not here';
  end if;
  insert into contacts (a, b, met_where)
  values (least(me.id, other.id), greatest(me.id, other.id), me.location)
  on conflict do nothing;
  get diagnostics fresh = row_count;
  return jsonb_build_object('new', fresh > 0, 'name', other.name);
end;
$$;

create or replace function send_message(p_to uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me sims%rowtype;
  other sims%rowtype;
  clean text;
  sent messages%rowtype;
begin
  select * into me from sims where owner = auth.uid();
  if not found then raise exception 'No sim'; end if;
  select * into other from sims where id = p_to;
  if other.id is null or other.id = me.id then raise exception 'No one to send that to'; end if;
  if not linked(me.id, other.id) then raise exception 'Meet them in London first'; end if;
  clean := btrim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'));
  if char_length(clean) = 0 then raise exception 'Say something first'; end if;
  if char_length(clean) > 280 then raise exception 'Keep it under 280 characters'; end if;
  if (select count(*) from messages where from_sim = me.id and created_at > clock_timestamp() - interval '10 seconds') >= 5 then
    raise exception 'Slow down a bit';
  end if;
  insert into messages (from_sim, to_sim, from_owner, to_owner, body)
  values (me.id, other.id, me.owner, other.owner, clean)
  returning * into sent;
  return jsonb_build_object('id', sent.id, 'from_me', true, 'body', sent.body, 'created_at', sent.created_at);
end;
$$;

create or replace function get_inbox()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from sims where owner = auth.uid();
  if me is null then raise exception 'No sim'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(c) order by c.last_at desc nulls last, c.met_at desc nulls last)
    from (
      select
        o.id as sim_id,
        o.name,
        p.username,
        o.appearance,
        k.met_where,
        k.met_at,
        k.friend,
        (o.location <> 'home' and o.updated_at > clock_timestamp() - interval '10 minutes') as out_now,
        last.body as last_body,
        last.from_me as last_from_me,
        last.created_at as last_at,
        (select count(*) from messages m where m.to_sim = me and m.from_sim = o.id and m.read_at is null) as unread
      from (
        select other, max(met_where) as met_where, max(met_at) as met_at, bool_or(friend) as friend
        from (
          select case when a = me then b else a end as other, met_where, met_at, false as friend
          from contacts where a = me or b = me
          union all
          select case when a = me then b else a end, null, null, true
          from relationships where a = me or b = me
        ) links
        group by other
      ) k
      join sims o on o.id = k.other
      join profiles p on p.id = o.owner
      left join lateral (
        select m.body, m.from_sim = me as from_me, m.created_at
        from messages m
        where least(m.from_sim, m.to_sim) = least(me, o.id) and greatest(m.from_sim, m.to_sim) = greatest(me, o.id)
        order by m.id desc
        limit 1
      ) last on true
      limit 100
    ) c
  ), '[]'::jsonb);
end;
$$;

create or replace function get_thread(p_with uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from sims where owner = auth.uid();
  if me is null then raise exception 'No sim'; end if;
  if not linked(me, p_with) then raise exception 'Meet them in London first'; end if;
  update messages set read_at = clock_timestamp()
  where to_sim = me and from_sim = p_with and read_at is null;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.id)
    from (
      select m.id, m.from_sim = me as from_me, m.body, m.created_at
      from messages m
      where least(m.from_sim, m.to_sim) = least(me, p_with) and greatest(m.from_sim, m.to_sim) = greatest(me, p_with)
      order by m.id desc
      limit 80
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function meet(uuid) to anon, authenticated;
grant execute on function send_message(uuid, text) to anon, authenticated;
grant execute on function get_inbox() to anon, authenticated;
grant execute on function get_thread(uuid) to anon, authenticated;
revoke execute on function linked(uuid, uuid) from public, anon, authenticated;
