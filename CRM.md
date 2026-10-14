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
