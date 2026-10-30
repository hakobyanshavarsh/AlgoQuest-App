// AlgoQuest: accounts (Supabase Auth) and cloud-saved progress. Loaded after app.js.
const SITE_URL = location.origin + location.pathname.replace(/index\.html$/, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const configured = typeof supabase !== 'undefined' && typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL.startsWith('https://') && typeof SUPABASE_KEY === 'string' && SUPABASE_KEY.length > 20;

let sb = null, user = null, profile = null, loadError = '';
let store = { xp: 0, done: {}, games: {}, streak: 0 };
let ready = false, recovery = false, authMode = 'login';

/** Load the signed-in user's profile, completed lessons and game stars (RLS returns only their own rows). */
async function loadData() {
  const [p, l, g] = await Promise.all([
    sb.from('profiles').select('display_name,role,xp,streak').eq('id', user.id).single(),
    sb.from('lesson_progress').select('lesson_id,completed_at').eq('user_id', user.id),
    sb.from('game_results').select('game_id,stars').eq('user_id', user.id)]);
  if (p.error) throw p.error;
  profile = p.data;
  store = { xp: p.data.xp, streak: p.data.streak, done: {}, games: {} };
  (l.data || []).forEach(r => store.done[r.lesson_id] = new Date(r.completed_at).getTime());
  (g.data || []).forEach(r => store.games[r.game_id] = r.stars);
}

/** Called after login or page reload: update the streak on the server, then load progress. */
async function startSession(session) {
  user = session.user;
  try { await sb.rpc('touch_activity'); await loadData(); loadError = ''; }
  catch (e) { console.error(e); loadError = 'Could not load your progress. Refresh the page and try again.'; }
  ready = true; render();
}

// ---- Views ----
function nav() {
  const r = location.hash.slice(1) || 'home';
  const items = user ? [['home','Home'],['dashboard','Dashboard'],['play','Play'],...LESSONS.map(l => [l.id, l.title])] : [['home','Home']];
  $('#nav').innerHTML = items.map(([k, v]) => `<button class="${k === r ? 'active' : ''}" onclick="go('${k}')">${v}</button>`).join('') +
    (user ? `<button onclick="logout()">Log out</button>` : `<button class="primary" onclick="go('auth')">Log in / Sign up</button>`);
}
async function logout() { await sb.auth.signOut(); go('home'); }

function render() {
  stop(); nav();
  const r = location.hash.slice(1) || 'home';
  if (!configured) setupView();
  else if (recovery) recoveryView();
  else if (!ready) $('#app').innerHTML = '<div class="card">Loading…</div>';
  else if (r === 'home') home();
  else if (!user) authView();
  else if (loadError) $('#app').innerHTML = `<div class="card"><p class="err">${loadError}</p></div>`;
  else if (r === 'auth') go('dashboard');
  else if (r === 'dashboard') dash();
  else if (r === 'play') play();
  else lesson(r);
  scrollTo(0, 0);
}

function setupView() {
  $('#app').innerHTML = `<div class="card"><h1>Setup needed</h1><p>Open <b>config.js</b> and paste your Supabase Project URL and publishable key. Make sure the Supabase script in index.html loads.</p></div>`;
}

const field = (id, label, type, ac) => `<label class="f">${label}<input id="${id}" type="${type}" autocomplete="${ac}" required></label>`;

function authView() {
  const T = { login: 'Log in', signup: 'Sign up', forgot: 'Reset password' }, mode = authMode;
  let fields = field('em', 'Email', 'email', 'email');
  if (mode === 'signup') fields = field('nm', 'Display name', 'text', 'nickname') + fields +
    field('pw', 'Password (8+ characters)', 'password', 'new-password') + field('pw2', 'Confirm password', 'password', 'new-password') +
    `<label class="f">I am a<select id="role"><option value="student">Student</option><option value="teacher">Teacher</option></select></label>`;
  if (mode === 'login') fields += field('pw', 'Password', 'password', 'current-password');
  $('#app').innerHTML = `<div class="card auth"><h1>${T[mode]}</h1>
    <div class="row">${Object.keys(T).map(k => `<button type="button" class="${k === mode ? 'active' : ''}" data-m="${k}">${T[k]}</button>`).join('')}</div>
    <form id="af" novalidate>${fields}<div class="row"><button class="primary" id="sub">${T[mode]}</button></div></form>
    <div class="msg" id="amsg" role="alert"></div></div>`;
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { authMode = b.dataset.m; authView(); });
  const say = (t, ok) => { const m = $('#amsg'); m.className = 'msg' + (ok ? '' : ' err'); m.textContent = t; };
  $('#af').onsubmit = async e => {
    e.preventDefault();
    const email = $('#em').value.trim(), pw = $('#pw') ? $('#pw').value : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) return say('Enter a valid email address.');
    const btn = $('#sub'); btn.disabled = true;
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) say(/confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox.' : 'Invalid email or password.');
      } else if (mode === 'signup') {
        const name = $('#nm').value.trim();
        if (name.length < 2 || name.length > 30) return say('Display name must be 2 to 30 characters.');
        if (pw.length < 8) return say('Password must be at least 8 characters.');
        if (pw !== $('#pw2').value) return say('Passwords do not match.');
        const { error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: SITE_URL, data: { display_name: name, role: $('#role').value } } });
        if (error && /password/i.test(error.message)) return say(error.message);
        // Same message whether or not the email already exists (never reveal accounts).
        say(error ? 'Could not sign up right now. Please try again later.' : 'Almost done! If this address can be registered, we sent a confirmation link. Open it, then log in.', !error);
      } else {
        await sb.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
        say('If an account exists for this email, a reset link is on its way.', true);
      }
    } catch (err) { say('Network problem. Please try again.'); }
    finally { btn.disabled = false; }
  };
}

