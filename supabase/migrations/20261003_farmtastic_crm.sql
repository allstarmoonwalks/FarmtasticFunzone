-- Farmtastic Fun Zone CRM schema (Oct 3, 2026).
-- Follows the AllStar Moonwalks security model: staff = active employees row (is_staff()),
-- every table is staff-only via RLS, and the public website writes ONLY through the
-- submit_lead() RPC (no anon table access).
-- NOTE: run this on a Farmtastic-specific Supabase project, NOT the AllStar Moonwalks one.

create extension if not exists pgcrypto;

-- ── staff ────────────────────────────────────────────────────────────────────
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  role text not null default 'crew' check (role in ('admin','manager','crew')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees
    where lower(email) = lower(auth.jwt() ->> 'email') and status = 'active');
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees
    where lower(email) = lower(auth.jwt() ->> 'email') and status = 'active' and role in ('admin','manager'));
$$;
revoke execute on function public.is_staff(), public.is_admin() from public;
revoke execute on function public.is_staff(), public.is_admin() from anon;  -- Supabase grants anon by default
grant execute on function public.is_staff(), public.is_admin() to authenticated, service_role;

-- ── catalog ──────────────────────────────────────────────────────────────────
create table if not exists zones (
  slug text primary key, name text not null, sort int not null default 0
);
create table if not exists attractions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  zone text references zones(slug),
  category text, ages text,
  active boolean not null default true,
  sort int not null default 0
);
-- price grid: per-day rate by booth count and event length
create table if not exists price_tiers (
  booths int not null,
  length_band text not null check (length_band in ('short','long')),  -- short = under 10 days, long = 10+
  per_day numeric(10,2) not null,
  primary key (booths, length_band)
);

