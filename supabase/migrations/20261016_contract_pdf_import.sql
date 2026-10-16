-- Contract PDF import (Oct 16, 2026): keep the original PDF with the digital contract.
alter table contracts add column if not exists source_pdf_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('contract-pdfs', 'contract-pdfs', false, 15728640, array['application/pdf']) on conflict (id) do nothing;
create policy "contract pdfs staff read" on storage.objects for select to authenticated
  using (bucket_id = 'contract-pdfs' and (select public.is_staff()));
create policy "contract pdfs staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'contract-pdfs' and (select public.is_staff()));
create policy "contract pdfs staff update" on storage.objects for update to authenticated
  using (bucket_id = 'contract-pdfs' and (select public.is_staff())) with check (bucket_id = 'contract-pdfs' and (select public.is_staff()));

-- Event times (Oct 16, 2026): per-day schedule + the contract's times wording, applied when a contract is signed.
alter table events add column if not exists schedule jsonb not null default '[]'::jsonb;  -- [{date,start,end}] 'HH:MM', midnight end = '24:00'
alter table events add column if not exists times_text text;
-- sign_contract() now also copies terms.schedule / terms.times_text onto the event (see 20261014 for the rest of the function):
--   sched := case when jsonb_typeof(c.terms->'schedule') = 'array' and jsonb_array_length(c.terms->'schedule') > 0 then c.terms->'schedule' else null end;
--   update events set status='confirmed', start_date=coalesce(sd,start_date), end_date=coalesce(ed,end_date),
--     schedule=coalesce(sched,schedule), times_text=coalesce(nullif(c.terms->>'times_text',''),times_text) where id=c.event_id;

-- Cancel / delete (Oct 16, 2026): cancel reason + credit on events; only admins may delete signed contracts (and their stored PDF).
alter table events add column if not exists cancel_reason text;
alter table events add column if not exists cancelled_at timestamptz;
alter table events add column if not exists credit_held numeric(10,2) not null default 0;
create or replace function public.is_role_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees where lower(email) = lower(auth.jwt() ->> 'email') and status = 'active' and role = 'admin');
$$;
revoke execute on function public.is_role_admin() from public, anon;
grant execute on function public.is_role_admin() to authenticated, service_role;
-- contracts_lock(): the DELETE branch now reads
--   if old.status = 'signed' and not (select public.is_role_admin()) and current_user not in ('postgres','service_role') then raise exception ...
create policy "contract pdfs admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'contract-pdfs' and (select public.is_role_admin()));

-- Inventory + reservations (Oct 16, 2026): attractions are the inventory items; a sent/signed contract reserves its event's items for the event's dates.
alter table attractions add column if not exists quantity int not null default 1 check (quantity >= 1);
alter table attractions add column if not exists notes text;
create or replace function public.check_inventory_conflict() returns trigger language plpgsql set search_path = public as $$
declare ev events%rowtype; r record;
begin
  if new.status not in ('draft','sent','signed') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('sent','signed') and new.event_id = old.event_id then return new; end if;
  select * into ev from events where id = new.event_id;
  if not found or ev.start_date is null or ev.status = 'cancelled' then return new; end if;
  for r in
    select a.name, a.quantity, string_agg(distinct e2.name, ', ') as who
    from event_attractions ea
    join attractions a on a.id = ea.attraction_id
    join event_attractions ea2 on ea2.attraction_id = ea.attraction_id and ea2.event_id <> ea.event_id
    join events e2 on e2.id = ea2.event_id and e2.status <> 'cancelled' and e2.start_date is not null
      and e2.start_date <= coalesce(ev.end_date, ev.start_date) and coalesce(e2.end_date, e2.start_date) >= ev.start_date
    where ea.event_id = ev.id
      and exists (select 1 from contracts c2 where c2.event_id = e2.id and c2.status in ('sent','signed'))
    group by a.id, a.name, a.quantity
    having count(distinct e2.id) >= a.quantity
  loop
    raise exception '% is already reserved for these dates by: %', r.name, r.who;
  end loop;
  return new;
end $$;
create trigger contracts_inventory_trg before insert or update of status, event_id on contracts for each row execute function check_inventory_conflict();
