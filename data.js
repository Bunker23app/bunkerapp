// ════════════════════════════════════════════════════════════════
// DATA.JS v2.2 — Bunker23
// Variabili globali, costanti, ruoli, auth, gestione sessione
// Architettura: Supabase (persistenza remota) + localStorage (solo token di sessione)
// ════════════════════════════════════════════════════════════════

// ── RUOLI ────────────────────────────────────────────────────────
const ROLES = {
  ADMIN:    'admin',
  STAFF:    'staff',
  AIUTANTE: 'aiutante',
  PREMIUM:  'premium',
  UTENTE:   'utente',
};

// Gerarchia numerica (utile per confronti >=)
const ROLE_LEVEL = {
  [ROLES.UTENTE]:   1,
  [ROLES.PREMIUM]:  2,
  [ROLES.AIUTANTE]: 3,
  [ROLES.STAFF]:    4,
  [ROLES.ADMIN]:    5,
};

// ── STATO AUTH ───────────────────────────────────────────────────
let currentUser    = null;   // { name, initial, color, role, photo, sospeso } oppure null
let guestMode      = false;  // true = accesso ospite (solo calendario pubblico)
// Flag impostato a true solo dopo che loadAllData() ha aggiornato MEMBERS da Supabase.
// Impedisce che restoreSession() venga eseguita prima che i dati siano attendibili.
let _membersReady  = false;

// ── SESSION STORAGE KEY ──────────────────────────────────────────
const SESSION_KEY  = 'bunker23_session';

// Durata sessione: 7 giorni staff/admin/aiutante, 30 min utenti/premium
const SESSION_TTL = {
  staff:    7 * 24 * 60 * 60 * 1000,
  admin:    7 * 24 * 60 * 60 * 1000,
  aiutante: 7 * 24 * 60 * 60 * 1000,
  premium:  30 * 60 * 1000,
  utente:   30 * 60 * 1000,
};

function getSessionTTL(role) {
  return SESSION_TTL[role] ?? SESSION_TTL.utente;
}

// ── MEMBERS (seed locale — sovrascritto da Supabase al load) ─────
let MEMBERS = [
  { name:'Chiaro', initial:'C', color:'#cc2200', password:'sha256:bbb0c9661d4500af1a2ad1f82cbea006119b727d177e51cca3a2b23eaef51927', role: ROLES.ADMIN  },
  { name:'Lukas',  initial:'L', color:'#1a6b3c', password:'sha256:2b2ff63949b46caaa980c971484ba099aea045a4cbe887bccf4faff00924484a', role: ROLES.STAFF  },
  { name:'Adal',   initial:'A', color:'#1a3a7a', password:'sha256:ee431cdcdf25341aafd8d67c35e6284ac7d5d7cb6c7cc0ac54a00f0440ab462d', role: ROLES.STAFF  },
  { name:'Zappa',  initial:'Z', color:'#6b1a6b', password:'sha256:4c63f163e41a37f4c2e034705b0b917bb475ae60a3dc86a2e0993042d80e1a9c', role: ROLES.STAFF  },
  { name:'Zaff',   initial:'Z', color:'#7a4a1a', password:'sha256:3b024d115de57e3adb6e098b6733b8ad72fb11b7cb1e0277efff8cb099018623', role: ROLES.STAFF  },
  { name:'Alex',   initial:'A', color:'#2a6b6b', password:'sha256:4135aa9dc1b842a653dea846903ddb95bfb8c5a10c504a7fa16e10bc31d1fdf0', role: ROLES.STAFF  },
  { name:'Ricia',  initial:'R', color:'#5a5a1a', password:'sha256:766ceea5fcdcc176646d2fcafd1dd08784bf17f38c7eee68438e06505ff6a9b8', role: ROLES.STAFF  },
  { name:'Utente1',initial:'U', color:'#444466', password:'sha256:9cdee5050fb57181e54646f487753dde73bc8e8c73843de92d01427420c64c23', role: ROLES.UTENTE },
  { name:'Utente2',initial:'U', color:'#446644', password:'sha256:df21b1245419763295b2d582072ada296c09b458227f6176d36634c88c179a91', role: ROLES.UTENTE },
  { name:'Utente3',initial:'U', color:'#664444', password:'sha256:d7843fc12f2260537ce74087e09f296cab80c1b4b1e8c5eb2d1b6250b5f5ce51', role: ROLES.UTENTE },
];

