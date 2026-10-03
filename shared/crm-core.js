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