function recoveryView() {
  $('#app').innerHTML = `<div class="card auth"><h1>Set a new password</h1><form id="rf" novalidate>
    ${field('pw', 'New password (8+ characters)', 'password', 'new-password')}${field('pw2', 'Confirm password', 'password', 'new-password')}
    <div class="row"><button class="primary" id="sub">Save password</button></div></form><div class="msg" id="amsg" role="alert"></div></div>`;
  const say = t => { const m = $('#amsg'); m.className = 'msg err'; m.textContent = t; };
  $('#rf').onsubmit = async e => {
    e.preventDefault();
    const p = $('#pw').value;
    if (p.length < 8) return say('Password must be at least 8 characters.');
    if (p !== $('#pw2').value) return say('Passwords do not match.');
    const { error } = await sb.auth.updateUser({ password: p });
    if (error) return say(error.message);
    recovery = false;
    const { data } = await sb.auth.getSession();
    if (data.session) await startSession(data.session);
    go('dashboard');
  };
}

// ---- Rewards: XP amounts and one-time rules are enforced in the database functions ----
function bindFinish(id, ready) {
  const b = $('#fin'); if (!b || b.disabled) return;
  b.onclick = async () => {
    const m = $('#fmsg');
    if (!ready()) { m.className = 'msg err'; m.textContent = 'Finish the activity first.'; return; }
    if (store.done[id]) return;
    b.disabled = true;
    const { data, error } = await sb.rpc('complete_lesson', { p_lesson: id });
    if (error) { b.disabled = false; m.className = 'msg err'; m.textContent = 'Could not save. Check your connection and try again.'; return; }
    store.done[id] = Date.now(); store.xp = data.xp; b.textContent = 'Completed ✓'; m.className = 'msg';
    m.textContent = data.awarded ? `+${data.awarded} XP earned!` : 'Already completed. No extra XP.';
  };
}

/** Show the XP for new stars immediately; the server recomputes and confirms. */
function award(id, stars) {
  const old = store.games[id] || 0;
  if (stars <= old) return 0;
  const xp = (stars - old) * 5;
  store.games[id] = stars; store.xp += xp;
  sb.rpc('record_game', { p_game: id, p_stars: stars }).then(({ data, error }) => {
    if (error) { store.games[id] = old; store.xp -= xp; console.error(error); } else store.xp = data.xp;
  });
  return xp;
}

// ---- Start ----
async function init() {
  window.onhashchange = render;
  if (!configured) { ready = true; return render(); }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { recovery = true; render(); return; }
    if (ev === 'SIGNED_OUT') { user = null; profile = null; store = { xp: 0, done: {}, games: {}, streak: 0 }; render(); return; }
    if (ev === 'INITIAL_SESSION' && !session) { ready = true; render(); return; }
    if ((ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') && session && !(user && user.id === session.user.id))
      setTimeout(() => startSession(session), 0); // avoid calling Supabase inside its own auth callback
  });
  render();
}
init();
