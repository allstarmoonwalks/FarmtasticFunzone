// Supabase Edge Function: notify-lead
// Wire as a Database Webhook on INSERT into public.leads. Texts the owner via Twilio.
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, OWNER_PHONE, WEBHOOK_SECRET
// The webhook must send header  x-webhook-secret: <WEBHOOK_SECRET>  (so the public can't trigger texts).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return new Response("forbidden", { status: 403 });
  const { record } = await req.json();
  if (!record) return new Response("no record", { status: 400 });
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), tok = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER"), to = Deno.env.get("OWNER_PHONE");
  if (!sid || !tok || !from || !to) return new Response("twilio not configured", { status: 500 });
  const body = `New Farmtastic lead: ${record.name}${record.organization ? " (" + record.organization + ")" : ""}` +
    `${record.event_dates ? " · " + record.event_dates : ""}${record.phone ? " · " + record.phone : ""}`.slice(0, 300);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to.startsWith("+") ? to : "+1" + to.replace(/\D/g, ""), From: from, Body: body }),
  });
  return new Response(r.ok ? "sent" : "twilio error", { status: r.ok ? 200 : 502 });
});