// ── PERMISSIONS ──────────────────────────────────────────────────
function hasRole(minRole) {
  return !!currentUser && ROLE_LEVEL[currentUser.role] >= ROLE_LEVEL[minRole];
}
function isAdmin()    { return hasRole(ROLES.ADMIN); }
function isStaff()    { return hasRole(ROLES.STAFF); }
function isAiutante() { return hasRole(ROLES.AIUTANTE); }
function isPremium()  { return hasRole(ROLES.PREMIUM); }
function isUtente()   { return !!currentUser && !isAiutante(); } // utente/premium ma non staff
function canEdit()    { return isStaff(); }
function canEditSpesa() { return !!currentUser; }

// Tipi evento visibili per ruolo
function tipiEventiPerRuolo(role) {
  if (role === ROLES.ADMIN || role === ROLES.STAFF)   return ['invito','premium','privato','segreto','consigliato'];
  if (role === ROLES.AIUTANTE)                        return ['invito','premium','privato','consigliato'];
  if (role === ROLES.PREMIUM)                         return ['invito','premium','consigliato'];
  return ['invito','consigliato'];
}

// ── DATI REMOTI (popolati da Supabase) ──────────────────────────
let EVENTI       = [];
let CONSIGLIATI  = [];
let BACHECA      = [
  { id:3, icon:'📌', titolo:'REGOLAMENTO',      testo:"Rispettare gli spazi comuni. Vietato introdurre bevande dall'esterno. Grazie.",                                    tempo:'01 MAR', foto:'' },
  { id:1, icon:'🔑', titolo:'OGGETTO SMARRITO', testo:"Trovato mazzo di chiavi con portachiavi rosso durante l'ultimo evento. Contattare lo staff.",                     tempo:'OGGI 14:30', foto:'' },
  { id:2, icon:'📢', titolo:'AVVISO PARCHEGGIO',testo:"Il parcheggio interno sarà chiuso sabato 22 marzo dalle 18:00 per l'allestimento.",                               tempo:'IER 10:15', foto:'' },
];
let INFO         = [
  { id:1, icon:'🚪', titolo:'COME ENTRARE', testo:"Suonare il campanello al cancello principale. Per gli eventi serali attendere l'apertura ufficiale. Portare sempre l'invito digitale o il codice evento." },
  { id:2, icon:'🅿️', titolo:'PARCHEGGIO',   testo:"Rispettare gli spazi delimitati. Non bloccare l'uscita di emergenza." },
  { id:3, icon:'🚨', titolo:'EMERGENZE',    testo:"Per qualsiasi emergenza consultare un membro dello staff." },
];
let SPESA        = [];
let LAVORI       = [
  { id:1, lavoro:'Pulire la sala',        who:'-', done:false },
  { id:2, lavoro:'Preparare il bancone',  who:'-', done:false },
  { id:3, lavoro:'Controllare i sistemi', who:'-', done:false },
  { id:4, lavoro:'Sistemare le luci',     who:'-', done:true  },
  { id:5, lavoro:'Riempire i frigoriferi',who:'-', done:false },
];
let PAGAMENTI    = [
  { name:'Chiaro', saldo:0, movimenti:[] },
  { name:'Lukas',  saldo:0, movimenti:[] },
  { name:'Adal',   saldo:0, movimenti:[] },
  { name:'Zappa',  saldo:0, movimenti:[] },
  { name:'Zaff',   saldo:0, movimenti:[] },
  { name:'Alex',   saldo:0, movimenti:[] },
  { name:'Ricia',  saldo:0, movimenti:[] },
];
let MAGAZZINO    = [
  { id:1,  nome:'Birra',              attuale:0, minimo:15, unita:'casse',     categoria:'alcolico',   costoUnitario:13.2  },
  { id:2,  nome:'Gin',                attuale:0, minimo:20, unita:'bottiglie', categoria:'alcolico',   costoUnitario:12    },
  { id:3,  nome:'Vodka liscia',       attuale:0, minimo:20, unita:'bottiglie', categoria:'alcolico',   costoUnitario:6.45  },
  { id:4,  nome:'Vodka alla menta',   attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:4.15  },
  { id:5,  nome:'Vodka alla fragola', attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:3.9   },
  { id:6,  nome:'Vodka alla pesca',   attuale:0, minimo:3,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:3.9   },
  { id:7,  nome:'Rum',                attuale:0, minimo:15, unita:'bottiglie', categoria:'alcolico',   costoUnitario:14.4  },
  { id:8,  nome:'Tequila',            attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:17.9  },
  { id:9,  nome:'Montenegro',         attuale:0, minimo:10, unita:'bottiglie', categoria:'alcolico',   costoUnitario:12.55 },
  { id:10, nome:'Jagermaister',       attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:15.9  },
  { id:11, nome:'Fireball',           attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:17.5  },
  { id:12, nome:'Sambuca',            attuale:0, minimo:2,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:12    },
  { id:13, nome:'Branca menta',       attuale:0, minimo:3,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:15.5  },
  { id:14, nome:'Whiskey',            attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:14.2  },
  { id:15, nome:'Tonica',             attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:5.7   },
  { id:16, nome:'Lemon',              attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:5.4   },
  { id:17, nome:'Red Bull',           attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:24    },
  { id:18, nome:'Pepsi',              attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:10.56 },
  { id:19, nome:'Thè al limone',      attuale:0, minimo:2,  unita:'casse',     categoria:'analcolico', costoUnitario:8.4   },
  { id:20, nome:'Thè alla pesca',     attuale:0, minimo:2,  unita:'casse',     categoria:'analcolico', costoUnitario:8.4   },
  { id:21, nome:'Acqua naturale',     attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:1.6   },
  { id:22, nome:'Acqua frizzante',    attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:1.6   },
];
let SUGGERIMENTI       = [];
let VALUTAZIONI        = [];
let EVENTI_VALUTAZIONI = {}; // { [eventId]: [{nome, stelle, testo, tempo}] }
let LOG                = [];
let CHAT               = [];

