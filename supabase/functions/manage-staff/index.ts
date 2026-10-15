// Supabase Edge Function: manage-staff
// Admin-only. Creates staff logins and sends/sets passwords (the browser can't: it needs the service-role key).
// Actions (POST JSON {action, ...}):
//   create        {name, email, role, phone?, send_invite?, password?}  -> employees row + auth login
//   invite        {employee_id}                                          -> emails a "set your password" link
//   set_password  {employee_id, password?}                               -> sets a temporary password (random if omitted); returned once
// The caller must be signed in as an ACTIVE employee with role 'admin' (checked with their own token).
// Secrets: RESEND_API_KEY (+ optional FROM_EMAIL, REPLY_TO, SITE_URL — same as send-contract-email).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to every function by Supabase.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = "sb_publishable_nun1X7mbN_Rgv2_sXkG2lQ_WtF6AP2f"; // public publishable key
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "manager", "crew"];
const site = () => (Deno.env.get("SITE_URL") || "https://www.farmtasticfunzone.com").replace(/\/$/, "");
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

function randomPassword(n = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => chars[x % chars.length]).join("");
}
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...svc, ...(init.headers || {}) } });

// Returns the auth user's id, creating the login (confirmed, random password) if it doesn't exist.
async function ensureUser(email: string, password?: string): Promise<{ id: string; created: boolean }> {
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: svc,
    body: JSON.stringify({ email, password: password || randomPassword(20), email_confirm: true }),
  });
  if (r.ok) return { id: (await r.json()).id, created: true };
  const link = await generateLink(email); // user already exists: the link response carries its id
  if (link.id) return { id: link.id, created: false };
  throw new Error("Could not create the login: " + (await r.text()).slice(0, 200));
}
async function generateLink(email: string): Promise<{ id?: string; action_link?: string; token_hash?: string }> {
  const r = await fetch(`${URL_}/auth/v1/admin/generate_link`, {
    method: "POST", headers: svc,
    body: JSON.stringify({ type: "recovery", email, redirect_to: `${site()}/admin/` }),
  });
  if (!r.ok) return {};
  const j = await r.json();
  return { id: j.id || j.user?.id, action_link: j.action_link || j.properties?.action_link, token_hash: j.hashed_token || j.properties?.hashed_token };
}
// The email links to OUR page with the one-time token, and the token is only used when the person presses the button there.
// (A plain Supabase action link gets "used up" by email security scanners that pre-open every link.)
const inviteLink = (tokenHash: string, role: string) => `${site()}/${role === "crew" ? "app" : "admin"}/?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
async function sendInvite(name: string, email: string, link: string, isReset: boolean) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return "Email isn't set up (RESEND_API_KEY missing).";
  const first = esc((name || "").split(" ")[0] || "there");
  const html = `<div style="font:16px/1.5 system-ui,Arial,sans-serif;color:#2b200a;max-width:560px">
<p>Hi ${first},</p>
<p>${isReset ? "Here is your link to set a new password for" : "You've been added to"} the Farmtastic FunZone CRM. Use the button to choose your password, then sign in.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#a8321f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Set my password</a></p>
<p style="font-size:14px;color:#6b5a35">CRM (computer): ${site()}/admin/<br>Crew app (phone): ${site()}/app/ — open it in your phone's browser and use Share → Add to Home Screen.<br>This link works once and expires after a while; if it stops working, press "Forgot / set password" on the sign-in page.</p>
<p>Thanks,<br>Farmtastic FunZone</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL") || "Farmtastic FunZone <contracts@farmtasticfunzone.com>",
      to: [email], reply_to: Deno.env.get("REPLY_TO") || "farmtasticfunzone@gmail.com",
      subject: isReset ? "Set a new password — Farmtastic FunZone CRM" : "You've been added to the Farmtastic FunZone CRM", html,
    }),
  });
  return r.ok ? "" : "The email service rejected the message: " + (await r.text()).slice(0, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);
  if (!SERVICE) return json({ error: "Server key unavailable." }, 500);

  // who is calling? must be an active admin employee
  const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: auth } });
  const callerEmail = ur.ok ? (await ur.json()).email : "";
  if (!callerEmail) return json({ error: "Sign in first." }, 401);
  const me = (await (await rest(`employees?email=ilike.${encodeURIComponent(callerEmail)}&status=eq.active&select=id,role`)).json())?.[0];
  if (!me || me.role !== "admin") return json({ error: "Admins only." }, 403);

  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json({ error: "Bad request." }, 400); }

  try {
    if (b.action === "create") {
      const name = String(b.name || "").trim(), email = String(b.email || "").trim().toLowerCase();
      if (name.length < 2) return json({ error: "Name is required." }, 400);
      if (!EMAIL.test(email)) return json({ error: "A valid email is required." }, 400);
      if (!ROLES.includes(b.role)) return json({ error: "Role must be admin, manager or crew." }, 400);
      if (b.password && String(b.password).length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
      const dup = await (await rest(`employees?email=ilike.${encodeURIComponent(email)}&select=id`)).json();
      if (dup.length) return json({ error: "That email is already on the team." }, 409);
      const u = await ensureUser(email, b.password ? String(b.password) : undefined);
      const er = await rest("employees", { method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name, email, role: b.role, phone: b.phone || null, status: "active" }) });
      if (!er.ok) return json({ error: "Could not save the team member: " + (await er.text()).slice(0, 200) }, 500);
      const emp = (await er.json())[0];
      let emailed = false, email_error = "";
      if (b.send_invite) {
        const link = await generateLink(email);
        email_error = link.token_hash ? await sendInvite(name, email, inviteLink(link.token_hash, b.role), false) : "Could not create a sign-in link.";
        emailed = !email_error;
      }
      return json({ ok: true, employee: emp, emailed, email_error, existing_login: !u.created });
    }

    const emp = b.employee_id && /^[0-9a-f-]{36}$/i.test(b.employee_id)
      ? (await (await rest(`employees?id=eq.${b.employee_id}&select=id,name,email,role`)).json())?.[0] : null;
    if (!emp) return json({ error: "Team member not found." }, 404);

    if (b.action === "invite") {
      await ensureUser(emp.email);
      const link = await generateLink(emp.email);
      if (!link.token_hash) return json({ error: "Could not create a sign-in link." }, 502);
      const err = await sendInvite(emp.name, emp.email, inviteLink(link.token_hash, emp.role), true);
      if (err) return json({ error: err }, 502);
      return json({ ok: true, to: emp.email });
    }
    if (b.action === "set_password") {
      const pw = b.password ? String(b.password) : randomPassword(12);
      if (pw.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
      const u = await ensureUser(emp.email);
      const r = await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: "PUT", headers: svc, body: JSON.stringify({ password: pw, email_confirm: true }) });
      if (!r.ok) return json({ error: "Could not set the password: " + (await r.text()).slice(0, 200) }, 502);
      return json({ ok: true, password: pw });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
