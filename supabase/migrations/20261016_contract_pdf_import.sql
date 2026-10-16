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
