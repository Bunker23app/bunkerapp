// ════════════════════════════════════════
// DATA.JS — Costanti, variabili globali e dati iniziali
// Nessuna dipendenza da funzioni di index.html o supabase.js
// ════════════════════════════════════════

// ── Costanti ruoli ──
const ROLES = {
  ADMIN:    'admin',
  STAFF:    'staff',
  AIUTANTE: 'aiutante',
  PREMIUM:  'premium',
  UTENTE:   'utente'
};

// ── Stato sessione ──
// MEMBERS parte vuoto: viene popolato ESCLUSIVAMENTE da Supabase in loadAllData()
// Non ci sono utenti hardcoded: la fonte di verità è il DB
let MEMBERS = [];

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
const TIPO_COLOR    = { invito:'#22cc44', premium:'#c8a84b', privato:'#cc2200', segreto:'#a020f0', consigliato:'#00b4dc' };
const TIPO_LABEL    = { invito:'SU INVITO', premium:'PREMIUM', privato:'PRIVATO', segreto:'SEGRETO', consigliato:'CONSIGLIATO' };
const TIPO_CLASS    = { invito:'tipo-invito', premium:'tipo-premium', privato:'tipo-privato', segreto:'tipo-segreto', consigliato:'tipo-consigliato' };
const TIPO_TAG_CLASS = { invito:'tag-green', premium:'tag-gold', privato:'tag-red', segreto:'tag-purple', consigliato:'tag-cyan' };

// ── Dati applicazione (fallback iniziale — sovrascritt da Supabase) ──
let CONSIGLIATI = [];
let EVENTI = [];

let BACHECA = [
  { id:3, icon:'📌', titolo:'REGOLAMENTO', testo:"Rispettare gli spazi comuni. Vietato introdurre bevande dall'esterno. Grazie.", tempo:'01 MAR', foto:'' },
  { id:1, icon:'🔑', titolo:'OGGETTO SMARRITO', testo:"Trovato mazzo di chiavi con portachiavi rosso durante l'ultimo evento. Contattare lo staff.", tempo:'OGGI 14:30', foto:'' },
  { id:2, icon:'📢', titolo:'AVVISO PARCHEGGIO', testo:"Il parcheggio interno sarà chiuso sabato 22 marzo dalle 18:00 per l'allestimento.", tempo:'IER 10:15', foto:'' },
];

let SUGGERIMENTI = [];
var _lastSugTime = 0;
let VALUTAZIONI  = [];
let EVENTI_VALUTAZIONI = {};

let INFO = [
  { id:1, icon:'🚪', titolo:'COME ENTRARE', testo:"Suonare il campanello al cancello principale. Per gli eventi serali attendere l'apertura ufficiale. Portare sempre l'invito digitale o il codice evento." },
  { id:2, icon:'🅿️', titolo:'PARCHEGGIO', testo:"Rispettare gli spazi delimitati. Non bloccare l'uscita di emergenza." },
  { id:3, icon:'🚨', titolo:'EMERGENZE', testo:"per qualsiasi emergenza consultare un membro dello staff" },
];

let LINKS_PAGE = {
  info:    [ { id:1, label:'COME ARRIVARE', url:'https://maps.app.goo.gl/9dk64aM3XHCogoTL9', icon:'📍', desc:'Apri in Google Maps' } ],
  bacheca: [],
};
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

let PAGAMENTI = [];

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
  event:     1,
  spesa:     1,
  lavori:    6,
  pagamenti: 1,
  magazzino: 23,
  bacheca:   4,
  info:      4
};
function getNextId(type) { return _nextIds[type]++; }

// ════════════════════════════════════════
// PERMISSIONS
// (usano currentUser definito sopra)
// ════════════════════════════════════════
function isStaff()    { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN); }
function isAdmin()    { return !!currentUser && currentUser.role === ROLES.ADMIN; }
function isAiutante() { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.AIUTANTE); }
function isUtente()   { return !!currentUser && (currentUser.role === ROLES.UTENTE || currentUser.role === ROLES.PREMIUM); }

function canEdit()      { return isStaff(); }
function canEditSpesa() { return !!currentUser; }
