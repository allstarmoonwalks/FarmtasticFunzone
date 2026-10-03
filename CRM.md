# Farmtastic Fun Zone — CRM, Website & Crew App

Built on the AllStar Moonwalks framework (`allstarmoonwalks/VPS`): static HTML/JS, Supabase
(Postgres + Auth + RLS), staff = an active `employees` row, Twilio for SMS, Stripe for payments.
Hosting stays on Netlify (no VPS / Node server needed — SMS goes through a Supabase edge function).

| Piece | Where | Notes |
|---|---|---|
| Website | `*.html` | `contact.html` now also writes the request into the CRM as a lead (Netlify Forms email stays as backup). |
| CRM | `/admin/` | Dashboard, leads pipeline, events (with attractions, quote builder, invoices, notes), fairs/orgs, tasks. |
| Crew app | `/app/` | Installable PWA (Add to Home Screen): upcoming events + load-in notes + directions, call/text leads, tasks. |
| Database | `supabase/migrations/20261003_farmtastic_crm.sql` | All tables staff-only via RLS. The public site can only call `submit_lead()`. |
| Lead SMS | `supabase/functions/notify-lead` | Texts the owner on each new lead (DB webhook). |
| Pricing | `shared/pricing.js` | Same grid as `pricing.html`; `node shared/pricing.test.js`. |

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