// ── LINK PAGES / EVENTI ─────────────────────────────────────────
let LINKS_PAGE = {
  info:    [{ id:1, label:'COME ARRIVARE', url:'https://maps.app.goo.gl/9dk64aM3XHCogoTL9', icon:'📍', desc:'Apri in Google Maps' }],
  bacheca: [],
};
let LINKS_EVENTO = {}; // { [eventId]: [{id, label, url, icon, desc}] }

// ── ID COUNTERS (aggiornati al load da Supabase) ─────────────────
const _nextIds = {
  event:      4,
  spesa:      1,
  lavori:     6,
  pagamenti:  8,
  magazzino: 23,
  bacheca:    4,
  info:       4,
};
function getNextId(type) { return _nextIds[type]++; }

let _nextLinkId      = 2;
let _lastSugTime     = 0; // timestamp ultimo suggerimento inviato

// ── COSTANTI UI ──────────────────────────────────────────────────
const T_SAVED     = '// SALVATO ✓';
const T_DELETED   = '// ELIMINATO';
const T_CFG_SAVED = '// CONFIGURAZIONE SALVATA ✓';

const MS_TOAST    = 3000;
const MS_ANIM     = 300;
const MS_DEBOUNCE = 600; // usato come default in supabase.js _debounce()

// ── TIPO EVENTO ──────────────────────────────────────────────────
const TIPO_COLOR     = { invito:'#22cc44', premium:'#c8a84b', privato:'#cc2200', segreto:'#a020f0', consigliato:'#00b4dc' };
const TIPO_LABEL     = { invito:'SU INVITO', premium:'PREMIUM', privato:'PRIVATO', segreto:'SEGRETO', consigliato:'CONSIGLIATO' };
const TIPO_CLASS     = { invito:'tipo-invito', premium:'tipo-premium', privato:'tipo-privato', segreto:'tipo-segreto', consigliato:'tipo-consigliato' };
const TIPO_TAG_CLASS = { invito:'tag-green', premium:'tag-gold', privato:'tag-red', segreto:'tag-purple', consigliato:'tag-cyan' };

// ── CALENDARIO ───────────────────────────────────────────────────
const MESI        = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
const GIORNI      = ['L','M','M','G','V','S','D'];
const GIORNI_FULL = ['LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO','DOMENICA'];