-- ── CRM core ─────────────────────────────────────────────────────────────────
create table if not exists organizations (          -- fairs, rodeos, schools, venues
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text default 'fair' check (kind in ('fair','rodeo','festival','school','corporate','other')),
  city text, state text default 'TX', website text, notes text,
  created_at timestamptz not null default now()
);
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  name text not null, email text, phone text, title text,
  sms_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null, organization text, email text, phone text,
  event_dates text, booths_interest text, message text,
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','contacted','quoted','won','lost')),
  assigned_to uuid references employees(id),
  contact_id uuid references contacts(id), event_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists events (                 -- a booked (or tentative) fair/rodeo run
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  name text not null,
  venue text, address text, city text,
  start_date date, end_date date,
  status text not null default 'tentative' check (status in ('tentative','confirmed','completed','cancelled')),
  booths int, craft_station boolean not null default false,
  expected_attendance int, load_in_notes text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table leads drop constraint if exists leads_event_fk;
alter table leads add constraint leads_event_fk foreign key (event_id) references events(id) on delete set null;
create table if not exists event_attractions (
  event_id uuid references events(id) on delete cascade,
  attraction_id uuid references attractions(id) on delete cascade,
  primary key (event_id, attraction_id)
);
create table if not exists event_staff (
  event_id uuid references events(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  primary key (event_id, employee_id)
);
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  booths int not null, days int not null, craft_station boolean not null default false,
  per_day numeric(10,2) not null, craft_fee numeric(10,2) not null default 0,
  travel_fee numeric(10,2) not null default 0, discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
  created_at timestamptz not null default now()
);
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  number text unique, kind text default 'deposit' check (kind in ('deposit','balance','full')),
  amount numeric(10,2) not null, due_date date,
  status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  stripe_payment_intent text, paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists activities (             -- notes, calls, emails against any record
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','call','email','sms','meeting')),
  body text not null, created_by text,
  created_at timestamptz not null default now()
);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, due_date date, done boolean not null default false,
  event_id uuid references events(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  assigned_to uuid references employees(id),
  created_at timestamptz not null default now()
);
create table if not exists settings (key text primary key, value jsonb not null);

create index if not exists leads_status_idx on leads(status, created_at desc);
create index if not exists events_dates_idx on events(start_date);

-- updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists leads_touch on leads;  create trigger leads_touch  before update on leads  for each row execute function touch_updated_at();
drop trigger if exists events_touch on events; create trigger events_touch before update on events for each row execute function touch_updated_at();

-- ── RLS: staff only everywhere ───────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['employees','zones','attractions','price_tiers','organizations','contacts','leads',
    'events','event_attractions','event_staff','quotes','invoices','activities','tasks','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Staff only" on public.%I', t);
    execute format('create policy "Staff only" on public.%I for all to authenticated
                    using ((select public.is_staff())) with check ((select public.is_staff()))', t);
  end loop;
end $$;
-- employees: only admins/managers manage the roster; everyone staff can read it
drop policy if exists "Staff only" on employees;
create policy "Staff read" on employees for select to authenticated using ((select public.is_staff()));
create policy "Admin write" on employees for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── public lead capture (the ONLY thing the anon key can do) ─────────────────
create or replace function public.submit_lead(
  p_name text, p_email text, p_phone text default null, p_organization text default null,
  p_event_dates text default null, p_booths text default null, p_message text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' or position('@' in p_email) = 0 then
    raise exception 'name and a valid email are required';
  end if;
  -- crude flood guard: max 5 website leads per email per hour
  if (select count(*) from leads where lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many requests';
  end if;
  insert into leads(name, email, phone, organization, event_dates, booths_interest, message, source)
  values (left(trim(p_name),200), left(trim(p_email),200), left(p_phone,40), left(p_organization,200),
          left(p_event_dates,200), left(p_booths,100), left(p_message,5000), 'website')
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.submit_lead(text,text,text,text,text,text,text) from public;
grant execute on function public.submit_lead(text,text,text,text,text,text,text) to anon, authenticated;

-- ── seed catalog (from booths.html / pricing.html) ───────────────────────────
insert into zones(slug,name,sort) values
 ('active-adventures','Active Adventures',1),('real-farmer-university','Real Farmer University',2),
 ('creative-harvest','The Creative Harvest',3),('memory-makers','Memory Makers',4) on conflict do nothing;
insert into attractions(slug,name,zone,category,ages,sort) values
 ('tractor-track','Tractor Track and Trots!','active-adventures','Fun Zone Activity Center','Ages ~3–8',1),
 ('farmtastic-corral','FarmTastic Corral!','active-adventures','Fun Zone Activity Center','Ages ~3–8',2),
 ('pooper-scooper','Pooper Scooper Trooper!','active-adventures','Fun Zone Activity Center','All Ages',3),
 ('saddle-up','Saddle Up Station!','real-farmer-university','Interactive Learning Center','Ages 5 & up',4),
 ('ropin-roundup','Ropin'' Roundup!','real-farmer-university','Interactive Learning Center','Ages 5 & up',5),
 ('scarecrow','Scarecrow Creation Station!','real-farmer-university','Interactive Fun Zone','All Ages',6),
 ('kernel-corn','Kernel Corn-struction Zone!','creative-harvest','Interactive Fun Zone','Ages 3 & up',7),
 ('joyful-noise','Joyful Noise Junction!','creative-harvest','Fun Zone Activity Center','Ages 5 & up',8),
 ('craft-creations','Craft Creations Corner!','creative-harvest','Souvenir Station','All Ages',9),
 ('sprout-grow','Sprout & Grow Garden!','memory-makers','Souvenir Station','All Ages',10),
 ('boots-scoots','Boots, Scoots, & Photo Shoots!','memory-makers','Memories / Souvenir Station','All Ages',11)
 on conflict do nothing;
insert into price_tiers(booths,length_band,per_day) values
 (4,'short',1122),(6,'short',1272),(8,'short',1422),(10,'short',1600),
 (4,'long',800),(6,'long',950),(8,'long',1100),(10,'long',1288) on conflict do nothing;
insert into settings(key,value) values
 ('pricing', '{"craft_addon_short_per_day":200,"craft_addon_long_flat":400,"long_event_min_days":10,"deposit_pct":25}')
 on conflict do nothing;
