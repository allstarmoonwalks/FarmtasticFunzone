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
