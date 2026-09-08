-- Run once in the SQL Editor of a new Supabase project you own.
-- Names and availability are visible to anyone holding the random plan link.
-- Editing a response additionally requires that browser's private edit token.
begin;
create schema if not exists yyd_private;
revoke all on schema yyd_private from public, anon, authenticated;

create table yyd_private.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 80),
  note text not null default '' check (length(note) <= 300),
  timezone text not null,
  slots text[] not null check (cardinality(slots) between 1 and 168),
  created_at timestamptz not null default now()
);
create table yyd_private.responses (
  plan_id uuid not null references yyd_private.plans(id) on delete cascade,
  id uuid not null,
  token_hash text not null,
  name text not null check (length(name) between 1 and 40),
  slots integer[] not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, id)
);
alter table yyd_private.plans enable row level security;
alter table yyd_private.responses enable row level security;
revoke all on all tables in schema yyd_private from public, anon, authenticated;

create function public.yyd_health()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from yyd_private.plans limit 0;
  perform 1 from yyd_private.responses limit 0;
  return jsonb_build_object('status','ready','version',1);
end;
$$;

create function public.yyd_get_plan(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object('id',p.id,'title',p.title,'note',p.note,'timezone',p.timezone,'slots',p.slots,
    'people',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'slots',r.slots) order by r.created_at,r.id)
      from yyd_private.responses r where r.plan_id=p.id),'[]'::jsonb)) into result
  from yyd_private.plans p where p.id=p_id;
  if result is null then raise exception 'This hangout does not exist.'; end if;
  return result;
end;
$$;

create function public.yyd_create_plan(p_title text,p_note text,p_timezone text,p_slots text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare plan_id uuid; slot text; day date; first_day date; last_day date; hour_count integer; day_count integer;
begin
  if p_title is null or length(btrim(p_title)) not between 1 and 80 then raise exception 'Give your hangout a name (up to 80 characters).'; end if;
  if p_note is null or length(p_note)>300 then raise exception 'Keep the note under 300 characters.'; end if;
  if p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Choose a valid time zone.'; end if;
  if p_slots is null or cardinality(p_slots) not between 1 and 168 or array_ndims(p_slots)<>1 then raise exception 'Choose between 1 and 168 time slots.'; end if;
  foreach slot in array p_slots loop
    if slot is null or slot !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T(0[0-9]|1[0-9]|2[0-3]):00$' then raise exception 'Invalid time slot.'; end if;
    day := left(slot,10)::date;
    if to_char(day,'YYYY-MM-DD')<>left(slot,10) then raise exception 'Invalid date.'; end if;
  end loop;
  if (select count(distinct s) from unnest(p_slots) s)<>cardinality(p_slots) then raise exception 'Duplicate time slots.'; end if;
  select min(left(s,10)::date),max(left(s,10)::date),count(distinct left(s,10)),count(distinct right(s,5))
    into first_day,last_day,day_count,hour_count from unnest(p_slots) s;
  if last_day-first_day>6 or day_count*hour_count<>cardinality(p_slots) then raise exception 'Choose up to seven days with the same hours each day.'; end if;
  insert into yyd_private.plans(title,note,timezone,slots) values(btrim(p_title),p_note,p_timezone,p_slots) returning id into plan_id;
  return public.yyd_get_plan(plan_id);
end;
$$;

create function public.yyd_save_response(p_plan uuid,p_id uuid,p_token text,p_name text,p_slots integer[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare slot_count integer; existing_hash text; submitted_hash text;
begin
  if p_id is null or p_token is null or p_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid edit identity.'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 40 then raise exception 'Enter a name between 1 and 40 characters.'; end if;
  -- Lock this plan to serialize concurrent inserts and enforce the participant cap.
  select cardinality(slots) into slot_count from yyd_private.plans where id=p_plan for update;
  if slot_count is null then raise exception 'This hangout does not exist.'; end if;
  if p_slots is null or cardinality(p_slots)>slot_count or (cardinality(p_slots)>0 and array_ndims(p_slots)<>1) then raise exception 'Invalid availability.'; end if;
  if exists(select 1 from unnest(p_slots) s where s is null or s<0 or s>=slot_count) then raise exception 'Invalid time selection.'; end if;
  if (select count(distinct s) from unnest(p_slots) s)<>cardinality(p_slots) then raise exception 'Duplicate time selections.'; end if;
  submitted_hash := encode(sha256(convert_to(p_token,'UTF8')),'hex');
  select token_hash into existing_hash from yyd_private.responses where plan_id=p_plan and id=p_id;
  if existing_hash is not null and existing_hash<>submitted_hash then raise exception 'This browser cannot edit that response.'; end if;
  if existing_hash is null and (select count(*) from yyd_private.responses where plan_id=p_plan)>=50 then raise exception 'This demo supports up to 50 people per hangout.'; end if;
  insert into yyd_private.responses(plan_id,id,token_hash,name,slots) values(p_plan,p_id,submitted_hash,btrim(p_name),p_slots)
    on conflict (plan_id,id) do update set name=excluded.name,slots=excluded.slots;
  return public.yyd_get_plan(p_plan);
end;
$$;

revoke all on function public.yyd_get_plan(uuid) from public, anon, authenticated;
revoke all on function public.yyd_health() from public, anon, authenticated;
revoke all on function public.yyd_create_plan(text,text,text,text[]) from public, anon, authenticated;
revoke all on function public.yyd_save_response(uuid,uuid,text,text,integer[]) from public, anon, authenticated;
grant execute on function public.yyd_get_plan(uuid) to anon;
grant execute on function public.yyd_health() to anon;
grant execute on function public.yyd_create_plan(text,text,text,text[]) to anon;
grant execute on function public.yyd_save_response(uuid,uuid,text,text,integer[]) to anon;
commit;