// ── DOM HELPERS ──────────────────────────────────────────────────
function $id(id)          { return document.getElementById(id); }
function $qs(sel, ctx)    { return (ctx || document).querySelector(sel); }
function setDisplay(id, v){ var el = $id(id); if (el) el.style.display = v; }
function showEl(id)       { setDisplay(id, 'block'); }
function hideEl(id)       { setDisplay(id, 'none'); }
function toggleEl(id, c)  { setDisplay(id, c ? 'block' : 'none'); }
function nl2br(s)         { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') : ''; }

// ── TAG HELPER ───────────────────────────────────────────────────
function tag(tipo) {
  return '<span class="tag ' + TIPO_TAG_CLASS[tipo] + '">' + TIPO_LABEL[tipo] + '</span>';
}

// ── ROLE LABEL ───────────────────────────────────────────────────
function roleLabel(role) {
  if (role === ROLES.ADMIN)    return { label:'★ ADMIN',    color:'#c8a84b', level:5 };
  if (role === ROLES.STAFF)    return { label:'★ STAFF',    color:'#cc2200', level:4 };
  if (role === ROLES.AIUTANTE) return { label:'✦ AIUTANTE', color:'#2a6b6b', level:3 };
  if (role === ROLES.PREMIUM)  return { label:'◈ PREMIUM',  color:'#6b1a6b', level:2 };
  return                              { label:'· UTENTE',   color:'#444',    level:1 };
}

// ── TIME HELPERS ─────────────────────────────────────────────────
function nowStr() {
  const n = new Date();
  return 'OGGI · ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
}

// ── LOG ──────────────────────────────────────────────────────────
let _unreadLog  = 0;
let _unreadChat = 0;

function addLog(azione) {
  if (!currentUser) return;
  LOG.unshift({ member: currentUser, azione: azione, tempo: nowStr() });
  _unreadLog++;
  if (typeof buildLog    === 'function') buildLog();
  if (typeof updateDash  === 'function') updateDash();
}

// ── GENERIC ITEM HELPERS ─────────────────────────────────────────
function deleteItem(array, index, name, buildFn, saveFn) {
  if (index < 0 || index >= array.length) return;
  var label = array[index].nome || array[index].lavoro || array[index].descrizione || name;
  showConfirm('Eliminare "' + label + '"?', function() {
    addLog('rimosso ' + name + ': ' + label);
    array.splice(index, 1);
    if (saveFn)  saveFn();
    if (buildFn) buildFn();
    showToast(T_DELETED, 'error');
  });
}

function toggleItem(array, index, name, buildFn, saveFn) {
  if (index < 0 || index >= array.length) return;
  array[index].done = !array[index].done;
  addLog((array[index].done ? 'completato' : 'riaperto') + ' ' + name + ': ' + (array[index].nome || array[index].lavoro || array[index].descrizione || ''));
  if (saveFn)  saveFn();
  if (buildFn) buildFn();
}

// ════════════════════════════════════════════════════════════════
// AUTH — Login / Logout / Sessione
// ════════════════════════════════════════════════════════════════

// ── Hashing password (SHA-256) ───────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function pwMatch(plain, stored) {
  if (!stored) return false;
  if (stored.startsWith('sha256:')) return (await sha256(plain)) === stored;
  return plain === stored; // migrazione in corso
}

// ── Migrazione password plaintext → SHA-256 ──────────────────────
async function migratePasswords() {
  let needsSave = false;
  for (const m of MEMBERS) {
    if (m.password && !m.password.startsWith('sha256:')) {
      m.password = await sha256(m.password);
      needsSave = true;
    }
  }
  if (needsSave && typeof saveMembers === 'function') saveMembers();
}

// ── Session persistence (localStorage) ──────────────────────────
function _writeSession(member) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      name: member.name,
      role: member.role,
      ts:   Date.now(),
    }));
  } catch(e) {}
}

function _clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}

function _readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

// ── Session timeout ──────────────────────────────────────────────
let _sessionTimer = null;

function resetSessionTimer() {
  if (!currentUser) return;
  clearTimeout(_sessionTimer);
  const ttl = getSessionTTL(currentUser.role);
  _sessionTimer = setTimeout(function() {
    if (!currentUser) return;
    showToast('// SESSIONE SCADUTA · EFFETTUA NUOVAMENTE IL LOGIN', 'error');
    setTimeout(function() {
      _doLogoutClean();
      if (typeof navigate === 'function') navigate('screenSplash');
    }, 2000);
  }, ttl);
}

// Resetta timer ad ogni interazione utente
['click','touchstart','keydown','scroll'].forEach(function(evt) {
  document.addEventListener(evt, function() {
    if (currentUser) resetSessionTimer();
  }, { passive: true });
});

// ── Pulizia stato interno al logout ─────────────────────────────
function _doLogoutClean() {
  clearTimeout(_sessionTimer);
  const staffScreen = $id('screenStaff');
  if (staffScreen) staffScreen.classList.remove('is-admin');
  currentUser = null;
  guestMode   = false;
  _clearSession();
  if (typeof buildAll              === 'function') buildAll();
  if (typeof updateHomeAccessLevel === 'function') updateHomeAccessLevel();
  if (typeof updatePageCfgBtns    === 'function') updatePageCfgBtns();
}

