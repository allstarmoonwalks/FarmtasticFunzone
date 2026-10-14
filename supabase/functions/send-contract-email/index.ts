// Supabase Edge Function: send-contract-email
// Staff-only. Emails a contract's signing link to the customer (via Resend) and marks the contract as sent.
// Secrets:  RESEND_API_KEY (required)
//           FROM_EMAIL  (optional, default "Farmtastic FunZone <contracts@farmtasticfunzone.com>" — must be on a Resend-verified domain)
//           REPLY_TO    (optional, default farmtasticfunzone@gmail.com)
//           BCC_EMAIL   (optional, a copy for the owners)
//           SITE_URL    (optional, default https://www.farmtasticfunzone.com)
// Auth: the caller's own Supabase session token. Every database read/write below runs AS THAT USER, so the
// staff-only RLS rules apply, and we also check is_staff() explicitly (customers can read their own contracts).
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = "sb_publishable_nun1X7mbN_Rgv2_sXkG2lQ_WtF6AP2f"; // public publishable key (same as shared/supabase-config.js)
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const usd = (n: unknown) => "$" + (+(n as number) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function range(a?: string, b?: string) {
  const p = (d?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
  const x = p(a), y = p(b || a); if (!x || !y) return "";
  if (x.y === y.y && x.m === y.m) return x.d === y.d ? `${MONTHS[x.m]} ${x.d}, ${x.y}` : `${MONTHS[x.m]} ${x.d}-${y.d}, ${x.y}`;
  return `${MONTHS[x.m]} ${x.d}, ${x.y} - ${MONTHS[y.m]} ${y.d}, ${y.y}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);
  const h = { apikey: KEY, Authorization: auth, "Content-Type": "application/json" };
  const db = (path: string, init: RequestInit = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });

  const staff = await db("rpc/is_staff", { method: "POST", body: "{}" });
  if (!staff.ok || (await staff.json()) !== true) return json({ error: "Staff only." }, 403);

  let body: { contract_id?: string; to?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  if (!body.contract_id || !/^[0-9a-f-]{36}$/i.test(body.contract_id)) return json({ error: "contract_id required." }, 400);

  const cr = await db(`contracts?id=eq.${body.contract_id}&select=id,status,title,sign_token,terms,event_id,contact_id`);
  const c = (await cr.json())?.[0];
  if (!c) return json({ error: "Contract not found." }, 404);
  if (!["draft", "sent"].includes(c.status)) return json({ error: `A ${c.status} contract can't be emailed.` }, 409);

  let name = "", to = (body.to || "").trim();
  if (c.contact_id) {
    const ct = (await (await db(`contacts?id=eq.${c.contact_id}&select=name,email`)).json())?.[0];
    if (ct) { name = ct.name || ""; if (!to) to = ct.email || ""; }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "No email address for this customer. Add one to the contact first." }, 422);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ error: "Email isn't set up yet (RESEND_API_KEY missing).", code: "not_configured" }, 503);

  const site = (Deno.env.get("SITE_URL") || "https://www.farmtasticfunzone.com").replace(/\/$/, "");
  const link = `${site}/sign/?t=${c.sign_token}`;
  const t = c.terms || {};
  const first = esc((name || "").split(" ")[0] || "there");
  const dates = range(t.start_date, t.end_date);
  const subject = `Your Farmtastic FunZone agreement${dates ? " — " + dates : ""}`;
  const html = `<div style="font:16px/1.5 system-ui,Arial,sans-serif;color:#2b200a;max-width:560px">
<p>Hi ${first},</p>
<p>Thank you for choosing Farmtastic FunZone! Your agreement${t.contractee_name ? " for <b>" + esc(t.contractee_name) + "</b>" : ""} is ready to review and sign online.</p>
<p style="background:#fbf3e0;border:1px solid #d9c9a0;border-radius:8px;padding:10px 14px">${dates ? "<b>Dates:</b> " + esc(dates) + "<br>" : ""}<b>Total:</b> ${usd(t.total)}<br><b>Retainer due:</b> ${usd(t.retainer)}</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#a8321f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Review &amp; sign your agreement</a></p>
<p style="font-size:14px;color:#6b5a35">Or paste this link into your browser:<br>${esc(link)}</p>
<p>Questions? Call us at 936-223-1433 or just reply to this email.</p>
<p>Thank you,<br>April Speight &amp; Steve Allen<br>Farmtastic FunZone</p></div>`;
  const text = `Hi ${name.split(" ")[0] || "there"},\n\nYour Farmtastic FunZone agreement is ready to review and sign online:\n${link}\n\n${dates ? "Dates: " + dates + "\n" : ""}Total: ${usd(t.total)}\nRetainer due: ${usd(t.retainer)}\n\nQuestions? Call 936-223-1433 or reply to this email.\n\nThank you,\nApril Speight & Steve Allen\nFarmtastic FunZone`;

  const bcc = Deno.env.get("BCC_EMAIL");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL") || "Farmtastic FunZone <contracts@farmtasticfunzone.com>",
      to: [to], reply_to: Deno.env.get("REPLY_TO") || "farmtasticfunzone@gmail.com",
      ...(bcc ? { bcc: [bcc] } : {}), subject, html, text,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    console.error("resend error", r.status, err);
    return json({ error: "The email service rejected the message: " + err.slice(0, 300), code: "send_failed" }, 502);
  }

  // mark sent + log on the event (as the staff user, so RLS applies)
  await db(`contracts?id=eq.${c.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }) });
  await db("activities", { method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ event_id: c.event_id, kind: "email", body: `Contract emailed to ${to}`, created_by: "CRM" }) });
  return json({ ok: true, to });
});
