// ════════════════════════════════════════
// DATA.JS — Variabili globali, costanti, ruoli,
//           configurazione iniziale e auth/sessione
// ════════════════════════════════════════

// ── Membri / credenziali ──
const MEMBERS = [
  { name:'Chiaro', initial:'C', color:'#cc2200', password:'sha256:bbb0c9661d4500af1a2ad1f82cbea006119b727d177e51cca3a2b23eaef51927', role:'admin' },
  { name:'Lukas',  initial:'L', color:'#1a6b3c', password:'sha256:2b2ff63949b46caaa980c971484ba099aea045a4cbe887bccf4faff00924484a', role:'staff' },
  { name:'Adal',   initial:'A', color:'#1a3a7a', password:'sha256:ee431cdcdf25341aafd8d67c35e6284ac7d5d7cb6c7cc0ac54a00f0440ab462d', role:'staff' },
  { name:'Zappa',  initial:'Z', color:'#6b1a6b', password:'sha256:4c63f163e41a37f4c2e034705b0b917bb475ae60a3dc86a2e0993042d80e1a9c', role:'staff' },
  { name:'Zaff',   initial:'Z', color:'#7a4a1a', password:'sha256:3b024d115de57e3adb6e098b6733b8ad72fb11b7cb1e0277efff8cb099018623', role:'staff' },
  { name:'Alex',   initial:'A', color:'#2a6b6b', password:'sha256:4135aa9dc1b842a653dea846903ddb95bfb8c5a10c504a7fa16e10bc31d1fdf0', role:'staff' },
  { name:'Ricia',  initial:'R', color:'#5a5a1a', password:'sha256:766ceea5fcdcc176646d2fcafd1dd08784bf17f38c7eee68438e06505ff6a9b8', role:'staff' },
  // Utenti registrati (area pubblica completa)
  { name:'Utente1',  initial:'U', color:'#444466', password:'sha256:9cdee5050fb57181e54646f487753dde73bc8e8c73843de92d01427420c64c23', role:'utente' },
  { name:'Utente2',  initial:'U', color:'#446644', password:'sha256:df21b1245419763295b2d582072ada296c09b458227f6176d36634c88c179a91', role:'utente' },
  { name:'Utente3',  initial:'U', color:'#664444', password:'sha256:d7843fc12f2260537ce74087e09f296cab80c1b4b1e8c5eb2d1b6250b5f5ce51', role:'utente' },
];

// ── Costanti ruoli ──
const ROLES = {
  ADMIN:    'admin',
  STAFF:    'staff',
  AIUTANTE: 'aiutante',
  PREMIUM:  'premium',
  UTENTE:   'utente'
};

// ── Stato sessione ──
// Livello accesso corrente: null=ospite, 'utente'=registrato, 'staff'/'admin'=staff
// guestMode: true quando si entra con ENTRA (nessun login)
let currentUser = null;
let guestMode = false;

// ── Costanti toast ──
const T_SAVED     = '// SALVATO ✓';
const T_DELETED   = '// ELIMINATO';
const T_CFG_SAVED = '// CONFIGURAZIONE SALVATA ✓';

// ── Costanti timing ──
const MS_TOAST    = 3000;
const MS_ANIM     = 300;
const MS_DEBOUNCE = 400;

// ── Costanti date/calendario ──
const MESI = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
const GIORNI = ['L','M','M','G','V','S','D'];
const GIORNI_FULL = ['LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO','DOMENICA'];

// ── Costanti tipo evento ──
const TIPO_COLOR = { invito:'#22cc44', premium:'#c8a84b', privato:'#cc2200', segreto:'#a020f0', consigliato:'#00b4dc' };
const TIPO_LABEL = { invito:'SU INVITO', premium:'PREMIUM', privato:'PRIVATO', segreto:'SEGRETO', consigliato:'CONSIGLIATO' };
const TIPO_CLASS = { invito:'tipo-invito', premium:'tipo-premium', privato:'tipo-privato', segreto:'tipo-segreto', consigliato:'tipo-consigliato' };
const TIPO_TAG_CLASS = { invito:'tag-green', premium:'tag-gold', privato:'tag-red', segreto:'tag-purple', consigliato:'tag-cyan' };

// ── Dati iniziali applicazione ──
let CONSIGLIATI = [];
let EVENTI = []; // caricati da Supabase (tabella calendario)