// ── Helper condiviso: applica UI post-login/restore ─────────────
// Usato da doLogin() e restoreSession() per evitare duplicazione.
function _applyLoginUI(member, toastMsg) {
  if (typeof buildAll              === 'function') buildAll();
  if (typeof updateHomeAccessLevel === 'function') updateHomeAccessLevel();
  if (typeof updatePageCfgBtns    === 'function') updatePageCfgBtns();

  if (isAiutante()) {
    const staffAvatar = $id('staffAvatar');
    const staffName   = $id('staffName');
    const staffRole   = $id('staffRole');
    const staffScreen = $id('screenStaff');
    if (staffAvatar && typeof renderAvatar === 'function') renderAvatar(staffAvatar, member);
    if (staffName)   staffName.textContent = member.name.toUpperCase();
    if (staffRole)   staffRole.textContent = roleLabel(member.role).label;
    if (staffScreen) staffScreen.classList.toggle('is-admin', isAdmin());
    if (typeof applyBenvenuto    === 'function') applyBenvenuto();
    if (typeof applyWidgetConfig === 'function') applyWidgetConfig();
    if (typeof applyTabConfig    === 'function') applyTabConfig();
    if (typeof showTab           === 'function') showTab('dashboard');
  }

  if (typeof applyPageSections === 'function') {
    applyPageSections('home');
    applyPageSections('bacheca');
    applyPageSections('info');
  }

  if (typeof navigate  === 'function') navigate('screenHome');
  if (typeof showToast === 'function') showToast(toastMsg, 'success');
  window.scrollTo(0, 0);
}

// ── Login ────────────────────────────────────────────────────────
async function doLogin() {
  const pw  = ($id('loginPw')?.value ?? '').trim();
  const err = $id('loginErr');
  if (!pw) { if (err) err.textContent = '// INSERISCI LA PASSWORD'; return; }

  let member = null;
  for (const m of MEMBERS) {
    if (await pwMatch(pw, m.password)) { member = m; break; }
  }

  if (!member)        { if (err) err.textContent = '// PASSWORD ERRATA';                                return; }
  if (member.sospeso) { if (err) err.textContent = '// ACCOUNT SOSPESO · CONTATTARE UN AMMINISTRATORE'; return; }

  currentUser = member;
  guestMode   = false;
  _writeSession(member);

  if ($id('loginPw')) $id('loginPw').value = '';
  if (err)            err.textContent = '';

  addLog('si è connesso');
  resetSessionTimer();
  _applyLoginUI(member, '// BENVENUTO, ' + member.name.toUpperCase());
}

// ── Logout ───────────────────────────────────────────────────────
function doLogout() {
  if (typeof showConfirm === 'function') {
    showConfirm('Sei sicuro di voler uscire?', function() {
      _doLogoutClean();
      if (typeof navigate === 'function') navigate('screenSplash');
    }, 'CONFERMA USCITA', 'ESCI');
  } else {
    _doLogoutClean();
  }
}

// ── Ripristino sessione al boot ──────────────────────────────────
// NOTA: restoreSession() deve essere chiamata SOLO dopo che loadAllData()
// è completata con successo, così i MEMBERS sono aggiornati da Supabase
// e il controllo del ruolo e dello stato sospeso è affidabile.
function restoreSession() {
  // Blocco di sicurezza: se loadAllData() non è ancora completata con successo,
  // i MEMBERS potrebbero essere solo il seed locale. Non ripristinare la sessione.
  if (!_membersReady) { console.warn('[restoreSession] MEMBERS non ancora pronti — skip'); return false; }

  const sess = _readSession();
  if (!sess) return false;

  // Cerca il membro nei dati aggiornati da Supabase
  const member = MEMBERS.find(m => m.name === sess.name);
  if (!member) { _clearSession(); return false; }

  // Usa il role REALE del member (da Supabase), non quello salvato in localStorage.
  // Questo evita che un vecchio token admin riattivi una sessione privilegiata
  // se il ruolo è stato cambiato o se il role in storage è corrotto.
  if (sess.role !== member.role) { _clearSession(); return false; }

  // Blocca il ripristino se l'account è stato sospeso nel frattempo
  if (member.sospeso) { _clearSession(); return false; }

  const elapsed = Date.now() - (sess.ts ?? 0);
  const ttl     = getSessionTTL(member.role);
  if (elapsed >= ttl) { _clearSession(); return false; }

  currentUser = member;
  _writeSession(member); // refresh timestamp
  resetSessionTimer();
  _applyLoginUI(member, '// BENTORNATO ' + member.name.toUpperCase());
  return true;
}

// ── Login page helper ────────────────────────────────────────────
function goToLogin() {
  const t = $id('loginTitle');
  const s = $id('loginSub');
  if (t) t.textContent = 'ACCESSO';
  if (s) s.textContent = 'INSERISCI LA PASSWORD';
  if (typeof navigate === 'function') navigate('screenLogin');
}
