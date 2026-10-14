-- Contracts, payments and the customer portal (Oct 14, 2026).
-- Flow: customer record -> quote sent -> quote accepted -> contract sent -> contract signed
-- (stored on the customer record; the event dates/status update automatically).
-- Customers are NOT staff: they sign in to /portal/ with an emailed link and can only READ rows tied to
-- contacts whose email matches their verified login. Nothing here uses auth.role() = 'authenticated'.

-- customer record fields the contract needs
alter table organizations add column if not exists address text;
alter table organizations add column if not exists zip text;
alter table organizations add column if not exists phone text;
alter table quotes add column if not exists discount_label text;
alter table quotes add column if not exists notes text;

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  quote_id uuid references quotes(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  title text not null default 'Agreement',
  status text not null default 'draft' check (status in ('draft','sent','signed','void')),
  terms jsonb not null default '{}'::jsonb,        -- merged customer/quote/event fields
  body_html text not null default '',              -- rendered snapshot; what the customer actually signs
  sign_token uuid not null unique default gen_random_uuid(),
  sent_at timestamptz, signed_at timestamptz,
  signed_name text, signed_title text, signed_user_agent text,
  created_by text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists contracts_event_idx on contracts(event_id);
create index if not exists contracts_quote_idx on contracts(quote_id);
create index if not exists contracts_contact_idx on contracts(contact_id);
create index if not exists contracts_org_idx on contracts(organization_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete set null,
  event_id uuid references events(id) on delete set null,
  amount numeric(10,2) not null,
  method text not null default 'check' check (method in ('card','check','cash','ach','other')),
  paid_at date not null default current_date,
  reference text, note text,
  created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on payments(invoice_id);
create index if not exists payments_event_idx on payments(event_id);

-- a signed contract can only be voided, never edited or deleted
create or replace function public.contracts_lock() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'signed' then raise exception 'A signed contract cannot be deleted. Void it instead.'; end if;
    return old;
  end if;
  new.updated_at = now();
  if old.status = 'signed' and (new.status not in ('signed','void') or new.body_html is distinct from old.body_html
     or new.terms is distinct from old.terms or new.signed_name is distinct from old.signed_name
     or new.signed_at is distinct from old.signed_at) then
    raise exception 'A signed contract cannot be changed. Void it and create a new one.';
  end if;
  return new;
end $$;
drop trigger if exists contracts_lock_trg on contracts;
create trigger contracts_lock_trg before update or delete on contracts for each row execute function contracts_lock();

-- ── who is this customer? (verified login email matches a contact's email) ───
create or replace function public.my_contact_ids() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select c.id from contacts c join auth.users u on lower(u.email) = lower(c.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null and c.email is not null;
$$;
create or replace function public.my_org_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id from contacts where id in (select public.my_contact_ids()) and organization_id is not null;
$$;
create or replace function public.my_event_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from events where contact_id in (select public.my_contact_ids())
     or organization_id in (select public.my_org_ids());
$$;
revoke execute on function public.my_contact_ids(), public.my_org_ids(), public.my_event_ids() from public, anon;
grant execute on function public.my_contact_ids(), public.my_org_ids(), public.my_event_ids() to authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table contracts enable row level security;
alter table payments enable row level security;
drop policy if exists "Staff only" on contracts;
create policy "Staff only" on contracts for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff only" on payments;
create policy "Staff only" on payments for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- customers: read-only, own rows only
drop policy if exists "Customer own" on contacts;
create policy "Customer own" on contacts for select to authenticated using (id in (select public.my_contact_ids()));
drop policy if exists "Customer own" on organizations;
create policy "Customer own" on organizations for select to authenticated using (id in (select public.my_org_ids()));
drop policy if exists "Customer own" on events;
create policy "Customer own" on events for select to authenticated using (id in (select public.my_event_ids()));
drop policy if exists "Customer own" on quotes;
create policy "Customer own" on quotes for select to authenticated using (status <> 'draft' and event_id in (select public.my_event_ids()));
drop policy if exists "Customer own" on invoices;
create policy "Customer own" on invoices for select to authenticated using (status <> 'void' and event_id in (select public.my_event_ids()));
drop policy if exists "Customer own" on payments;
create policy "Customer own" on payments for select to authenticated using (event_id in (select public.my_event_ids()));
drop policy if exists "Customer own" on contracts;
create policy "Customer own" on contracts for select to authenticated using (status in ('sent','signed') and event_id in (select public.my_event_ids()));

-- ── signing (by emailed link token, or from the portal) ──────────────────────
create or replace function public.get_contract(p_token uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('id', c.id, 'status', c.status, 'title', c.title, 'body_html', c.body_html,
    'signed_name', c.signed_name, 'signed_title', c.signed_title, 'signed_at', c.signed_at, 'event_name', e.name)
  from contracts c join events e on e.id = c.event_id
  where c.sign_token = p_token and c.status in ('sent','signed');
$$;
create or replace function public.sign_contract(p_token uuid, p_name text, p_title text default null, p_agent text default null)
returns json language plpgsql security definer set search_path = public as $$
declare c contracts%rowtype; sd date; ed date;
begin
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Please type your full name to sign.'; end if;
  select * into c from contracts where sign_token = p_token for update;
  if not found or c.status not in ('sent','signed') then raise exception 'This contract link is not valid.'; end if;
  if c.status = 'signed' then raise exception 'This contract was already signed.'; end if;
  update contracts set status = 'signed', signed_at = now(), signed_name = left(trim(p_name),200),
    signed_title = left(nullif(trim(coalesce(p_title,'')),''),200), signed_user_agent = left(p_agent,300) where id = c.id;
  begin sd := nullif(c.terms->>'start_date','')::date; ed := nullif(c.terms->>'end_date','')::date;
  exception when others then sd := null; ed := null; end;
  update events set status = 'confirmed', start_date = coalesce(sd, start_date), end_date = coalesce(ed, end_date) where id = c.event_id;
  if c.quote_id is not null then update quotes set status = 'accepted' where id = c.quote_id and status in ('draft','sent'); end if;
  update leads set status = 'won' where event_id = c.event_id and status <> 'won';
  insert into activities(event_id, kind, body, created_by)
    values (c.event_id, 'note', 'Contract signed online by ' || left(trim(p_name),200), 'customer');
  return json_build_object('ok', true);
end $$;
revoke execute on function public.get_contract(uuid), public.sign_contract(uuid,text,text,text) from public;
grant execute on function public.get_contract(uuid), public.sign_contract(uuid,text,text,text) to anon, authenticated;

-- customer accepts or declines a quote they were sent
create or replace function public.respond_to_quote(p_quote_id uuid, p_accept boolean) returns json
language plpgsql security definer set search_path = public as $$
declare q quotes%rowtype;
begin
  select * into q from quotes where id = p_quote_id for update;
  if not found or q.event_id not in (select public.my_event_ids()) then raise exception 'Quote not found.'; end if;
  if q.status <> 'sent' then raise exception 'This quote can no longer be changed online.'; end if;
  update quotes set status = case when p_accept then 'accepted' else 'declined' end where id = q.id;
  insert into activities(event_id, kind, body, created_by)
    values (q.event_id, 'note', case when p_accept then 'Customer accepted the quote online.' else 'Customer declined the quote online.' end, 'customer');
  return json_build_object('ok', true);
end $$;
revoke execute on function public.respond_to_quote(uuid, boolean) from public, anon;
grant execute on function public.respond_to_quote(uuid, boolean) to authenticated;