let BACHECA = [
  { id:3, icon:'📌', titolo:'REGOLAMENTO', testo:"Rispettare gli spazi comuni. Vietato introdurre bevande dall'esterno. Grazie.", tempo:'01 MAR', foto:'' },
  { id:1, icon:'🔑', titolo:'OGGETTO SMARRITO', testo:"Trovato mazzo di chiavi con portachiavi rosso durante l'ultimo evento. Contattare lo staff.", tempo:'OGGI 14:30', foto:'' },
  { id:2, icon:'📢', titolo:'AVVISO PARCHEGGIO', testo:"Il parcheggio interno sarà chiuso sabato 22 marzo dalle 18:00 per l'allestimento.", tempo:'IER 10:15', foto:'' },
];

let SUGGERIMENTI = [];
var _lastSugTime = 0;
let VALUTAZIONI  = [];
let EVENTI_VALUTAZIONI = {}; // { [eventId]: [{nome, stelle, testo, tempo}] }

let INFO = [
  { id:1, icon:'🚪', titolo:'COME ENTRARE', testo:"Suonare il campanello al cancello principale. Per gli eventi serali attendere l'apertura ufficiale. Portare sempre l'invito digitale o il codice evento." },
  { id:2, icon:'🅿️', titolo:'PARCHEGGIO', testo:"Rispettare gli spazi delimitati. Non bloccare l'uscita di emergenza." },
  { id:3, icon:'🚨', titolo:'EMERGENZE', testo:"per qualsiasi emergenza consultare un membro dello staff" },
];

// LINKS_PAGE: link per Info e Bacheca (indipendenti per pagina)
let LINKS_PAGE = {
  info:    [ { id:1, label:'COME ARRIVARE', url:'https://maps.app.goo.gl/9dk64aM3XHCogoTL9', icon:'📍', desc:'Apri in Google Maps' } ],
  bacheca: [],
};
// LINKS_EVENTO: { [eventId]: [ {id, label, url, icon, desc}, ... ] }
let LINKS_EVENTO = {};
var _nextLinkId = 2;

let SPESA = [];

let LAVORI = [
  { id:1, lavoro:'Pulire la sala',           who:'-', done:false },
  { id:2, lavoro:'Preparare il bancone',     who:'-', done:false },
  { id:3, lavoro:'Controllare i sistemi',    who:'-', done:false },
  { id:4, lavoro:'Sistemare le luci',        who:'-', done:true  },
  { id:5, lavoro:'Riempire i frigoriferi',   who:'-', done:false },
];

let PAGAMENTI = [
  { name:'Chiaro', saldo:0, movimenti:[] },
  { name:'Lukas',  saldo:0, movimenti:[] },
  { name:'Adal',   saldo:0, movimenti:[] },
  { name:'Zappa',  saldo:0, movimenti:[] },
  { name:'Zaff',   saldo:0, movimenti:[] },
  { name:'Alex',   saldo:0, movimenti:[] },
  { name:'Ricia',  saldo:0, movimenti:[] },
];

let MAGAZZINO = [
  { id:1,  nome:'Birra',             attuale:0, minimo:15, unita:'casse',     categoria:'alcolico',   costoUnitario:13.2  },
  { id:2,  nome:'Gin',               attuale:0, minimo:20, unita:'bottiglie', categoria:'alcolico',   costoUnitario:12    },
  { id:3,  nome:'Vodka liscia',      attuale:0, minimo:20, unita:'bottiglie', categoria:'alcolico',   costoUnitario:6.45  },
  { id:4,  nome:'Vodka alla menta',  attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:4.15  },
  { id:5,  nome:'Vodka alla fragola',attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:3.9   },
  { id:6,  nome:'Vodka alla pesca',  attuale:0, minimo:3,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:3.9   },
  { id:7,  nome:'Rum',               attuale:0, minimo:15, unita:'bottiglie', categoria:'alcolico',   costoUnitario:14.4  },
  { id:8,  nome:'Tequila',           attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:17.9  },
  { id:9,  nome:'Montenegro',        attuale:0, minimo:10, unita:'bottiglie', categoria:'alcolico',   costoUnitario:12.55 },
  { id:10, nome:'Jagermaister',      attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:15.9  },
  { id:11, nome:'Fireball',          attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:17.5  },
  { id:12, nome:'Sambuca',           attuale:0, minimo:2,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:12    },
  { id:13, nome:'Branca menta',      attuale:0, minimo:3,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:15.5  },
  { id:14, nome:'Whiskey',           attuale:0, minimo:5,  unita:'bottiglie', categoria:'alcolico',   costoUnitario:14.2  },
  { id:15, nome:'Tonica',            attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:5.7   },
  { id:16, nome:'Lemon',             attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:5.4   },
  { id:17, nome:'Red Bull',          attuale:0, minimo:10, unita:'casse',     categoria:'analcolico', costoUnitario:24    },
  { id:18, nome:'Pepsi',             attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:10.56 },
  { id:19, nome:'Thè al limone',     attuale:0, minimo:2,  unita:'casse',     categoria:'analcolico', costoUnitario:8.4   },
  { id:20, nome:'Thè alla pesca',    attuale:0, minimo:2,  unita:'casse',     categoria:'analcolico', costoUnitario:8.4   },
  { id:21, nome:'Acqua naturale',    attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:1.6   },
  { id:22, nome:'Acqua frizzante',   attuale:0, minimo:5,  unita:'casse',     categoria:'analcolico', costoUnitario:1.6   },
];

