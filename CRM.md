# Farmtastic Fun Zone — CRM, Website & Crew App

Built on the AllStar Moonwalks framework (`allstarmoonwalks/VPS`): static HTML/JS, Supabase
(Postgres + Auth + RLS), staff = an active `employees` row, Twilio for SMS, Stripe for payments.
Hosting stays on Netlify (no VPS / Node server needed — SMS goes through a Supabase edge function).

| Piece | Where | Notes |
|---|---|---|
| Website | `*.html` | `contact.html` now also writes the request into the CRM as a lead (Netlify Forms email stays as backup). |
| CRM | `/admin/` | Dashboard (clickable tiles), leads, customers (record with contacts, events, contracts, quotes, invoices, payments), events (list + month calendar), quotes, contracts, invoices, tasks. |
| Customer portal | `/portal/` | Customers sign in with an emailed link (or a password they set). Read-only view of their own events, quotes (accept/decline), agreements (sign), invoices and payment history. |
| Signing page | `/sign/?t=<token>` | No login: the emailed link. Shows the agreement and records a typed-name signature. |
| Crew app | `/app/` | Installable PWA (Add to Home Screen): upcoming events + load-in notes + directions, call/text leads, tasks. |
| Database | `supabase/migrations/20261003_farmtastic_crm.sql` | All tables staff-only via RLS. The public site can only call `submit_lead()`. |
| Lead SMS | `supabase/functions/notify-lead` | Texts the owner on each new lead (DB webhook). |
| Pricing | `shared/pricing.js` | Same grid as `pricing.html`; `node shared/pricing.test.js`. |

## Sales flow
Customer record → quote sent → quote accepted → contract created from the customer + quote + event → contract
sent (copy link / email link) → customer signs (emailed link or portal) → signed copy stored on the customer
record, event set to **confirmed** with the contracted dates (shown on Events → Calendar), quote marked accepted,
lead marked won. A signed contract can't be edited or deleted (database trigger) — void it and make a new one.
- Contract wording lives in `shared/contract.js` (from the 2027 Loredo agreement). The rendered text is stored on the
  contract row when it is saved, so later wording changes never alter a sent/signed contract. `node shared/contract.test.js`.
