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
// When the user lands from the reset email, supabase-js signs them in and fires PASSWORD_RECOVERY:
// show a "choose a password" form on top of the page.
if (sb) sb.auth.onAuthStateChange((event) => {
  if (event !== 'PASSWORD_RECOVERY') return;
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
});

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