let LOG = [];

// ── ID generator ──
const _nextIds = {
  event: 4,      // EVENTI ha id fino a 3
  spesa: 1,      // SPESA è vuota all'avvio
  lavori: 6,     // LAVORI ha id fino a 5
  pagamenti: 8,  // PAGAMENTI ha id fino a 7
  magazzino: 23, // MAGAZZINO ha id fino a 22
  bacheca: 4,    // BACHECA ha id fino a 3
  info: 4        // INFO ha id fino a 3
};
function getNextId(type) { return _nextIds[type]++; }

// ════════════════════════════════════════
// PERMISSIONS
// ════════════════════════════════════════
function isStaff()    { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN); }
function isAdmin()    { return !!currentUser && currentUser.role === ROLES.ADMIN; }
function isAiutante() { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.AIUTANTE); }
function isUtente()   { return !!currentUser && (currentUser.role === ROLES.UTENTE || currentUser.role === ROLES.PREMIUM); }

function canEdit()      { return isStaff(); }
function canEditSpesa() { return !!currentUser; }

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function enterAsGuest() {
  guestMode = true;
  currentUser = null;
  buildAll();
  updateHomeAccessLevel();
  navigate('screenHome');
}

// ── Hashing password (SHA-256 via crypto.subtle) ──
async function sha256(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return 'sha256:' + Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

// Confronto: gestisce sia hash che plain (transizione)
async function pwMatch(input, stored) {
  if (stored && stored.startsWith('sha256:')) {
    return (await sha256(input)) === stored;
  }
  // password ancora in chiaro (pre-migrazione) — confronto diretto
  return input === stored;
}

// Migra tutte le password in chiaro → hash (chiamata all'avvio)
async function migratePasswords() {
  var needsSave = false;
  for (var i = 0; i < MEMBERS.length; i++) {
    if (MEMBERS[i].password && !MEMBERS[i].password.startsWith('sha256:')) {
      MEMBERS[i].password = await sha256(MEMBERS[i].password);
      needsSave = true;
    }
  }
  if (needsSave) saveMembers();
}

async function doLogin() {
  var pw = document.getElementById('loginPw').value.trim();
  var err = document.getElementById('loginErr');
  if (!pw) { err.textContent = '// INSERISCI LA PASSWORD'; return; }
  var member = null;
  for (var i = 0; i < MEMBERS.length; i++) {
    if (await pwMatch(pw, MEMBERS[i].password)) { member = MEMBERS[i]; break; }
  }
  if (!member) { err.textContent = '// PASSWORD ERRATA'; return; }
  if (member.sospeso) { err.textContent = '// ACCOUNT SOSPESO · CONTATTARE UN AMMINISTRATORE'; return; }
  currentUser = member;
  // Salva sessione persistente
  try {
    localStorage.setItem('bunker23_session', JSON.stringify({ name: member.name, role: member.role, ts: Date.now() }));
  } catch(e) {}
  guestMode = false;
  document.getElementById('loginPw').value = '';
  err.textContent = '';
  addLog('si è connesso');
  buildAll();
  updateHomeAccessLevel();
  window.scrollTo(0, 0);
  showToast('// BENVENUTO, ' + member.name.toUpperCase(), 'success');
  resetSessionTimer();
  if (member.role === ROLES.STAFF || member.role === ROLES.ADMIN || member.role === ROLES.AIUTANTE) {
    renderAvatar(document.getElementById('staffAvatar'), member);
    document.getElementById('staffName').textContent = member.name.toUpperCase();
    document.getElementById('staffRole').textContent = roleLabel(member.role).label;
    var staffScreen = document.getElementById('screenStaff');
    staffScreen.classList.toggle('is-admin', member.role === ROLES.ADMIN);
    applyBenvenuto();
    applyWidgetConfig();
    applyTabConfig();
    showTab('dashboard');
  }
  updatePageCfgBtns();
  applyPageSections('home');
  applyPageSections('bacheca');
  applyPageSections('info');
  navigate('screenHome');
}

function goToLogin() {
  var t = document.getElementById('loginTitle');
  var s = document.getElementById('loginSub');
  if (t) t.textContent = 'ACCESSO';
  if (s) s.textContent = 'INSERISCI LA PASSWORD';
  navigate('screenLogin');
}

// ── Timeout sessione — 30 minuti di inattività ──
var _sessionTimer = null;
var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min

function resetSessionTimer() {
  if (!currentUser) return;
  clearTimeout(_sessionTimer);
  _sessionTimer = setTimeout(function() {
    if (!currentUser) return;
    showToast('// SESSIONE SCADUTA · EFFETTUA NUOVAMENTE IL LOGIN', 'error');
    setTimeout(function() {
      document.getElementById('screenStaff').classList.remove('is-admin');
      currentUser = null;
      guestMode = false;
      try { localStorage.removeItem('bunker23_session'); } catch(e) {}
      buildAll();
      updateHomeAccessLevel();
      updatePageCfgBtns();
      navigate('screenSplash');
    }, 2000);
  }, SESSION_TIMEOUT);
}

// Resetta il timer ad ogni interazione
['click','touchstart','keydown','scroll'].forEach(function(evt) {
  document.addEventListener(evt, resetSessionTimer, { passive: true });
});

function doLogout() {
  showConfirm('Sei sicuro di voler uscire?', function() {
    clearTimeout(_sessionTimer);
    document.getElementById('screenStaff').classList.remove('is-admin');
    currentUser = null;
    guestMode = false;
    try { localStorage.removeItem('bunker23_session'); } catch(e) {}
    buildAll();
    updateHomeAccessLevel();
    updatePageCfgBtns();
    navigate('screenSplash');
  }, 'CONFERMA USCITA', 'ESCI');
}

// ── Ripristino sessione (chiamata da DOMContentLoaded in index.html) ──
function restoreSession() {
  try {
    var savedSession = localStorage.getItem('bunker23_session');
    if (savedSession) {
      var sess = JSON.parse(savedSession);
      var elapsed = Date.now() - (sess.ts || 0);
      var isStaffRole = (sess.role === 'admin' || sess.role === 'staff' || sess.role === 'aiutante');
      var MAX_SESSION = isStaffRole ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      if (elapsed < MAX_SESSION) {
        var member = MEMBERS.find(function(m) { return m.name === sess.name; });
        if (member) {
          currentUser = member;
          localStorage.setItem('bunker23_session', JSON.stringify({ name: member.name, role: member.role, ts: Date.now() }));
          resetSessionTimer();
          buildAll();
          updateHomeAccessLevel();
          updatePageCfgBtns();
          if (member.role === ROLES.STAFF || member.role === ROLES.ADMIN || member.role === ROLES.AIUTANTE) {
            renderAvatar(document.getElementById('staffAvatar'), member);
            document.getElementById('staffName').textContent = member.name.toUpperCase();
            document.getElementById('staffRole').textContent = roleLabel(member.role).label;
            var staffScreen = document.getElementById('screenStaff');
            staffScreen.classList.toggle('is-admin', member.role === ROLES.ADMIN);
            applyBenvenuto();
            applyWidgetConfig();
            applyTabConfig();
            showTab('dashboard');
          }
          applyPageSections('home');
          applyPageSections('bacheca');
          applyPageSections('info');
          navigate('screenHome');
          showToast('// BENTORNATO ' + member.name.toUpperCase(), 'ok');
        } else {
          localStorage.removeItem('bunker23_session');
        }
      } else {
        localStorage.removeItem('bunker23_session');
      }
    }
  } catch(e) {}
}