- Prices come from the database price list (`price_tiers` + `settings.pricing`; falls back to `shared/pricing.js`). On an event, the quote builder prices booths/days/craft live, with travel and a $ or % discount; every number on the quote stays editable (Quotes tab, with a discount-% helper). A contract made before any quote exists is priced from the price list too.
- Retainer = 1/3 of the total, final = the rest (editable on the contract form).
- Migration `supabase/migrations/20261014_contracts_portal.sql`: `contracts`, `payments`, customer read-only RLS via
  `my_contact_ids()` (login email must be **verified** and match a contact's email), `get_contract` / `sign_contract`
  (token, anon-callable), `respond_to_quote` (customer, own quotes only).
- **Automatic contract email:** `supabase/functions/send-contract-email` (deployed, staff-only; runs as the signed-in staff
  user, so RLS applies). "✉ Email to customer" / "Save & email to customer" sends the signing link via **Resend**, marks the
  contract sent and logs it on the event. "Copy signing link" and "Open in my mail app" remain as fallbacks.
  One-time setup: create a Resend account, add + verify the domain `farmtasticfunzone.com` (DNS records at GoDaddy), then set
  the function secret `RESEND_API_KEY` (Supabase → Edge Functions → Secrets). Optional secrets: `FROM_EMAIL`
  (default `Farmtastic FunZone <contracts@farmtasticfunzone.com>`), `REPLY_TO` (default farmtasticfunzone@gmail.com),
  `BCC_EMAIL`, `SITE_URL`. Until the key is set the button explains that email isn't configured.
- Add `https://www.farmtasticfunzone.com/portal/` (or `/**`) to Supabase Auth → Redirect URLs for portal sign-in links.

## Import a contract PDF (Contracts tab)
**⬆ Import contract PDF** reads an agreement PDF in the browser (pdf.js, text PDFs only — not scans/photos) with the parser in
`shared/contract-import.js` (`node shared/contract-import.test.js`), shows a review screen, then creates: the **customer** (matched to an
existing one by name, else new, with address/phone), an optional **contact**, the **event** (booths, craft station, matched attractions,
other booth names in the notes), a **quote** with the contract's pricing (per-day, craft, discount, total), and the **digital contract**
(same template as new contracts) with the original PDF stored privately (`contract-pdfs` bucket, staff-only) and a "📄 Original PDF" button.
If the PDF is a signed copy (signer name/date on the Contractee lines, or a "Signed electronically by …" line) — or you tick "signed" — the
contract is stored as **signed**, the quote **accepted**, and the event **confirmed with its dates on the calendar**. Unsigned imports create a
*tentative* event with no dates and a *sent* contract. Migration: `supabase/migrations/20261016_contract_pdf_import.sql`.

### Event times and multi-year contracts
- **Times of engagement** are read too: "Wednesday and Thursday 4pm-10pm, Friday and Saturday 4pm-12am" becomes a per-day schedule on the contracted dates
  (`shared/schedule.js`, `node shared/schedule.test.js`; stored in `events.schedule` + `events.times_text`). The review screen shows it as editable lines
  (`2026-10-21 4pm-10pm`) with a "rebuild from the times above" link; events have the same editor. Times show on the Events list, the calendar chip
  tooltips, the crew app event cards and the customer portal. Unsigned imports keep the schedule in the contract and it is applied to the event when the contract is signed.
- **Multi-year contracts** ("2026-2028 AGREEMENT", "3-YEAR CONTRACT", dates to be determined later): the first year's event is scheduled from the dates;
  with "also create tentative events" ticked, later years get tentative placeholder events (no dates) with the same per-year quote. They show as pipeline
  in Financials until their dates are set and they are confirmed. The digital contract keeps the multi-year wording (title years, per-year price labels,
  package subtotal, "Requirements per year", dates-to-be-determined note).

## Inventory and reservations
**Inventory** tab: every selectable item (booths, tracks, stations…) is an inventory item — add, edit, set the **quantity you own**, deactivate (hidden from new events), or delete
(admins, only if it's on no event). Items are chosen on each event. A contract that is **sent or signed reserves its event's items for the event's dates**; a draft doesn't.
A **new contract can't be created** (form, import, email/mark-sent) for dates when an item is already fully reserved by other contracts — the form, the PDF import and the event editor
all say which item and which event holds it, and the database refuses it too (`contracts_inventory_trg`). Items with quantity 2+ allow that many overlapping bookings. The event editor
greys out items that are fully reserved for its dates; cancelling an event releases its items. Items on an event only count once it has dates and a sent/signed contract. Booth *counts*
("10 booths") aren't tied to specific items — only the items you pick are reserved.

## Cancel and delete (events and contracts)
- **Cancel event…** (event dialog, any staff): sets the event to *cancelled* (off the calendar, out of revenue and receivables), with a reason, and asks what happens to money
  already received: **keep it** (e.g. non-refundable retainer), **refund** (records a negative payment — the CRM records it, it doesn't send money), or **hold as credit**
  toward a future event (`events.credit_held`, shown on the customer record). Optionally voids open contracts and unpaid invoices. Reinstate by setting Status back and saving.
- **Delete event…** (admins): permanently removes the event with its quotes, contracts and invoices (and stored PDFs). **Blocked when payments are recorded** — cancel instead, so payment history is kept.
- **Delete contract** (admins any status, others drafts only): a *signed* contract needs the admin to type DELETE (database trigger allows signed deletes only for admins); the stored PDF is removed too. Void keeps the record.
- Imported contracts now put the contracted dates and times on the event even when unsigned (shown as a *tentative* event); signing confirms it.

## Financials (admins only)
Revenue by month and year, modeled on the AllStar reports (Revenue by Month, Annual Revenue, Monthly Payments, Receivables): **Overview**
(year KPIs, revenue-vs-cash chart, month table + CSV), **Payments received**, **Receivables**, **By year** (with growth). Revenue = signed contract
total (else accepted quote, else latest quote) of confirmed/completed events, spread over the days each event runs; cash = payments by date;
tentative events are shown as pipeline only. The Dashboard also shows the current year's revenue.

## Team (admins only)
Admin → **Team** tab: view everyone with a CRM/crew-app login, add people, edit name/phone/role/status, email a
"set your password" link, or set a temporary password. Creating logins needs the service-role key, so it runs in the
`manage-staff` edge function (admin-only; checks the caller is an active `admin` employee). Invite emails use the same
Resend setup as contracts. Roles: `admin` (everything + Team), `manager`, `crew`. You can't change your own role/status.

## Go-live steps
1. ~~Create a Supabase project~~ — done: **Farmtastic Fun Zone** (`ciydqepqhqfqhptpqily`, us-east-1, org LMX Rentals LLC). Separate from the AllStar Moonwalks project. Migration already applied and `shared/supabase-config.js` filled in.
2. Add staff (SQL editor):
   `insert into employees(name,email,role) values ('April','…','admin'), ('Steve','…','admin');`
   and create their logins in Supabase Auth (Authentication → Users).
3. Put the project URL + anon key in `shared/supabase-config.js`; commit and push (Netlify redeploys).
4. Optional SMS alerts: deploy `notify-lead`, set secrets `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_FROM_NUMBER`, `OWNER_PHONE`, `WEBHOOK_SECRET`; add a Database Webhook on `leads` INSERT
   with header `x-webhook-secret`.
5. Stripe (not built yet): invoices are tracked and marked paid manually. Online payment would reuse the
   AllStar `create-checkout` edge function + a server-side confirm step (see VPS `CLAUDE.md` security model).

## Open questions for the owner
- ~~Craft Station add-on at 10+ days~~ — confirmed flat $400 per event.
- Native iOS app: the PWA covers the crew use case; AllStar's Capacitor/SwiftUI wrappers can be added later.

## Supabase keep-alive
The free-tier project pauses after ~7 days without activity. `.github/workflows/supabase-keepalive.yml`
calls `public.keepalive()` every 3 days (and can be run by hand from the Actions tab). GitHub turns off
scheduled workflows after 60 days of no repo activity; any push to the repo re-enables them. If the
project ever shows as paused, restore it in the Supabase dashboard (Restore project).
