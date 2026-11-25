import { firebaseConfig } from './firebase-config.js';

/* ================= básicos ================= */
const SDK = '12.19.0', FB = `https://www.gstatic.com/firebasejs/${SDK}`;
const CAL = 'https://www.googleapis.com/auth/calendar.events';
const GAPI = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TZ = 'America/Bahia', MARK = { private: { meuCirculo: '1' } };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [a, b, c] = String(s).split('-').map(Number); return new Date(a, b - 1, c); };
const today = new Date(); today.setHours(0, 0, 0, 0); const T = ymd(today);
const diff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const clone = o => JSON.parse(JSON.stringify(o));
const iso = () => new Date().toISOString();
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], DL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const fmtD = s => { const d = pd(s); return `${DS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
const fmtL = s => { const d = pd(s); return `${DL[d.getDay()]}, ${d.getDate()} de ${MES[d.getMonth()]}`; };
const fmtBR = s => s ? s.split('-').reverse().join('/') : '—';
const GR = { amigos: 'Amigos', familia: 'Família', namorada: 'Namorada', outros: 'Outros' };
const FREQ = [[7, 'toda semana'], [14, 'a cada 2 semanas'], [30, 'todo mês'], [60, 'a cada 2 meses'], [90, 'a cada 3 meses'], [180, 'a cada 6 meses']];
const ST = { planejado: 'Planejado', convidado: 'Convite enviado', confirmado: 'Confirmado', feito: 'Aconteceu', cancelado: 'Não rolou' };
const OPEN = ['planejado', 'convidado', 'confirmado'];
const RING = ['em dia', 'chegando a hora', 'atrasado', 'saudade'];
const DEF = { ano: 2027, metaMes: 2, diasSociais: [5, 6, 0], gsync: true };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const gk = g => GR[g] ? g : 'outros';
const freqTxt = f => (FREQ.find(x => x[0] === Number(f)) || [0, `a cada ${f} dias`])[1];
const safeLink = u => typeof u === 'string' && u.startsWith('https://') ? u : '';

let S = blank();
function blank() { return { pessoas: [], planos: [], dias: {}, gcal: {}, gjan: {}, gdel: [], config: clone(DEF) }; }
const P = id => S.pessoas.find(p => p.id === id);
const first = n => String(n || '').trim().split(/\s+/)[0] || '?';
const ini = n => { const w = String(n || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); };
const names = (e, short) => (e.pessoas || []).map(P).filter(Boolean).map(p => short ? first(p.nome) : p.nome).join(', ') || 'alguém';
const conta = e => (e.pessoas || []).some(id => { const p = P(id); return p && gk(p.grupo) !== 'namorada'; });
function last(p) { let l = p.ultimo || ''; for (const e of S.planos) if (e.status === 'feito' && e.data <= T && (e.pessoas || []).includes(p.id) && e.data > l) l = e.data; return l; }
function nextOf(p) { return S.planos.filter(e => (e.pessoas || []).includes(p.id) && e.data >= T && OPEN.includes(e.status)).sort((a, b) => a.data < b.data ? -1 : 1)[0]; }
function sit(p) { const l = last(p); if (!l) return { ring: 3, r: 99, dias: null, l }; const dd = Math.max(0, diff(l, T)), r = dd / (Number(p.freq) || 30); return { ring: r < .75 ? 0 : r < 1 ? 1 : r < 2 ? 2 : 3, r, dias: dd, l }; }
function niver(p) { if (!/^\d{1,2}\/\d{1,2}$/.test(p.aniver || '')) return null; const [d, m] = p.aniver.split('/').map(Number); let x = new Date(today.getFullYear(), m - 1, d); if (x < today) x = new Date(today.getFullYear() + 1, m - 1, d); return diff(T, ymd(x)); }
const sitTxt = (st, p) => !st.l ? 'sem registro do último encontro' : (st.dias === 0 ? 'visto hoje' : `visto há ${st.dias} dia${st.dias > 1 ? 's' : ''}`) + ` · quer ver ${freqTxt(p.freq)}`;

/* ================= backends ================= */
const configured = !!(firebaseConfig && firebaseConfig.apiKey && !/^COLE/.test(firebaseConfig.apiKey));
const TK = 'meu-circulo-gtok';
const tokGet = () => { try { const v = JSON.parse(sessionStorage.getItem(TK) || 'null'); return v && v.exp > Date.now() ? v.t : null; } catch (e) { return null; } };
const tokSet = t => { try { sessionStorage.setItem(TK, JSON.stringify({ t, exp: Date.now() + 50 * 60e3 })); } catch (e) { } };
const tokDrop = () => { try { sessionStorage.removeItem(TK); } catch (e) { } };

function localBackend() {
  const LK = 'meu-circulo-2027-local';
  let st; try { st = JSON.parse(localStorage.getItem(LK) || 'null'); } catch (e) { st = null; }
  st = st || { meta: null, pessoas: {}, encontros: {} };
  let cb = null;
  const emit = () => cb && cb({ meta: st.meta, pessoas: Object.values(st.pessoas), encontros: Object.values(st.encontros), pending: false, offline: false, freshMeta: true, freshPessoas: true });
  return {
    local: true, email: '',
    onAuth(f) { setTimeout(() => f({ uid: 'local', email: '', displayName: 'neste navegador' }), 0); },
    async signIn() { }, async signOut() { },
    listen(u, f) { cb = f; setTimeout(emit, 0); return () => { cb = null; }; },
    async write(ops) {
      for (const o of ops) { if (o.t === 'put') st[o.kind][o.obj.id] = clone(o.obj); else if (o.t === 'del') delete st[o.kind][o.id]; else if (o.t === 'meta') st.meta = clone(o.meta); }
      try { localStorage.setItem(LK, JSON.stringify(st)); } catch (e) { }
      setTimeout(emit, 0);
    },
    token: () => null, hasToken: () => false, dropToken() { },
    async connectCal() { throw { code: 'local' }; }
  };
}

async function firebaseBackend() {
  const [A, U, F] = await Promise.all([import(`${FB}/firebase-app.js`), import(`${FB}/firebase-auth.js`), import(`${FB}/firebase-firestore.js`)]);
  const app = A.initializeApp(firebaseConfig);
  const auth = U.getAuth(app); auth.languageCode = 'pt';
  let db; try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); } catch (e) { db = F.getFirestore(app); }
  let me = null;
  const prov = hint => { const p = new U.GoogleAuthProvider(); p.addScope(CAL); p.setCustomParameters(hint ? { login_hint: hint } : { prompt: 'select_account' }); return p; };
  const keep = r => { const c = U.GoogleAuthProvider.credentialFromResult(r); if (c && c.accessToken) tokSet(c.accessToken); };
  const clean = o => JSON.parse(JSON.stringify(o));
  return {
    local: false,
    get email() { return me && me.email || ''; },
    onAuth(f) { U.onAuthStateChanged(auth, u => { me = u; f(u); }); },
    async signIn() {
      try { keep(await U.signInWithPopup(auth, prov())); }
      catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await U.signInWithRedirect(auth, prov()); else throw e; }
    },
    async signOut() { tokDrop(); await U.signOut(auth); },
    listen(u, f) {
      const base = F.doc(db, 'circulo', u), parts = {}, pend = {}, cache = {};
      const emit = () => {
        if (!('m' in parts && 'p' in parts && 'e' in parts)) return;
        f({ meta: parts.m, pessoas: parts.p, encontros: parts.e, pending: Object.values(pend).some(Boolean), offline: !navigator.onLine && Object.values(cache).some(Boolean), freshMeta: !cache.m, freshPessoas: !cache.p });
      };
      const err = e => f(null, e), opt = { includeMetadataChanges: true };
      const list = s => s.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
      const un = [
        F.onSnapshot(base, opt, s => { parts.m = s.exists() ? s.data() : null; pend.m = s.metadata.hasPendingWrites; cache.m = s.metadata.fromCache; emit(); }, err),
        F.onSnapshot(F.collection(base, 'pessoas'), opt, s => { parts.p = list(s); pend.p = s.metadata.hasPendingWrites; cache.p = s.metadata.fromCache; emit(); }, err),
        F.onSnapshot(F.collection(base, 'encontros'), opt, s => { parts.e = list(s); pend.e = s.metadata.hasPendingWrites; cache.e = s.metadata.fromCache; emit(); }, err)
      ];
      return () => un.forEach(x => x());
    },
    async write(ops) {
      const base = F.doc(db, 'circulo', me.uid);
      for (let i = 0; i < ops.length; i += 400) {
        const b = F.writeBatch(db);
        for (const o of ops.slice(i, i + 400)) {
          if (o.t === 'put') b.set(F.doc(base, o.kind, o.obj.id), clean(o.obj));
          else if (o.t === 'del') b.delete(F.doc(base, o.kind, o.id));
          else if (o.t === 'meta') b.set(base, clean(o.meta));
        }
        await b.commit();
      }
    },
    token: tokGet, hasToken: () => !!tokGet(), dropToken: tokDrop,
    async connectCal() { if (!me) throw { code: 'auth' }; keep(await U.reauthenticateWithPopup(me, prov(me.email))); }
  };
}

/* ================= escrita + desfazer ================= */
let backend = null, undoFn = null, tt = null;
function toast(m, undo) { $('#tmsg').textContent = m; $('#tundo').hidden = !undo; $('#toast').hidden = false; clearTimeout(tt); tt = setTimeout(() => { $('#toast').hidden = true; }, undo ? 7000 : 4500); }
$('#tundo').addEventListener('click', () => { const f = undoFn; undoFn = null; $('#toast').hidden = true; if (f) f(); });
function fsMsg(e) {
  const c = e && e.code;
  if (c === 'permission-denied') return 'O Firestore recusou. Confira as regras (firestore.rules) no console do Firebase.';
  if (c === 'resource-exhausted') return 'Limite do Firestore atingido por hoje.';
  return 'Não consegui salvar no Firestore agora.';
}
const metaObj = () => clone({ config: S.config, dias: S.dias, gcal: S.gcal, gjan: S.gjan, gdel: S.gdel, atualizadoEm: iso() });
function applyLocal(ops) {
  for (const o of ops) {
    const k = o.kind === 'pessoas' ? 'pessoas' : 'planos';
    if (o.t === 'put') { const i = S[k].findIndex(x => x.id === o.obj.id); if (i >= 0) S[k][i] = clone(o.obj); else S[k].push(clone(o.obj)); }
    else if (o.t === 'del') S[k] = S[k].filter(x => x.id !== o.id);
    else if (o.t === 'meta') setMeta(o.meta);
  }
}
function setMeta(m) { m = m || {}; S.config = Object.assign(clone(DEF), m.config || {}); S.dias = m.dias || {}; S.gcal = m.gcal || {}; S.gjan = m.gjan || {}; S.gdel = Array.isArray(m.gdel) ? m.gdel : []; }
function w(ops, msg, undoOps) {
  applyLocal(ops); render();
  backend.write(clone(ops)).catch(e => toast(fsMsg(e)));
  if (msg) { undoFn = undoOps ? () => w(undoOps, 'Desfeito') : null; toast(msg, !!undoOps); }
  schedSync();
}
function putMeta(mut, msg, undo) { const prev = metaObj(), m = metaObj(); mut(m); w([{ t: 'meta', meta: m }], msg, undo ? [{ t: 'meta', meta: prev }] : null); }
function withHist(e) {
  const prev = S.planos.find(x => x.id === e.id), h = Array.isArray(prev && prev.hist) ? prev.hist.slice() : [];
  if (!prev || prev.status !== e.status) h.push({ status: e.status, em: iso() });
  return Object.assign(clone(e), { hist: h.slice(-30), criadoEm: (prev && prev.criadoEm) || e.criadoEm || iso(), atualizadoEm: iso() });
}

/* ================= Google Agenda ================= */
let syncing = false, syncAgain = false, stm = null;
const gMonth = {};
function gcalMsg(x) {
  const c = x && x.code;
  if (c === 'local') return 'No modo demonstração o Google Agenda não funciona.';
  if (c === 'expired') return 'A conexão com o Google Agenda expirou. Clique em "Conectar Google Agenda".';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'A janela do Google foi fechada antes de terminar.';
  if (c === 'auth/popup-blocked') return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.';
  if (c === 'auth/user-mismatch') return 'Escolha a mesma conta Google com que você entrou no app.';
  if (c === 'http' && x.status === 403 && /has not been used|disabled/i.test(x.msg || '')) return 'Ative a Google Calendar API no projeto do Firebase (passo 5 do README).';
  if (c === 'http' && x.status === 403) return 'O Google negou acesso à agenda. Conecte de novo e marque a permissão da agenda.';
  if (c === 'http') return `O Google Agenda recusou (erro ${x.status}).`;
  return 'Não consegui falar com o Google Agenda agora.';
}
async function gapi(path, opt = {}) {
  const t = backend.token(); if (!t) throw { code: 'expired' };
  const r = await fetch(GAPI + path, { method: opt.method || 'GET', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: opt.body ? JSON.stringify(opt.body) : undefined });
  if (r.status === 401) { backend.dropToken(); renderG(); throw { code: 'expired' }; }
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw { code: 'http', status: r.status, msg: (j.error && j.error.message) || '' };
  return j;
}
async function gdelete(id) { try { await gapi('/' + encodeURIComponent(id), { method: 'DELETE' }); } catch (x) { if (!(x.code === 'http' && (x.status === 404 || x.status === 410))) throw x; } }
function hplus(data, hora, h) { const [a, b] = hora.split(':').map(Number); const d = pd(data); d.setHours(a + h, b, 0, 0); return d; }
function gRange(e) { if (e.hora) return { s: hplus(e.data, e.hora, 0), f: hplus(e.data, e.hora, 3), all: false }; const s = pd(e.data), f = pd(e.data); f.setDate(f.getDate() + 1); return { s, f, all: true }; }
const lt = d => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const encSig = e => [e.data, e.hora || '', names(e), e.ideia || '', e.status].join('|');
function evBody(e) {
  const r = gRange(e);
  return { summary: 'Social: ' + names(e), description: `${e.ideia ? e.ideia + '\n' : ''}Situação: ${ST[e.status] || e.status}\nCriado pelo Meu Círculo 2027`, colorId: e.status === 'confirmado' ? '10' : '9', transparency: 'opaque',
    start: r.all ? { date: ymd(r.s) } : { dateTime: lt(r.s), timeZone: TZ }, end: r.all ? { date: ymd(r.f) } : { dateTime: lt(r.f), timeZone: TZ }, extendedProperties: MARK };
}
function janBody(d) { const f = pd(d); f.setDate(f.getDate() + 1); return { summary: 'Janela social (reservado)', description: 'Dia reservado para ver alguém. Criado pelo Meu Círculo 2027', colorId: '5', transparency: 'opaque', start: { date: d }, end: { date: ymd(f) }, extendedProperties: MARK }; }
function gplan() {
  const ops = [], min = (() => { const d = new Date(today); d.setDate(d.getDate() - 30); return ymd(d); })();
  for (const e of S.planos) {
    const g = e.gcal || {};
    if (e.status !== 'cancelado' && e.data >= min) { if (!g.id) ops.push({ k: 'enc', e }); else if (g.sig !== encSig(e)) ops.push({ k: 'enc', e }); }
    else if (e.status === 'cancelado' && g.id) ops.push({ k: 'encdel', e });
  }
  const busy = new Set(S.planos.filter(e => e.status !== 'cancelado').map(e => e.data));
  const want = new Set(Object.keys(S.dias).filter(k => S.dias[k] === 'janela' && k >= T && !busy.has(k)));
  for (const k of want) if (!S.gjan[k]) ops.push({ k: 'jan', d: k });
  for (const [k, id] of Object.entries(S.gjan)) if (k >= T && !want.has(k)) ops.push({ k: 'jandel', d: k, id });
  for (const id of S.gdel) ops.push({ k: 'del', id });
  return ops;
}
function schedSync() { clearTimeout(stm); stm = setTimeout(gsync, 900); }
async function gsync() {
  if (!backend || backend.local || !S.config.gsync) { renderG(); return; }
  const ops = gplan(); renderG(ops.length);
  if (!ops.length || !backend.hasToken()) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  const janSet = {}, janDel = [], delDone = [], extraDel = [];
  try {
    for (const o of ops) {
      if (o.k === 'enc') {
        const e = S.planos.find(x => x.id === o.e.id); if (!e) continue;
        const body = evBody(e), sig = encSig(e); let j;
        if (e.gcal && e.gcal.id) { try { j = await gapi('/' + encodeURIComponent(e.gcal.id), { method: 'PATCH', body }); } catch (x) { if (x.code === 'http' && (x.status === 404 || x.status === 410)) j = await gapi('', { method: 'POST', body }); else throw x; } }
        else j = await gapi('', { method: 'POST', body });
        const now = S.planos.find(x => x.id === e.id);
        if (!now) { extraDel.push(j.id); continue; }
        const e2 = Object.assign(clone(now), { gcal: { id: j.id, sig, link: safeLink(j.htmlLink), at: iso() } });
        applyLocal([{ t: 'put', kind: 'encontros', obj: e2 }]); backend.write([{ t: 'put', kind: 'encontros', obj: e2 }]).catch(() => { });
      } else if (o.k === 'encdel') {
        await gdelete(o.e.gcal.id);
        const now = S.planos.find(x => x.id === o.e.id);
        if (now) { const e2 = clone(now); delete e2.gcal; applyLocal([{ t: 'put', kind: 'encontros', obj: e2 }]); backend.write([{ t: 'put', kind: 'encontros', obj: e2 }]).catch(() => { }); }
      } else if (o.k === 'jan') { const j = await gapi('', { method: 'POST', body: janBody(o.d) }); janSet[o.d] = j.id; }
      else if (o.k === 'jandel') { await gdelete(o.id); janDel.push(o.d); }
      else if (o.k === 'del') { await gdelete(o.id); delDone.push(o.id); }
    }
  } catch (x) { toast(gcalMsg(x)); }
  for (const id of extraDel) { try { await gdelete(id); } catch (x) { } }
  if (Object.keys(janSet).length || janDel.length || delDone.length) {
    const m = metaObj(); Object.assign(m.gjan, janSet); janDel.forEach(d => { delete m.gjan[d]; }); m.gdel = m.gdel.filter(x => !delDone.includes(x));
    applyLocal([{ t: 'meta', meta: m }]); backend.write([{ t: 'meta', meta: m }]).catch(e => toast(fsMsg(e)));
  }
  syncing = false; render();
  if (syncAgain) { syncAgain = false; schedSync(); }
}
function evDays(ev) {
  const st = ev.start || {}, en = ev.end || {}, all = [], soc = [];
  if (st.date) { const d = pd(st.date), end = pd(en.date || st.date); do { all.push(ymd(d)); soc.push(ymd(d)); d.setDate(d.getDate() + 1); } while (d < end); }
  else if (st.dateTime) {
    const a = new Date(st.dateTime), b = new Date(en.dateTime || st.dateTime); if (isNaN(a) || isNaN(b)) return { all, soc };
    const d = new Date(a); d.setHours(0, 0, 0, 0);
    do { const wd = d.getDay(), w0 = new Date(d), w1 = new Date(d); w0.setHours(wd === 0 || wd === 6 ? 10 : 18, 0, 0, 0); w1.setHours(23, 59, 0, 0); all.push(ymd(d)); if (a < w1 && b > w0) soc.push(ymd(d)); d.setDate(d.getDate() + 1); } while (d < b);
  }
  return { all, soc };
}
async function gload(force) {
  if (!backend || backend.local || !backend.hasToken()) return;
  const k0 = mkey(); if (!force && gMonth[k0] && Date.now() - gMonth[k0].ts < 5 * 60e3) return;
  const a = new Date(cur.y, cur.m, 1), b = new Date(cur.y, cur.m + 1, 1); let evs = [], tok = '';
  try {
    for (let i = 0; i < 4; i++) {
      const q = new URLSearchParams({ timeMin: a.toISOString(), timeMax: b.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' }); if (tok) q.set('pageToken', tok);
      const j = await gapi('?' + q); if (Array.isArray(j.items)) evs = evs.concat(j.items); tok = j.nextPageToken || ''; if (!tok) break;
    }
  } catch (x) { toast(gcalMsg(x)); return; }
  const byDay = {}, dias = {};
  for (const ev of evs) {
    if (!ev || ev.status === 'cancelled') continue;
    if (ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.meuCirculo === '1') continue;
    const { all, soc } = evDays(ev), h = ev.start && ev.start.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0, 5) : 'dia todo';
    all.filter(k => k.startsWith(k0)).forEach(k => { (byDay[k] = byDay[k] || []).push({ h, t: typeof ev.summary === 'string' ? ev.summary : '(sem título)' }); });
    if (ev.transparency !== 'transparent') soc.filter(k => k.startsWith(k0)).forEach(k => { dias[k] = (dias[k] || 0) + 1; });
  }
  gMonth[k0] = { ts: Date.now(), ev: byDay };
  if (JSON.stringify((S.gcal[k0] || {}).dias || {}) !== JSON.stringify(dias)) { const m = metaObj(); m.gcal[k0] = { at: iso(), dias }; applyLocal([{ t: 'meta', meta: m }]); backend.write([{ t: 'meta', meta: m }]).catch(() => { }); }
  render();
}
async function connectCal() {
  try { await backend.connectCal(); toast('Google Agenda conectado'); render(); await gload(true); gsync(); }
  catch (x) { toast(gcalMsg(x)); }
}
function renderG(n) {
  if (n === undefined) n = backend && !backend.local && S.config.gsync ? gplan().length : 0;
  const b = $('#gbtn'), on = backend && backend.hasToken();
  b.hidden = !backend || backend.local; b.textContent = on ? 'Google Agenda conectado' : `Conectar Google Agenda${n ? ` (${n})` : ''}`;
  let h = '';
  if (!backend || backend.local) h = '<span>Google Agenda: só funciona com o Firebase configurado.</span>';
  else {
    h = `<button class="btn sm" data-act="gtoggle" aria-pressed="${!!S.config.gsync}">Enviar para o Google Agenda</button>`;
    if (!S.config.gsync) h += '<span>sincronização desligada</span>';
    else if (on) h += `<span>${syncing ? 'sincronizando…' : n ? `${n} mudança${n > 1 ? 's' : ''} para enviar` : 'tudo sincronizado'}</span>`;
    else h += `<span>${n ? `${n} mudança${n > 1 ? 's' : ''} esperando` : 'desconectado'}</span><button class="btn sm pri" data-act="gconn">Conectar</button>`;
  }
  $('#gstat').innerHTML = h;
}

/* ================= painel ================= */
function upcoming() { return S.planos.filter(e => e.data >= T && OPEN.includes(e.status)).sort((a, b) => (a.data + (a.hora || '')) < (b.data + (b.hora || '')) ? -1 : 1); }
function renderTop() {
  const c = S.config, y = String(c.ano), meta = Number(c.metaMes) || 2;
  const feitos = S.planos.filter(e => conta(e) && e.status === 'feito' && String(e.data).startsWith(y));
  const vistos = new Set(feitos.flatMap(e => e.pessoas || []).filter(id => { const p = P(id); return p && gk(p.grupo) !== 'namorada'; }));
  const circ = S.pessoas.filter(p => gk(p.grupo) !== 'namorada').length;
  const mk = T.slice(0, 7), mf = S.planos.filter(e => conta(e) && e.status === 'feito' && String(e.data).startsWith(mk)).length, mm = S.planos.filter(e => conta(e) && String(e.data).startsWith(mk) && e.data >= T && OPEN.includes(e.status)).length;
  const nx = upcoming()[0];
  $('#sub').textContent = `Meta: ${meta} encontro${meta > 1 ? 's' : ''} por mês, com gente diferente.`;
  $('#ano').textContent = y;
  $('#figs').innerHTML = `<div class="fg"><div class="big">${feitos.length}<small> de ${meta * 12}</small></div><span>encontros em ${esc(y)}</span></div>
  <div class="fg"><div class="big">${vistos.size}<small> de ${circ}</small></div><span>pessoas diferentes vistas em ${esc(y)}</span></div>
  <div class="fg"><div class="big">${mf}<small> + ${mm} marcado${mm === 1 ? '' : 's'}</small></div><span>este mês · meta ${meta}</span></div>
  <div class="fg"><div class="big" style="font-size:clamp(22px,3vw,28px)">${nx ? esc(fmtD(nx.data)) : 'nada marcado'}</div><span>${nx ? 'próximo: ' + esc(names(nx, 1)) : 'abra a agenda e reserve uma janela'}</span></div>`;
}
function renderFila() {
  const arr = S.pessoas.map(p => ({ p, st: sit(p), nx: nextOf(p), nv: niver(p) })).sort((a, b) => (a.nx ? 1 : 0) - (b.nx ? 1 : 0) || b.st.r - a.st.r || a.p.nome.localeCompare(b.p.nome)).slice(0, 7);
  if (!arr.length) { $('#fila').innerHTML = `<div class="empty">Ninguém no círculo ainda. Comece pelos amigos que você não vê há mais tempo.<div class="bar" style="margin-top:10px"><button class="btn pri" data-act="addp">Adicionar pessoa</button></div></div>`; return; }
  const noFriends = !S.pessoas.some(p => p.grupo === 'amigos');
  $('#fila').innerHTML = arr.map(({ p, st, nx, nv }) => `<div class="row"><div class="av" style="background:var(--g-${gk(p.grupo)})">${esc(ini(p.nome))}</div>
    <div><b>${esc(p.nome)}</b><small>${esc(sitTxt(st, p))}${nx ? ' · marcado ' + esc(fmtD(nx.data)) : ''}${nv !== null && nv <= 30 ? ` · aniversário ${nv === 0 ? 'hoje' : 'em ' + nv + ' dias'}` : ''}</small></div>
    ${nx ? `<button class="btn sm" data-act="editplan" data-id="${esc(nx.id)}">Ver plano</button>` : `<button class="btn sm pri" data-act="invite" data-id="${esc(p.id)}">Convidar</button>`}</div>`).join('')
    + (noFriends ? `<div class="empty" style="margin-top:12px">Faltam os amigos. Use "Adicionar vários" na aba Pessoas e cole os nomes de quem você não vê faz tempo.</div>` : '');
}
function renderLegend() { const n = k => S.pessoas.filter(p => gk(p.grupo) === k).length; $('#legend').innerHTML = Object.keys(GR).map(k => `<span><i class="sw" style="background:var(--g-${k})"></i>${GR[k]} ${n(k)}</span>`).join('') + '<span>círculo tracejado = encontro marcado</span><span>encontros só com a namorada não contam na meta</span>'; }
function renderRitmo() {
  const y = String(S.config.ano), meta = Number(S.config.metaMes) || 2; $('#meta').value = String(meta);
  const rows = MES.map((m, i) => { const k = `${y}-${pad(i + 1)}`; return { m, f: S.planos.filter(e => conta(e) && e.status === 'feito' && String(e.data).startsWith(k)).length, mk: S.planos.filter(e => conta(e) && OPEN.includes(e.status) && String(e.data).startsWith(k) && e.data >= T).length }; });
  const mx = Math.max(meta + 1, ...rows.map(r => r.f + r.mk));
  $('#ritmo').innerHTML = rows.map(r => `<div class="mrow"><span class="mut">${r.m.slice(0, 3)}</span><div class="track"><i class="seg f" style="width:${r.f / mx * 100}%"></i><i class="seg m" style="width:${r.mk / mx * 100}%"></i><i class="goal" style="left:${meta / mx * 100}%"></i></div><span class="v">${r.f}/${meta}</span></div>`).join('');
}
function renderProx() {
  const pend = S.planos.filter(e => e.data < T && OPEN.includes(e.status)).sort((a, b) => a.data < b.data ? -1 : 1), up = upcoming().slice(0, 6);
  let h = '';
  if (pend.length) h += `<p class="mut" style="margin:0 0 4px">Esses encontros aconteceram?</p><ul class="sched">${pend.map(e => `<li><span class="d">${esc(fmtD(e.data))}</span><span>${esc(names(e))}</span><span class="bar"><button class="btn sm pri" data-act="done" data-id="${esc(e.id)}">Sim</button><button class="btn sm" data-act="skip" data-id="${esc(e.id)}">Não</button></span></li>`).join('')}</ul>`;
  h += up.length ? `<ul class="sched">${up.map(e => `<li><span class="d">${esc(fmtD(e.data))}</span><span><b>${esc(names(e))}</b><br><small class="mut">${esc([e.hora, e.ideia].filter(Boolean).join(' · ') || 'sem detalhes ainda')}</small></span><button class="pill ${esc(e.status)}" style="border:0;cursor:pointer" data-act="editplan" data-id="${esc(e.id)}">${esc(ST[e.status] || e.status)}</button></li>`).join('')}</ul>`
    : `<div class="empty">Nada marcado. Na aba Agenda, "Reservar janelas do mês" separa os dias e depois você escolhe quem chamar.</div>`;
  $('#prox').innerHTML = h;
}

/* ================= mapa ================= */
const svg = $('#map');
function drawMap() {
  const W = svg.clientWidth, H = svg.clientHeight; if (!W || !H) return;
  const R = Math.min(W / 2 - 6, (H - 40) / 2), cx = W / 2, cy = R + 8, sm = W < 520, placed = [];
  const hit = b => placed.some(q => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
  const c0 = R * .13, rr = [.34, .56, .78, 1].map(f => f * R); let h = '';
  for (let i = 3; i >= 0; i--) h += `<circle cx="${cx}" cy="${cy}" r="${rr[i]}" fill="var(--r${i})"/>`;
  for (let i = 0; i < 4; i++) { const inner = i ? rr[i - 1] : c0; h += `<text class="rl" x="${cx}" y="${cy - (inner + rr[i]) / 2 + 5}" text-anchor="middle">${RING[i]}</text>`; }
  h += `<circle cx="${cx}" cy="${cy}" r="${c0}" fill="var(--band)"/><text class="in" x="${cx}" y="${cy + 5}" text-anchor="middle">você</text>`;
  const groups = [[], [], [], []]; S.pessoas.forEach(p => { const st = sit(p); groups[st.ring].push({ p, st }); });
  const dr = sm ? 14 : 17;
  groups.forEach((arr, i) => {
    const n = arr.length; if (!n) return;
    const inner = i ? rr[i - 1] : c0, mid = (inner + rr[i]) / 2, band = rr[i] - inner;
    const gap = Math.max(22, (58 / mid) * 180 / Math.PI), span = 360 - 2 * gap, a0 = -90 + gap, arc = (span * Math.PI / 180) * mid / n, showName = arc >= 58 && n <= 14;
    arr.sort((x, y) => x.p.nome.localeCompare(y.p.nome)).forEach((o, j) => {
      const r = (arc < dr * 2 + 8 && band > dr * 2.6) ? mid + (j % 2 ? -1 : 1) * band * .24 : mid, hw = Math.max(dr, showName ? 28 : dr) + 2;
      const ad = a0 + (j + .5 + (i % 2 ? .3 : 0)) * span / n; let x0, y0, bx;
      for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) { const a = (ad + k * 9) * Math.PI / 180; x0 = cx + r * Math.cos(a); y0 = cy + r * Math.sin(a); bx = [x0 - hw, y0 - dr - 2, x0 + hw, y0 + dr + (showName ? 20 : 2)]; if (!hit(bx)) break; }
      placed.push(bx); const x = x0.toFixed(1), y = y0.toFixed(1), nx = nextOf(o.p);
      h += `<g class="dot" data-act="${nx ? 'editplan' : 'invite'}" data-id="${esc(nx ? nx.id : o.p.id)}" tabindex="0" role="button" aria-label="${esc(o.p.nome)}"><title>${esc(o.p.nome)}: ${esc(sitTxt(o.st, o.p))}</title>`
        + (nx ? `<circle cx="${x}" cy="${y}" r="${dr + 5}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 3"/>` : '')
        + `<circle cx="${x}" cy="${y}" r="${dr}" fill="var(--g-${gk(o.p.grupo)})"/><text class="in" x="${x}" y="${(+y + 5).toFixed(1)}" text-anchor="middle">${esc(ini(o.p.nome))}</text>`
        + (showName ? `<text class="nm" x="${x}" y="${(+y + dr + 16).toFixed(1)}" text-anchor="middle">${esc(first(o.p.nome))}</text>` : '') + '</g>';
    });
  });
  svg.innerHTML = h;
}
new ResizeObserver(drawMap).observe(svg);
svg.addEventListener('keydown', ev => { const d = ev.target.closest('.dot'); if ((ev.key === 'Enter' || ev.key === ' ') && d) { ev.preventDefault(); d.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

/* ================= agenda ================= */
let cur = { y: today.getFullYear(), m: today.getMonth() }, sel = T;
const mkey = () => `${cur.y}-${pad(cur.m + 1)}`;
function renderAgenda() {
  const y = cur.y, m = cur.m, k0 = mkey(), start = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), g = (S.gcal[k0] || {}).dias || {};
  $('#mtitle').textContent = `${MES[m]} ${y}`;
  $('#wds').innerHTML = DS.map((d, i) => `<button class="btn sm" data-act="wd" data-v="${i}" aria-pressed="${S.config.diasSociais.includes(i)}">${d}</button>`).join('');
  let h = DS.map(d => `<div class="dow">${d}</div>`).join(''); for (let i = 0; i < start; i++) h += '<div class="cell void"></div>';
  for (let d = 1; d <= n; d++) {
    const k = `${k0}-${pad(d)}`, wd = new Date(y, m, d).getDay(), st = S.dias[k] === 'janela' || S.dias[k] === 'ocupado' ? S.dias[k] : '', ev = S.planos.filter(e => e.data === k && e.status !== 'cancelado');
    h += `<button class="cell ${st} ${S.config.diasSociais.includes(wd) ? 'soc' : ''} ${k < T ? 'past' : ''} ${k === T ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-day="${k}" aria-label="${esc(fmtL(k))}"><b>${d}</b>`
      + (st ? `<i class="tag">${st}</i>` : '') + ev.slice(0, 2).map(e => `<span class="chip ${esc(e.status)}">${esc(names(e, 1))}</span>`).join('') + (ev.length > 2 ? `<span class="more">+${ev.length - 2}</span>` : '')
      + (g[k] ? `<span class="gc">Google ${Number(g[k])}</span>` : '') + '</button>';
  }
  $('#cal').innerHTML = h;
  const gs = S.gcal[k0]; $('#gsync').textContent = gs && gs.at ? `Google Agenda lido em ${new Date(gs.at).toLocaleString('pt-BR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '';
  renderDay(); renderG();
}
function renderDay() {
  const k = sel, st = S.dias[k] || 'livre', ev = S.planos.filter(e => e.data === k), gm = gMonth[k.slice(0, 7)], gl = gm && gm.ev[k] || [], gc = ((S.gcal[k.slice(0, 7)] || {}).dias || {})[k];
  $('#dayp').innerHTML = `<h3>${esc(fmtL(k))}</h3><div class="seg3">${[['livre', 'Livre'], ['janela', 'Janela social'], ['ocupado', 'Ocupado']].map(([v, l]) => `<button class="btn sm" data-act="daystate" data-v="${v}" aria-pressed="${st === v}">${l}</button>`).join('')}</div>`
    + (gl.length ? `<p class="mut" style="margin:0 0 4px">No seu Google Agenda:</p><ul class="glist">${gl.map(x => `<li><b>${esc(x.h)}</b> ${esc(x.t)}</li>`).join('')}</ul>` : gc ? `<p class="mut">O Google Agenda tem ${Number(gc)} compromisso${gc > 1 ? 's' : ''} no horário social desse dia.</p>` : '')
    + (ev.length ? `<ul class="sched">${ev.map(e => `<li><span class="d" style="font-size:15px">${esc(e.hora || 'dia todo')}</span><span><b>${esc(names(e))}</b><br><small class="mut">${esc(e.ideia || '')}</small></span><button class="pill ${esc(e.status)}" style="border:0;cursor:pointer" data-act="editplan" data-id="${esc(e.id)}">${esc(ST[e.status] || e.status)}</button></li>`).join('')}</ul>` : '<p class="mut">Nenhum encontro nesse dia.</p>')
    + `<button class="btn pri" data-act="newplan" style="margin-top:10px">Marcar encontro neste dia</button><p class="mut" style="margin-bottom:0">Janela é um dia que você reserva antes de saber com quem. Com o Google Agenda conectado, ela vira um evento que tranca o dia.</p>`;
}
async function sugerir() {
  if (backend.hasToken() && !gMonth[mkey()]) await gload();
  const y = cur.y, mo = cur.m, k0 = mkey(), g = (S.gcal[k0] || {}).dias || {}, n = new Date(y, mo + 1, 0).getDate(), meta = Number(S.config.metaMes) || 2;
  const have = new Set(); for (let d = 1; d <= n; d++) { const k = `${k0}-${pad(d)}`; if (S.dias[k] === 'janela' || S.planos.some(e => e.data === k && e.status !== 'cancelado')) have.add(k); }
  const need = meta - have.size; if (need <= 0) { toast('Este mês já tem janelas suficientes para a meta'); return; }
  let cand = []; for (let d = 1; d <= n; d++) { const k = `${k0}-${pad(d)}`, wd = new Date(y, mo, d).getDay(); if (k <= T || !S.config.diasSociais.includes(wd) || S.dias[k] || g[k] || have.has(k)) continue; cand.push({ k, d, wd }); }
  if (!cand.length) { toast('Não achei dia livre nos dias que contam. Ajuste os dias ou marque na mão.'); return; }
  const pick = [];
  for (let i = 0; i < need && cand.length; i++) { const tgt = (i + .5) * n / need, sc = c => Math.abs(c.d - tgt) - (c.wd === 6 ? 2 : 0); cand.sort((a, b) => sc(a) - sc(b)); const c = cand.shift(); pick.push(c.k); cand = cand.filter(x => Math.abs(x.d - c.d) >= 3); }
  putMeta(m => { pick.forEach(k => { m.dias[k] = 'janela'; }); }, `Reservei ${pick.map(fmtD).join(' e ')}`, true);
}

/* ================= pessoas ================= */
function renderPessoas() {
  const q = $('#q').value.trim().toLowerCase();
  const arr = S.pessoas.filter(p => !q || p.nome.toLowerCase().includes(q)).sort((a, b) => Object.keys(GR).indexOf(gk(a.grupo)) - Object.keys(GR).indexOf(gk(b.grupo)) || a.nome.localeCompare(b.nome));
  $('#ptb').innerHTML = arr.length ? arr.map(p => {
    const st = sit(p), nx = nextOf(p);
    return `<tr><td class="nmcell"><span class="nmc"><span class="av" style="background:var(--g-${gk(p.grupo)})">${esc(ini(p.nome))}</span><span><b>${esc(p.nome)}</b><br><small class="mut">${esc(GR[gk(p.grupo)])}</small></span></span></td>
    <td>${esc(freqTxt(p.freq))}</td><td style="white-space:nowrap">${esc(fmtBR(st.l))}</td><td><span class="pill ring${st.ring}">${RING[st.ring]}</span></td><td style="white-space:nowrap">${nx ? esc(fmtD(nx.data)) : '—'}</td>
    <td><span class="bar" style="justify-content:flex-end"><button class="btn sm" data-act="editp" data-id="${esc(p.id)}">Editar</button><button class="btn sm pri" data-act="invite" data-id="${esc(p.id)}">Convidar</button></span></td></tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty">${q ? 'Ninguém com esse nome.' : 'Ninguém ainda. Adicione amigos, família e quem mais você quer ver em 2027.'}</div></td></tr>`;
}
const opts = (list, val) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('');
$('#p-grupo').innerHTML = opts(Object.entries(GR)); $('#p-freq').innerHTML = opts(FREQ, 30); $('#bulkg').innerHTML = opts(Object.entries(GR), 'amigos'); $('#bulkf').innerHTML = opts(FREQ, 90);
$('#e-status').innerHTML = opts(Object.entries(ST));
let EPp = null, delArm = false;
function openPerson(p) {
  EPp = p ? clone(p) : null; delArm = false; $('#pTitle').textContent = p ? 'Editar pessoa' : 'Nova pessoa';
  $('#p-nome').value = p ? p.nome : ''; $('#p-grupo').value = p ? gk(p.grupo) : 'amigos'; $('#p-freq').value = String(p ? p.freq || 30 : 30); $('#p-ultimo').value = p ? p.ultimo || '' : ''; $('#p-zap').value = p ? p.zap || '' : ''; $('#p-aniver').value = p ? p.aniver || '' : ''; $('#p-ideias').value = p ? p.ideias || '' : '';
  $('#p-del').hidden = !p; $('#p-del').textContent = 'Excluir'; $('#p-err').textContent = ''; $('#dlgP').showModal(); $('#p-nome').focus();
}
$('#fP').addEventListener('submit', ev => {
  ev.preventDefault(); const nome = $('#p-nome').value.trim(); if (!nome) { $('#p-err').textContent = 'Coloque o nome.'; return; }
  const av = $('#p-aniver').value.trim(); if (av && !/^\d{1,2}\/\d{1,2}$/.test(av)) { $('#p-err').textContent = 'Aniversário no formato dia/mês, como 15/03.'; return; }
  const d = { nome, grupo: $('#p-grupo').value, freq: Number($('#p-freq').value), ultimo: $('#p-ultimo').value, zap: $('#p-zap').value.trim(), aniver: av, ideias: $('#p-ideias').value.trim(), atualizadoEm: iso() };
  const old = EPp && P(EPp.id), obj = old ? Object.assign(clone(old), d) : Object.assign({ id: uid(), criadoEm: iso() }, d);
  $('#dlgP').close(); w([{ t: 'put', kind: 'pessoas', obj }], old ? 'Pessoa atualizada' : `${first(nome)} entrou no círculo`);
});
$('#p-del').addEventListener('click', () => {
  if (!EPp) return; if (!delArm) { delArm = true; $('#p-del').textContent = 'Confirmar exclusão'; return; }
  const p = P(EPp.id); if (!p) return;
  const ops = [{ t: 'del', kind: 'pessoas', id: p.id }], undo = [{ t: 'put', kind: 'pessoas', obj: clone(p) }], gd = [];
  for (const e of S.planos.filter(e => (e.pessoas || []).includes(p.id))) {
    undo.push({ t: 'put', kind: 'encontros', obj: clone(e) });
    const rest = e.pessoas.filter(i => i !== p.id);
    if (rest.length) ops.push({ t: 'put', kind: 'encontros', obj: Object.assign(clone(e), { pessoas: rest }) });
    else { ops.push({ t: 'del', kind: 'encontros', id: e.id }); if (e.gcal && e.gcal.id) gd.push(e.gcal.id); }
  }
  if (gd.length) { const m = metaObj(); undo.push({ t: 'meta', meta: metaObj() }); m.gdel = m.gdel.concat(gd); ops.push({ t: 'meta', meta: m }); }
  $('#dlgP').close(); w(ops, `${first(p.nome)} saiu do círculo`, undo);
});

