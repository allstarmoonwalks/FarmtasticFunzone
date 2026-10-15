/* Shared by admin/ and app/: Supabase client, staff gate, escaping, formatting. */
const CFG = window.FARM_CONFIG || {};
const sb = (CFG.SUPABASE_URL && window.supabase) ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

// All user/lead-supplied text goes through esc() before touching innerHTML (leads come from the public form).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const telHref = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const smsHref = p => 'sms:' + String(p || '').replace(/[^\d+]/g, '');
const daysBetween = (a, b) => (a && b) ? Math.round((new Date(b) - new Date(a)) / 864e5) + 1 : 0;

// Returns {user, employee} or null. Staff = active employees row (same rule as the DB's is_staff()).
async function requireStaff() {
  if (!sb) return { error: 'config' };
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data: emp } = await sb.from('employees').select('*').ilike('email', session.user.email).eq('status', 'active').maybeSingle();
  if (!emp) return { error: 'not-staff', user: session.user };
  return { user: session.user, employee: emp };
}
async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
const signOut = () => sb.auth.signOut().then(() => location.reload());

// Password reset: emails a link back to the same page (admin/ or app/). The URL must be allowed in
// Supabase → Authentication → URL Configuration → Redirect URLs.
async function resetPassword(email) {
  if (!email) throw new Error('Enter your email first.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}
// "Choose a password" form shown on top of the page (after a reset/invite link was used).
function passwordOverlay() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:#fbf3e0;z-index:99;display:grid;place-items:center;padding:16px';
  box.innerHTML = '<form style="background:#fff;border:1px solid #d9c9a0;border-radius:12px;padding:20px;max-width:340px;width:100%;font:16px system-ui">' +
    '<h3 style="margin-top:0">Choose a password</h3><input id="np" type="password" minlength="8" required placeholder="New password (8+ characters)" style="width:100%;padding:10px;margin:6px 0;border:1px solid #d9c9a0;border-radius:8px">' +
    '<p id="npe" style="color:#a8321f"></p><button style="background:#a8321f;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600">Save password</button></form>';
  box.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: box.querySelector('#np').value });
    if (error) box.querySelector('#npe').textContent = error.message;
    else { history.replaceState(null, '', location.pathname); location.reload(); }
  };
  document.body.appendChild(box);
}
// When the user lands from Supabase's own reset email, supabase-js signs them in and fires PASSWORD_RECOVERY.
if (sb) sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') passwordOverlay(); });

// Invite / password links from our own emails look like  /admin/?token_hash=…&type=recovery.  The one-time token is only
// spent when the person presses the button here — email security scanners pre-open links, which used up plain one-time links.
(function () {
  const p = new URLSearchParams(location.search), th = p.get('token_hash');
  if (!sb || !th || p.get('type') !== 'recovery') return;
  history.replaceState(null, '', location.pathname);
  const show = () => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;background:#fbf3e0;z-index:99;display:grid;place-items:center;padding:16px';
    box.innerHTML = '<div style="background:#fff;border:1px solid #d9c9a0;border-radius:12px;padding:20px;max-width:340px;width:100%;font:16px system-ui;color:#2b200a">' +
      '<h3 style="margin-top:0">Farmtastic FunZone</h3><p>Press the button to set your password.</p><p id="tke" style="color:#a8321f"></p>' +
      '<button id="tkb" style="background:#a8321f;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600">Set my password</button></div>';
    box.querySelector('#tkb').onclick = async () => {
      const { error } = await sb.auth.verifyOtp({ token_hash: th, type: 'recovery' });
      if (error) { box.querySelector('#tke').textContent = 'This link has expired or was already used. Ask an admin to send a new one, or use "Forgot / set password" on the sign-in page.'; return; }
      box.remove(); passwordOverlay();
    };
    document.body.appendChild(box);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', show) : show();
})();

// Supabase puts auth failures in the URL hash (e.g. #error_code=otp_expired&error_description=...).
// Surface them as a readable message instead of leaving the user on a confusing page.
const urlAuthError = (() => {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (!p.get('error')) return '';
  history.replaceState(null, '', location.pathname);
  return p.get('error_code') === 'otp_expired'
    ? 'That email link has expired or was already used. Enter your email and press "Forgot / set password" for a fresh one, then click the new link only once.'
    : (p.get('error_description') || 'Sign-in link problem. Please request a new one.').replace(/\+/g, ' ');
})();

// Change password for the signed-in user: confirms the current password, then sets the new one.
function openChangePassword() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:#0007;z-index:99;display:grid;place-items:center;padding:16px';
  const inp = 'width:100%;padding:10px;margin:6px 0;border:1px solid #d9c9a0;border-radius:8px;font:16px system-ui;box-sizing:border-box';
  box.innerHTML = '<form style="background:#fff;border-radius:12px;padding:20px;max-width:340px;width:100%;font:16px system-ui;color:#2b200a">' +
    '<h3 style="margin-top:0">Change password</h3>' +
    '<input id="cp0" type="password" required autocomplete="current-password" placeholder="Current password" style="' + inp + '">' +
    '<input id="cp1" type="password" minlength="8" required autocomplete="new-password" placeholder="New password (8+ characters)" style="' + inp + '">' +
    '<input id="cp2" type="password" minlength="8" required autocomplete="new-password" placeholder="Repeat new password" style="' + inp + '">' +
    '<p id="cpe" style="color:#a8321f;margin:6px 0"></p>' +
    '<button style="background:#a8321f;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600">Save password</button> ' +
    '<button type="button" id="cpx" style="background:#fff;border:1px solid #d9c9a0;border-radius:8px;padding:10px 16px">Cancel</button></form>';
  const $ = id => box.querySelector('#' + id), msg = (t, ok) => { $('cpe').style.color = ok ? '#3f6b2f' : '#a8321f'; $('cpe').textContent = t; };
  $('cpx').onclick = () => box.remove();
  box.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    if ($('cp1').value !== $('cp2').value) return msg('The new passwords don\'t match.');
    if ($('cp1').value === $('cp0').value) return msg('Pick a password different from the current one.');
    const { data: { session } } = await sb.auth.getSession();
    const { error: e1 } = await sb.auth.signInWithPassword({ email: session.user.email, password: $('cp0').value });
    if (e1) return msg('Current password is incorrect.');
    const { error: e2 } = await sb.auth.updateUser({ password: $('cp1').value });
    if (e2) return msg(e2.message);
    msg('Password changed.', true);
    setTimeout(() => box.remove(), 1200);
  };
  document.body.appendChild(box);
}