/* ================= encontro ================= */
let EP = null, msgTouched = false;
function suggestDay() {
  const g = k => ((S.gcal[k.slice(0, 7)] || {}).dias || {})[k], busy = k => S.planos.some(e => e.data === k && e.status !== 'cancelado'), d = new Date(today);
  for (let i = 1; i <= 60; i++) { d.setDate(d.getDate() + 1); const k = ymd(d); if (S.dias[k] === 'janela' && !busy(k)) return k; }
  d.setTime(today.getTime()); for (let i = 1; i <= 60; i++) { d.setDate(d.getDate() + 1); const k = ymd(d); if (S.config.diasSociais.includes(d.getDay()) && !S.dias[k] && !g(k) && !busy(k)) return k; }
  const x = new Date(today); x.setDate(x.getDate() + 7); return ymd(x);
}
const firstIdea = p => p && p.ideias ? p.ideias.split(/[,\n;]/)[0].trim() : '';
function newPlan(data, ids) { openPlan({ id: '', data: data || suggestDay(), hora: '', pessoas: ids || [], ideia: ids && ids.length === 1 ? firstIdea(P(ids[0])) : '', status: 'planejado' }); }
function openPlan(e) {
  EP = clone(e); msgTouched = !!EP.msg; $('#eTitle').textContent = EP.id ? 'Encontro' : 'Novo encontro';
  $('#e-pick').innerHTML = S.pessoas.length ? S.pessoas.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(p => `<label class="pk"><input type="checkbox" value="${esc(p.id)}"${EP.pessoas.includes(p.id) ? ' checked' : ''}><span><i class="sw" style="background:var(--g-${gk(p.grupo)});margin:0"></i>${esc(p.nome)}</span></label>`).join('') : '<span class="mut">Adicione pessoas primeiro, na aba Pessoas.</span>';
  $('#e-data').value = EP.data || ''; $('#e-hora').value = EP.hora || ''; $('#e-ideia').value = EP.ideia || ''; $('#e-status').value = EP.status || 'planejado';
  $('#e-del').hidden = !EP.id; $('#e-del').textContent = 'Excluir'; delArm = false; $('#e-err').textContent = '';
  const h = Array.isArray(EP.hist) ? EP.hist : [];
  $('#e-hist').textContent = h.length ? 'Histórico: ' + h.map(x => `${ST[x.status] || x.status} em ${new Date(x.em).toLocaleDateString('pt-BR')}`).join(' → ') : '';
  updMsg(); $('#dlgE').showModal();
}
function msgFor(e) {
  const ps = (e.pessoas || []).map(P).filter(Boolean); if (!e.data) return ''; const d = pd(e.data), many = ps.length > 1;
  return `${many ? 'Oi, gente!' : `Oi, ${first(ps[0] ? ps[0].nome : '')}!`} Tô com saudade de ${many ? 'vocês' : 'você'}. Bora sair ${DL[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}${e.hora ? `, às ${e.hora}` : ''}?${e.ideia ? ` Pensei em ${e.ideia}.` : ''} Topa?`;
}
const gstamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
function updMsg() {
  if (!msgTouched) $('#e-msg').value = msgFor(EP);
  const msg = $('#e-msg').value, ps = EP.pessoas.map(P).filter(Boolean);
  const wa = ps.filter(p => String(p.zap || '').replace(/\D/g, '').length >= 10).map(p => { let n = String(p.zap).replace(/\D/g, ''); if (n.length <= 11) n = '55' + n; return `<a class="btn sm" data-wa="1" target="_blank" rel="noopener" href="https://wa.me/${n}?text=${encodeURIComponent(msg)}">WhatsApp: ${esc(first(p.nome))}</a>`; });
  if (ps.length && wa.length < ps.length) wa.push(`<a class="btn sm" data-wa="1" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">WhatsApp: escolher contato</a>`);
  $('#e-links').innerHTML = wa.join('') + (msg ? '<button type="button" class="btn sm" id="e-copy">Copiar mensagem</button>' : '');
  const gl = $('#e-glink'), gs = $('#e-gstate'), saved = EP.id && S.planos.find(x => x.id === EP.id), gc = saved && saved.gcal;
  if (backend.local) {
    if (EP.data) { const r = gRange(EP), dates = r.all ? `${gstamp(r.s).slice(0, 8)}/${gstamp(r.f).slice(0, 8)}` : `${gstamp(r.s)}/${gstamp(r.f)}`; gl.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Social: ' + names(EP))}&dates=${dates}&ctz=${TZ}&details=${encodeURIComponent(EP.ideia || '')}`; gl.hidden = false; } else gl.hidden = true;
    gs.textContent = '';
  } else {
    gl.hidden = !(gc && safeLink(gc.link)); if (gc && safeLink(gc.link)) { gl.href = gc.link; gl.textContent = 'Ver no Google Agenda'; }
    gs.textContent = !S.config.gsync ? 'Envio para o Google Agenda desligado.' : gc && gc.id ? (gc.sig === encSig(Object.assign({}, saved)) ? 'Está no seu Google Agenda.' : 'Vai atualizar no Google Agenda.') : backend.hasToken() ? 'Vai para o seu Google Agenda ao salvar.' : 'Vai para o Google Agenda quando você conectar.';
  }
}
function readPlan() { EP.data = $('#e-data').value; EP.hora = $('#e-hora').value; EP.ideia = $('#e-ideia').value.trim(); EP.status = $('#e-status').value; EP.pessoas = $$('#e-pick input:checked').map(i => i.value); if (msgTouched) EP.msg = $('#e-msg').value; else delete EP.msg; }
function commitPlan(msg) {
  readPlan(); if (!EP.pessoas.length) { $('#e-err').textContent = 'Escolha pelo menos uma pessoa.'; return false; } if (!EP.data) { $('#e-err').textContent = 'Escolha o dia.'; return false; }
  $('#e-err').textContent = ''; if (!EP.id) EP.id = uid();
  const saved = S.planos.find(x => x.id === EP.id); if (saved && saved.gcal) EP.gcal = saved.gcal;
  const obj = withHist(EP); EP.hist = obj.hist; $('#e-del').hidden = false;
  w([{ t: 'put', kind: 'encontros', obj }], msg); return true;
}
$('#fE').addEventListener('input', ev => { if (ev.target.id === 'e-msg') msgTouched = true; readPlan(); updMsg(); });
$('#fE').addEventListener('submit', ev => { ev.preventDefault(); if (commitPlan()) { $('#dlgE').close(); toast('Encontro salvo'); } });
$('#e-links').addEventListener('click', ev => {
  if (ev.target.closest('a[data-wa]')) { readPlan(); if (EP.status === 'planejado') { EP.status = 'convidado'; $('#e-status').value = 'convidado'; } commitPlan(); return; }
  if (ev.target.id === 'e-copy') navigator.clipboard.writeText($('#e-msg').value).then(() => toast('Mensagem copiada')).catch(() => { $('#e-msg').select(); toast('Texto selecionado: copie com Ctrl+C'); });
});
$('#e-del').addEventListener('click', () => {
  if (!EP || !EP.id) return; if (!delArm) { delArm = true; $('#e-del').textContent = 'Confirmar exclusão'; return; }
  const e = S.planos.find(x => x.id === EP.id); if (!e) { $('#dlgE').close(); return; }
  const ops = [{ t: 'del', kind: 'encontros', id: e.id }], undo = [{ t: 'put', kind: 'encontros', obj: clone(e) }];
  if (e.gcal && e.gcal.id) { undo.push({ t: 'meta', meta: metaObj() }); const m = metaObj(); m.gdel.push(e.gcal.id); ops.push({ t: 'meta', meta: m }); }
  $('#dlgE').close(); w(ops, 'Encontro excluído', undo);
});
$$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

/* ================= histórico + backup ================= */
function renderHist() {
  const sel0 = hUser, anos = [...new Set(S.planos.filter(e => e.status === 'feito').map(e => String(e.data).slice(0, 4)).concat([String(S.config.ano), T.slice(0, 4)]))].sort().reverse();
  const ano = anos.includes(sel0) ? sel0 : (S.planos.some(e => e.status === 'feito' && String(e.data).startsWith(String(S.config.ano))) ? String(S.config.ano) : (anos.find(a => S.planos.some(e => e.status === 'feito' && String(e.data).startsWith(a))) || String(S.config.ano)));
  $('#hano').innerHTML = anos.map(a => `<option${a === ano ? ' selected' : ''}>${esc(a)}</option>`).join('');
  const fe = S.planos.filter(e => e.status === 'feito' && String(e.data).startsWith(ano)).sort((a, b) => a.data < b.data ? 1 : -1);
  let h = '', mo = '';
  for (const e of fe) { const m = MES[pd(e.data).getMonth()]; if (m !== mo) { h += (mo ? '</ul>' : '') + `<p class="mhead">${m}</p><ul class="sched">`; mo = m; } h += `<li><span class="d">${esc(fmtD(e.data))}</span><span><b>${esc(names(e))}</b><br><small class="mut">${esc(e.ideia || '')}</small></span><button class="pill feito" style="border:0;cursor:pointer" data-act="editplan" data-id="${esc(e.id)}">Ver</button></li>`; }
  $('#hlist').innerHTML = fe.length ? h + '</ul>' : `<div class="empty" style="margin-top:12px">Nenhum encontro registrado em ${esc(ano)} ainda. Quando um encontro passar, o painel pergunta se aconteceu.</div>`;
  const rows = S.pessoas.map(p => { const es = fe.filter(e => (e.pessoas || []).includes(p.id)); return { p, n: es.length, l: es[0] ? es[0].data : '' }; }).sort((a, b) => b.n - a.n || a.p.nome.localeCompare(b.p.nome));
  $('#hpes').innerHTML = rows.length ? rows.map(r => `<tr><td><span class="nmc"><span class="av" style="background:var(--g-${gk(r.p.grupo)})">${esc(ini(r.p.nome))}</span>${esc(r.p.nome)}</span></td><td class="n">${r.n}</td><td style="white-space:nowrap">${esc(fmtBR(r.l))}</td></tr>`).join('') : '<tr><td colspan="3" class="mut">Ninguém no círculo ainda.</td></tr>';
}
let hUser = null;
$('#hano').addEventListener('change', () => { hUser = $('#hano').value; renderHist(); });
function exportar() {
  const data = { app: 'meu-circulo-2027', versao: 1, exportadoEm: iso(), meta: metaObj(), pessoas: S.pessoas, encontros: S.planos };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `meu-circulo-backup-${T}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('#imp').addEventListener('change', async () => {
  const f = $('#imp').files[0]; $('#imp').value = ''; if (!f) return;
  let d; try { d = JSON.parse(await f.text()); } catch (e) { toast('Esse arquivo não é um backup válido.'); return; }
  const okId = x => x && typeof x.id === 'string' && /^[\w-]{1,64}$/.test(x.id);
  const ps = Array.isArray(d.pessoas) ? d.pessoas.filter(x => okId(x) && typeof x.nome === 'string') : [], es = Array.isArray(d.encontros) ? d.encontros.filter(x => okId(x) && typeof x.data === 'string' && Array.isArray(x.pessoas)) : [];
  if (!ps.length && !es.length) { toast('Não achei pessoas nem encontros nesse arquivo.'); return; }
  const ops = [], undo = [];
  for (const p of ps) { const o = P(p.id); undo.push(o ? { t: 'put', kind: 'pessoas', obj: clone(o) } : { t: 'del', kind: 'pessoas', id: p.id }); ops.push({ t: 'put', kind: 'pessoas', obj: p }); }
  for (const e of es) { const o = S.planos.find(x => x.id === e.id); undo.push(o ? { t: 'put', kind: 'encontros', obj: clone(o) } : { t: 'del', kind: 'encontros', id: e.id }); const e2 = clone(e); delete e2.gcal; ops.push({ t: 'put', kind: 'encontros', obj: e2 }); }
  w(ops, `Importei ${ps.length} pessoa${ps.length === 1 ? '' : 's'} e ${es.length} encontro${es.length === 1 ? '' : 's'}`, undo);
});

/* ================= ações ================= */
function setStatus(id, s) { const e = S.planos.find(x => x.id === id); if (!e) return; const obj = withHist(Object.assign(clone(e), { status: s })); w([{ t: 'put', kind: 'encontros', obj }], s === 'feito' ? `Registrado: ${names(e, 1)}` : 'Marcado como não rolou', [{ t: 'put', kind: 'encontros', obj: clone(e) }]); }
document.addEventListener('click', ev => {
  const day = ev.target.closest('[data-day]'); if (day) { sel = day.getAttribute('data-day'); renderAgenda(); if (innerWidth < 880) $('#dayp').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const t = ev.target.closest('[data-act]'); if (!t) return; const a = t.getAttribute('data-act'), id = t.getAttribute('data-id'), v = t.getAttribute('data-v');
  if (a === 'invite') { if (P(id)) newPlan(null, [id]); }
  else if (a === 'editp') { const p = P(id); if (p) openPerson(p); }
  else if (a === 'addp') openPerson(null);
  else if (a === 'editplan') { const e = S.planos.find(x => x.id === id); if (e) openPlan(e); }
  else if (a === 'newplan') newPlan(sel, []);
  else if (a === 'done') setStatus(id, 'feito'); else if (a === 'skip') setStatus(id, 'cancelado');
  else if (a === 'prev' || a === 'next') { const d = new Date(cur.y, cur.m + (a === 'next' ? 1 : -1), 1); cur = { y: d.getFullYear(), m: d.getMonth() }; sel = ymd(d); renderAgenda(); gload(); }
  else if (a === 'hoje') { cur = { y: today.getFullYear(), m: today.getMonth() }; sel = T; renderAgenda(); gload(); }
  else if (a === 'sug') sugerir();
  else if (a === 'gref') { if (backend.local) toast(gcalMsg({ code: 'local' })); else if (!backend.hasToken()) connectCal(); else gload(true).then(gsync); }
  else if (a === 'gconn') connectCal();
  else if (a === 'gtoggle') putMeta(m => { m.config.gsync = !m.config.gsync; });
  else if (a === 'daystate') putMeta(m => { if (v === 'livre') delete m.dias[sel]; else m.dias[sel] = v; });
  else if (a === 'wd') { const i = Number(v); putMeta(m => { const ds = m.config.diasSociais; m.config.diasSociais = ds.includes(i) ? ds.filter(x => x !== i) : ds.concat(i); }); }
  else if (a === 'export') exportar();
  else if (a === 'bulk') {
    const have = new Set(S.pessoas.map(p => p.nome.toLowerCase())), ls = $('#bulk').value.split('\n').map(s => s.trim()).filter(s => s && !have.has(s.toLowerCase()) && have.add(s.toLowerCase()));
    if (!ls.length) { toast('Nenhum nome novo na lista'); return; }
    const ops = ls.map(nome => ({ t: 'put', kind: 'pessoas', obj: { id: uid(), nome, grupo: $('#bulkg').value, freq: Number($('#bulkf').value), ultimo: '', zap: '', aniver: '', ideias: '', criadoEm: iso() } }));
    $('#bulk').value = ''; w(ops, `${ls.length} pessoa${ls.length > 1 ? 's' : ''} adicionada${ls.length > 1 ? 's' : ''}`, ops.map(o => ({ t: 'del', kind: 'pessoas', id: o.obj.id })));
  }
});
$('#meta').addEventListener('change', () => putMeta(m => { m.config.metaMes = Number($('#meta').value); }));
$('#q').addEventListener('input', renderPessoas);
$('#gbtn').addEventListener('click', () => { if (!backend.hasToken()) connectCal(); else { location.hash = '#agenda'; route(); } });
const TABS = ['painel', 'agenda', 'pessoas', 'historico'];
function route() {
  const h = location.hash.slice(1), t = TABS.includes(h) ? h : 'painel';
  $$('.view').forEach(v => { v.hidden = v.id !== 'v-' + t; }); $$('.tabs a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + t ? 'page' : 'false'));
  if (t === 'painel') drawMap(); if (t === 'agenda' && backend) gload();
}
addEventListener('hashchange', route);
function render() { renderTop(); renderFila(); renderLegend(); renderRitmo(); renderProx(); renderAgenda(); renderPessoas(); renderHist(); drawMap(); }

/* ================= início ================= */
function sync(t, warn) { const s = $('#sync'); s.textContent = t; s.classList.toggle('warn', !!warn); }
function seed(withFamily) {
  const ops = [{ t: 'meta', meta: Object.assign(metaObj(), { config: clone(DEF), criadoEm: iso() }) }];
  if (withFamily) [['Mãe', 'familia', 14], ['Namorada', 'namorada', 7], ['Tia', 'familia', 30], ['Tio', 'familia', 30], ['Primo', 'familia', 30]].forEach(([nome, grupo, freq]) => ops.push({ t: 'put', kind: 'pessoas', obj: { id: uid(), nome, grupo, freq, ultimo: '', zap: '', aniver: '', ideias: '', criadoEm: iso() } }));
  w(ops);
}
async function start() {
  if (configured) { try { backend = await firebaseBackend(); } catch (e) { console.error(e); sync('Não consegui carregar o Firebase', true); $('#login').hidden = false; $('#entrar').disabled = true; $('#lerr').textContent = 'Falha ao carregar o Firebase. Confira a internet e o firebase-config.js.'; return; } }
  else backend = localBackend();
  $('#demo').hidden = !backend.local;
  let unsub = null, seeded = false;
  backend.onAuth(u => {
    if (unsub) { unsub(); unsub = null; }
    if (!u) { S = blank(); $('#app').hidden = true; $('#appTop').hidden = true; $('#login').hidden = false; $('#uname').hidden = true; $('#sair').hidden = true; $('#gbtn').hidden = true; sync('Desconectada', true); return; }
    $('#login').hidden = true; $('#app').hidden = false; $('#appTop').hidden = false;
    $('#uname').textContent = u.email || u.displayName || ''; $('#uname').hidden = !$('#uname').textContent; $('#sair').hidden = backend.local;
    sync('Carregando…'); route(); render();
    const lt = setTimeout(() => sync('Demorando para carregar…', true), 10000);
    unsub = backend.listen(u.uid, (d, err) => {
      clearTimeout(lt);
      if (err) { sync(err.code === 'permission-denied' ? 'Sem permissão no Firestore' : 'Erro ao ler o Firestore', true); toast(fsMsg(err)); return; }
      S.pessoas = d.pessoas; S.planos = d.encontros; setMeta(d.meta);
      if (!d.meta && d.freshMeta && !seeded) { seeded = true; seed(d.freshPessoas && !d.pessoas.length); }
      sync(backend.local ? 'Salvo só neste navegador' : d.pending ? 'Salvando…' : d.offline ? 'Sem conexão: salvo no aparelho' : 'Salvo', backend.local || d.offline);
      render(); schedSync();
    });
    if (backend.hasToken() && location.hash !== '#agenda') gload();
  });
}
$('#entrar').addEventListener('click', async () => { $('#lerr').textContent = ''; try { await backend.signIn(); } catch (e) { $('#lerr').textContent = e && e.code === 'auth/unauthorized-domain' ? 'Este endereço não está autorizado no Firebase (passo 4 do README).' : e && e.code === 'auth/popup-closed-by-user' ? 'A janela do Google foi fechada antes de terminar.' : 'Não consegui entrar. Tente de novo.'; } });
$('#sair').addEventListener('click', () => backend.signOut());
$$('.tabs a').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); const h = a.getAttribute('href'); try { history.replaceState(null, '', h); } catch (e) { location.hash = h; } route(); }));
start();
