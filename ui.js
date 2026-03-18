// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════
let MEMBERS = [
  { name:'Chiaro', initial:'C', color:'#cc2200', password:'sha256:bbb0c9661d4500af1a2ad1f82cbea006119b727d177e51cca3a2b23eaef51927', role:'admin' },
  { name:'Lukas',  initial:'L', color:'#1a6b3c', password:'sha256:2b2ff63949b46caaa980c971484ba099aea045a4cbe887bccf4faff00924484a', role:'staff' },
  { name:'Adal',   initial:'A', color:'#1a3a7a', password:'sha256:ee431cdcdf25341aafd8d67c35e6284ac7d5d7cb6c7cc0ac54a00f0440ab462d', role:'staff' },
  { name:'Zappa',  initial:'Z', color:'#6b1a6b', password:'sha256:4c63f163e41a37f4c2e034705b0b917bb475ae60a3dc86a2e0993042d80e1a9c', role:'staff' },
  { name:'Zaff',   initial:'Z', color:'#7a4a1a', password:'sha256:3b024d115de57e3adb6e098b6733b8ad72fb11b7cb1e0277efff8cb099018623', role:'staff' },
  { name:'Alex',   initial:'A', color:'#2a6b6b', password:'sha256:4135aa9dc1b842a653dea846903ddb95bfb8c5a10c504a7fa16e10bc31d1fdf0', role:'staff' },
  { name:'Ricia',  initial:'R', color:'#5a5a1a', password:'sha256:766ceea5fcdcc176646d2fcafd1dd08784bf17f38c7eee68438e06505ff6a9b8', role:'staff' },
  // Utenti registrati (area pubblica completa)
  // [nessun utente di default — creare gli utenti dall'app]
];

// Cache cronologia utenti — caricata in bulk all'avvio per ricerca/filtri avanzati
var MEMBERS_HISTORY = [];

// Stato filtri widget membri
var _membriFilter = {
  query:         '',
  searchOriginal: false,
  method:        'all',   // 'all' | 'qr' | 'manual'
  invitedBy:     'all',   // 'all' | <nome invitante>
  role:          'all',   // 'all' | 'admin' | 'staff' | 'aiutante' | 'premium' | 'utente'
};

// Livello accesso corrente: null=ospite, 'utente'=registrato, 'staff'/'admin'=staff
// guestMode: true quando si entra con ENTRA (nessun login)

// tipo: 'invito' | 'premium' | 'privato' | 'segreto'
/* ── Costanti ruoli ── */
const ROLES = {
  ADMIN:    'admin',
  STAFF:    'staff',
  AIUTANTE: 'aiutante',
  PREMIUM:  'premium',
  UTENTE:   'utente'
};

/* ── DOM helpers ── */
function $id(id) { return document.getElementById(id); }
function nl2br(s) { return s ? s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>") : ""; }
function $qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function setDisplay(id, val) { var el = $id(id); if (el) el.style.display = val; }

/* ── Toast costanti ── */
const T_SAVED     = '// SALVATO ✓';
const T_DELETED   = '// ELIMINATO';
const T_CFG_SAVED = '// CONFIGURAZIONE SALVATA ✓';

/* ── Timing costanti ── */
const MS_TOAST    = 3000;
const MS_ANIM     = 300;
const MS_DEBOUNCE = 400;

let CONSIGLIATI = [];
let EVENTI = []; // caricati da Supabase (tabella calendario)

let BACHECA = [
  { id:3, icon:'📌', titolo:'REGOLAMENTO', testo:"Rispettare gli spazi comuni. Vietato introdurre bevande dall'esterno. Grazie.", tempo:'01 MAR', foto:'' },
  { id:1, icon:'🔑', titolo:'OGGETTO SMARRITO', testo:"Trovato mazzo di chiavi con portachiavi rosso durante l'ultimo evento. Contattare lo staff.", tempo:'OGGI 14:30', foto:'' },
  { id:2, icon:'📢', titolo:'AVVISO PARCHEGGIO', testo:"Il parcheggio interno sarà chiuso sabato 22 marzo dalle 18:00 per l'allestimento.", tempo:'IER 10:15', foto:'' },
];

let SUGGERIMENTI = [];
var _lastSugTime = 0; // timestamp ultimo suggerimento inviato
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
// Set degli id spesa eliminati manualmente dall'utente in questa sessione.
// Serve a impedire a syncMagazzinoWithSpesa di reinserire voci [AUTO]
// che l'utente ha appena cancellato. Si resetta al ricaricamento dei dati.
var _manuallyDeletedSpesaIds = {};

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
let currentUser = null;
let guestMode = false; // true = ospite (solo calendario)

// ID evento da aprire direttamente (proveniente da notifica push via ?evento=ID nell'URL)
var _pendingEventoId = (function() {
  try {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('evento');
    if (id) {
      // Pulisce il parametro dall'URL senza ricaricare la pagina
      var cleanUrl = window.location.pathname + window.location.hash;
      history.replaceState(null, '', cleanUrl);
      return id;
    }
  } catch(e) {}
  return null;
})();

// ════════════════════════════════════════
// UTILS
// ════════════════════════════════════════
const MESI = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
const GIORNI = ['L','M','M','G','V','S','D'];
const GIORNI_FULL = ['LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO','DOMENICA'];

const TIPO_COLOR = { invito:'#22cc44', premium:'#c8a84b', privato:'#cc2200', segreto:'#a020f0', consigliato:'#00b4dc' };
const TIPO_LABEL = { invito:'SU INVITO', premium:'PREMIUM', privato:'PRIVATO', segreto:'SEGRETO', consigliato:'CONSIGLIATO' };
const TIPO_CLASS = { invito:'tipo-invito', premium:'tipo-premium', privato:'tipo-privato', segreto:'tipo-segreto', consigliato:'tipo-consigliato' };
const TIPO_TAG_CLASS = { invito:'tag-green', premium:'tag-gold', privato:'tag-red', segreto:'tag-purple', consigliato:'tag-cyan' };

function tag(tipo) {
  return '<span class="tag ' + TIPO_TAG_CLASS[tipo] + '">' + TIPO_LABEL[tipo] + '</span>';
}

function nowStr() {
  const n = new Date();
  return 'OGGI · ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
}

function addLog(azione) {
  if (!currentUser) return;
  LOG.unshift({ member: currentUser, azione: azione, tempo: nowStr() });
  _unreadLog++;
  buildLog();
  updateDash();
}

// ════════════════════════════════════════
// PERMISSIONS
// ════════════════════════════════════════
function isStaff()    { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN); }
function isAdmin()    { return !!currentUser && currentUser.role === ROLES.ADMIN; }
function isAiutante() { return !!currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.AIUTANTE); }
function isUtente()   { return !!currentUser && (currentUser.role === ROLES.UTENTE || currentUser.role === ROLES.PREMIUM); }

function canEdit()     { return isStaff(); }

function _checkPerm(perm) {
  if (!currentUser) return false;
  if (perm === ROLES.ADMIN)    return isAdmin();
  if (perm === ROLES.STAFF)    return isStaff();
  if (perm === ROLES.AIUTANTE) return isAiutante();
  return false;
}
function canAddUser() {
  // Solo admin può creare profili (tramite modale) o inviti QR
  if (isAdmin()) return true;
  if (isStaff()) return true;
  return false;
}

// Controlla se l'utente corrente può modificare il livello di altri utenti
function canPromoteUsers() {
  if (isAdmin()) return true;
  if (currentUser && currentUser.canPromote) return true;
  return false;
}

// ════════════════════════════════════════
// CONSOLIDATED UTILITIES
// ════════════════════════════════════════
// ID Generator
const _nextIds = {
  event: 4,    // EVENTI ha id fino a 3
  spesa: 1,    // SPESA è vuota all'avvio
  lavori: 6,   // LAVORI ha id fino a 5
  pagamenti: 8, // PAGAMENTI ha id fino a 7
  magazzino: 23,  // MAGAZZINO ha id fino a 22
  bacheca: 4,   // BACHECA ha id fino a 3
  info: 4       // INFO ha id fino a 3
};
function getNextId(type) { return _nextIds[type]++; }

// Generic item delete
function deleteItem(array, index, name, buildFn, saveFn) {
  if (index < 0 || index >= array.length) return;
  var label = array[index].nome || array[index].lavoro || array[index].descrizione || name;
  showConfirm('Eliminare "' + label + '"?', function() {
    addLog('rimosso ' + name + ': ' + label);
    array.splice(index, 1);
    if (saveFn) saveFn();
    buildFn();
    showToast(T_DELETED, 'error');
  });
}

// Generic item toggle done
function toggleItem(array, index, name, buildFn, saveFn) {
  if (index < 0 || index >= array.length) return;
  array[index].done = !array[index].done;
  addLog((array[index].done ? 'completato' : 'riaperto') + ' ' + name + ': ' + (array[index].nome || array[index].lavoro || array[index].descrizione || ''));
  if (saveFn) saveFn();
  buildFn();
}

// Generic modal opener
function handleStaffBtn() {
  var _isStaff = isAiutante();
  var _isUtente = isUtente();
  if (_isStaff) {
    showTab('dashboard');
    navigate('screenStaff');
  } else if (_isUtente) {
    openProfiloUtente();
  } else {
    // Arrivo dal pulsante staff → titolo STAFF
    var t = document.getElementById('loginTitle');
    var s = document.getElementById('loginSub');
    if (t) t.textContent = 'STAFF';
    if (s) s.textContent = 'ACCESSO RISERVATO';
    navigate('screenLogin');
  }
}

function openProfiloUtente() {
  if (!currentUser) return;
  $id('modalTitle').textContent = 'IL MIO PROFILO';

  var colorSwatches = ['#cc2200','#1a6b3c','#1a3a7a','#6b1a6b','#7a4a1a','#2a6b6b','#5a5a1a','#4a2a6b','#6b4a2a','#1a5a5a','#8b2200','#2a4a8b','#5a1a3a','#1a5a2a','#8b6b00','#3a1a6b'];
  var swatchesHtml = colorSwatches.map(function(col) {
    var sel = col === currentUser.color ? ' selected' : '';
    return '<div class="color-swatch' + sel + '" style="background:' + col + '" onclick="selectUtenteColor(this,\'' + col + '\')"></div>';
  }).join('');

  $id('modalBody').innerHTML =
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">' +
      '<div style="position:relative;flex-shrink:0">' +
        '<div id="uteAvatar" style="width:48px;height:48px;border-radius:50%;background:' + currentUser.color + ';display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:20px;color:#fff;overflow:hidden">' + (currentUser.photo ? '<img src="' + currentUser.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/>' : currentUser.initial) + '</div>' +
        '<button id="UteFotoBtn" title="Carica foto" style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:#222;border:1px solid #444;color:#aaa;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">📷</button>' +
        (currentUser.photo ? '<button id="UteDelFotoBtn" title="Elimina foto" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#1a0000;border:1px solid #cc2200;color:#cc2200;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>' : '') +
      '</div>' +
      '<div><div style="font-family:monospace;font-size:12px;letter-spacing:3px;color:var(--white)" id="uteNomeLabel">' + currentUser.name.toUpperCase() + '</div>' +
      '<div style="font-family:monospace;font-size:8px;color:#444;letter-spacing:1px">' + roleLabel(currentUser.role).label + '</div></div>' +
    '</div>' +
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="uteNome" value="' + currentUser.name + '" oninput="var av=document.getElementById(\'uteAvatar\');if(!av.querySelector(\'img\')){av.textContent=this.value.charAt(0).toUpperCase();}document.getElementById(\'uteNomeLabel\').textContent=this.value.toUpperCase()"/></div>' +
    '<div style="margin-top:12px"><label class="modal-label">// COLORE AVATAR</label>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="uteColorPicker">' + swatchesHtml + '</div></div>' +
    '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">' +
    '<label class="modal-label">// CAMBIA PASSWORD</label>' +
    '<input class="modal-input" id="utePwAttuale" type="password" placeholder="Password attuale" style="margin-bottom:6px"/>' +
    '<input class="modal-input" id="utePwNuova" type="password" placeholder="Nuova password" style="margin-bottom:6px"/>' +
    '<input class="modal-input" id="utePwConferma" type="password" placeholder="Conferma password"/>' +
    '<div id="utePwError" style="font-family:var(--mono);font-size:9px;color:var(--red);letter-spacing:2px;min-height:16px;margin-top:4px"></div>' +
    '</div>';

  // Sezione QR ricevuti (aggiunta dopo)

  window._modalCb = async function() {
    var nome = document.getElementById('uteNome').value.trim();
    if (!nome) return;
    // Cambio password (opzionale)
    var att = document.getElementById('utePwAttuale').value;
    var nuova = document.getElementById('utePwNuova').value.trim();
    var conf = document.getElementById('utePwConferma').value.trim();
    var errEl = document.getElementById('utePwError');
    if (att || nuova || conf) {
      if (!(await pwMatch(att, currentUser.password))) { errEl.textContent = '// PASSWORD ATTUALE ERRATA'; return; }
      if (nuova.length < 4) { errEl.textContent = '// PASSWORD TROPPO CORTA (min 4)'; return; }
      if (nuova !== conf) { errEl.textContent = '// LE PASSWORD NON COINCIDONO'; return; }
      var nuovaHash = await sha256(nuova);
      currentUser.password = nuovaHash;
      addLog('ha cambiato la password');
    }
    // Controlla se il nome è già usato da un altro membro (case-insensitive)
    if (nome.toLowerCase() !== currentUser.name.toLowerCase()) {
      for (var mi = 0; mi < MEMBERS.length; mi++) {
        if (MEMBERS[mi].name !== currentUser.name && MEMBERS[mi].name.toLowerCase() === nome.toLowerCase()) {
          var errEl2 = document.getElementById('utePwError');
          if (errEl2) errEl2.textContent = '// NICKNAME GIÀ UTILIZZATO — SCEGLINE UN ALTRO';
          return;
        }
      }
    }
    if (nome !== currentUser.name) currentUser._oldName = currentUser.name;
    currentUser.name = nome;
    currentUser.initial = nome.charAt(0).toUpperCase();
    addLog('ha aggiornato il profilo');
    saveMembers();
    buildAll();
    closeModal();
  };
  openModal();
  // Attiva pulsante foto dopo che il modal è nel DOM
  setTimeout(function() {
    var fotoBtn = document.getElementById('UteFotoBtn');
    if (fotoBtn) fotoBtn.onclick = function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        compressAndSavePhoto(inp.files[0], function(b64) {
          currentUser.photo = b64;
          var av = document.getElementById('uteAvatar');
          if (av) { av.style.background = 'transparent'; av.innerHTML = '<img src="' + b64 + '" style="width:100%;height:100%;object-fit:cover;display:block"/>'; }
          addLog('ha aggiornato la foto profilo');
          saveMembers();
        });
      };
      inp.click();
    };
    var delFotoBtn = document.getElementById('UteDelFotoBtn');
    if (delFotoBtn) delFotoBtn.onclick = function() {
      currentUser.photo = null;
      var av = document.getElementById('uteAvatar');
      if (av) {
        av.style.background = currentUser.color;
        av.innerHTML = currentUser.initial;
      }
      var btn = document.getElementById('UteDelFotoBtn');
      if (btn) btn.remove();
      addLog('ha rimosso la foto profilo');
      saveMembers();
    };
    // Genera QR nel profilo per ogni invito ricevuto

    // Pulsante PAGAMENTI per Lv12 presenti nella tabella pagamenti
    if (currentUser && (currentUser.role === ROLES.UTENTE || currentUser.role === ROLES.PREMIUM)) {
      var _inPag = PAGAMENTI.some(function(p){ return p.name === currentUser.name; });
      if (_inPag) {
        var _modalBody = document.getElementById('modalBody');
        if (_modalBody) {
          var _pagBtn = document.createElement('button');
          _pagBtn.textContent = '💳 I MIEI PAGAMENTI';
          _pagBtn.style.cssText = 'width:100%;margin-top:16px;padding:12px;background:transparent;border:1px solid #8855cc;color:#aa77ee;font-family:var(--mono);font-size:10px;letter-spacing:2px;border-radius:2px;cursor:pointer;text-align:left;';
          _pagBtn.onclick = function() {
            closeModal();
            renderAvatar(document.getElementById('staffAvatar'), currentUser);
            document.getElementById('staffName').textContent = currentUser.name.toUpperCase();
            document.getElementById('staffRole').textContent = roleLabel(currentUser.role).label;
            showTab('pagamenti');
            navigate('screenStaff');
          };
          _modalBody.appendChild(_pagBtn);
        }
      }
    }
  }, 50);
}

function selectUtenteColor(el, col) {
  currentUser.color = col;
  document.querySelectorAll('#uteColorPicker .color-swatch').forEach(function(s){ s.classList.remove('selected'); });
  el.classList.add('selected');
  document.getElementById('uteAvatar').style.background = col;
  saveMembers();
}

function updateLogoutBtns() {
  var showLogout = currentUser || guestMode;
  ['logoutHome','logoutBacheca','logoutInfo'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (showLogout) { el.classList.add('visible'); } else { el.classList.remove('visible'); }
      // For guest show a different label
      if (el && guestMode && !currentUser) {
        el.textContent = '🔓 ESCI';
      } else if (el && currentUser) {
        el.textContent = '🔓 LOGOUT';
      }
    }
  });
}

function updateStaffNavBtns() {
  var _isStaff = isAiutante();
  var _isUtente = isUtente();
  var isGuest = guestMode && !currentUser;
  var pairs = [
    ['staffNavIcon','staffNavLabel'],
    ['staffNavIconB','staffNavLabelB'],
    ['staffNavIconI','staffNavLabelI'],
  ];
  pairs.forEach(function(p) {
    var ic = document.getElementById(p[0]);
    var lb = document.getElementById(p[1]);
    if (!ic) return;
    if (_isStaff) {
      ic.textContent = '⚙️';
      lb.textContent = 'Staff';
      ic.closest('button').style.display = '';
    } else if (_isUtente) {
      ic.textContent = '👤';
      lb.textContent = 'Profilo';
      ic.closest('button').style.display = '';
    } else {
      // guest: show LOGIN button
      ic.textContent = '🔑';
      lb.textContent = 'Login';
      ic.closest('button').style.display = '';
    }
  });
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
// enterAsGuest: avvia il polling per ospiti
function enterAsGuest() {
  guestMode = true;
  currentUser = null;
  buildAll();
  updateHomeAccessLevel();
  navigate('screenHome');
  // Polling già attivo se avviato dopo loadAllData; altrimenti parte qui
  if (typeof initPolling === 'function') initPolling();
}

// ════════════════════════════════════════
// HASHING PASSWORD (SHA-256 via crypto.subtle)
// ════════════════════════════════════════
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
  var nomeInput = document.getElementById('loginNome') ? document.getElementById('loginNome').value.trim() : '';
  var pw = document.getElementById('loginPw').value.trim();
  var err = document.getElementById('loginErr');
  if (!nomeInput) { err.textContent = '// INSERISCI IL NOME UTENTE'; return; }
  if (!pw) { err.textContent = '// INSERISCI LA PASSWORD'; return; }
  // Cerca il membro per nome (case-insensitive)
  var member = null;
  for (var i = 0; i < MEMBERS.length; i++) {
    if (MEMBERS[i].name.toLowerCase() === nomeInput.toLowerCase()) {
      member = MEMBERS[i];
      break;
    }
  }
  if (!member) { err.textContent = '// NOME UTENTE NON TROVATO'; return; }
  // Fetch password_hash direttamente da DB (al login currentUser è null → MEMBERS non ha password_hash)
  try {
    var res = await getSupabase().from('members').select('password_hash').eq('name', member.name).single();
    if (res.error || !res.data) { err.textContent = '// ERRORE DI CONNESSIONE'; return; }
    member.password = res.data.password_hash;
  } catch(e) { err.textContent = '// ERRORE DI CONNESSIONE'; return; }
  // Verifica la password
  if (!(await pwMatch(pw, member.password))) { err.textContent = '// PASSWORD ERRATA'; return; }
  if (member.sospeso) { err.textContent = '// ACCOUNT SOSPESO · CONTATTARE UN AMMINISTRATORE'; return; }
  currentUser = member;
  // Salva sessione persistente
  try {
    localStorage.setItem('bunker23_session', JSON.stringify({ name: member.name, role: member.role, ts: Date.now() }));
  } catch(e) {}
  guestMode = false;
  document.getElementById('loginPw').value = '';
  err.textContent = '';
  // Log per tutti i livelli (staff, admin e utenti registrati)
  addLog('si è connesso');
  // Carica tutti i dati freschi da Supabase (loadAllData imposta anche _realtimeReady = true)
  if (typeof loadAllData === 'function') await loadAllData();
  buildAll();
  updateHomeAccessLevel();
  window.scrollTo(0, 0);
  showToast('// BENVENUTO, ' + member.name.toUpperCase(), 'success');
  resetSessionTimer();
  // Setup staff UI (dopo buildAll per avere gli elementi nel DOM)
  if (member.role === ROLES.STAFF || member.role === ROLES.ADMIN || member.role === ROLES.AIUTANTE) {
    renderAvatar(document.getElementById('staffAvatar'), member);
    document.getElementById('staffName').textContent = member.name.toUpperCase();
    document.getElementById('staffRole').textContent = roleLabel(member.role).label;
    var staffScreen = document.getElementById('screenStaff');
    staffScreen.classList.toggle('is-admin', member.role === ROLES.ADMIN);
    applyBenvenuto();
    // Applica configurazione widget/tab in base al ruolo
    applyWidgetConfig();
    applyTabConfig();
    showTab('dashboard');
    // Staff/admin usano realtime — ferma polling e inizializza canali
    if (typeof onUserLogin === 'function') onUserLogin();
    if (typeof requestPushPermissionAndRegister === 'function') requestPushPermissionAndRegister();
  } else {
    // Utente normale (livelli 1-3): avvia polling se non già attivo
    if (typeof onUserLogin === 'function') onUserLogin();
    if (typeof requestPushPermissionAndRegister === 'function') requestPushPermissionAndRegister();
  }
  updatePageCfgBtns();
  applyPageSections('home');
  applyPageSections('bacheca');
  applyPageSections('info');
  navigate('screenHome');
  // Se l'utente è arrivato cliccando una notifica push con ?evento=ID, naviga all'evento
  if (_pendingEventoId) {
    navigaAdEvento(_pendingEventoId);
  }
}

function goToLogin() {
  var t = document.getElementById('loginTitle');
  var s = document.getElementById('loginSub');
  if (t) t.textContent = 'ACCESSO';
  if (s) s.textContent = 'NOME UTENTE E PASSWORD';
  navigate('screenLogin');
}

function exitToSplash() {
  guestMode = false;
  currentUser = null;
  if (document.getElementById('loginNome')) document.getElementById('loginNome').value = '';
  document.getElementById('loginPw').value = '';
  document.getElementById('loginErr').textContent = '';
  navigate('screenSplash');
}

// Timeout sessione — nessun logout automatico per admin/staff, 7 giorni di inattività per gli altri
var _sessionTimer = null;
var SESSION_TIMEOUT_USER = 7 * 24 * 60 * 60 * 1000; // 7 giorni (utenti non-staff)

function _isPrivilegedRole(user) {
  var u = user || currentUser;
  return !!u && (u.role === ROLES.ADMIN || u.role === ROLES.STAFF || u.role === ROLES.AIUTANTE);
}

function resetSessionTimer() {
  if (!currentUser) return;
  clearTimeout(_sessionTimer);
  _sessionTimer = null;

  // Admin e Staff: nessun logout automatico per inattività
  if (_isPrivilegedRole()) return;

  // Altri utenti: logout dopo 7 giorni di inattività
  _sessionTimer = setTimeout(function() {
    if (!currentUser) return;
    showToast('// SESSIONE SCADUTA · EFFETTUA NUOVAMENTE IL LOGIN', 'error');
    setTimeout(function() {
      document.getElementById('screenStaff').classList.remove('is-admin');
      if (typeof onUserLogout === 'function') onUserLogout();
      currentUser = null;
      guestMode = false;
      try { localStorage.removeItem('bunker23_session'); } catch(e) {}
      buildAll();
      updateHomeAccessLevel();
      updatePageCfgBtns();
      navigate('screenSplash');
    }, 2000);
  }, SESSION_TIMEOUT_USER);
}

// Resetta il timer ad ogni interazione
['click','touchstart','keydown','scroll'].forEach(function(evt) {
  document.addEventListener(evt, resetSessionTimer, { passive: true });
});

function doLogout() {
  showConfirm('Sei sicuro di voler uscire?', function() {
    clearTimeout(_sessionTimer);
    if (typeof onUserLogout === 'function') onUserLogout();
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

function updateHomeAccessLevel() {
  var isGuest = guestMode && !currentUser;
  var _isUtente = isUtente();
  var _isStaff = isAiutante();

  // Navbar bottom: nascosta in guest mode, visibile per utenti loggati
  var bottomNavs = document.querySelectorAll('#screenHome .bottom-nav');
  bottomNavs.forEach(function(nav) { nav.style.display = isGuest ? 'none' : ''; });

  var navBacheca = document.querySelectorAll('.nav-btn[onclick*="screenBacheca"]');
  var navInfo = document.querySelectorAll('.nav-btn[onclick*="screenInfo"]');
  navBacheca.forEach(function(b) { b.style.display = isGuest ? 'none' : ''; });
  navInfo.forEach(function(b) { b.style.display = isGuest ? 'none' : ''; });

  // Messaggio ospite
  var guestMsg = document.getElementById('guestMessage');
  if (guestMsg) guestMsg.style.display = isGuest ? 'block' : 'none';

  // Cerca eventi (nascondi per ospite)
  var cercaBtn = document.getElementById('homeCercaBtn');
  if (cercaBtn) cercaBtn.parentElement.style.display = isGuest ? 'none' : '';

  // Calendario (nascondi per ospite)
  var calWrap = document.querySelector('#screenHome .cal-wrap');
  if (calWrap) calWrap.style.display = isGuest ? 'none' : '';

  // Prossimo evento (nascondi per ospite)
  var nextEv = $id('homeNextEvent');
  if (nextEv) nextEv.style.display = isGuest ? 'none' : '';
}

// ════════════════════════════════════════
// TABS STAFF
// ════════════════════════════════════════
const TABS = ['dashboard','calendario','spesa','log','cerca','lavori','magazzino','pagamenti','profilo','configura','inviti'];
var _currentTab = 'dashboard';

function showTab(name) {
  // Protezione: configura solo per admin
  if (name === 'configura' && !isAdmin()) return;
  TABS.forEach(function(t) {
    var el = document.getElementById('tab-' + t);
    if (el) el.style.display = 'none';
  });
  var active = document.getElementById('tab-' + name);
  if (active) {
    active.style.display = 'block';
    active.scrollTop = 0;
  }
  // Anche il contenitore screenStaff va in cima
  var staffScreen = document.getElementById('screenStaff');
  if (staffScreen) staffScreen.scrollTop = 0;
  // Mostra/nascondi pulsante torna alla dashboard
  var btnDash = document.getElementById('btnTornaDash');
  if (btnDash) btnDash.style.display = (name === 'dashboard' || isUtente()) ? 'none' : '';
  // Reset unread counters when tab opened
  if (name === 'log')  { _unreadLog  = 0; updateDash();
    var btnSL = document.getElementById('btnSvuotaLog');
    if (btnSL) btnSL.style.display = isAdmin() ? 'inline-block' : 'none';
  }
  // Rebuild views that depend on role
  if (name === 'calendario') buildSCal();
  if (name === 'profilo') {
    buildProfilo();
    markMembersVisited();
    // Assicura visibilità gestione account per staff e admin
    var _ga = document.getElementById('gestioneAccountSection');
    if (_ga && currentUser && (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN)) {
      _ga.style.display = 'block';
    }
  }
  if (name === 'configura') buildConfigura();
  if (name === 'dashboard') { applyWidgetConfig(); applyTabConfig(); applyBenvenuto(); }
  if (name === 'magazzino') {
    // Resetta sezioni collassate ad ogni apertura del tab
    ['alcolico','analcolico','altro'].forEach(function(cat) {
      _mzCollapsed[cat] = true;
      var body = document.getElementById('mz-body-' + cat);
      var icon = document.getElementById('mz-icon-' + cat);
      if (body) body.style.display = 'none';
      if (icon) icon.textContent = '▸';
    });
    buildMagazzino(); // aggiorna con dati freschi ad ogni apertura
  }
  // Aggiunge uno stato history per gestire il tasto indietro del telefono
  // (non farlo per la dashboard che viene già gestita da navigate)
  if (name !== 'dashboard') {
    history.pushState({ screen: 'screenStaff', tab: name }, '', '');
  }
  _currentTab = name;
}

// ════════════════════════════════════════
// CALENDARIO PUBBLICO (home)
// ════════════════════════════════════════
var calYear  = new Date().getFullYear();
var calMonth = new Date().getMonth() + 1;
var calSel   = null;

function calPrev() { calMonth--; if (calMonth < 1) { calMonth=12; calYear--; } calSel=null; buildCal(); }
function calNext() { calMonth++; if (calMonth > 12) { calMonth=1; calYear++; } calSel=null; buildCal(); }

// Naviga direttamente a un evento nel calendario dato il suo ID.
// Usata per aprire l'evento corretto al click su notifica push.
function navigaAdEvento(eventoId) {
  if (!eventoId) return;
  var ev = EVENTI.find(function(e) { return String(e.id) === String(eventoId); });
  if (!ev) {
    console.warn('[notifica] evento non trovato con id:', eventoId);
    return;
  }
  // Imposta anno/mese/giorno nel calendario utente
  calYear  = ev.anno;
  calMonth = ev.mese;
  calSel   = ev.giorno;

  // Per tutti gli utenti la notifica apre il calendario della home.
  // Se screenHome è già la schermata attiva navigate() non fa nulla,
  // quindi chiamiamo buildCal() direttamente in ogni caso.
  var homeScreen = document.getElementById('screenHome');
  var isAlreadyHome = homeScreen && homeScreen.classList.contains('active');
  if (!isAlreadyHome) {
    navigate('screenHome');
  }
  // Piccolo delay per lasciar completare l'eventuale animazione di navigate,
  // poi buildCal ridisegna con calSel impostato e apre il dettaglio evento.
  setTimeout(function() {
    buildCal();
    // Scrolla il pannello dettaglio in vista
    var det = document.getElementById('calDetail');
    if (det) det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, isAlreadyHome ? 0 : 80);
  _pendingEventoId = null;
}

function tipiVisibiliPerRole(role) {
  if (role === ROLES.STAFF || role === ROLES.ADMIN)   return ['invito','premium','privato','segreto','consigliato'];
  if (role === ROLES.AIUTANTE)                    return ['invito','premium','privato','consigliato'];
  if (role === ROLES.PREMIUM)                     return ['invito','premium','consigliato'];
  return                                             ['invito','consigliato'];
}

function buildCal() {
  var label = $id('calLabel');
  if (!label) return;
  label.textContent = MESI[calMonth-1] + ' ' + calYear;

  var dl = document.getElementById('calDayLabels');
  if (dl) {
    dl.innerHTML = '';
    GIORNI.forEach(function(d) {
      var el = document.createElement('div');
      el.className = 'cal-day-label';
      el.textContent = d;
      dl.appendChild(el);
    });
  }

  var grid = $id('calGrid');
  if (!grid) return;
  grid.innerHTML = '';

  var today = new Date();
  var firstDay = new Date(calYear, calMonth-1, 1).getDay();
  var offset = firstDay === 0 ? 6 : firstDay - 1;
  var days = new Date(calYear, calMonth, 0).getDate();

  for (var i = 0; i < offset; i++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (var d = 1; d <= days; d++) {
    (function(day) {
      var tipi = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
      var dayTs = new Date(calYear, calMonth-1, day).getTime();
      // Raccoglie TUTTI gli eventi visibili per questo giorno
      var evs = EVENTI.filter(function(e) {
        if (tipi.indexOf(e.tipo) < 0) return false;
        var startTs = new Date(e.anno, e.mese-1, e.giorno).getTime();
        if (e.giornoFine && e.meseFine && e.annoFine) {
          var endTs = new Date(e.annoFine, e.meseFine-1, e.giornoFine).getTime();
          return dayTs >= startTs && dayTs <= endTs;
        }
        return e.anno===calYear && e.mese===calMonth && e.giorno===day;
      });
      var ev = evs[0] || null; // primo evento per colorazione cella
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;
      if (day===today.getDate() && calMonth===today.getMonth()+1 && calYear===today.getFullYear()) cell.classList.add('today');
      if (ev) {
        cell.classList.add('has-event');
        cell.classList.add(TIPO_CLASS[ev.tipo]);
        var startTs = new Date(ev.anno, ev.mese-1, ev.giorno).getTime();
        if (dayTs > startTs) cell.classList.add('event-continuation');
        if (evs.length > 1) {
          var badge = document.createElement('span');
          badge.className = 'cal-multi-badge';
          badge.textContent = evs.length;
          cell.appendChild(badge);
        }
      }
      if (calSel === day) cell.classList.add('selected');
      cell.onclick = function() { calSel = day; buildCal(); renderCalDetail(day, evs, false); };
      grid.appendChild(cell);
    })(d);
  }

  if (calSel !== null) {
    var tipiSel = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
    var selEvs = EVENTI.filter(function(e) {
      return e.anno===calYear && e.mese===calMonth && e.giorno===calSel && tipiSel.indexOf(e.tipo) >= 0;
    });
    renderCalDetail(calSel, selEvs, false);
  } else {
    var det = $id('calDetail');
    if (det) det.innerHTML = '';
  }
}

// renderCalDetail — ev può essere un array di eventi oppure un singolo evento (retrocompatibilità)
function renderCalDetail(day, ev, _isStaffView) {
  var detId = _isStaffView ? 'sCalDetail' : 'calDetail';
  var det = document.getElementById(detId);
  if (!det) return;
  det.innerHTML = '';

  // Normalizza sempre a array
  var evs = Array.isArray(ev) ? ev : (ev ? [ev] : []);

  if (evs.length > 0) {
    if (evs.length > 1) {
      var countEl = document.createElement('div');
      countEl.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px';
      countEl.textContent = '// ' + evs.length + ' EVENTI IN QUESTA DATA';
      det.appendChild(countEl);
    }

    evs.forEach(function(evItem) {
      var card = document.createElement('div');
      card.className = 'cal-detail-card';
      card.style.borderLeft = '3px solid ' + TIPO_COLOR[evItem.tipo];
      if (evs.length > 1) card.style.marginBottom = '10px';

      var header = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">' +
        '<div class="cal-detail-title">' + evItem.nome + '</div>' +
        tag(evItem.tipo) +
        '</div>';
      var dow = new Date(evItem.anno, evItem.mese-1, day).getDay();
      var dowIdx = dow === 0 ? 6 : dow - 1;
      var activeMonth = _isStaffView ? sCalMonth : calMonth;
      var dateStr;
      if (evItem.giornoFine && evItem.meseFine && evItem.annoFine) {
        dateStr = '🗓️ ' + evItem.giorno + ' ' + MESI[evItem.mese-1] + ' → ' + evItem.giornoFine + ' ' + MESI[evItem.meseFine-1] + (evItem.annoFine !== evItem.anno ? ' ' + evItem.annoFine : '');
      } else {
        dateStr = '🗓️ ' + GIORNI_FULL[dowIdx] + ' ' + day + ' ' + MESI[activeMonth-1];
      }
      var meta = '<div class="cal-detail-meta">' + dateStr + ' · ORE ' + evItem.ora + '</div>';
      var desc = evItem.desc ? '<div class="cal-detail-desc">ℹ️ ' + evItem.desc + '</div>' : '';
      var extra = '';
      if (evItem.luogo) extra += '<div class="cal-detail-desc">📍 ' + evItem.luogo + '</div>';
      if (evItem.note)  extra += '<div class="cal-detail-desc">✨ ' + evItem.note  + '</div>';
      var locandina = evItem.locandina ? '<div class="loc-img-wrap" onclick="event.stopPropagation();openLightbox(\'' + evItem.locandina + '\')" style="margin-top:10px"><img src="' + evItem.locandina + '" style="width:100%;border-radius:4px;max-height:220px;object-fit:contain;display:block"/><span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' : '';

      var actions = '';
      if (_isStaffView && canEdit()) {
        var idx = EVENTI.indexOf(evItem);
        actions = '<div style="margin-top:10px;display:flex;gap:6px">' +
          '<button class="cal-action-btn" style="color:' + TIPO_COLOR[evItem.tipo] + ';border-color:' + TIPO_COLOR[evItem.tipo] + '" onclick="openEventoModal(' + idx + ')">✏ MODIFICA</button>' +
          '<button class="cal-action-btn" style="color:#555;border-color:#333" onclick="deleteEvento(' + idx + ')">🗑 ELIMINA</button>' +
          '</div>';
      }

      card.innerHTML = header + meta + desc + extra + locandina + actions;
      det.appendChild(card);
      buildEventLinks(evItem, card);

      // ── Valutazioni evento (solo lato pubblico) ──
      if (!_isStaffView) {
        var evId   = evItem.id;
        var vList  = EVENTI_VALUTAZIONI[evId] || [];
        var canDel = isStaff();
        var giàVotato = currentUser && vList.some(function(v){ return v.nome === currentUser.name; });

        var ratingBlock = document.createElement('div');
        ratingBlock.style.cssText = 'margin-top:14px;border-top:1px solid #1a1a1a;padding-top:12px';

        var totS = vList.filter(function(v){ return v.stelle > 0; });
        var media = totS.length ? (totS.reduce(function(a,v){ return a+v.stelle; },0)/totS.length).toFixed(1) : null;
        var mediaHtml = media
          ? '<span style="color:#c8a84b;font-family:var(--display);font-size:15px">' + media + ' ★</span>' +
            '<span style="font-family:var(--mono);font-size:8px;color:#444;margin-left:6px">' + vList.length + ' VOTO/I</span>'
          : '<span style="font-family:var(--mono);font-size:8px;color:#444;letter-spacing:1px">NESSUNA VALUTAZIONE</span>';

        ratingBlock.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-family:var(--mono);font-size:9px;color:#555;letter-spacing:2px">// VALUTAZIONI EVENTO</span>' +
          '<div>' + mediaHtml + '</div>' +
          '</div>';

        if (currentUser && !giàVotato) {
          var formDiv = document.createElement('div');
          formDiv.style.cssText = 'margin-bottom:12px';
          formDiv.innerHTML =
            '<div style="display:flex;gap:4px;margin-bottom:8px" id="evStarRow_' + evId + '">' +
              [1,2,3,4,5].map(function(n){
                return '<span class="star-btn" data-ev="' + evId + '" data-v="' + n + '" onclick="setEvStarVal(' + evId + ',' + n + ')" style="font-size:20px;cursor:pointer;opacity:0.3">★</span>';
              }).join('') +
            '</div>' +
            '<textarea id="evValInput_' + evId + '" placeholder="La tua recensione..." maxlength="300" style="width:100%;box-sizing:border-box;padding:8px;background:#0d0d0d;border:1px solid #222;border-radius:3px;color:var(--light);font-family:var(--body);font-size:12px;resize:none;outline:none" rows="2"></textarea>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:6px">' +
              '<button onclick="inviaValutazioneEvento(' + evId + ')" style="padding:6px 14px;background:transparent;border:1px solid #333;color:#777;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">INVIA</button>' +
            '</div>';
          ratingBlock.appendChild(formDiv);
        } else if (!currentUser) {
          var loginMsg = document.createElement('div');
          loginMsg.style.cssText = 'font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;margin-bottom:10px';
          loginMsg.textContent = '// ACCEDI PER LASCIARE UNA VALUTAZIONE';
          ratingBlock.appendChild(loginMsg);
        } else if (giàVotato) {
          var doneMsg = document.createElement('div');
          doneMsg.style.cssText = 'font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px;margin-bottom:10px';
          doneMsg.textContent = '✓ HAI GIÀ VALUTATO QUESTO EVENTO';
          ratingBlock.appendChild(doneMsg);
        }

        if (vList.length) {
          vList.forEach(function(v, vi) {
            var row = document.createElement('div');
            row.style.cssText = 'background:#0d0d0d;border:1px solid #1a1a1a;border-radius:3px;padding:8px;display:flex;align-items:flex-start;gap:8px;margin-bottom:6px';
            var stelle = v.stelle > 0
              ? '<div style="color:#c8a84b;font-size:12px;margin-bottom:3px">' + '★'.repeat(v.stelle) + '<span style="color:#222">' + '★'.repeat(5-v.stelle) + '</span></div>'
              : '';
            row.innerHTML =
              '<div style="flex:1">' +
                stelle +
                (v.testo ? '<div style="font-family:var(--body);font-size:12px;color:var(--light);line-height:1.4">' + nl2br(v.testo) + '</div>' : '') +
                '<div style="font-family:var(--mono);font-size:8px;color:#333;margin-top:3px">' + v.nome.toUpperCase() + ' · ' + v.tempo + '</div>' +
              '</div>' +
              (canDel ? '<button style="background:none;border:none;color:#cc2200;cursor:pointer;font-size:11px;padding:0;flex-shrink:0" onclick="deleteValutazioneEvento(' + evId + ',' + vi + ')">✕</button>' : '');
            ratingBlock.appendChild(row);
          });
        }

        det.appendChild(ratingBlock);
      }
    }); // fine forEach evs

    // Bottone "aggiungi altro" sempre visibile allo staff quando c'è già almeno un evento
    if (_isStaffView && canEdit()) {
      var addMoreBtn = document.createElement('button');
      addMoreBtn.className = 'cal-add-btn';
      addMoreBtn.textContent = '+ AGGIUNGI EVENTO IN QUESTA DATA';
      addMoreBtn.onclick = function() { openEventoModal(null, day, sCalMonth, sCalYear); };
      det.appendChild(addMoreBtn);
    }
  } else if (_isStaffView && currentUser) {
    var addBtn = document.createElement('button');
    addBtn.className = 'cal-add-btn';
    addBtn.textContent = '+ AGGIUNGI EVENTO';
    addBtn.onclick = function() { openEventoModal(null, day, sCalMonth, sCalYear); };
    det.appendChild(addBtn);
  } else {
    var nessuno = document.createElement('div');
    nessuno.style.cssText = 'font-family:monospace;font-size:9px;color:#333;text-align:center;padding:12px;letter-spacing:2px';
    nessuno.textContent = 'NESSUN EVENTO';
    det.appendChild(nessuno);
  }
}

// ════════════════════════════════════════
// CALENDARIO STAFF
// ════════════════════════════════════════
var sCalYear  = new Date().getFullYear();
var sCalMonth = new Date().getMonth() + 1;
var sCalSel   = null;

function sCalPrev() { sCalMonth--; if (sCalMonth < 1) { sCalMonth=12; sCalYear--; } sCalSel=null; buildSCal(); }
function sCalNext() { sCalMonth++; if (sCalMonth > 12) { sCalMonth=1; sCalYear++; } sCalSel=null; buildSCal(); }

function buildSCal() {
  var label = document.getElementById('sCalLabel');
  if (!label) return;
  label.textContent = MESI[sCalMonth-1] + ' ' + sCalYear;

  var dl = document.getElementById('sCalDayLabels');
  if (dl) {
    dl.innerHTML = '';
    GIORNI.forEach(function(d) {
      var el = document.createElement('div');
      el.className = 'cal-day-label';
      el.textContent = d;
      dl.appendChild(el);
    });
  }

  var grid = document.getElementById('sCalGrid');
  if (!grid) return;
  grid.innerHTML = '';

  var today = new Date();
  var firstDay = new Date(sCalYear, sCalMonth-1, 1).getDay();
  var offset = firstDay === 0 ? 6 : firstDay - 1;
  var days = new Date(sCalYear, sCalMonth, 0).getDate();

  for (var i = 0; i < offset; i++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (var d = 1; d <= days; d++) {
    (function(day) {
      // Staff: mostra TUTTI gli eventi (inclusi multi-giorno)
      var dayTs = new Date(sCalYear, sCalMonth-1, day).getTime();
      var evs = EVENTI.filter(function(e) {
        var startTs = new Date(e.anno, e.mese-1, e.giorno).getTime();
        if (e.giornoFine && e.meseFine && e.annoFine) {
          var endTs = new Date(e.annoFine, e.meseFine-1, e.giornoFine).getTime();
          return dayTs >= startTs && dayTs <= endTs;
        }
        return e.anno===sCalYear && e.mese===sCalMonth && e.giorno===day;
      });
      var ev = evs[0] || null;
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;
      if (day===today.getDate() && sCalMonth===today.getMonth()+1 && sCalYear===today.getFullYear()) cell.classList.add('today');
      if (ev) {
        cell.classList.add('has-event');
        cell.classList.add(TIPO_CLASS[ev.tipo]);
        var startTs = new Date(ev.anno, ev.mese-1, ev.giorno).getTime();
        if (dayTs > startTs) cell.classList.add('event-continuation');
        if (evs.length > 1) {
          var badge = document.createElement('span');
          badge.className = 'cal-multi-badge';
          badge.textContent = evs.length;
          cell.appendChild(badge);
        }
      }
      if (sCalSel === day) cell.classList.add('selected');
      cell.onclick = function() { sCalSel = day; buildSCal(); renderCalDetail(day, evs, true); };
      grid.appendChild(cell);
    })(d);
  }

  if (sCalSel !== null) {
    var selEvs = EVENTI.filter(function(e) { return e.anno===sCalYear && e.mese===sCalMonth && e.giorno===sCalSel; });
    renderCalDetail(sCalSel, selEvs, true);
  } else {
    var det = document.getElementById('sCalDetail');
    if (det) det.innerHTML = '';
  }
}

// ════════════════════════════════════════
// EVENTO IN CORSO — funzione globale condivisa
// ════════════════════════════════════════
function isEventoInCorso(e) {
  if (e.terminato) return false;
  var now = new Date();
  var todayAnno   = now.getFullYear();
  var todayMese   = now.getMonth() + 1;
  var todayGiorno = now.getDate();
  var nowMinutes  = now.getHours() * 60 + now.getMinutes();

  // Calcola ora inizio in minuti
  var oraParts = (e.ora || '00:00').split(':');
  var oraInizioMin = (parseInt(oraParts[0])||0) * 60 + (parseInt(oraParts[1])||0);

  // Calcola ora fine in minuti
  // Se non specificata → 23:59 del giorno di inizio
  // Se specificata ed è precedente all'ora di inizio → giorno successivo (es. 22:30→02:00)
  var oraFineMin;
  var oraFineStr = e.ora_fine || '';
  if (oraFineStr) {
    var oraFineParts = oraFineStr.split(':');
    oraFineMin = (parseInt(oraFineParts[0])||0) * 60 + (parseInt(oraFineParts[1])||0);
  } else {
    oraFineMin = 23 * 60 + 59; // 23:59 default
  }

  // Calcola data/ora inizio e fine come oggetti Date assoluti
  var startDT = new Date(e.anno, e.mese-1, e.giorno, Math.floor(oraInizioMin/60), oraInizioMin%60, 0);

  // Data fine: parte dalla data di fine esplicita se presente, altrimenti dalla data inizio
  var baseFinDate;
  if (e.giornoFine && e.meseFine && e.annoFine) {
    baseFinDate = new Date(e.annoFine, e.meseFine-1, e.giornoFine);
  } else {
    baseFinDate = new Date(e.anno, e.mese-1, e.giorno);
    // Se ora_fine < ora_inizio e non c'è data fine esplicita → giorno dopo
    if (oraFineStr && oraFineMin < oraInizioMin) {
      baseFinDate.setDate(baseFinDate.getDate() + 1);
    }
  }
  var endDT = new Date(baseFinDate.getFullYear(), baseFinDate.getMonth(), baseFinDate.getDate(),
    Math.floor(oraFineMin/60), oraFineMin%60, 0);

  // L'evento è in corso se now è compreso tra startDT e endDT
  return now >= startDT && now <= endDT;
}

// ════════════════════════════════════════
// PROSSIMO EVENTO (home)
// ════════════════════════════════════════
var _nextEventInterval = null;

function buildHomeNextEvent() {
  var el = $id('homeNextEvent');
  if (!el) return;

  // Pulisci interval precedente
  if (_nextEventInterval) { clearInterval(_nextEventInterval); _nextEventInterval = null; }

  var today = new Date(); today.setHours(0,0,0,0);

  // Solo eventi su invito futuri, escludendo quelli attualmente in corso
  var next = EVENTI
    .filter(function(e) { return e.tipo === 'invito' && new Date(e.anno, e.mese-1, e.giorno) >= today && !isEventoInCorso(e); })
    .sort(function(a,b) { return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno); })[0];

  if (!next) { el.innerHTML = ''; return; }

  var editBtn = canEdit()
    ? '<button class="nec-edit-btn visible" onclick="event.stopPropagation();openEventoModal(' + EVENTI.indexOf(next) + ')">✏</button>'
    : '';

  var locandinaHtml = next.locandina
    ? '<img class="nec-locandina" src="' + next.locandina + '" onclick="event.stopPropagation();openLightbox(\'' + next.locandina + '\')" title="Clicca per ingrandire"/>'
    : '';

  // Calcola target datetime (ora dell'evento)
  var oraParts = (next.ora || '00:00').split(':');
  var target = new Date(next.anno, next.mese-1, next.giorno, parseInt(oraParts[0])||0, parseInt(oraParts[1])||0, 0, 0);

  function formatCountdown() {
    var now = new Date();
    var diff = target - now;
    if (diff <= 0) return '<span style="color:var(--red)">IN CORSO</span>';
    var days  = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins  = Math.floor((diff % 3600000)  / 60000);
    var secs  = Math.floor((diff % 60000)    / 1000);
    var parts = [];
    if (days)  parts.push(days  + 'g');
    if (hours) parts.push(hours + 'h');
    parts.push(String(mins).padStart(2,'0') + 'm');
    parts.push(String(secs).padStart(2,'0') + 's');
    return parts.join(' ');
  }

  el.innerHTML =
    '<div class="next-event-card" onclick="calSel=' + next.giorno + ';calMonth=' + next.mese + ';calYear=' + next.anno + ';buildCal()">' +
    locandinaHtml +
    '<div class="nec-info">' +
    '<div class="nec-tag"><div class="blink-dot"></div> PROSSIMO EVENTO</div>' +
    '<div class="nec-title">' + next.nome + '</div>' +
    '<div class="nec-meta">' + (function(){ var d=new Date(next.anno,next.mese-1,next.giorno); var dow=[6,0,1,2,3,4,5][d.getDay()]; return GIORNI_FULL[dow]+' '+next.giorno+' '+MESI[next.mese-1].charAt(0)+MESI[next.mese-1].slice(1).toLowerCase(); })() + ' · ORE ' + next.ora + (next.luogo ? ' · ' + next.luogo.toUpperCase() : '') + '</div>' +
    '<div id="necCountdown" style="font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--red);margin-top:6px">' + formatCountdown() + '</div>' +
    '</div>' +
    editBtn +
    '</div>';

  // Aggiorna countdown ogni secondo
  _nextEventInterval = setInterval(function() {
    var cd = document.getElementById('necCountdown');
    if (!cd) { clearInterval(_nextEventInterval); return; }
    cd.innerHTML = formatCountdown();
  }, 1000);
}

// ════════════════════════════════════════
// BANNER EVENTO IN CORSO (home)
// ════════════════════════════════════════
var _eventoBannerInterval = null;

function buildEventoInCorsoBanner() {
  var banner = document.getElementById('eventoInCorsoBanner');
  if (!banner) return;

  // Filtra per ruolo utente — identica logica di buildCal() / tipiVisibiliPerRole()
  var tipi = tipiVisibiliPerRole(currentUser ? currentUser.role : null);

  // Cerca il primo evento in corso visibile per il ruolo corrente
  var evInCorso = null;
  for (var i = 0; i < EVENTI.length; i++) {
    if (tipi.indexOf(EVENTI[i].tipo) < 0) continue;
    if (isEventoInCorso(EVENTI[i])) { evInCorso = EVENTI[i]; break; }
  }

  if (evInCorso) {
    var oraFineLabel = evInCorso.ora_fine ? ' → ' + evInCorso.ora_fine : '';
    banner.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#22cc44;flex-shrink:0;animation:blink-anim 1.2s ease-in-out infinite"></div>' +
        '<div style="min-width:0">' +
          '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#22cc44;margin-bottom:2px">// EVENTO IN CORSO</div>' +
          '<div style="font-family:var(--mono);font-size:12px;letter-spacing:2px;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + evInCorso.nome + '</div>' +
          '<div style="font-family:var(--mono);font-size:9px;color:#555;letter-spacing:1px;margin-top:2px">ORE ' + evInCorso.ora + oraFineLabel + (evInCorso.luogo ? ' · ' + evInCorso.luogo.toUpperCase() : '') + '</div>' +
        '</div>' +
      '</div>' +
      (canEdit()
        ? '<button onclick="segnaTerminato(' + EVENTI.indexOf(evInCorso) + ')" style="flex-shrink:0;padding:6px 12px;background:transparent;border:1px solid #333;color:#555;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px;white-space:nowrap">✓ TERMINA</button>'
        : '');
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
    banner.innerHTML = '';
  }
}

function segnaTerminato(idx) {
  if (!canEdit()) return;
  if (idx < 0 || idx >= EVENTI.length) return;
  EVENTI[idx].terminato = true;
  saveEventi();
  buildEventoInCorsoBanner();
  showToast('// EVENTO SEGNATO COME TERMINATO ✓', 'success');
}

function startEventoBannerTimer() {
  if (_eventoBannerInterval) clearInterval(_eventoBannerInterval);
  buildEventoInCorsoBanner();
  // Aggiorna ogni 30 secondi per rilevare inizio/fine automatici
  _eventoBannerInterval = setInterval(buildEventoInCorsoBanner, 30000);
}

// ════════════════════════════════════════

function buildBacheca() {
  var list = document.getElementById('bachecaList');
  if (!list) return;
  list.innerHTML = '';
  var addBtn = document.getElementById('bacheca-add-btn');
  if (addBtn) addBtn.style.display = canEdit() ? 'block' : 'none';

  buildLinks('bacheca');
  BACHECA.forEach(function(item, i) {
    if (item.hidden) return;
    var div = document.createElement('div');
    div.className = 'istr-card';
    div.innerHTML =
      '<div class="istr-header">' +
        '<span class="istr-icon">' + item.icon + '</span>' +
        '<span class="istr-title">' + item.titolo + '</span>' +
        '<span style="font-family:var(--mono);font-size:7px;color:#444;letter-spacing:1px;white-space:nowrap;margin-right:6px">' + item.tempo + '</span>' +
        '<span class="istr-arrow">▶</span>' +
      '</div>' +
      '<div class="istr-body">' +
        (item.testo ? '<div style="color:var(--light);font-size:13px;line-height:1.5;margin-bottom:' + (item.foto ? '10px' : '0') + '">' + nl2br(item.testo) + '</div>' : '') +
        (item.foto ? '<img src="' + item.foto + '" onclick="event.stopPropagation();openLightbox(\'' + item.foto + '\')" style="width:100%;border-radius:4px;max-height:200px;object-fit:cover;display:block;cursor:zoom-in"/>' : '') +
      '</div>';

    var header = div.querySelector('.istr-header');
    var longPressed = false;

    header.addEventListener('click', function() {
      if (!longPressed) toggleIstr(header);
      longPressed = false;
    });

    if (canEdit()) {
      attachLongPress(header, function() {
        longPressed = true;
        showLongPressMenu('bacheca', i);
      });
    }

    list.appendChild(div);
  });
}

// ════════════════════════════════════════
// SUGGERIMENTI
// ════════════════════════════════════════
var _starVal = 0;

function setStarVal(v) {
  _starVal = v;
  document.querySelectorAll('.star-btn').forEach(function(s) {
    s.style.opacity = parseInt(s.dataset.v) <= v ? '1' : '0.3';
    s.style.color   = parseInt(s.dataset.v) <= v ? '#c8a84b' : '';
  });
}


function inviaSuggerimento() {
  var ta = document.getElementById('sugInput');
  if (!ta) return;
  var testo = ta.value.trim();
  if (!testo) return;
  var now = Date.now();
  if (now - _lastSugTime < 30000) {
    var sec = Math.ceil((30000 - (now - _lastSugTime)) / 1000);
    showToast('// ATTENDI ' + sec + 's PRIMA DI INVIARE', 'error');
    return;
  }
  _lastSugTime = now;
  var _sTs = new Date().toISOString();
  SUGGERIMENTI.unshift({ id: Date.now(), testo: testo, ts: _sTs, tempo: nowStr() });
  ta.value = '';
  var cnt = document.getElementById('sugCount');
  if (cnt) cnt.textContent = '0 / 150';
  buildSuggerimenti();
  saveSuggerimenti();
  showToast('// SUGGERIMENTO INVIATO ✓', 'success');
}

function buildSuggerimenti() {
  var section = document.getElementById('suggerimentiSection');
  var list    = document.getElementById('suggerimentiList');
  if (!list) return;
  list.innerHTML = '';

  var canSee = isStaff();

  // La lista è visibile solo a staff/admin
  if (section) section.style.display = canSee ? 'block' : 'none';
  if (!canSee) return;

  if (!SUGGERIMENTI.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:12px;letter-spacing:2px">NESSUN SUGGERIMENTO</div>';
    return;
  }
  SUGGERIMENTI.forEach(function(s, i) {
    var div = document.createElement('div');
    div.style.cssText = 'background:#111;border:1px solid #1e1e1e;border-radius:3px;padding:10px;display:flex;align-items:flex-start;gap:10px';
    div.innerHTML =
      '<div style="flex:1">' +
        '<div style="font-family:var(--body);font-size:13px;color:var(--light);line-height:1.5">' + nl2br(s.testo) + '</div>' +
        '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;margin-top:4px">👤 ANONIMO · ' + s.tempo + '</div>' +
      '</div>' +
      '<button class="edit-btn-small visible" style="color:#cc2200;flex-shrink:0" onclick="deleteSuggerimento(' + i + ')">✕</button>';
    list.appendChild(div);
  });
}

function deleteSuggerimento(i) {
  var removedId = SUGGERIMENTI[i] && SUGGERIMENTI[i].id;
  SUGGERIMENTI.splice(i, 1);
  addLog('eliminato suggerimento anonimo');
  saveSuggerimenti();
  if (removedId) _sbDeleteById('suggerimenti', removedId);
  buildSuggerimenti();
}

// ════════════════════════════════════════
// VALUTAZIONI
// ════════════════════════════════════════
function inviaValutazione() {
  var ta = document.getElementById('valInput');
  if (!ta) return;
  var testo = ta.value.trim();
  if (!testo && !_starVal) return;
  if (!currentUser) return; // ospiti non possono votare
  var nome = currentUser.name;
  // blocca doppio voto
  if (VALUTAZIONI.some(function(v){ return v.nome === nome; })) return;
  var _vTs = new Date().toISOString();
  VALUTAZIONI.unshift({ id: Date.now(), nome: nome, stelle: _starVal || 0, testo: testo, ts: _vTs, tempo: nowStr() });
  ta.value = '';
  setStarVal(0);
  buildValutazioni();
  saveValutazioni();
}

function buildValutazioni() {
  var form = document.getElementById('valutazioniForm');
  var list = document.getElementById('valutazioniList');
  if (!list) return;
  list.innerHTML = '';

  var canDel    = isStaff();
  var giàVotato = currentUser && VALUTAZIONI.some(function(v){ return v.nome === currentUser.name; });

  // Form dinamico
  if (form) {
    if (!currentUser) {
      form.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;padding:4px 0 10px">// ACCEDI PER LASCIARE UNA VALUTAZIONE</div>';
    } else if (giàVotato) {
      form.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px;padding:4px 0 10px">✓ HAI GIÀ LASCIATO UNA VALUTAZIONE</div>';
    } else {
      form.innerHTML =
        '<div style="display:flex;gap:6px;margin-bottom:8px" id="starInput">' +
          [1,2,3,4,5].map(function(n){
            return '<span class="star-btn" data-v="' + n + '" onclick="setStarVal(' + n + ')" style="font-size:22px;cursor:pointer;opacity:0.3">★</span>';
          }).join('') +
        '</div>' +
        '<textarea id="valInput" placeholder="Scrivi la tua recensione..." style="width:100%;box-sizing:border-box;padding:10px;background:#111;border:1px solid #2a2a2a;border-radius:3px;color:var(--light);font-family:var(--body);font-size:13px;resize:none;outline:none" rows="3"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:6px">' +
          '<button onclick="inviaValutazione()" style="padding:8px 16px;background:transparent;border:1px solid #333;color:#888;font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">INVIA RECENSIONE</button>' +
        '</div>';
    }
  }

  if (!VALUTAZIONI.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:12px;letter-spacing:2px">NESSUNA RECENSIONE</div>';
    return;
  }

  // Riepilogo medio stelle — visibile a tutti
  var totStelle = VALUTAZIONI.filter(function(v){ return v.stelle > 0; });
  var media = totStelle.length ? (totStelle.reduce(function(a,v){ return a + v.stelle; }, 0) / totStelle.length).toFixed(1) : null;
  if (media) {
    var mediaDiv = document.createElement('div');
    mediaDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:#111;border-radius:3px;border:1px solid #1e1e1e';
    mediaDiv.innerHTML =
      '<span style="font-family:var(--display);font-size:22px;color:#c8a84b">' + media + '</span>' +
      '<div>' +
        '<div style="color:#c8a84b;font-size:16px;letter-spacing:2px">' +
          '★'.repeat(Math.round(parseFloat(media))) +
          '<span style="color:#333">' + '★'.repeat(5 - Math.round(parseFloat(media))) + '</span>' +
        '</div>' +
        '<div style="font-family:var(--mono);font-size:8px;color:#444;letter-spacing:1px">' + totStelle.length + ' VOTI · ' + VALUTAZIONI.length + ' RECENSIONI</div>' +
      '</div>';
    list.appendChild(mediaDiv);
  }

  VALUTAZIONI.forEach(function(v, i) {
    var div = document.createElement('div');
    div.style.cssText = 'background:#111;border:1px solid #1e1e1e;border-radius:3px;padding:10px;display:flex;align-items:flex-start;gap:10px';
    var stelle = v.stelle > 0
      ? '<div style="color:#c8a84b;font-size:14px;margin-bottom:4px">' + '★'.repeat(v.stelle) + '<span style="color:#333">' + '★'.repeat(5-v.stelle) + '</span></div>'
      : '';
    div.innerHTML =
      '<div style="flex:1">' +
        stelle +
        (v.testo ? '<div style="font-family:var(--body);font-size:13px;color:var(--light);line-height:1.5">' + nl2br(v.testo) + '</div>' : '') +
        '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;margin-top:4px">' + v.nome.toUpperCase() + ' · ' + v.tempo + '</div>' +
      '</div>' +
      (canDel ? '<button class="edit-btn-small visible" style="color:#cc2200;flex-shrink:0" onclick="deleteValutazione(' + i + ')">✕</button>' : '');
    list.appendChild(div);
  });
}

function deleteValutazione(i) {
  var removedId = VALUTAZIONI[i] && VALUTAZIONI[i].id;
  VALUTAZIONI.splice(i, 1);
  addLog('eliminata valutazione');
  saveValutazioni();
  if (removedId) _sbDeleteById('valutazioni', removedId);
  buildValutazioni();
}

// ════════════════════════════════════════
// VALUTAZIONI EVENTI
// ════════════════════════════════════════
var _evStarVals = {}; // { [evId]: numero }

function setEvStarVal(evId, v) {
  _evStarVals[evId] = v;
  document.querySelectorAll('.star-btn[data-ev="' + evId + '"]').forEach(function(s) {
    var n = parseInt(s.dataset.v);
    s.style.opacity = n <= v ? '1' : '0.3';
    s.style.color   = n <= v ? '#c8a84b' : '';
  });
}

function inviaValutazioneEvento(evId) {
  if (!currentUser) return;
  var ta = document.getElementById('evValInput_' + evId);
  var testo = ta ? ta.value.trim() : '';
  var stelle = _evStarVals[evId] || 0;
  if (!testo && !stelle) return;

  if (!EVENTI_VALUTAZIONI[evId]) EVENTI_VALUTAZIONI[evId] = [];
  // blocca doppio voto
  if (EVENTI_VALUTAZIONI[evId].some(function(v){ return v.nome === currentUser.name; })) return;

  EVENTI_VALUTAZIONI[evId].unshift({ nome: currentUser.name, stelle: stelle, testo: testo, tempo: nowStr() });
  delete _evStarVals[evId];
  addLog('ha valutato un evento');
  saveConfig();
  var tipiSel = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
  renderCalDetail(calSel, EVENTI.filter(function(e){ return e.anno===calYear && e.mese===calMonth && e.giorno===calSel && tipiSel.indexOf(e.tipo) >= 0; }), false);
}

function deleteValutazioneEvento(evId, vi) {
  if (EVENTI_VALUTAZIONI[evId]) {
    EVENTI_VALUTAZIONI[evId].splice(vi, 1);
    if (!EVENTI_VALUTAZIONI[evId].length) delete EVENTI_VALUTAZIONI[evId];
  }
  addLog('eliminata valutazione evento');
  saveConfig();
  var tipiSel2 = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
  renderCalDetail(calSel, EVENTI.filter(function(e){ return e.anno===calYear && e.mese===calMonth && e.giorno===calSel && tipiSel2.indexOf(e.tipo) >= 0; }), false);
}


function buildInfo() {
  var list = document.getElementById('infoList');
  if (!list) return;
  list.innerHTML = '';
  var addBtn = document.getElementById('info-add-btn');
  if (addBtn) addBtn.style.display = canEdit() ? 'block' : 'none';

  buildLinks('info');
  INFO.forEach(function(item, i) {
    if (item.hidden) return; // rispetta visibilità configurata
    var div = document.createElement('div');
    div.className = 'istr-card';
    div.innerHTML = '<div class="istr-header">' +
      '<span class="istr-icon">' + item.icon + '</span>' +
      '<span class="istr-title">' + item.titolo + '</span>' +
      '<span class="istr-arrow">▶</span>' +
      '</div>' +
      '<div class="istr-body">' + nl2br(item.testo) +
        (item.foto ? '<div class="loc-img-wrap" style="margin-top:10px" onclick="event.stopPropagation();openLightbox(\'' + item.foto + '\')"><img src="' + item.foto + '" style="width:100%;border-radius:4px;max-height:180px;object-fit:contain;display:block"/><span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' : '') +
      '</div>';

    var header = div.querySelector('.istr-header');
    var longPressed = false;

    header.addEventListener('click', function() {
      if (!longPressed) toggleIstr(header);
      longPressed = false;
    });

    if (canEdit()) {
      attachLongPress(header, function() {
        longPressed = true;
        showLongPressMenu('info', i);
      });
    }

    list.appendChild(div);
  });
}

function toggleIstr(header) {
  var body = header.nextElementSibling;
  var isOpen = body.classList.contains('open');
  document.querySelectorAll('.istr-body').forEach(function(b) { b.classList.remove('open'); });
  document.querySelectorAll('.istr-arrow').forEach(function(a) { a.style.transform = ''; });
  if (!isOpen) {
    body.classList.add('open');
    header.querySelector('.istr-arrow').style.transform = 'rotate(90deg)';
  }
}

// ════════════════════════════════════════
// LINKS ESTERNI
// ════════════════════════════════════════

function _renderLinkBlock(container, arr, tipo, contesto) {
  container.innerHTML = '';

  arr.forEach(function(link, i) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:' + (canEdit() ? '4px' : '8px') + ';';

    var a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.className = 'maps-link-btn';
    a.innerHTML =
      '<span class="maps-link-icon">' + (link.icon || '🔗') + '</span>' +
      '<div class="maps-link-text">' +
        '<span class="maps-link-label">' + link.label + '</span>' +
        '<span class="maps-link-sub">' + (link.desc || link.url) + '</span>' +
      '</div>' +
      '<span class="maps-link-arrow">↗</span>';
    wrap.appendChild(a);

    if (canEdit()) {
      var editRow = document.createElement('div');
      editRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;margin-top:3px';
      editRow.innerHTML =
        '<button class="cal-action-btn" style="font-size:8px;padding:3px 10px"' +
          ' data-tipo="' + tipo + '" data-contesto="' + contesto + '" data-idx="' + i + '" data-action="edit">✏ MODIFICA</button>' +
        '<button class="cal-action-btn" style="font-size:8px;padding:3px 10px;color:#555;border-color:#333"' +
          ' data-tipo="' + tipo + '" data-contesto="' + contesto + '" data-idx="' + i + '" data-action="del">🗑 ELIMINA</button>';
      editRow.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var t = this.dataset.tipo;
          var c = t === 'evento' ? parseInt(this.dataset.contesto) : this.dataset.contesto;
          var ii = parseInt(this.dataset.idx);
          if (this.dataset.action === 'edit') openLinkModal(t, c, ii);
          else deleteLink(t, c, ii);
        });
      });
      wrap.appendChild(editRow);
    }

    container.appendChild(wrap);
  });

  if (canEdit()) {
    var addBtn = document.createElement('button');
    addBtn.className = 'mz-add-btn';
    addBtn.style.marginBottom = '4px';
    addBtn.textContent = '+ AGGIUNGI LINK';
    addBtn.addEventListener('click', function() {
      var c = tipo === 'evento' ? (typeof contesto === 'string' ? parseInt(contesto) : contesto) : contesto;
      openLinkModal(tipo, c, null);
    });
    container.appendChild(addBtn);
  }
}

function buildLinks(pagina) {
  var container = document.getElementById('linksSection-' + pagina);
  if (!container) return;
  var arr = LINKS_PAGE[pagina] || [];
  if (arr.length === 0 && !canEdit()) { container.innerHTML = ''; return; }
  _renderLinkBlock(container, arr, 'page', pagina);
}

function buildEventLinks(ev, container) {
  if (!ev) return;
  var arr = LINKS_EVENTO[ev.id] || [];
  if (arr.length === 0 && !canEdit()) return;
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,229,255,0.08);padding-top:10px';
  wrap.id = 'eventLinksWrap-' + ev.id;
  if (arr.length > 0 || canEdit()) {
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:var(--mono);font-size:8px;color:rgba(0,229,255,0.4);letter-spacing:3px;margin-bottom:8px';
    lbl.textContent = '// LINK UTILI';
    wrap.appendChild(lbl);
  }
  _renderLinkBlock(wrap, arr, 'evento', ev.id);
  container.appendChild(wrap);
}

function openLinkModal(tipo, contesto, editIdx) {
  var isEdit = editIdx !== null && editIdx !== undefined;
  var arr    = tipo === 'page' ? (LINKS_PAGE[contesto] || []) : (LINKS_EVENTO[contesto] || []);
  var item   = isEdit ? arr[editIdx] : null;

  $id('modalTitle').textContent = isEdit ? 'MODIFICA LINK' : 'NUOVO LINK';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// ETICHETTA</label>' +
      '<input class="modal-input" id="lLabel" value="' + (isEdit ? item.label : '') + '" placeholder="es. COME ARRIVARE"/></div>' +
    '<div><label class="modal-label">// URL</label>' +
      '<input class="modal-input" id="lUrl" value="' + (isEdit ? item.url : '') + '" placeholder="https://..."/></div>' +
    '<div style="display:flex;gap:10px">' +
      '<div style="flex:0 0 80px"><label class="modal-label">// ICONA</label>' +
        '<input class="modal-input" id="lIcon" value="' + (isEdit ? (item.icon||'🔗') : '🔗') + '"/></div>' +
      '<div style="flex:1"><label class="modal-label">// DESCRIZIONE</label>' +
        '<input class="modal-input" id="lDesc" value="' + (isEdit ? (item.desc||'') : '') + '" placeholder="es. Apri in Maps"/></div>' +
    '</div>';

  window._modalCb = function() {
    var label = document.getElementById('lLabel').value.trim();
    var url   = document.getElementById('lUrl').value.trim();
    if (!label || !url) { showToast('// COMPILA TUTTI I CAMPI', 'error'); return; }
    var obj = {
      id:    isEdit ? item.id : _nextLinkId++,
      label: label, url: url,
      icon:  document.getElementById('lIcon').value.trim() || '🔗',
      desc:  document.getElementById('lDesc').value.trim()
    };
    if (tipo === 'page') {
      if (!LINKS_PAGE[contesto]) LINKS_PAGE[contesto] = [];
      if (isEdit) LINKS_PAGE[contesto][editIdx] = obj; else LINKS_PAGE[contesto].push(obj);
      buildLinks(contesto);
    } else {
      if (!LINKS_EVENTO[contesto]) LINKS_EVENTO[contesto] = [];
      if (isEdit) LINKS_EVENTO[contesto][editIdx] = obj; else LINKS_EVENTO[contesto].push(obj);
      buildCal();
    }
    saveConfig();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' link: ' + obj.label);
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}


// ════════════════════════════════════════
// QR CODE SYSTEM
// ════════════════════════════════════════

function deleteLink(tipo, contesto, idx) {
  var arr  = tipo === 'page' ? (LINKS_PAGE[contesto] || []) : (LINKS_EVENTO[contesto] || []);
  var nome = arr[idx] ? arr[idx].label : 'link';
  arr.splice(idx, 1);
  saveConfig();
  addLog('rimosso link: ' + nome);
  if (tipo === 'page') buildLinks(contesto); else buildCal();
  showToast('// RIMOSSO', 'success');
}

// ════════════════════════════════════════
// SPESA
// ════════════════════════════════════════

// Ripara una voce fromMagazzino con _categoria o costoUnitario mancante
// recuperando i dati dall'array MAGAZZINO. Chiamata al momento del render
// per coprire i casi in cui loadAllData ha processato spesa prima di magazzino.
function _repairSpesaItem(item) {
  if (!item.fromMagazzino || !item.magazzinoId) return;
  var mz = MAGAZZINO.find(function(m) { return m.id === item.magazzinoId; });
  if (!mz) return;
  if (!item._categoria)    item._categoria    = mz.categoria;
  if (!item.costoUnitario) item.costoUnitario = mz.costoUnitario;
  if (!item.unita)         item.unita         = mz.unita;
  // Ricostruisci qtyNum da qty testuale se non è stato impostato correttamente
  if (!(parseFloat(item.qtyNum) > 0) && item.qty) {
    var parsed = parseFloat(item.qty);
    if (!isNaN(parsed) && parsed > 0) item.qtyNum = parsed;
  }
}

function buildSpesa() {
  var list = document.getElementById('spesaList');
  if (!list) return;
  list.innerHTML = '';
  var todo = 0;
  var totaleGenerale = 0;

  // Ripara tutti gli item fromMagazzino prima di raggruppare
  SPESA.forEach(function(item) { _repairSpesaItem(item); });

  function renderVoce(item) {
    var i = SPESA.indexOf(item);
    var qtyN = parseFloat(item.qtyNum);
    var costoU = parseFloat(item.costoUnitario);
    if (!item.done) {
      todo++;
      var t = (qtyN > 0 && costoU > 0) ? qtyN * costoU : 0;
      totaleGenerale += t;
    }
    var row = document.createElement('div');
    row.className = 'spesa-row' + (item.done ? ' done' : '');
    var totaleItem = (qtyN > 0 && costoU > 0) ? (qtyN * costoU).toFixed(2) + '€' : '—';
    var badge = item.fromMagazzino ? '<span style="font-family:var(--mono);font-size:7px;color:#2a6b6b;letter-spacing:1px;margin-left:4px">[AUTO]</span>' : '';
    row.innerHTML =
      '<div class="spesa-check ' + (item.done ? 'checked' : '') + '" onclick="toggleSpesa(' + i + ')">' + (item.done ? '✓' : '') + '</div>' +
      '<span class="spesa-name">' + item.nome + badge + '</span>' +
      '<span class="spesa-qty">' + item.qty + '</span>' +
      '<span style="color:#0066cc;font-weight:bold;min-width:50px;text-align:right">' + totaleItem + '</span>' +
      '<div class="spesa-actions">' +
        '<button class="edit-btn-small visible" onclick="openSpesaModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteSpesa(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  }

  function renderHeader(label, color, totCat) {
    var h = document.createElement('div');
    h.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:' + color + ';margin:10px 0 4px;display:flex;justify-content:space-between;align-items:center';
    h.innerHTML = '<span>' + label + '</span><span style="color:' + color + ';font-weight:bold">' + totCat.toFixed(2) + '€</span>';
    list.appendChild(h);
  }

  // Raggruppa per categoria.
  // IMPORTANTE: altroAuto richiede che _categoria sia una stringa nota diversa
  // da 'alcolico'/'analcolico' (es. 'altro'). Voci con _categoria null/undefined
  // dopo il repair sono orfane e vanno in una sezione separata, NON in "Altro",
  // per evitare duplicati con le voci già classificate.
  var alcolici  = SPESA.filter(function(s) { return s.fromMagazzino && s._categoria === 'alcolico'; });
  var analcolici = SPESA.filter(function(s) { return s.fromMagazzino && s._categoria === 'analcolico'; });
  var altroAuto  = SPESA.filter(function(s) { return s.fromMagazzino && s._categoria && s._categoria !== 'alcolico' && s._categoria !== 'analcolico'; });
  var orfane     = SPESA.filter(function(s) { return s.fromMagazzino && !s._categoria; });
  var manual     = SPESA.filter(function(s) { return !s.fromMagazzino; });

  function catTotale(arr) {
    return arr.reduce(function(acc, item) {
      var qN = parseFloat(item.qtyNum);
      var cU = parseFloat(item.costoUnitario);
      return acc + ((!item.done && qN > 0 && cU > 0) ? qN * cU : 0);
    }, 0);
  }

  if (alcolici.length) {
    renderHeader('// ALCOLICI', '#8b2200', catTotale(alcolici));
    alcolici.forEach(renderVoce);
  }
  if (analcolici.length) {
    renderHeader('// ANALCOLICI', '#2a6b6b', catTotale(analcolici));
    analcolici.forEach(renderVoce);
  }
  if (altroAuto.length) {
    renderHeader('// ALTRO (AUTO)', '#555', catTotale(altroAuto));
    altroAuto.forEach(renderVoce);
  }
  if (orfane.length) {
    renderHeader('// NON CLASSIFICATI', '#444', catTotale(orfane));
    orfane.forEach(renderVoce);
  }
  if (manual.length) {
    renderHeader('// VOCI MANUALI', '#555', catTotale(manual));
    manual.forEach(renderVoce);
  }

  if (!SPESA.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:20px;letter-spacing:2px">LISTA VUOTA</div>';
  }

  var badge = document.getElementById('spesaCount');
  if (badge) badge.innerHTML = todo + ' DA FARE • Tot: <span style="color:#0066cc;font-weight:bold">' + totaleGenerale.toFixed(2) + '€</span>';
  updateDash();
}

function toggleSpesa(i) {
  if (i < 0 || i >= SPESA.length) return;
  var item = SPESA[i];

  // Se stiamo marcando come fatto (era non fatto) → chiedi la quantità acquistata
  if (!item.done) {
    var suggerito = item.qtyNum || '';
    var unita = item.unita ? ' (' + item.unita + ')' : '';
    var modale = document.createElement('div');
    modale.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:24px';
    modale.innerHTML =
      '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:4px;width:100%;max-width:300px;padding:20px;display:flex;flex-direction:column;gap:14px">' +
        '<div style="font-family:var(--mono);font-size:9px;color:var(--red);letter-spacing:3px">// ACQUISTO CONFERMATO</div>' +
        '<div style="font-family:var(--body);font-size:14px;color:var(--light)">' + item.nome + '</div>' +
        '<div>' +
          '<label style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;display:block;margin-bottom:6px">// QTÀ ACQUISTATA' + unita + '</label>' +
          '<input id="acquisto-qty" type="number" min="0" step="any" value="' + suggerito + '" style="width:100%;padding:8px 10px;background:#111;border:1px solid #333;border-radius:2px;color:var(--white);font-family:var(--mono);font-size:14px;outline:none"/>' +
        '</div>' +
        (item.fromMagazzino && item.magazzinoId
          ? '<div style="font-family:var(--mono);font-size:8px;color:#2a6b6b;letter-spacing:1px">→ Il magazzino di <b style="color:#4a9b9b">' + item.nome + '</b> verrà aggiornato</div>'
          : '') +
        '<div style="display:flex;gap:8px;margin-top:4px">' +
          '<button onclick="confermaAcquisto(' + i + ')" style="flex:1;padding:10px;background:var(--red);border:none;color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:2px;cursor:pointer;border-radius:2px">✓ CONFERMA</button>' +
          '<button onclick="annullaAcquisto()" style="flex:1;padding:10px;background:transparent;border:1px solid #333;color:#888;font-family:var(--mono);font-size:10px;letter-spacing:2px;cursor:pointer;border-radius:2px">ANNULLA</button>' +
        '</div>' +
      '</div>';
    modale.id = 'acquisto-modal';
    document.body.appendChild(modale);
    setTimeout(function() { var inp = document.getElementById('acquisto-qty'); if(inp){inp.focus();inp.select();} }, 50);
  } else {
    // Stiamo riaprendo una voce già fatta → riapri senza toccare magazzino
    item.done = false;
    addLog('riaperto spesa: ' + item.nome);
    saveSpesa();
    buildSpesa();
  }
}

function annullaAcquisto() {
  var m = document.getElementById('acquisto-modal');
  if (m) m.remove();
}

function confermaAcquisto(i) {
  var inp = document.getElementById('acquisto-qty');
  var qtyAcquistata = inp ? parseFloat(inp.value) : 0;
  annullaAcquisto();

  var item = SPESA[i];
  if (!item) return;

  item.done = true;
  addLog('acquistato spesa: ' + item.nome + (qtyAcquistata ? ' x' + qtyAcquistata + (item.unita ? ' ' + item.unita : '') : ''));

  // Aggiorna magazzino se collegato
  if (item.fromMagazzino && item.magazzinoId && qtyAcquistata > 0) {
    var gIdx = MAGAZZINO.findIndex(function(g) { return g.id === item.magazzinoId; });
    if (gIdx !== -1) {
      var vecchio = MAGAZZINO[gIdx].attuale;
      MAGAZZINO[gIdx].attuale = vecchio + qtyAcquistata;
      addLog('magazzino aggiornato: ' + MAGAZZINO[gIdx].nome + ' da ' + vecchio + ' a ' + MAGAZZINO[gIdx].attuale + ' ' + MAGAZZINO[gIdx].unita);
      // Imposta guard: questo client ha già aggiornato il magazzino localmente,
      // il realtime DELETE su spesa non deve fare un secondo incremento.
      var guardKey = 'mz-' + item.magazzinoId;
      _pendingMagazzinoIds[guardKey] = true;
      setTimeout(function() { delete _pendingMagazzinoIds[guardKey]; }, 5000);
      // Ricalcola lista spesa da magazzino
      syncMagazzinoWithSpesa();
      buildMagazzino();
    }
  }

  buildSpesa();
  saveMagazzino();
  saveSpesa();
  showToast('Acquisto registrato!', 'success');
}

function deleteSpesa(i) {
  var item = SPESA[i];
  if (!item) return;
  var removedId = item.id;
  // Se è una voce [AUTO] collegata al magazzino, registrala come eliminata manualmente
  // così syncMagazzinoWithSpesa non la reinserirà nella stessa sessione.
  if (item.fromMagazzino && item.magazzinoId) {
    _manuallyDeletedSpesaIds[item.magazzinoId] = true;
  }
  deleteItem(SPESA, i, 'spesa', buildSpesa, function() {
    saveSpesa();
    _sbDeleteById('spesa', removedId);
  });
}

// ════════════════════════════════════════
// LAVORI
// ════════════════════════════════════════
function buildLavori() {
  var list = document.getElementById('lavoriList');
  if (!list) return;
  list.innerHTML = '';
  var todo = 0;
  LAVORI.forEach(function(item, i) {
    if (!item.done) todo++;
    var row = document.createElement('div');
    row.className = 'spesa-row' + (item.done ? ' done' : '');
    row.innerHTML = '<div class="spesa-check ' + (item.done ? 'checked' : '') + '" onclick="toggleLavori(' + i + ')">' + (item.done ? '✓' : '') + '</div>' +
      '<span class="spesa-name">' + item.lavoro + '</span>' +
      '<span class="spesa-who">' + (item.who !== '-' ? item.who : '') + '</span>' +
      '<div class="spesa-actions">' +
        '<button class="edit-btn-small visible" onclick="openLavoriModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteLavori(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  });
  var badge = document.getElementById('lavoriCount');
  if (badge) badge.textContent = todo + ' DA FARE';
  updateDash();
}

function toggleLavori(i) {
  if (i < 0 || i >= LAVORI.length) return;
  var item = LAVORI[i];
  item.done = !item.done;
  addLog((item.done ? 'completato' : 'riaperto') + ' lavoro: ' + (item.lavoro || ''));
  // Upsert chirurgico: solo la riga toccata, non l'intero array.
  // saveLavori() (bulk) scriverebbe tutti i lavori con i valori locali,
  // sovrascrivendo modifiche concorrenti di altri utenti sugli altri lavori.
  saveLavoroRow(item);
  buildLavori();
}
function deleteLavori(i) {
  var item = LAVORI[i];
  if (!item) return;
  var removedId = item.id;
  deleteItem(LAVORI, i, 'lavoro', buildLavori, function() {
    // Upsert delle righe rimaste (per sicurezza) + delete puntuale della riga rimossa
    saveLavori();
    _sbDeleteById('lavori', removedId);
  });
}

function openLavoriModal(editIdx) {
  var isEdit = editIdx !== undefined && editIdx !== null;
  var item = isEdit ? LAVORI[editIdx] : null;
  $id('modalTitle').textContent = isEdit ? 'MODIFICA LAVORO' : 'NUOVO LAVORO';
  var staffMembers = MEMBERS.filter(function(m) {
    return m.role === ROLES.STAFF || m.role === ROLES.ADMIN || m.role === ROLES.AIUTANTE;
  });
  var whoOptions = staffMembers.map(function(m) {
    return '<option value="' + m.name + '"' + (isEdit && item.who===m.name ? ' selected' : '') + '>' + m.name + '</option>';
  }).join('');
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// DESCRIZIONE</label><input class="modal-input" id="lDesc" value="' + (isEdit ? item.lavoro : '') + '"/></div>' +
    '<div><label class="modal-label">// ASSEGNATO A</label><select class="modal-input" id="lWho"><option value="-">—</option>' + whoOptions + '</select></div>';

  window._modalCb = function() {
    var obj = {
      id: isEdit ? item.id : getNextId('lavori'),
      lavoro: document.getElementById('lDesc').value.trim(),
      who: document.getElementById('lWho').value,
      done: isEdit ? item.done : false,
    };
    if (isEdit) { LAVORI[editIdx] = obj; } else { LAVORI.push(obj); }
    saveLavori();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' lavoro: ' + obj.lavoro);
    buildLavori();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}


// PAGAMENTI
// ════════════════════════════════════════
function buildPagamenti() {
  var list = document.getElementById('pagamentiList');
  if (!list) return;
  list.innerHTML = '';

  var inDebito = 0;
  PAGAMENTI.forEach(function(p, i) {
    // Lv12 (utente/premium): mostra solo la propria card
    if (isUtente() && !(currentUser && currentUser.name === p.name)) return;
    if (p.saldo < 0) inDebito++;
    var member = MEMBERS.find(function(m){ return m.name === p.name; });
    var color = p.saldo > 0 ? '#2a9a2a' : p.saldo < 0 ? '#cc2200' : '#555';
    var saldoLabel = p.saldo > 0 ? '+' + p.saldo.toFixed(2) + '€ CREDITO'
                   : p.saldo < 0 ? Math.abs(p.saldo).toFixed(2) + '€ DEBITO'
                   : 'IN PARI';

    var avatarHtml = member
      ? (member.photo
          ? '<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="' + member.photo + '" style="width:100%;height:100%;object-fit:cover"/></div>'
          : '<div style="width:34px;height:34px;border-radius:50%;background:' + member.color + ';display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:14px;color:#fff;flex-shrink:0">' + member.initial + '</div>')
      : '<div style="width:34px;height:34px;border-radius:50%;background:#333;flex-shrink:0"></div>';

    var isSelf       = currentUser && currentUser.name === p.name;
    // MOVIMENTI: propria card per tutti; staff/admin vedono anche le altrui
    var canMovimenti = isSelf || isStaff();
    // REGISTRA PAGAMENTO: solo propria card, solo se in debito
    var canPay       = isSelf && p.saldo < 0;
    // ADDEBITA / ACCREDITA: solo admin, solo card altrui
    var canCharge    = (isAdmin() && !isSelf) || (isStaff() && !isAdmin() && isSelf);
    // RIMBORSA: tutti i ruoli, solo card altrui (il mittente deve essere in PAGAMENTI)
    var canRimborsa  = !isSelf && !!currentUser && PAGAMENTI.some(function(q){ return q.name === currentUser.name; });
    // MODIFICA SALDO / RIMUOVI: solo admin
    var canEdit      = isAdmin();

    var card = document.createElement('div');
    card.style.cssText = 'background:var(--panel);border:1px solid #1e1e1e;border-radius:4px;margin-bottom:8px;overflow:hidden;';

    // ── Header (sempre visibile, click per aprire/chiudere) ──
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;';
    header.innerHTML =
      avatarHtml +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--white)">' + p.name.toUpperCase() + '</div>' +
        '<div style="font-family:var(--mono);font-size:10px;font-weight:bold;color:' + color + ';margin-top:2px">' + saldoLabel + '</div>' +
      '</div>' +
      '<div style="font-family:var(--mono);font-size:14px;color:#555;flex-shrink:0" class="pay-arrow">▶</div>';

    // ── Body (collassabile) ──
    var body = document.createElement('div');
    body.style.cssText = 'border-top:1px solid #1a1a1a;padding:10px 14px;display:flex;flex-direction:column;gap:8px;';
    body.style.display = 'none';

    var btns = [];
    if (canMovimenti) {
      btns.push({ label:'📋 MOVIMENTI', color:'transparent', border:'#2a3a4a', txtColor:'var(--light)', action: function(){ apriDettaglioPagamento(i); } });
    }
    if (canPay) {
      btns.push({ label:'✓ REGISTRA PAGAMENTO', color:'transparent', border:'#2a9a2a', txtColor:'#2a9a2a', action: function(){ registraPagamento(i); } });
    }
    if (canCharge) {
      btns.push({ label:'− ADDEBITA', color:'transparent', border:'#cc2200', txtColor:'#cc2200', action: function(){ autoAddebito(i); } });
      btns.push({ label:'+ ACCREDITA', color:'transparent', border:'#2a9a2a', txtColor:'#2a9a2a', action: function(){ accreditaManuale(i); } });
    }
    if (canRimborsa) {
      btns.push({ label:'↩ RIMBORSA', color:'transparent', border:'#8855cc', txtColor:'#aa77ee', action: function(){ rimborsa(i); } });
    }
    if (canEdit) {
      btns.push({ label:'✏ MODIFICA SALDO', color:'transparent', border:'#334488', txtColor:'#6688cc', action: function(){ modificaSaldo(i); } });
      btns.push({ label:'✕ RIMUOVI UTENTE', color:'transparent', border:'#660000', txtColor:'#993333', action: function(){ rimuoviUtentePagamenti(i); } });
    }

    btns.forEach(function(b) {
      var btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = 'width:100%;padding:10px;background:' + (b.color||'transparent') + ';border:1px solid ' + b.border + ';color:' + (b.txtColor||'var(--light)') + ';font-family:var(--mono);font-size:10px;letter-spacing:2px;border-radius:2px;cursor:pointer;text-align:left;';
      btn.addEventListener('click', b.action);
      body.appendChild(btn);
    });

    // Toggle collapse
    header.addEventListener('click', function() {
      var open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'flex';
      header.querySelector('.pay-arrow').textContent = open ? '▶' : '▼';
    });

    card.appendChild(header);
    card.appendChild(body);
    list.appendChild(card);
  });

  // Aggiorna widget dashboard
  var wp = document.getElementById('wPagamenti');
  if (wp) wp.textContent = inDebito;

  // Pulsanti admin in fondo
  if (isAdmin()) {
    var addBtn = document.createElement('button');
    addBtn.textContent = '+ AGGIUNGI UTENTE';
    addBtn.style.cssText = 'width:100%;margin-top:8px;padding:12px;background:transparent;border:1px solid rgba(0,255,204,0.3);color:var(--cyan);font-family:var(--mono);font-size:10px;letter-spacing:2px;border-radius:2px;cursor:pointer;';
    addBtn.addEventListener('click', function() { aggiungiUtentePagamenti(); });
    list.appendChild(addBtn);

    var expBtn = document.createElement('button');
    expBtn.textContent = '⬇ ESPORTA BACKUP';
    expBtn.style.cssText = 'width:100%;margin-top:6px;padding:12px;background:transparent;border:1px solid #334455;color:#556677;font-family:var(--mono);font-size:10px;letter-spacing:2px;border-radius:2px;cursor:pointer;';
    expBtn.addEventListener('click', function() { esportaPagamenti(); });
    list.appendChild(expBtn);
  }
}


function aggiungiUtentePagamenti() {
  $id('modalTitle').textContent = 'AGGIUNGI UTENTE · PAGAMENTI';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// NOME UTENTE</label>' +
    '<input class="modal-input" id="newPagNome" placeholder="es. Mario" maxlength="30"/></div>';
  window._modalCb = function() {
    var nome = $id('newPagNome').value.trim();
    if (!nome) { showToast('// NOME OBBLIGATORIO', 'error'); return; }
    var exists = PAGAMENTI.find(function(p) { return p.name.toLowerCase() === nome.toLowerCase(); });
    if (exists) { showToast('// UTENTE GIÀ PRESENTE', 'error'); return; }
    PAGAMENTI.push({ name: nome, saldo: 0, movimenti: [] });
    savePagamenti();
    buildPagamenti();
    _applyRoleVisibility();
    closeModal();
    showToast('// UTENTE AGGIUNTO: ' + nome.toUpperCase(), 'success');
    addLog('aggiunto utente pagamenti: ' + nome);
  };
  openModal();
}

function esportaPagamenti() {
  if (!isAdmin()) return;
  var data = new Date().toISOString().slice(0, 10);
  var righe = ['NOME;SALDO;MOVIMENTI'];
  PAGAMENTI.forEach(function(p) {
    var mov = p.movimenti.map(function(m) {
      return m.data + ' ' + (m.importo >= 0 ? '+' : '') + m.importo.toFixed(2) + '€ [' + m.tipo + '] ' + (m.nota || '');
    }).join(' | ');
    righe.push(p.name + ';' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€;' + mov);
  });
  var csv = righe.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'pagamenti_backup_' + data + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('// BACKUP ESPORTATO', 'ok');
}

function rimuoviUtentePagamenti(i) {
  var p = PAGAMENTI[i];
  showConfirm(
    'Rimuovere ' + p.name.toUpperCase() + ' dai pagamenti? Tutti i movimenti andranno persi.',
    async function() {
      try {
        await getSupabase().from('pagamenti').delete().eq('member_name', p.name);
      } catch(e) { console.warn('[rimuovi pagamento]', e.message); }
      PAGAMENTI.splice(i, 1);
      buildPagamenti();
      _applyRoleVisibility();
      // Se l'utente rimosso è il Lv12 corrente → non ha più accesso, torna a screenHome
      if (currentUser && currentUser.name === p.name && isUtente()) {
        navigate('screenHome');
      }
      showToast('// UTENTE RIMOSSO: ' + p.name.toUpperCase(), 'success');
      addLog('rimosso utente pagamenti: ' + p.name);
    },
    'RIMUOVI UTENTE',
    'RIMUOVI'
  );
}

function apriDettaglioPagamento(i) {
  var p = PAGAMENTI[i];
  var rows = p.movimenti.length
    ? p.movimenti.slice().reverse().map(function(m){
        var isEntrata = m.importo > 0;
        var color = isEntrata ? '#2a9a2a' : '#cc2200';
        var icon = isEntrata ? '▲' : '▼';
        return '<div class="spesa-row" style="font-size:10px">' +
          '<span style="font-family:var(--mono);font-size:8px;color:#555;min-width:75px">' + m.data + '</span>' +
          '<span style="flex:1;color:var(--light)">' + (m.nota || m.tipo) + '</span>' +
          '<span style="font-weight:bold;color:' + color + ';font-family:var(--mono)">' + icon + ' ' + Math.abs(m.importo).toFixed(2) + '€</span>' +
        '</div>';
      }).join('')
    : '<div style="font-family:var(--mono);font-size:9px;color:#444;text-align:center;padding:16px">NESSUN MOVIMENTO</div>';

  var saldo = p.saldo;
  var saldoColor = saldo > 0 ? '#2a9a2a' : saldo < 0 ? '#cc2200' : '#555';
  var saldoLabel = saldo > 0 ? '+' + saldo.toFixed(2) + '€ CREDITO' : saldo < 0 ? '-' + Math.abs(saldo).toFixed(2) + '€ DEBITO' : 'IN PARI';

  // Costruisci mini grafico saldo nel tempo con SVG
  var grafico = '';
  if (p.movimenti.length >= 2) {
    var saldoTemp = 0;
    var punti = [0];
    p.movimenti.forEach(function(m){ saldoTemp += m.importo; punti.push(saldoTemp); });
    var minV = Math.min.apply(null, punti);
    var maxV = Math.max.apply(null, punti);
    var range = maxV - minV || 1;
    var W = 280, H = 50, pad = 4;
    var pts = punti.map(function(v, idx){
      var x = pad + (idx / (punti.length - 1)) * (W - pad*2);
      var y = pad + (1 - (v - minV) / range) * (H - pad*2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var zeroY = pad + (1 - (0 - minV) / range) * (H - pad*2);
    grafico = '<div style="margin-bottom:12px;background:var(--dark);border:1px solid var(--border);padding:8px;border-radius:2px">' +
      '<div style="font-family:var(--mono);font-size:7px;color:#555;letter-spacing:2px;margin-bottom:4px">ANDAMENTO SALDO</div>' +
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block">' +
        '<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W-pad) + '" y2="' + zeroY.toFixed(1) + '" stroke="#333" stroke-width="1" stroke-dasharray="3,3"/>' +
        '<polyline points="' + pts + '" fill="none" stroke="' + (saldo >= 0 ? '#2a9a2a' : '#cc2200') + '" stroke-width="1.5"/>' +
        '<circle cx="' + (pad + (W-pad*2)).toFixed(1) + '" cy="' + (pad + (1 - (saldo - minV) / range) * (H-pad*2)).toFixed(1) + '" r="3" fill="' + saldoColor + '"/>' +
      '</svg>' +
    '</div>';
  }

  $id('modalTitle').textContent = 'MOVIMENTI · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--dark);border:1px solid var(--border);margin-bottom:12px;font-family:var(--mono)">' +
      '<span style="font-size:9px;letter-spacing:2px;color:#888">SALDO ATTUALE</span>' +
      '<span style="font-size:13px;font-weight:bold;color:' + saldoColor + '">' + saldoLabel + '</span>' +
    '</div>' +
    grafico +
    '<div style="max-height:45vh;overflow-y:auto">' + rows + '</div>';
  window._modalCb = null;
  openModal();
}

function registraPagamento(i) {
  var p = PAGAMENTI[i];
  var dovuto = Math.abs(p.saldo).toFixed(2);
  $id('modalTitle').textContent = 'REGISTRA PAGAMENTO · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#cc2200;letter-spacing:2px;margin-bottom:12px">DEBITO ATTUALE: ' + dovuto + '€</div>' +
    '<div><label class="modal-label">// IMPORTO PAGATO (€)</label><input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" max="' + dovuto + '" value="' + dovuto + '"/></div>' +
    '<div><label class="modal-label">// NOTA (opzionale)</label><input class="modal-input" id="mvNota" placeholder="es. Bonifico, contanti..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'pagamento';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: importo, tipo: 'pagamento', nota: nota });
    addLog('pagamento registrato: ' + p.name + ' +' + importo + '€ — ' + nota);
    closeModal();
    buildPagamenti();
    // Usa _saveRigaPagamenti per non sovrascrivere righe non caricate (es. Lv12 con lista parziale)
    _saveRigaPagamenti(PAGAMENTI[i]);
  };
  openModal();
}

function modificaSaldo(i) {
  if (!isAdmin()) return;
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'MODIFICA SALDO · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// TIPO MOVIMENTO</label>' +
      '<select class="modal-input" id="mvTipo">' +
        '<option value="debito">Addebita (debito)</option>' +
        '<option value="credito">Accredita (credito)</option>' +
      '</select></div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label><input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01"/></div>' +
    '<div><label class="modal-label">// NOTA</label><input class="modal-input" id="mvNota" placeholder="es. Quota serata, rimborso..."/></div>';
  window._modalCb = function() {
    var tipo = $id('mvTipo').value;
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || tipo;
    var data = new Date().toISOString().slice(0,10);
    var delta = tipo === 'debito' ? -importo : importo;
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + delta).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: delta, tipo: tipo, nota: nota });
    addLog('saldo modificato: ' + p.name + ' ' + (delta >= 0 ? '+' : '') + delta + '€ — ' + nota);
    closeModal();
    buildPagamenti();
    savePagamenti();
  };
  openModal();
}

function autoAddebito(i) {
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'ADDEBITA · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label><input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" placeholder="es. 20.00"/></div>' +
    '<div><label class="modal-label">// NOTA</label><input class="modal-input" id="mvNota" placeholder="es. Preso dalla cassa, consumazione..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'auto-addebito';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo - importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: -importo, tipo: 'debito', nota: nota });
    addLog('auto-addebito: ' + p.name + ' -' + importo + '€ — ' + nota);
    closeModal();
    buildPagamenti();
    _saveRigaPagamenti(PAGAMENTI[i]);
  };
  openModal();
}


function accreditaManuale(i) {
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'ACCREDITA · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label><input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" placeholder="es. 20.00"/></div>' +
    '<div><label class="modal-label">// NOTA</label><input class="modal-input" id="mvNota" placeholder="es. Versamento, rimborso..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'accredito manuale';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: importo, tipo: 'credito', nota: nota });
    addLog('accredito: ' + p.name + ' +' + importo + '€ — ' + nota);
    closeModal();
    buildPagamenti();
    _saveRigaPagamenti(PAGAMENTI[i]);
  };
  openModal();
}


function rimborsa(i) {
  if (!currentUser) return;
  var dest = PAGAMENTI[i];
  var mittIdx = PAGAMENTI.findIndex(function(p){ return p.name === currentUser.name; });
  if (mittIdx < 0) { showToast('// NON SEI IN PAGAMENTI', 'error'); return; }
  var mitt = PAGAMENTI[mittIdx];

  $id('modalTitle').textContent = 'RIMBORSA · ' + dest.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
      'TUO SALDO: ' + (mitt.saldo >= 0 ? '+' : '') + mitt.saldo.toFixed(2) + '€' +
    '</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label>' +
      '<input class="modal-input" id="rmbImporto" type="number" step="0.01" min="0.01" placeholder="es. 10.00"/>' +
    '</div>' +
    '<div><label class="modal-label">// NOTA (opzionale)</label>' +
      '<input class="modal-input" id="rmbNota" placeholder="es. Cena di ieri..."/>' +
    '</div>';

  window._modalCb = async function() {
    var importo = parseFloat($id('rmbImporto').value) || 0;
    if (importo <= 0) { showToast('// IMPORTO NON VALIDO', 'error'); return; }
    var nota = $id('rmbNota').value.trim();
    var data = new Date().toISOString().slice(0, 10);

    // Aggiorna mittente in memoria
    mitt.saldo = parseFloat((mitt.saldo - importo).toFixed(2));
    mitt.movimenti.push({ data: data, importo: -importo, tipo: 'rimborso', nota: '→ ' + dest.name + (nota ? ' · ' + nota : '') });
    closeModal();
    buildPagamenti();

    // Upsert mittente
    var ok1 = await _saveRigaPagamenti(mitt);
    if (!ok1) {
      mitt.saldo = parseFloat((mitt.saldo + importo).toFixed(2));
      mitt.movimenti.pop();
      buildPagamenti();
      showToast('// ERRORE SALVATAGGIO — OPERAZIONE ANNULLATA', 'error');
      return;
    }

    // Aggiorna destinatario in memoria
    dest.saldo = parseFloat((dest.saldo + importo).toFixed(2));
    dest.movimenti.push({ data: data, importo: importo, tipo: 'rimborso', nota: '← ' + mitt.name + (nota ? ' · ' + nota : '') });
    buildPagamenti();

    // Upsert destinatario
    var ok2 = await _saveRigaPagamenti(dest);
    if (!ok2) {
      // Rollback entrambi in memoria
      mitt.saldo = parseFloat((mitt.saldo + importo).toFixed(2));
      mitt.movimenti.pop();
      dest.saldo = parseFloat((dest.saldo - importo).toFixed(2));
      dest.movimenti.pop();
      buildPagamenti();
      _saveRigaPagamenti(mitt); // best-effort ripristino mittente su Supabase
      showToast('// ERRORE DESTINATARIO — ROLLBACK ESEGUITO', 'error');
      return;
    }

    addLog(currentUser.name + ' ha rimborsato ' + importo.toFixed(2) + '€ a ' + dest.name + (nota ? ' — ' + nota : ''));
    showToast('// RIMBORSO: ' + importo.toFixed(2) + '€ → ' + dest.name.toUpperCase(), 'ok');
  };
  openModal();
}


function buildLog() {
  var list = document.getElementById('logList');
  if (!list) return;
  list.innerHTML = '';

  var fUtente = (document.getElementById('logFiltroUtente') ? document.getElementById('logFiltroUtente').value.trim().toLowerCase() : '');
  var fAzione = (document.getElementById('logFiltroAzione') ? document.getElementById('logFiltroAzione').value.trim().toLowerCase() : '');
  var fData   = (document.getElementById('logFiltroData')   ? document.getElementById('logFiltroData').value.trim().toLowerCase()   : '');

  var filtered = LOG.filter(function(entry) {
    var okUtente = !fUtente || entry.member.name.toLowerCase().includes(fUtente);
    var okAzione = !fAzione || entry.azione.toLowerCase().includes(fAzione);
    var okData   = !fData   || entry.tempo.toLowerCase().includes(fData);
    return okUtente && okAzione && okData;
  });

  if (!filtered.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:20px;letter-spacing:2px">' + (LOG.length ? 'NESSUN RISULTATO' : 'NESSUNA ATTIVITÀ') + '</div>';
    return;
  }
  filtered.forEach(function(entry) {
    var item = document.createElement('div');
    item.className = 'log-item';
    var rl = roleLabel(entry.member.role);
    var avatarHtml = entry.member.photo
      ? '<div class="log-avatar" style="background:transparent;overflow:hidden"><img src="' + entry.member.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/></div>'
      : '<div class="log-avatar" style="background:' + entry.member.color + '">' + entry.member.initial + '</div>';
    item.innerHTML = avatarHtml +
      '<div><div class="log-text"><strong>' + entry.member.name + '</strong>' +
      '<span style="font-family:var(--mono);font-size:7px;color:' + rl.color + ';letter-spacing:1px;margin-left:4px">[' + rl.label + ']</span>' +
      ' ' + entry.azione + '</div>' +
      '<div class="log-time">' + entry.tempo + '</div></div>';
    list.appendChild(item);
  });
}

// ════════════════════════════════════════
// DASHBOARD COUNTS
// ════════════════════════════════════════

var _unreadLog  = 0;

function updateDash() {
  // Notifica magazzino — aggiorna widget dashboard con colore rosso se sotto minimo
  var sottoMinimo = MAGAZZINO.filter(function(g){ return g.attuale < g.minimo; });
  var wMagEl = document.getElementById('wMagazzino');
  var wLabelEl = document.getElementById('wlabel-magazzino');
  if (wMagEl) {
    wMagEl.textContent = sottoMinimo.length;
    wMagEl.style.color = sottoMinimo.length > 0 ? '#cc2200' : '';
  }
  if (wLabelEl) {
    wLabelEl.textContent = sottoMinimo.length > 0 ? '⚠ SOTTO MINIMO' : 'MAGAZZINO';
    wLabelEl.style.color = sottoMinimo.length > 0 ? '#cc2200' : '';
  }

  // Eventi: solo futuri
  var today = new Date(); today.setHours(0,0,0,0);
  var futuri = EVENTI.filter(function(e) {
    return new Date(e.anno, e.mese-1, e.giorno) >= today;
  }).length;
  var we = document.getElementById('wEventi'); if (we) we.textContent = futuri;

  // Spesa: da fare
  var ws = document.getElementById('wSpesa');
  if (ws) ws.textContent = SPESA.filter(function(s){return !s.done;}).length;

  // Lavori: da fare
  var wl = document.getElementById('wLavori');
  if (wl) wl.textContent = LAVORI.filter(function(l){return !l.done;}).length;

  // Pagamenti: in sospeso
  var wp = document.getElementById('wPagamenti');
  if (wp) wp.textContent = PAGAMENTI.filter(function(p){return !p.pagato;}).length;

  // Log: solo non visti
  var wll = document.getElementById('wLog');
  if (wll) wll.textContent = _unreadLog;
}

// ════════════════════════════════════════
// EVENTI CRUD
// ════════════════════════════════════════
function deleteEvento(i) {
  if (!canEdit()) return;
  showConfirm('Eliminare "' + EVENTI[i].nome + '"?', function() {
    var evId  = EVENTI[i].id;
    var evLoc = EVENTI[i].locandina;
    addLog('eliminato evento: ' + EVENTI[i].nome);
    EVENTI.splice(i, 1);
    if (evId && EVENTI_VALUTAZIONI[evId]) { delete EVENTI_VALUTAZIONI[evId]; saveConfig(); }
    saveEventi();
    _sbDeleteById('calendario', evId);
    // Cancella la locandina da Storage se era un file caricato (non base64 legacy)
    if (evLoc && evLoc.indexOf('/storage/v1/object/public/locandine/') !== -1) {
      deleteLocandina(evLoc);
    }
    sCalSel = null;
    buildAll();
    showToast('// EVENTO ELIMINATO', 'error');
  });
}

function openEventoModal(editIdx, preDay, preMese, preAnno) {
  if (!canEdit()) return;
  var isEdit = editIdx !== null && editIdx !== undefined;
  var ev = isEdit ? EVENTI[editIdx] : null;
  $id('modalTitle').textContent = isEdit ? 'MODIFICA EVENTO' : 'NUOVO EVENTO';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="mNome" type="text" value="' + (isEdit ? ev.nome : '') + '"/></div>' +
    '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;margin:10px 0 4px">// DATA INIZIO</div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">GG</label><input class="modal-input" id="mGiorno" type="number" min="1" max="31" value="' + (isEdit ? ev.giorno : (preDay||'')) + '"/></div>' +
      '<div><label class="modal-label">MM</label><input class="modal-input" id="mMese" type="number" min="1" max="12" value="' + (isEdit ? ev.mese : (preMese||'')) + '"/></div>' +
      '<div><label class="modal-label">AAAA</label><input class="modal-input" id="mAnno" type="number" value="' + (isEdit ? ev.anno : (preAnno||new Date().getFullYear())) + '"/></div>' +
    '</div>' +
    '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;margin:10px 0 4px">// DATA FINE <span style="color:#333">(opzionale — lascia vuoto se evento di un solo giorno)</span></div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">GG</label><input class="modal-input" id="mGiornoFine" type="number" min="1" max="31" value="' + (isEdit && ev.giornoFine ? ev.giornoFine : '') + '" placeholder="—"/></div>' +
      '<div><label class="modal-label">MM</label><input class="modal-input" id="mMeseFine" type="number" min="1" max="12" value="' + (isEdit && ev.meseFine ? ev.meseFine : '') + '" placeholder="—"/></div>' +
      '<div><label class="modal-label">AAAA</label><input class="modal-input" id="mAnnoFine" type="number" value="' + (isEdit && ev.annoFine ? ev.annoFine : '') + '" placeholder="—"/></div>' +
    '</div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">// ORA INIZIO</label><input class="modal-input" id="mOra" type="text" placeholder="22:00" value="' + (isEdit ? ev.ora : '') + '"/></div>' +
      '<div><label class="modal-label">// ORA FINE <span style="font-size:9px;color:#444">(opz.)</span></label><input class="modal-input" id="mOraFine" type="text" placeholder="02:00" value="' + (isEdit && ev.ora_fine ? ev.ora_fine : '') + '"/></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;margin:4px 0 8px">' +
      '<input type="checkbox" id="mTerminato" style="width:16px;height:16px;accent-color:#cc2200;cursor:pointer;flex-shrink:0"' + (isEdit && ev.terminato ? ' checked' : '') + '/>' +
      '<label for="mTerminato" style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#888;cursor:pointer">EVENTO TERMINATO <span style="color:#555">(segnalo manualmente come concluso)</span></label>' +
    '</div>' +
    '<div><label class="modal-label">// TIPO</label>' +
    '<select class="modal-input" id="mTipo">' +
      '<option value="invito"'      + (isEdit && ev.tipo==='invito'      ? ' selected' : '') + '>SU INVITO</option>' +
      '<option value="premium"'     + (isEdit && ev.tipo==='premium'     ? ' selected' : '') + '>PREMIUM</option>' +
      '<option value="privato"'     + (isEdit && ev.tipo==='privato'     ? ' selected' : '') + '>PRIVATO</option>' +
      '<option value="segreto"'     + (isEdit && ev.tipo==='segreto'     ? ' selected' : '') + '>SEGRETO</option>' +
      '<option value="consigliato"' + (isEdit && ev.tipo==='consigliato' ? ' selected' : '') + '>CONSIGLIATO</option>' +
    '</select></div>' +
    '<div><label class="modal-label">// DESCRIZIONE</label><textarea class="modal-input" id="mDesc" rows="3" style="resize:none">' + (isEdit ? ev.desc : '') + '</textarea></div>' +
    '<div><label class="modal-label">// NOTE</label><input class="modal-input" id="mNote" type="text" value="' + (isEdit ? ev.note : '') + '"/></div>' +
    '<div><label class="modal-label">// LUOGO <span style="font-size:9px;color:#444">(opzionale, per eventi consigliati)</span></label><input class="modal-input" id="mLuogo" type="text" placeholder="es. Warehouse, Milano" value="' + (isEdit && ev.luogo ? ev.luogo : '') + '"/></div>' +
    '<div><label class="modal-label">// LOCANDINA</label>' +
    '<input type="file" id="mLocandinaFile" accept="image/*" style="display:none"/>' +
    '<button onclick="document.getElementById(\'mLocandinaFile\').click()" style="width:100%;padding:10px;background:transparent;border:1px dashed #2a2a2a;color:#555;font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">📷 CARICA LOCANDINA</button>' +
    '<div id="mLocandinaPreview" style="margin-top:6px">' + (isEdit && ev.locandina ? '<div class="loc-img-wrap" onclick="openLightbox(this.querySelector(\'img\').src)"><img src="' + ev.locandina + '" style="width:100%;border-radius:3px;max-height:160px;object-fit:contain"/><span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' : '') + '</div></div>' +
    '<div style="border-top:1px solid #1a1a1a;margin:10px 0 6px;padding-top:10px">' +
      '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#444;margin-bottom:8px">// 🔔 NOTIFICHE</div>' +
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">' +
        '<input type="checkbox" id="mNotificaNuovo" style="width:16px;height:16px;accent-color:#cc2200;cursor:pointer;flex-shrink:0"' + (isEdit && ev.notifica_nuovo ? ' checked' : (!isEdit ? ' checked' : '')) + '/>' +
        '<label for="mNotificaNuovo" style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#888;cursor:pointer">NOTIFICA NUOVO EVENTO <span style="color:#555;font-size:8px">(invia push alla pubblicazione)</span></label>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">' +
        '<input type="checkbox" id="mNotificaReminder" style="width:16px;height:16px;accent-color:#cc2200;cursor:pointer;flex-shrink:0"' + (isEdit && ev.notifica_reminder ? ' checked' : (!isEdit ? ' checked' : '')) + '/>' +
        '<label for="mNotificaReminder" style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#888;cursor:pointer">REMINDER 5H PRIMA <span style="color:#555;font-size:8px">(invia push 5 ore prima dell\'inizio)</span></label>' +
      '</div>' +
    '</div>';

  // Attiva input file locandina dopo che il modal è nel DOM
  setTimeout(function() {
    var fileInput = document.getElementById('mLocandinaFile');
    function _showLocandinaPreview(src) {
      var prev = document.getElementById('mLocandinaPreview');
      if (!prev) return;
      prev.innerHTML =
        '<div class="loc-img-wrap" onclick="openLightbox(this.querySelector(\'img\').src)"><img src="' + src + '" style="width:100%;border-radius:3px;max-height:160px;object-fit:contain"/><span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' +
        '<button onclick="_clearLocandina()" style="margin-top:4px;width:100%;padding:6px;background:transparent;border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI LOCANDINA</button>';
    }
    window._clearLocandina = function() {
      var prev = document.getElementById('mLocandinaPreview');
      if (prev) prev.innerHTML = '';
      if (fileInput) { fileInput._b64 = null; fileInput.value = ''; }
      window._locandinaCancellata = true;
    };
    window._locandinaCancellata = false;
    if (fileInput) fileInput.onchange = function() {
      var file = this.files[0];
      if (!file) return;
      window._locandinaCancellata = false;
      compressLocandina(file, function(b64) {
        fileInput._b64 = b64;
        _showLocandinaPreview(b64);
      });
    };
    // Se c'era già una locandina in modifica, aggiungi il bottone elimina
    var prevEl = document.getElementById('mLocandinaPreview');
    if (prevEl && prevEl.querySelector('img')) {
      prevEl.innerHTML = prevEl.innerHTML +
        '<button onclick="_clearLocandina()" style="margin-top:4px;width:100%;padding:6px;background:transparent;border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI LOCANDINA</button>';
    }
  }, 50);

  window._modalCb = async function() {
    var locandinaFile = document.getElementById('mLocandinaFile');
    var nome   = document.getElementById('mNome').value.trim();
    var giorno = parseInt(document.getElementById('mGiorno').value) || 1;
    var mese   = parseInt(document.getElementById('mMese').value)   || 1;
    var anno   = parseInt(document.getElementById('mAnno').value)   || new Date().getFullYear();

    // Data fine (opzionale)
    var giornoFineRaw = document.getElementById('mGiornoFine').value.trim();
    var meseFineRaw   = document.getElementById('mMeseFine').value.trim();
    var annoFineRaw   = document.getElementById('mAnnoFine').value.trim();
    var hasDateFine = giornoFineRaw || meseFineRaw || annoFineRaw;
    var giornoFine = hasDateFine ? (parseInt(giornoFineRaw) || giorno) : null;
    var meseFine   = hasDateFine ? (parseInt(meseFineRaw)   || mese)   : null;
    var annoFine   = hasDateFine ? (parseInt(annoFineRaw)   || anno)   : null;

    if (!nome) { showToast('// INSERISCI IL NOME EVENTO', 'error'); return; }

    var errData = validaDataEvento(giorno, mese, anno);
    if (errData) { showToast('// ' + errData.toUpperCase(), 'error'); return; }

    // Validazione data fine se presente
    if (hasDateFine) {
      var errFine = validaDataEvento(giornoFine, meseFine, annoFine);
      if (errFine) { showToast('// DATA FINE: ' + errFine.toUpperCase(), 'error'); return; }
      var tsInizio = new Date(anno, mese-1, giorno).getTime();
      var tsFine   = new Date(annoFine, meseFine-1, giornoFine).getTime();
      if (tsFine < tsInizio) { showToast('// DATA FINE PRECEDENTE ALL\'INIZIO', 'error'); return; }
    }

    var oraFineVal = document.getElementById('mOraFine').value.trim();
    var terminatoVal = document.getElementById('mTerminato').checked;

    // ── Gestione locandina ────────────────────────────────────────────────
    // Se è stata caricata una nuova immagine (base64 in _b64):
    //   1. Se in modifica ed esisteva già una locandina Storage → cancellala
    //   2. Carica il nuovo file su Supabase Storage → salva l'URL
    // Se è stata cancellata (_locandinaCancellata):
    //   → cancella il vecchio file da Storage (se era un URL Storage) e salva null
    // Altrimenti:
    //   → mantieni la locandina esistente
    var eventoId = isEdit ? ev.id : getNextId('event');
    var locandinaFinal = isEdit ? ev.locandina : null;

    if (locandinaFile && locandinaFile._b64) {
      // Nuova immagine caricata
      showToast('// CARICAMENTO LOCANDINA...', 'info');
      // Cancella la vecchia da Storage se esiste
      if (isEdit && ev.locandina) deleteLocandina(ev.locandina);
      var uploadedUrl = await uploadLocandina(locandinaFile._b64, eventoId);
      locandinaFinal = uploadedUrl || locandinaFile._b64; // fallback a base64 se upload fallisce
    } else if (window._locandinaCancellata) {
      // Locandina rimossa
      if (isEdit && ev.locandina) deleteLocandina(ev.locandina);
      locandinaFinal = null;
    }
    // ─────────────────────────────────────────────────────────────────────

    var obj = {
      id: eventoId,
      nome: nome,
      giorno: giorno, mese: mese, anno: anno,
      giornoFine: giornoFine, meseFine: meseFine, annoFine: annoFine,
      ora: document.getElementById('mOra').value.trim(),
      ora_fine: oraFineVal || null,
      terminato: terminatoVal,
      tipo: document.getElementById('mTipo').value,
      desc: document.getElementById('mDesc').value.trim(),
      note: document.getElementById('mNote').value.trim(),
      luogo: document.getElementById('mLuogo').value.trim(),
      locandina: locandinaFinal,
      notifica_nuovo: document.getElementById('mNotificaNuovo') ? document.getElementById('mNotificaNuovo').checked : false,
      notifica_reminder: document.getElementById('mNotificaReminder') ? document.getElementById('mNotificaReminder').checked : false,
    };
    if (isEdit) { EVENTI[editIdx] = obj; } else { EVENTI.push(obj); }
    saveEventi();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' evento: ' + obj.nome);
    // Notifiche push
    if (typeof notificaNuovoEvento === 'function') {
      if (!isEdit) {
        notificaNuovoEvento(obj);
      } else if (obj.notifica_nuovo && !ev.notifica_nuovo) {
        notificaNuovoEvento(obj);
      }
    }
    if (typeof pianificaReminderEvento === 'function') pianificaReminderEvento(obj);
    buildAll();
    showToast('// EVENTO ' + (isEdit ? 'AGGIORNATO' : 'AGGIUNTO') + ' ✓', 'success');
    closeModal();
  };
  openModal();
}

// ════════════════════════════════════════
// ════════════════════════════════════════
// FOTO WIDGET HELPER (bacheca / info)
// ════════════════════════════════════════
function _fotoWidgetHtml(currentFoto) {
  return '<div><label class="modal-label">// FOTO (URL)</label><input class="modal-input" id="bFotoUrl" placeholder="https://..." value="' + (currentFoto || '') + '"/></div>' +
    '<div><label class="modal-label">// OPPURE CARICA</label>' +
    '<input type="file" id="bFotoFile" accept="image/*" style="display:none" onchange="previewFoto(this)"/>' +
    '<button onclick="document.getElementById(\'bFotoFile\').click()" style="width:100%;padding:10px;background:transparent;border:1px dashed #2a2a2a;color:#555;font-family:monospace;font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">📷 CARICA FOTO</button>' +
    '<div id="fotoPreview" style="margin-top:6px">' +
      (currentFoto ? '<img src="' + currentFoto + '" id="fotoPreviewImg" style="width:100%;border-radius:3px;max-height:100px;object-fit:cover"/><button onclick="_clearFoto()" style="margin-top:4px;width:100%;padding:6px;background:transparent;border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI FOTO</button>' : '') +
    '</div></div>';
}
window._clearFoto = function() {
  var prev = document.getElementById('fotoPreview');
  if (prev) prev.innerHTML = '';
  var fi = document.getElementById('bFotoFile');
  if (fi) { fi._b64 = null; fi.value = ''; }
  var url = document.getElementById('bFotoUrl');
  if (url) url.value = '';
  window._fotoCancellata = true;
};
function previewFoto(input) {
  if (!input.files || !input.files[0]) return;
  window._fotoCancellata = false;
  var reader = new FileReader();
  reader.onload = function(e) {
    input._b64 = e.target.result;
    var urlEl = document.getElementById('bFotoUrl');
    if (urlEl) urlEl.value = '';
    var prev = document.getElementById('fotoPreview');
    if (prev) prev.innerHTML = '<img src="' + e.target.result + '" style="width:100%;border-radius:3px;max-height:100px;object-fit:cover"/>' +
      '<button onclick="_clearFoto()" style="margin-top:4px;width:100%;padding:6px;background:transparent;border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI FOTO</button>';
  };
  reader.readAsDataURL(input.files[0]);
}
function _getFotoFinal() {
  var fi  = document.getElementById('bFotoFile');
  var url = document.getElementById('bFotoUrl');
  if (fi && fi._b64) return fi._b64;
  if (url && url.value.trim()) return url.value.trim();
  return null;
}

// BACHECA CRUD
// ════════════════════════════════════════
function openBachecaModal(i) {
  if (!canEdit()) return;
  var item = BACHECA[i];
  $id('modalTitle').textContent = 'MODIFICA BACHECA';
  $id('modalBody').innerHTML =
    '<div class="modal-row"><div style="flex:0 0 60px"><label class="modal-label">// ICONA</label><input class="modal-input" id="bIcon" style="font-size:18px" value="' + item.icon + '"/></div>' +
    '<div><label class="modal-label">// TITOLO</label><input class="modal-input" id="bTitolo" value="' + item.titolo + '"/></div></div>' +
    '<div><label class="modal-label">// TESTO</label><textarea class="modal-input" id="bTesto" rows="4" style="resize:none">' + item.testo + '</textarea></div>' +
    _fotoWidgetHtml(item.foto);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var fotoFinal = window._fotoCancellata ? null : (_getFotoFinal() || (window._fotoCancellata ? null : item.foto));
    var now = new Date();
    BACHECA[i] = {
      id: item.id,
      icon: document.getElementById('bIcon').value || item.icon,
      titolo: document.getElementById('bTitolo').value.trim() || item.titolo,
      testo: document.getElementById('bTesto').value.trim(),
      tempo: String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0'),
      foto: fotoFinal,
    };
    saveConfig();
    addLog('modificato bacheca: ' + BACHECA[i].titolo);
    buildBacheca();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

// ════════════════════════════════════════
// LONG PRESS UTILITY
// ════════════════════════════════════════
function attachLongPress(el, callback) {
  var timer = null;

  function start(e) {
    el.style.transition = 'box-shadow 1s ease';
    el.style.boxShadow = '0 0 0 2px var(--red)';
    timer = setTimeout(function() {
      el.style.boxShadow = '';
      el.style.transition = '';
      callback(e);
    }, 1000);
  }

  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    el.style.boxShadow = '';
    el.style.transition = '';
  }

  el.addEventListener('touchstart',  function(e) { start(e); }, { passive: true });
  el.addEventListener('touchend',    cancel);
  el.addEventListener('touchmove',   cancel, { passive: true });
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     cancel);
  el.addEventListener('mouseleave',  cancel);
  el.addEventListener('contextmenu', function(e) { e.preventDefault(); });
}

function showLongPressMenu(type, index) {
  // Rimuovi menu precedente
  var old = document.getElementById('longPressMenu');
  if (old) old.remove();

  var menu = document.createElement('div');
  menu.id = 'longPressMenu';
  menu.style.cssText = [
    'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
    'background:#161616', 'border:1px solid #2a2a2a', 'border-radius:6px',
    'z-index:9999', 'min-width:220px', 'overflow:hidden',
    'box-shadow:0 8px 32px rgba(0,0,0,0.8)',
    'animation:menuFadeIn 0.15s ease'
  ].join(';');

  var label = type === 'bacheca'
    ? (BACHECA[index] ? BACHECA[index].titolo : '')
    : (INFO[index]    ? INFO[index].titolo    : '');

  menu.innerHTML =
    '<div style="padding:10px 14px 8px;font-family:var(--mono);font-size:8px;color:#555;letter-spacing:3px;border-bottom:1px solid #1e1e1e">// ' + label.toUpperCase() + '</div>' +
    '<button onclick="closeLongPressMenu();' + (type === 'bacheca' ? 'openBachecaModal(' + index + ')' : 'openInfoModal(' + index + ')') + '" style="width:100%;padding:14px 16px;background:transparent;border:none;border-bottom:1px solid #1a1a1a;color:var(--white);font-family:var(--body);font-size:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px"><span>✏️</span><span>Modifica</span></button>' +
    '<button onclick="closeLongPressMenu();' + (type === 'bacheca' ? 'deleteBacheca(' + index + ')' : 'deleteInfo(' + index + ')') + '" style="width:100%;padding:14px 16px;background:transparent;border:none;border-bottom:1px solid #1a1a1a;color:#cc2200;font-family:var(--body);font-size:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px"><span>🗑️</span><span>Elimina</span></button>' +
    '<button onclick="closeLongPressMenu()" style="width:100%;padding:12px 16px;background:transparent;border:none;color:#555;font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer">ANNULLA</button>';

  // Overlay per chiudere cliccando fuori
  var overlay = document.createElement('div');
  overlay.id = 'longPressOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.5)';
  overlay.onclick = closeLongPressMenu;

  document.body.appendChild(overlay);
  document.body.appendChild(menu);
}

function closeLongPressMenu() {
  var menu = document.getElementById('longPressMenu');
  var overlay = document.getElementById('longPressOverlay');
  if (menu) menu.remove();
  if (overlay) overlay.remove();
}

function openBachecaModalNew() {
  if (!canEdit()) return;
  $id('modalTitle').textContent = 'NUOVA BACHECA';
  $id('modalBody').innerHTML =
    '<div class="modal-row"><div style="flex:0 0 60px"><label class="modal-label">// ICONA</label><input class="modal-input" id="bIcon" style="font-size:18px" value="📢"/></div>' +
    '<div><label class="modal-label">// TITOLO</label><input class="modal-input" id="bTitolo" placeholder="Titolo comunicazione"/></div></div>' +
    '<div><label class="modal-label">// TESTO</label><textarea class="modal-input" id="bTesto" rows="4" style="resize:none" placeholder="Testo del messaggio..."></textarea></div>' +
    _fotoWidgetHtml(null);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var titolo = document.getElementById('bTitolo').value.trim();
    if (!titolo) { showToast('// TITOLO OBBLIGATORIO', 'error'); return; }
    var fotoFinal = _getFotoFinal();
    var now = new Date();
    BACHECA.unshift({
      id: getNextId('bacheca'),
      icon: document.getElementById('bIcon').value || '📢',
      titolo: titolo,
      testo: document.getElementById('bTesto').value.trim(),
      tempo: 'OGGI ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
      foto: fotoFinal,
    });
    saveConfig();
    addLog('aggiunta bacheca: ' + titolo);
    buildBacheca();
    showToast('// PUBBLICATO ✓', 'success');
    closeModal();
  };
  openModal();
}

function deleteBacheca(i) {
  if (!canEdit()) return;
  var label = BACHECA[i].titolo || 'voce';
  showConfirm('Eliminare "' + label + '"?', function() {
    addLog('eliminata bacheca: ' + label);
    BACHECA.splice(i, 1);
    saveConfig();
    buildBacheca();
    showToast(T_DELETED, 'error');
  });
}

function openInfoModalNew() {
  if (!canEdit()) return;
  $id('modalTitle').textContent = 'NUOVA SEZIONE INFO';
  $id('modalBody').innerHTML =
    '<div class="modal-row"><div style="flex:0 0 60px"><label class="modal-label">// ICONA</label><input class="modal-input" id="iIcon" style="font-size:18px" value="📄"/></div>' +
    '<div><label class="modal-label">// TITOLO</label><input class="modal-input" id="iTitolo" placeholder="Titolo sezione"/></div></div>' +
    '<div><label class="modal-label">// TESTO</label><textarea class="modal-input" id="iTesto" rows="5" style="resize:none" placeholder="Contenuto della sezione..."></textarea></div>';

  window._modalCb = function() {
    var titolo = document.getElementById('iTitolo').value.trim();
    if (!titolo) { showToast('// TITOLO OBBLIGATORIO', 'error'); return; }
    INFO.push({
      id: getNextId('info'),
      icon: document.getElementById('iIcon').value || '📄',
      titolo: titolo,
      testo: document.getElementById('iTesto').value.trim(),
    });
    saveConfig();
    addLog('aggiunta info: ' + titolo);
    buildInfo();
    showToast('// AGGIUNTO ✓', 'success');
    closeModal();
  };
  openModal();
}

function deleteInfo(i) {
  if (!canEdit()) return;
  var label = INFO[i].titolo || 'sezione';
  showConfirm('Eliminare "' + label + '"?', function() {
    addLog('eliminata info: ' + label);
    INFO.splice(i, 1);
    saveConfig();
    buildInfo();
    showToast(T_DELETED, 'error');
  });
}

// ════════════════════════════════════════
// INFO CRUD
// ════════════════════════════════════════
function openInfoModal(i) {
  if (!canEdit()) return;
  var item = INFO[i];
  $id('modalTitle').textContent = 'MODIFICA SEZIONE';
  $id('modalBody').innerHTML =
    '<div class="modal-row"><div style="flex:0 0 60px"><label class="modal-label">// ICONA</label><input class="modal-input" id="iIcon" style="font-size:18px" value="' + item.icon + '"/></div>' +
    '<div><label class="modal-label">// TITOLO</label><input class="modal-input" id="iTitolo" value="' + item.titolo + '"/></div></div>' +
    '<div><label class="modal-label">// TESTO</label><textarea class="modal-input" id="iTesto" rows="5" style="resize:none">' + item.testo + '</textarea></div>' +
    _fotoWidgetHtml(item.foto || null);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var fotoFinal = window._fotoCancellata ? null : (_getFotoFinal() || item.foto || null);
    INFO[i] = {
      id: item.id,
      icon: document.getElementById('iIcon').value || item.icon,
      titolo: document.getElementById('iTitolo').value.trim() || item.titolo,
      testo: document.getElementById('iTesto').value.trim(),
      foto: fotoFinal,
    };
    saveConfig();
    addLog('modificato info: ' + INFO[i].titolo);
    buildInfo();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

// ════════════════════════════════════════
// GIACENZE
// ════════════════════════════════════════
function buildMagazzino() {
  // Pulisci tutte e tre le liste
  var cats = ['alcolico','analcolico','altro'];
  cats.forEach(function(cat) {
    var el = document.getElementById('magazzinoList-' + cat);
    if (el) el.innerHTML = '';
  });

  var sottominimo = 0;
  var catCounts = { alcolico: 0, analcolico: 0, altro: 0 };

  MAGAZZINO.forEach(function(item, i) {
    if (item.attuale < item.minimo) sottominimo++;
    var cat = (item.categoria === 'alcolico' || item.categoria === 'analcolico') ? item.categoria : 'altro';
    catCounts[cat]++;

    var list = document.getElementById('magazzinoList-' + cat);
    if (!list) return;

    var isLow = item.attuale < item.minimo;
    var row = document.createElement('div');
    row.className = 'spesa-row' + (isLow ? ' low-stock' : '');
    row.id = 'magazzino-row-' + item.id;
    row.innerHTML = '<span class="spesa-name">' + item.nome + '</span>' +
      '<span class="magazzino-qty" style="font-weight:bold;color:' + (isLow ? '#cc2200' : '#2a2') + '">' + item.attuale + '/' + item.minimo + ' ' + item.unita + '</span>' +
      '<div class="spesa-actions" style="align-items:center;gap:4px">' +
        '<button class="mz-qty-btn" onclick="stepMagazzino(' + item.id + ', -1)" style="width:26px;height:26px;border-radius:3px;border:1px solid #333;background:#1a1a1a;color:#aaa;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0">−</button>' +
        '<input type="number" id="qty-' + item.id + '" value="' + item.attuale + '" min="0" style="width:52px;padding:4px 2px;border:1px solid #2a2a2a;border-radius:2px;background:#111;color:var(--light);font-family:var(--mono);font-size:12px;text-align:center" onchange="updateMagazzinoById(' + item.id + ', this.value)"/>' +
        '<button class="mz-qty-btn" onclick="stepMagazzino(' + item.id + ', 1)" style="width:26px;height:26px;border-radius:3px;border:1px solid #333;background:#1a1a1a;color:#aaa;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0">+</button>' +
        '<button class="edit-btn-small visible" onclick="openMagazzinoModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteMagazzino(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  });

  // Aggiorna badge per ogni sezione
  cats.forEach(function(cat) {
    var badge = document.getElementById('mz-badge-' + cat);
    if (badge) badge.textContent = catCounts[cat];
  });

  var badge = document.getElementById('magazzinoCount');
  if (badge) badge.textContent = sottominimo + ' SOTTO MINIMO';
  updateDash();
}

var _mzCollapsed = { alcolico: true, analcolico: true, altro: true };

function toggleMzSection(cat) {
  _mzCollapsed[cat] = !_mzCollapsed[cat];
  var body = document.getElementById('mz-body-' + cat);
  var icon = document.getElementById('mz-icon-' + cat);
  if (body) body.style.display = _mzCollapsed[cat] ? 'none' : 'block';
  if (icon) icon.textContent = _mzCollapsed[cat] ? '▸' : '▾';
}

function stepMagazzino(itemId, delta) {
  var input = document.getElementById('qty-' + itemId);
  var current = parseInt((input && input.value) || 0) || 0;
  var newVal = Math.max(0, current + delta);
  if (input) input.value = newVal;
  updateMagazzinoById(itemId, newVal);
}

function updateMagazzinoById(itemId, newQty) {
  newQty = Math.max(0, parseInt(newQty) || 0);
  var idx = MAGAZZINO.findIndex(function(m){ return m.id === itemId; });
  if (idx < 0) return;
  var item = MAGAZZINO[idx];
  var oldQty = item.attuale;
  if (oldQty === newQty) return; // nessuna modifica
  item.attuale = newQty;
  // Aggiorna input nel DOM
  var inp = document.getElementById('qty-' + itemId);
  if (inp && parseInt(inp.value) !== newQty) inp.value = newQty;
  addLog('aggiornato magazzino: ' + item.nome + ' da ' + oldQty + ' a ' + newQty + ' ' + item.unita);

  // Aggiorna DOM
  var isLow = item.attuale < item.minimo;
  var row = document.getElementById('magazzino-row-' + item.id);
  if (row) {
    row.className = 'spesa-row' + (isLow ? ' low-stock' : '');
    var qtySpan = row.querySelector('.magazzino-qty');
    if (qtySpan) {
      qtySpan.style.color = isLow ? '#cc2200' : '#2a2';
      qtySpan.textContent = item.attuale + '/' + item.minimo + ' ' + item.unita;
    }
  }

  // Badge
  var sottominimo = MAGAZZINO.filter(function(g){ return g.attuale < g.minimo; }).length;
  var badge = document.getElementById('magazzinoCount');
  if (badge) badge.textContent = sottominimo + ' SOTTO MINIMO';

  syncMagazzinoWithSpesa();
  updateDash();
  // Salva su Supabase: questa funzione è il punto di ingresso delle modifiche utente
  // (stepMagazzino, onchange input). Il debounce evita scritture eccessive.
  saveMagazzino();
  saveSpesa();
}

function syncMagazzinoWithSpesa() {
  MAGAZZINO.forEach(function(item) {
    // Cerca solo voci generate automaticamente dal magazzino (fromMagazzino=true)
    var existingIdx = SPESA.findIndex(function(s) { return s.fromMagazzino && s.magazzinoId === item.id; });

    if (item.attuale < item.minimo) {
      // Se l'utente ha eliminato manualmente questa voce nella sessione corrente, non reinserirla
      if (_manuallyDeletedSpesaIds[item.id]) return;

      var qty = item.minimo - item.attuale;
      if (existingIdx >= 0) {
        // Aggiorna voce esistente (anche se done, riattivala se la qty è cambiata)
        SPESA[existingIdx].nome          = item.nome;
        SPESA[existingIdx].qty           = qty + ' ' + item.unita;
        SPESA[existingIdx].qtyNum        = qty;           // sempre numerico
        SPESA[existingIdx].costoUnitario = item.costoUnitario;
        SPESA[existingIdx].unita         = item.unita;
        SPESA[existingIdx]._categoria    = item.categoria; // mai null
        SPESA[existingIdx].done          = false;
      } else {
        SPESA.push({
          id:            getNextId('spesa'),
          fromMagazzino: true,
          magazzinoId:   item.id,
          nome:          item.nome,
          qty:           qty + ' ' + item.unita,
          qtyNum:        qty,           // sempre numerico
          costoUnitario: item.costoUnitario,
          unita:         item.unita,
          _categoria:    item.categoria, // mai null
          who:           '—',
          done:          false
        });
      }
    } else {
      // Sopra il minimo: rimuovi la voce automatica se esiste
      if (existingIdx >= 0) {
        SPESA.splice(existingIdx, 1);
      }
      // Sopra il minimo: rimuovi eventuale guard di eliminazione manuale
      delete _manuallyDeletedSpesaIds[item.id];
    }
  });
  // NOTA: buildSpesa() NON viene chiamata qui — è compito del chiamante.
  // syncMagazzinoWithSpesa() modifica solo i dati in SPESA.
}


function deleteMagazzino(i) {
  var item = MAGAZZINO[i];
  var wasCustom = item.id >= 23;
  addLog('rimosso magazzino: ' + item.nome);
  // Rimuovi dalla spesa la voce automatica collegata tramite magazzinoId
  for (var j = SPESA.length - 1; j >= 0; j--) {
    if (SPESA[j].fromMagazzino && SPESA[j].magazzinoId === item.id) {
      SPESA.splice(j, 1);
    }
  }
  MAGAZZINO.splice(i, 1);
  saveMagazzino();
  saveSpesa();
  // Se era un articolo custom, aggiorna anche appconfig cosi' gli altri client
  // non vedranno piu' l'articolo alla prossima sincronizzazione
  if (wasCustom) saveConfig();
  buildMagazzino();
  buildSpesa();
}

function openMagazzinoModal(editIdx, defaultCat) {
  var isEdit = editIdx !== undefined && editIdx !== null;
  var item = isEdit ? MAGAZZINO[editIdx] : null;
  var currentCat = isEdit ? (item.categoria || 'altro') : (defaultCat || 'altro');
  $id('modalTitle').textContent = isEdit ? 'MODIFICA MAGAZZINO' : 'NUOVO ARTICOLO';

  function catOption(val, label) {
    return '<option value="' + val + '"' + (currentCat === val ? ' selected' : '') + '>' + label + '</option>';
  }

  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// PRODOTTO</label><input class="modal-input" id="gNome" value="' + (isEdit ? item.nome : '') + '" placeholder="es. Birra, Bibite..."/></div>' +
    '<div><label class="modal-label">// CATEGORIA</label><select class="modal-input" id="gCategoria">' +
      catOption('alcolico', '🍺 ALCOLICI') + catOption('analcolico', '🥤 ANALCOLICI') + catOption('altro', '📦 ALTRO') +
    '</select></div>' +
    '<div class="modal-row"><div><label class="modal-label">// QUANTITÀ ATTUALE</label><input class="modal-input" id="gAttuale" type="number" value="' + (isEdit ? item.attuale : '') + '"/></div>' +
    '<div><label class="modal-label">// MINIMO</label><input class="modal-input" id="gMinimo" type="number" value="' + (isEdit ? item.minimo : '') + '"/></div></div>' +
    '<div class="modal-row"><div><label class="modal-label">// UNITÀ DI MISURA</label><input class="modal-input" id="gUnita" value="' + (isEdit ? item.unita : '') + '" placeholder="es. casse, kg, pz..."/></div>' +
    '<div><label class="modal-label">// COSTO UNITARIO (€)</label><input class="modal-input" id="gCosto" type="number" step="0.01" value="' + (isEdit ? item.costoUnitario : '') + '"/></div></div>';

  window._modalCb = function() {
    var obj = {
      id: isEdit ? item.id : getNextId('magazzino'),
      nome: document.getElementById('gNome').value.trim(),
      categoria: document.getElementById('gCategoria').value,
      attuale: parseInt(document.getElementById('gAttuale').value) || 0,
      minimo: parseInt(document.getElementById('gMinimo').value) || 0,
      unita: document.getElementById('gUnita').value.trim() || 'unità',
      costoUnitario: parseFloat(document.getElementById('gCosto').value) || 0
    };
    if (!obj.nome) return;
    
    if (isEdit) {
      SPESA.forEach(function(spesaItem) {
        if (spesaItem.fromMagazzino && spesaItem.magazzinoId === obj.id) {
          spesaItem.nome = obj.nome;
          spesaItem.costoUnitario = obj.costoUnitario;
          spesaItem.unita = obj.unita;
        }
      });
    }
    
    if (isEdit) { MAGAZZINO[editIdx] = obj; } else { MAGAZZINO.push(obj); }
    // Per articoli custom (id >= 23), salva subito la definizione in appconfig
    // PRIMA di chiamare saveMagazzino, così il realtime degli altri client
    // troverà già il config aggiornato quando riceve l'INSERT sulla tabella magazzino.
    if (obj.id >= 23) saveConfig();
    saveMagazzino();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' magazzino: ' + obj.nome);
    syncMagazzinoWithSpesa();
    saveSpesa();
    buildMagazzino();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

// ════════════════════════════════════════
// SPESA MODAL
// ════════════════════════════════════════
function openSpesaModal(editIdx) {
  var isEdit = editIdx !== undefined && editIdx !== null;
  var item = isEdit ? SPESA[editIdx] : null;
  $id('modalTitle').textContent = isEdit ? 'MODIFICA VOCE' : 'NUOVA VOCE';
  var staffMembers = MEMBERS.filter(function(m) {
    return m.role === ROLES.STAFF || m.role === ROLES.ADMIN || m.role === ROLES.AIUTANTE;
  });
  var whoOptions = staffMembers.map(function(m) {
    return '<option value="' + m.name + '"' + (isEdit && item.who===m.name ? ' selected' : '') + '>' + m.name + '</option>';
  }).join('');
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// ARTICOLO</label><input class="modal-input" id="sNome" value="' + (isEdit ? item.nome : '') + '"/></div>' +
    '<div><label class="modal-label">// QUANTITÀ</label><input class="modal-input" id="sQty" value="' + (isEdit ? item.qty : '') + '"/></div>' +
    '<div><label class="modal-label">// ASSEGNATO A</label><select class="modal-input" id="sWho"><option value="-">—</option>' + whoOptions + '</select></div>';

  window._modalCb = function() {
    var obj = {
      id: isEdit ? item.id : getNextId('spesa'),
      nome: document.getElementById('sNome').value.trim(),
      qty: document.getElementById('sQty').value.trim(),
      who: document.getElementById('sWho').value,
      done: isEdit ? item.done : false,
      // Preservare i campi automatici se la voce viene da magazzino
      fromMagazzino:  isEdit ? (item.fromMagazzino  || false) : false,
      magazzinoId:    isEdit ? (item.magazzinoId    || null)  : null,
      qtyNum:         isEdit ? (item.qtyNum         || null)  : null,
      costoUnitario:  isEdit ? (item.costoUnitario  || null)  : null,
      _categoria:     isEdit ? (item._categoria     || null)  : null,
    };
    if (isEdit) { SPESA[editIdx] = obj; } else { SPESA.push(obj); }
    saveSpesa();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' spesa: ' + obj.nome);
    buildSpesa();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

// ════════════════════════════════════════
// MODAL
// ════════════════════════════════════════
function openModal() {
  var hasConfirm = typeof window._modalCb === 'function';
  var confirmBtn = $id('modalConfirmBtn');
  var cancelBtn  = $id('modalCancelBtn');
  if (confirmBtn) confirmBtn.style.display = hasConfirm ? '' : 'none';
  if (cancelBtn)  cancelBtn.textContent = hasConfirm ? 'ANNULLA' : '← INDIETRO';
  $id('modalOverlay').classList.add('open');
}
function closeModal() {
  $id('modalOverlay').classList.remove('open');
  window._modalCb = null;
}


// ════════════════════════════════════════
// CLOCKS
// ════════════════════════════════════════
function updateClocks() {
  var now = new Date();
  var t = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  document.querySelectorAll('.clock').forEach(function(el) { el.textContent = t; });
}

// ════════════════════════════════════════
// AVATAR HELPER
// ════════════════════════════════════════
function renderAvatar(el, member) {
  if (!el || !member) return;
  if (member.photo) {
    el.style.background = 'transparent';
    el.innerHTML = '<img src="' + member.photo + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block"/>';
  } else {
    el.style.background = member.color;
    el.innerHTML = member.initial;
  }
}

function compressAndSavePhoto(file, onDone) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 100; canvas.height = 100;
      var ctx = canvas.getContext('2d');
      // Crop centrato
      var size = Math.min(img.width, img.height);
      var sx = (img.width - size) / 2;
      var sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 100, 100);
      onDone(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Compressione locandine: alta qualità, mantieni proporzioni (max 900px)
function compressLocandina(file, onDone) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var MAX = 900;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      onDone(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── LIGHTBOX ──
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightboxImg').src = '';
}


function buildProfilo() {
  if (!currentUser) return;
  // Build color swatches
  var cp = document.getElementById('colorPicker');
  if (cp) {
    cp.innerHTML = '';
    ['#cc2200', '#1a6b3c', '#1a3a7a', '#6b1a6b', '#7a4a1a', '#2a6b6b', '#5a5a1a', '#4a2a6b', '#6b4a2a', '#1a5a5a', '#8b2200', '#2a4a8b', '#5a1a3a', '#1a5a2a', '#8b6b00', '#3a1a6b'].forEach(function(col) {
      var sw = document.createElement('div');
      sw.className = 'color-swatch' + (col === currentUser.color ? ' selected' : '');
      sw.style.background = col;
      sw.onclick = function() {
        currentUser.color = col;
        document.querySelectorAll('.color-swatch').forEach(function(s){ s.classList.remove('selected'); });
        sw.classList.add('selected');
        // Update avatar everywhere
        document.getElementById('profiloAvatar').style.background = col;
        var staffAv2 = document.getElementById('staffAvatar');
        if (staffAv2) staffAv2.style.background = col;
        addLog('ha cambiato colore avatar');
        saveMembers();
        buildMembriList();
      };
      cp.appendChild(sw);
    });
  }
  var av = document.getElementById('profiloAvatar');
  var nm = document.getElementById('profiloNome');
  var rl = document.getElementById('profiloRuolo');
  if (av) renderAvatar(av, currentUser);
  // Aggiorna anche staffAvatar nell'header
  var staffAv = document.getElementById('staffAvatar');
  if (staffAv) renderAvatar(staffAv, currentUser);
  var staffNm = document.getElementById('staffName');
  if (staffNm) staffNm.textContent = currentUser.name.toUpperCase();
  if (nm) nm.textContent = currentUser.name.toUpperCase();
  if (rl) rl.textContent = roleLabel(currentUser.role).label;
  // Popola campo cambio nome
  var nomeInput = document.getElementById('profiloNomeInput');
  if (nomeInput) nomeInput.value = currentUser.name;
  var nomeErr = document.getElementById('profiloNomeError');
  if (nomeErr) nomeErr.textContent = '';

  // Pulsante carica foto
  var fp = document.getElementById('fotoProfilo');
  var fpRemove = document.getElementById('fotoProfiloRemove');
  // Mostra/nascondi pulsante rimuovi in base alla foto attuale
  if (fpRemove) {
    fpRemove.style.display = currentUser.photo ? 'flex' : 'none';
    fpRemove.onclick = function() {
      currentUser.photo = null;
      renderAvatar(document.getElementById('profiloAvatar'), currentUser);
      var staffAv = document.getElementById('staffAvatar');
      if (staffAv) renderAvatar(staffAv, currentUser);
      fpRemove.style.display = 'none';
      addLog('ha rimosso la foto profilo');
      saveMembers();
      buildMembriList();
    };
  }
  if (fp) {
    fp.onclick = function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        compressAndSavePhoto(inp.files[0], function(b64) {
          currentUser.photo = b64;
          renderAvatar(document.getElementById('profiloAvatar'), currentUser);
          var staffAv = document.getElementById('staffAvatar');
          if (staffAv) renderAvatar(staffAv, currentUser);
          if (fpRemove) fpRemove.style.display = 'flex';
          addLog('ha aggiornato la foto profilo');
          saveMembers();
          buildMembriList();
        });
      };
      inp.click();
    };
  }

  // Gestione account: admin e staff (con permessi diversi)
  var ga = document.getElementById('gestioneAccountSection');
  if (ga) ga.style.display = isStaff() ? 'block' : 'none';
  var es = document.getElementById('esportaSection');
  if (es) es.style.display = currentUser.role === ROLES.ADMIN ? 'block' : 'none';

  // Build members list
  buildMembriList();
}

function roleLabel(role) {
  if (role === ROLES.ADMIN)    return { label: '★ ADMIN',    color: '#c8a84b', level: 5 };
  if (role === ROLES.STAFF)    return { label: '★ STAFF',    color: '#cc2200', level: 4 };
  if (role === ROLES.AIUTANTE) return { label: '✦ AIUTANTE', color: '#2a6b6b', level: 3 };
  if (role === ROLES.PREMIUM)  return { label: '◈ PREMIUM',  color: '#6b1a6b', level: 2 };
  return                          { label: '· UTENTE',   color: '#444',    level: 1 };
}

function buildMembriList() {
  var list = document.getElementById('membriList');
  if (!list) return;

  // Mostra/nascondi il pulsante "Nuovo membro" in base al permesso configurato
  var btnNM = document.getElementById('btnNuovoMembro');
  if (btnNM) btnNM.style.display = canAddUser() ? '' : 'none';

  // ── BARRA RICERCA + FILTRI (solo staff/admin) ──────────────────────────────
  var filterBarId = 'membriFilterBar';
  var existingBar = document.getElementById(filterBarId);

  if (isStaff()) {
    if (!existingBar) {
      // Prima costruzione: inietta il markup nel DOM PRIMA di membriList
      var bar = document.createElement('div');
      bar.id = filterBarId;
      bar.style.cssText = 'margin-bottom:10px';

      // Raccoglie lista invitanti unici da MEMBERS_HISTORY
      function getInvitanti() {
        var seen = {};
        var list = [];
        if (Array.isArray(MEMBERS_HISTORY)) {
          MEMBERS_HISTORY.forEach(function(h) {
            if (h.invited_by && !seen[h.invited_by]) {
              seen[h.invited_by] = true;
              list.push(h.invited_by);
            }
          });
        }
        return list.sort();
      }

      var invitanti = getInvitanti();
      var invitantiOptions = '<option value="all">// TUTTI GLI INVITANTI</option>' +
        invitanti.map(function(n) { return '<option value="' + n + '">' + n.toUpperCase() + '</option>'; }).join('');

      bar.innerHTML =
        // Riga 1: ricerca testuale
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
          '<input id="membriSearchInput" type="text" placeholder="// CERCA MEMBRO..." ' +
            'style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--white);font-family:var(--mono);font-size:10px;letter-spacing:1px;padding:6px 8px;border-radius:3px;outline:none" ' +
            'oninput="_membriFilter.query=this.value;buildMembriList()" ' +
            'value="' + (_membriFilter.query || '') + '">' +
          '<button style="background:none;border:1px solid var(--border);border-radius:3px;padding:5px 8px;color:#555;font-family:var(--mono);font-size:9px;cursor:pointer;letter-spacing:1px;white-space:nowrap" ' +
            'title="Reimposta tutti i filtri" onclick="_resetMembriFilter()">' +
            '✕ RESET' +
          '</button>' +
        '</div>' +
        // Riga 2: toggle cerca per nome originale
        '<label style="display:flex;align-items:center;gap:6px;margin-bottom:8px;cursor:pointer">' +
          '<input type="checkbox" id="membriSearchOriginal" ' + (_membriFilter.searchOriginal ? 'checked' : '') + ' ' +
            'onchange="_membriFilter.searchOriginal=this.checked;buildMembriList()" ' +
            'style="accent-color:#cc2200;cursor:pointer">' +
          '<span style="font-family:var(--mono);font-size:8px;letter-spacing:1px;color:#777">CERCA ANCHE PER NOME ORIGINALE</span>' +
        '</label>' +
        // Riga 3: filtri a pills
        '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
          // Metodo creazione
          '<select id="membriFilterMethod" style="background:var(--bg);border:1px solid var(--border);color:#aaa;font-family:var(--mono);font-size:8px;letter-spacing:1px;padding:4px 6px;border-radius:3px;cursor:pointer" ' +
            'onchange="_membriFilter.method=this.value;buildMembriList()">' +
            '<option value="all"' + (_membriFilter.method==='all'?' selected':'') + '>// TUTTI I METODI</option>' +
            '<option value="qr"' + (_membriFilter.method==='qr'?' selected':'') + '>QR INVITE</option>' +
            '<option value="manual"' + (_membriFilter.method==='manual'?' selected':'') + '>CREATO DA STAFF</option>' +
          '</select>' +
          // Filtro ruolo
          '<select id="membriFilterRole" style="background:var(--bg);border:1px solid var(--border);color:#aaa;font-family:var(--mono);font-size:8px;letter-spacing:1px;padding:4px 6px;border-radius:3px;cursor:pointer" ' +
            'onchange="_membriFilter.role=this.value;buildMembriList()">' +
            '<option value="all"' + (_membriFilter.role==='all'?' selected':'') + '>// TUTTI I RUOLI</option>' +
            '<option value="admin"' + (_membriFilter.role==='admin'?' selected':'') + '>ADMIN</option>' +
            '<option value="staff"' + (_membriFilter.role==='staff'?' selected':'') + '>STAFF</option>' +
            '<option value="aiutante"' + (_membriFilter.role==='aiutante'?' selected':'') + '>AIUTANTE</option>' +
            '<option value="premium"' + (_membriFilter.role==='premium'?' selected':'') + '>PREMIUM</option>' +
            '<option value="utente"' + (_membriFilter.role==='utente'?' selected':'') + '>UTENTE</option>' +
          '</select>' +
          // Filtro invitante
          (invitanti.length > 0
            ? '<select id="membriFilterInvitedBy" style="background:var(--bg);border:1px solid var(--border);color:#aaa;font-family:var(--mono);font-size:8px;letter-spacing:1px;padding:4px 6px;border-radius:3px;cursor:pointer" ' +
                'onchange="_membriFilter.invitedBy=this.value;buildMembriList()">' +
                invitantiOptions +
              '</select>'
            : '') +
        '</div>';

      list.parentNode.insertBefore(bar, list);
    } else {
      // Barra già presente: aggiorna solo i valori degli invitanti nel dropdown
      var selInv = document.getElementById('membriFilterInvitedBy');
      // Rigenera gli option dell'invitante per riflettere nuovi QR generati
      if (selInv && Array.isArray(MEMBERS_HISTORY)) {
        var seen2 = {}; var invList = [];
        MEMBERS_HISTORY.forEach(function(h) {
          if (h.invited_by && !seen2[h.invited_by]) { seen2[h.invited_by] = true; invList.push(h.invited_by); }
        });
        invList.sort();
        selInv.innerHTML = '<option value="all">// TUTTI GLI INVITANTI</option>' +
          invList.map(function(n) { return '<option value="' + n + '"' + (_membriFilter.invitedBy===n?' selected':'') + '>' + n.toUpperCase() + '</option>'; }).join('');
      }
    }
  } else {
    // Non è staff: rimuove la barra se era rimasta (cambio ruolo in sessione)
    if (existingBar) existingBar.parentNode.removeChild(existingBar);
  }

  list.innerHTML = '';

  // ── LOGICA FILTRO ──────────────────────────────────────────────────────────
  var q = (_membriFilter.query || '').toLowerCase().trim();
  var fMethod = _membriFilter.method || 'all';
  var fRole   = _membriFilter.role   || 'all';
  var fInv    = _membriFilter.invitedBy || 'all';
  var fSearchOrig = !!_membriFilter.searchOriginal;

  // Costruisce lookup di members_history indicizzato per member_name
  var historyMap = {};
  if (Array.isArray(MEMBERS_HISTORY)) {
    MEMBERS_HISTORY.forEach(function(h) {
      if (h.member_name) historyMap[h.member_name.toLowerCase()] = h;
    });
  }

  function memberPassesFilter(m) {
    // Filtro ruolo
    if (fRole !== 'all' && m.role !== fRole) return false;

    var hist = historyMap[m.name.toLowerCase()];

    // Filtro metodo creazione
    if (fMethod !== 'all') {
      if (!hist) return false;
      if (hist.creation_method !== fMethod) return false;
    }

    // Filtro invitante
    if (fInv !== 'all') {
      if (!hist || hist.invited_by !== fInv) return false;
    }

    // Filtro testo ricerca
    if (q) {
      var nameMatch = m.name.toLowerCase().indexOf(q) !== -1;
      if (nameMatch) return true;
      if (fSearchOrig && hist) {
        // Cerca in initial_name
        if (hist.initial_name && hist.initial_name.toLowerCase().indexOf(q) !== -1) return true;
        // Cerca in name_changes (tutti i vecchi nomi)
        if (Array.isArray(hist.name_changes)) {
          for (var nc = 0; nc < hist.name_changes.length; nc++) {
            var change = hist.name_changes[nc];
            if (change.old_name && change.old_name.toLowerCase().indexOf(q) !== -1) return true;
            if (change.new_name && change.new_name.toLowerCase().indexOf(q) !== -1) return true;
          }
        }
        return false;
      }
      if (!nameMatch) return false;
    }

    return true;
  }

  // Badge nuovi utenti: leggi timestamp ultima visita
  var _lastVisit = parseInt(localStorage.getItem('lastMembersVisit') || '0', 10);

  var groups = [
    { role: 'utente',   title: 'LV.1 · UTENTI' },
    { role: 'premium',  title: 'LV.2 · PREMIUM' },
    { role: 'aiutante', title: 'LV.3 · AIUTANTI' },
    { role: 'staff',    title: 'LV.4 · STAFF' },
    { role: 'admin',    title: 'LV.5 · ADMIN' },
  ];

  var totalShown = 0;

  groups.forEach(function(g) {
    // Se filtro ruolo attivo e non corrisponde, salta tutto il gruppo
    if (fRole !== 'all' && g.role !== fRole) return;

    var members = MEMBERS.map(function(m, i) { return { m: m, i: i }; })
                         .filter(function(x) { return x.m.role === g.role && memberPassesFilter(x.m); });
    if (members.length === 0) return;

    totalShown += members.length;

    var header = document.createElement('div');
    header.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin:10px 0 4px';
    header.textContent = '// ' + g.title;
    list.appendChild(header);

    members.forEach(function(x) {
      var m = x.m; var i = x.i;
      var row = document.createElement('div');
      row.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-radius:3px;padding:10px;margin-bottom:4px;display:flex;align-items:center;gap:10px';
      var isSelf = currentUser && m.name === currentUser.name;
      var rl = roleLabel(m.role);
      var _isNew = isStaff() && m.created_at && (new Date(m.created_at).getTime() > _lastVisit);
      var avatarStyle = 'width:32px;height:32px;border-radius:50%;background:' + (m.photo ? 'transparent' : m.color) + ';display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:12px;color:#fff;flex-shrink:0;overflow:hidden' + (_isNew ? ';box-shadow:0 0 0 2px #22cc44' : '');
      var avatarContent = m.photo ? '<img src="' + m.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/>' : m.initial;

      // Sottotitolo: invitante/metodo (solo staff e se presente in history)
      var hist = historyMap[m.name.toLowerCase()];
      var subtitleHtml = '';
      if (isStaff() && hist) {
        if (hist.creation_method === 'qr' && hist.invited_by) {
          subtitleHtml = '<div style="font-family:var(--mono);font-size:7px;color:#555;letter-spacing:1px;margin-top:1px">· INV. DA ' + hist.invited_by.toUpperCase() + '</div>';
        } else if (hist.creation_method === 'manual') {
          subtitleHtml = '<div style="font-family:var(--mono);font-size:7px;color:#444;letter-spacing:1px;margin-top:1px">· STAFF</div>';
        }
      }

      row.innerHTML =
        '<div style="' + avatarStyle + '">' + avatarContent + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:' + (m.sospeso ? '#555' : 'var(--white)') + '">' + m.name.toUpperCase() +
            (m.sospeso ? '<span style="font-family:var(--mono);font-size:7px;color:#cc2200;letter-spacing:1px;margin-left:6px">⛔ SOSPESO</span>' : '') +
            (m.canPromote ? '<span style="font-family:var(--mono);font-size:7px;color:#22cc44;letter-spacing:1px;margin-left:6px">⬆ PROMUOVI</span>' : '') +
            (_isNew ? '<span style="font-family:var(--mono);font-size:7px;color:#22cc44;letter-spacing:1px;margin-left:6px;border:1px solid #22cc44;padding:0 3px;border-radius:2px">NUOVO</span>' : '') +
          '</div>' +
          '<div style="font-family:monospace;font-size:8px;color:' + rl.color + ';letter-spacing:1px">' + rl.label + '</div>' +
          subtitleHtml +
        '</div>' +
        // Pulsante cronologia — visibile solo a staff e admin
        (isStaff()
          ? '<button class="edit-btn-small visible" title="Cronologia" onclick="openMemberHistoryModal(\'' + m.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" style="margin-right:4px;font-size:10px">📋</button>'
          : '') +
        (isAdmin()
          ? '<button class="edit-btn-small visible" onclick="openEditMembroModal(' + i + ')" style="margin-right:4px">✏</button>' +
            (!isSelf ? '<button class="edit-btn-small visible" style="color:#cc2200;border-color:#661100" onclick="rimuoviMembro(' + i + ')">✕</button>' : '<span style="width:28px"></span>')
          : (canPromoteUsers() && !isSelf
              ? '<button class="edit-btn-small visible" style="color:#22cc44;border-color:#116611;margin-right:4px" onclick="openPromoteModal(' + i + ')" title="Cambia livello">⬆</button>' +
                '<button class="edit-btn-small visible" style="color:' + (m.sospeso ? '#22cc44' : '#cc8800') + ';border-color:' + (m.sospeso ? '#116611' : '#664400') + ';margin-right:4px" onclick="toggleSospesoMembro(' + i + ')" title="' + (m.sospeso ? 'Riattiva' : 'Sospendi') + '">' + (m.sospeso ? '▶' : '⏸') + '</button>' +
                '<button class="edit-btn-small visible" style="color:#cc2200;border-color:#661100" onclick="rimuoviMembro(' + i + ')">✕</button>'
              : (!isSelf
                  ? '<button class="edit-btn-small visible" style="color:' + (m.sospeso ? '#22cc44' : '#cc8800') + ';border-color:' + (m.sospeso ? '#116611' : '#664400') + '" onclick="toggleSospesoMembro(' + i + ')" title="' + (m.sospeso ? 'Riattiva' : 'Sospendi') + '">' + (m.sospeso ? '▶' : '⏸') + '</button>' +
                    '<button class="edit-btn-small visible" style="color:#cc2200;border-color:#661100;margin-left:4px" onclick="rimuoviMembro(' + i + ')">✕</button>'
                  : '<span style="width:60px"></span>'))
        );
      list.appendChild(row);
    });
  });

  // Messaggio "nessun risultato"
  if (totalShown === 0 && (q || fMethod !== 'all' || fRole !== 'all' || fInv !== 'all')) {
    var noRes = document.createElement('div');
    noRes.style.cssText = 'font-family:var(--mono);font-size:9px;color:#555;letter-spacing:2px;text-align:center;padding:16px 0';
    noRes.textContent = '// NESSUN RISULTATO';
    list.appendChild(noRes);
  }

  // Aggiorna badge nuovi utenti nel widget dashboard
  updateNewMembersBadge();
}

// Reimposta tutti i filtri membri e ricostruisce la lista
function _resetMembriFilter() {
  _membriFilter.query         = '';
  _membriFilter.searchOriginal = false;
  _membriFilter.method        = 'all';
  _membriFilter.invitedBy     = 'all';
  _membriFilter.role          = 'all';
  // Resetta i campi visivi
  var si = document.getElementById('membriSearchInput');
  if (si) si.value = '';
  var so = document.getElementById('membriSearchOriginal');
  if (so) so.checked = false;
  var sm = document.getElementById('membriFilterMethod');
  if (sm) sm.value = 'all';
  var sr = document.getElementById('membriFilterRole');
  if (sr) sr.value = 'all';
  var sinv = document.getElementById('membriFilterInvitedBy');
  if (sinv) sinv.value = 'all';
  buildMembriList();
}

async function cambiaPassword() {
  var errEl = document.getElementById('pwError');
  var attuale = document.getElementById('pwAttuale').value;
  var nuova = document.getElementById('pwNuova').value.trim();
  var conferma = document.getElementById('pwConferma').value.trim();
  if (!attuale || !nuova || !conferma) { errEl.textContent = '// COMPILA TUTTI I CAMPI'; return; }
  if (!(await pwMatch(attuale, currentUser.password))) { errEl.textContent = '// PASSWORD ATTUALE ERRATA'; return; }
  if (nuova.length < 4) { errEl.textContent = '// PASSWORD TROPPO CORTA (min 4)'; return; }
  if (nuova !== conferma) { errEl.textContent = '// LE PASSWORD NON COINCIDONO'; return; }
  // Controlla se la password è già usata da un altro membro
  var nuovaHash = await sha256(nuova);
  for (var mi = 0; mi < MEMBERS.length; mi++) {
    if (MEMBERS[mi].name !== currentUser.name && MEMBERS[mi].password === nuovaHash) {
      errEl.textContent = '// PASSWORD NON DISPONIBILE — SCEGLINE UN\'ALTRA'; return;
    }
  }
  currentUser.password = nuovaHash;
  document.getElementById('pwAttuale').value = '';
  document.getElementById('pwNuova').value = '';
  document.getElementById('pwConferma').value = '';
  errEl.style.color = 'var(--green)';
  errEl.textContent = '// PASSWORD AGGIORNATA ✓';
  addLog('ha cambiato la password');
  saveMembers();
  showToast('// PASSWORD AGGIORNATA ✓', 'success');
  setTimeout(function() { errEl.textContent = ''; errEl.style.color = 'var(--red)'; }, MS_TOAST);
}

// ════════════════════════════════════════
// CONFIGURATORE ADMIN → caricato da configuratore.js
// ════════════════════════════════════════

function salvaProfiloNome() {
  if (!currentUser) return;
  var nomeInput = document.getElementById('profiloNomeInput');
  var errEl = document.getElementById('profiloNomeError');
  if (!nomeInput || !errEl) return;
  var nome = nomeInput.value.trim();
  if (!nome) { errEl.textContent = '// INSERISCI UN NOME'; return; }
  if (nome.length < 2) { errEl.textContent = '// NOME TROPPO CORTO (min 2 caratteri)'; return; }
  if (nome.toLowerCase() === currentUser.name.toLowerCase()) { errEl.textContent = '// È GIÀ IL TUO NOME ATTUALE'; return; }
  // Controlla duplicati
  var dup = MEMBERS.find(function(m) {
    return m.name !== currentUser.name && m.name.toLowerCase() === nome.toLowerCase();
  });
  if (dup) { errEl.textContent = '// NICKNAME GIÀ UTILIZZATO — SCEGLINE UN ALTRO'; return; }
  // Salva
  var _prevName = currentUser.name;
  currentUser._oldName = currentUser.name;
  currentUser.name = nome;
  currentUser.initial = nome.charAt(0).toUpperCase();
  addLog('ha cambiato il nome in: ' + nome);
  // Cronologia: cambio nome autonomo
  if (typeof historyAddNameChange === 'function') historyAddNameChange(_prevName, nome, nome);
  saveMembers();
  // Aggiorna UI
  var nm = document.getElementById('profiloNome');
  if (nm) nm.textContent = nome.toUpperCase();
  var staffNm = document.getElementById('staffName');
  if (staffNm) staffNm.textContent = nome.toUpperCase();
  renderAvatar(document.getElementById('profiloAvatar'), currentUser);
  renderAvatar(document.getElementById('staffAvatar'), currentUser);
  // Aggiorna sessione localStorage
  try { localStorage.setItem('bunker23_session', JSON.stringify({ name: nome, role: currentUser.role, ts: Date.now() })); } catch(e) {}
  errEl.style.color = 'var(--green)';
  errEl.textContent = '// NOME AGGIORNATO ✓';
  showToast('// NOME AGGIORNATO ✓', 'success');
  setTimeout(function() { errEl.textContent = ''; errEl.style.color = 'var(--red)'; }, 3000);
}

var COLORS = ['#cc2200','#1a6b3c','#1a3a7a','#6b1a6b','#7a4a1a','#2a6b6b','#5a5a1a','#4a2a6b','#6b4a2a','#1a5a5a'];

function openPromoteModal(i) {
  if (!canPromoteUsers()) { showToast('// PERMESSO NEGATO', 'error'); return; }
  var m = MEMBERS[i];
  // Chi non è admin può promuovere al massimo a staff
  var maxRole = isAdmin() ? ROLES.ADMIN : ROLES.STAFF;
  var maxLevel = roleLabel(maxRole).level;
  // Non può modificare utenti di livello uguale o superiore al proprio (se non admin)
  if (!isAdmin()) {
    var myLevel = roleLabel(currentUser.role).level;
    var theirLevel = roleLabel(m.role).level;
    if (theirLevel >= myLevel) { showToast('// PERMESSO NEGATO', 'error'); return; }
  }
  var allRoles = [
    { value: ROLES.UTENTE,   label: 'Lv.1 · Utente' },
    { value: ROLES.PREMIUM,  label: 'Lv.2 · Premium' },
    { value: ROLES.AIUTANTE, label: 'Lv.3 · Aiutante' },
    { value: ROLES.STAFF,    label: 'Lv.4 · Staff' },
    { value: ROLES.ADMIN,    label: 'Lv.5 · Admin' }
  ];
  var opts = allRoles
    .filter(function(r) { return roleLabel(r.value).level <= maxLevel; })
    .map(function(r) {
      return '<option value="' + r.value + '"' + (m.role === r.value ? ' selected' : '') + '>' + r.label + '</option>';
    }).join('');

  $id('modalTitle').textContent = 'CAMBIA LIVELLO — ' + m.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:8px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
    'Livello attuale: <span style="color:' + roleLabel(m.role).color + '">' + roleLabel(m.role).label + '</span></div>' +
    '<div><label class="modal-label">// NUOVO LIVELLO</label>' +
    '<select class="modal-input" id="pRuoloAcc">' + opts + '</select></div>';

  window._modalCb = function() {
    var nuovoRuolo = document.getElementById('pRuoloAcc').value;
    if (nuovoRuolo === m.role) { closeModal(); return; }
    // Doppio controllo livello al momento del salvataggio
    if (!isAdmin()) {
      var myLevel = roleLabel(currentUser.role).level;
      if (roleLabel(nuovoRuolo).level >= myLevel) { showToast('// PERMESSO NEGATO', 'error'); return; }
    }
    var vecchio = roleLabel(m.role).label;
    MEMBERS[i].role = nuovoRuolo;
    addLog('ha cambiato il livello di ' + m.name + ': ' + vecchio + ' → ' + roleLabel(nuovoRuolo).label);
    saveMembers();
    buildMembriList();
    closeModal();
    showToast('// LIVELLO AGGIORNATO ✓', 'success');
    // Se il membro modificato è l'utente corrente → ricarica dati e UI per il nuovo ruolo
    if (currentUser && currentUser.name === m.name) {
      currentUser.role = nuovoRuolo;
      try {
        var _sess = JSON.parse(localStorage.getItem('bunker23_session') || '{}');
        _sess.role = nuovoRuolo;
        localStorage.setItem('bunker23_session', JSON.stringify(_sess));
      } catch(e) {}
      if (typeof reloadStaffData === 'function') {
        reloadStaffData().then(function() {
          buildAll();
          if (typeof applyWidgetConfig === 'function') applyWidgetConfig();
          if (typeof applyTabConfig === 'function') applyTabConfig();
          if (typeof onUserLogin === 'function') onUserLogin();
          showToast('// RUOLO AGGIORNATO · DATI RICARICATI ✓', 'success');
        });
      } else {
        buildAll();
      }
    }
  };
  openModal();
}

function openNuovoMembroModal() {
  if (!canAddUser()) { showToast('// PERMESSO NEGATO', 'error'); return; }
  $id('modalTitle').textContent = 'NUOVO MEMBRO';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="mNomeAcc" type="text" placeholder="Nome"/></div>' +
    '<div><label class="modal-label">// PASSWORD</label>' +
    '<input class="modal-input" id="mPwAcc" type="text" placeholder="Password iniziale"/></div>' +
    '<div><label class="modal-label">// RUOLO</label>' +
    '<select class="modal-input" id="mRuoloAcc">' +
      '<option value="utente">Lv.1 · Utente</option>' +
      '<option value="premium">Lv.2 · Premium</option>' +
      '<option value="aiutante">Lv.3 · Aiutante</option>' +
      '<option value="staff">Lv.4 · Staff</option>' +
      '<option value="admin">Lv.5 · Admin</option>' +
    '</select></div>';

  window._modalCb = async function() {
    var nome = document.getElementById('mNomeAcc').value.trim();
    var pw   = document.getElementById('mPwAcc').value.trim();
    var ruolo = document.getElementById('mRuoloAcc').value;
    if (!nome || !pw) return;
    var initial = nome.charAt(0).toUpperCase();
    var color = COLORS[MEMBERS.length % COLORS.length];
    MEMBERS.push({ name: nome, initial: initial, color: color, password: await sha256(pw), role: ruolo });
    saveMembers();
    addLog('ha creato account: ' + nome);
    // Cronologia: creazione manuale da staff/admin
    if (typeof historyCreateMember === 'function') historyCreateMember(nome, 'manual', null);
    buildMembriList();
    closeModal();
  };
  openModal();
}

function openEditMembroModal(i) {
  if (currentUser && currentUser.role !== ROLES.ADMIN) return;
  var m = MEMBERS[i];
  $id('modalTitle').textContent = 'MODIFICA MEMBRO';
  $id('modalBody').innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
      '<div style="position:relative;flex-shrink:0">' +
        '<div id="memAvatar" style="width:44px;height:44px;border-radius:50%;background:' + m.color + ';display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:18px;color:#fff;overflow:hidden">' +
          (m.photo ? '<img src="' + m.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/>' : m.initial) +
        '</div>' +
        '<button id="memFotoBtn" title="Carica foto" style="position:absolute;bottom:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#222;border:1px solid #444;color:#aaa;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">📷</button>' +
        (m.photo ? '<button id="memDelFotoBtn" title="Elimina foto" style="position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#1a0000;border:1px solid #cc2200;color:#cc2200;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>' : '') +
      '</div>' +
      '<div style="font-family:monospace;font-size:11px;letter-spacing:2px;color:var(--white)">' + m.name.toUpperCase() + '</div>' +
    '</div>' +
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="mNomeAcc" type="text" value="' + m.name + '"/></div>' +
    '<div><label class="modal-label">// NUOVA PASSWORD (lascia vuoto per non cambiare)</label>' +
    '<input class="modal-input" id="mPwAcc" type="text" placeholder="Lascia vuoto per invariata"/></div>' +
    '<div><label class="modal-label">// RUOLO</label>' +
    '<select class="modal-input" id="mRuoloAcc">' +
      '<option value="utente"'   + (m.role === ROLES.UTENTE   ? ' selected' : '') + '>Lv.1 · Utente</option>' +
      '<option value="premium"'  + (m.role === ROLES.PREMIUM  ? ' selected' : '') + '>Lv.2 · Premium</option>' +
      '<option value="aiutante"' + (m.role === ROLES.AIUTANTE ? ' selected' : '') + '>Lv.3 · Aiutante</option>' +
      '<option value="staff"'    + (m.role === ROLES.STAFF    ? ' selected' : '') + '>Lv.4 · Staff</option>' +
      '<option value="admin"'    + (m.role === ROLES.ADMIN    ? ' selected' : '') + '>Lv.5 · Admin</option>' +
    '</select></div>' +
    '<div style="margin-top:12px;padding:10px;border:1px solid ' + (m.sospeso ? '#cc2200' : '#333') + ';border-radius:3px;background:' + (m.sospeso ? 'rgba(204,34,0,0.08)' : 'transparent') + '">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
    '<input type="checkbox" id="mSospeso"' + (m.sospeso ? ' checked' : '') + ' style="width:16px;height:16px;cursor:pointer"/>' +
    '<span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:' + (m.sospeso ? '#cc2200' : '#888') + '">ACCOUNT SOSPESO</span>' +
    '</label></div>' +
    '<div style="margin-top:8px;padding:10px;border:1px solid ' + (m.canPromote ? '#22cc44' : '#333') + ';border-radius:3px;background:' + (m.canPromote ? 'rgba(34,204,68,0.06)' : 'transparent') + '">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
    '<input type="checkbox" id="mCanPromote"' + (m.canPromote ? ' checked' : '') + ' style="width:16px;height:16px;cursor:pointer"/>' +
    '<span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:' + (m.canPromote ? '#22cc44' : '#888') + '">PU\xd2 MODIFICARE IL LIVELLO UTENTI</span>' +
    '</label></div>';

  // Attiva bottoni foto membro
  setTimeout(function() {
    var mfBtn = document.getElementById('memFotoBtn');
    if (mfBtn) mfBtn.onclick = function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        compressAndSavePhoto(inp.files[0], function(b64) {
          MEMBERS[i].photo = b64;
          var av = document.getElementById('memAvatar');
          if (av) { av.style.background = 'transparent'; av.innerHTML = '<img src="' + b64 + '" style="width:100%;height:100%;object-fit:cover;display:block"/>'; }
          var delBtn = document.getElementById('memDelFotoBtn');
          if (!delBtn) {
            delBtn = document.createElement('button');
            delBtn.id = 'memDelFotoBtn';
            delBtn.title = 'Elimina foto';
            delBtn.style.cssText = 'position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#1a0000;border:1px solid #cc2200;color:#cc2200;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0';
            delBtn.textContent = '✕';
            mfBtn.parentNode.appendChild(delBtn);
            attachDelFoto(delBtn);
          }
          saveMembers();
          buildMembriList();
        });
      };
      inp.click();
    };
    var mDelBtn = document.getElementById('memDelFotoBtn');
    if (mDelBtn) attachDelFoto(mDelBtn);
    function attachDelFoto(btn) {
      btn.onclick = function() {
        MEMBERS[i].photo = null;
        var av = document.getElementById('memAvatar');
        if (av) { av.style.background = MEMBERS[i].color; av.innerHTML = MEMBERS[i].initial; }
        btn.remove();
        saveMembers();
        buildMembriList();
      };
    }
  }, 50);

  window._modalCb = function() {
    var nome    = document.getElementById('mNomeAcc').value.trim() || m.name;
    var pw      = document.getElementById('mPwAcc').value.trim();
    var ruolo   = document.getElementById('mRuoloAcc').value;
    var sospeso = document.getElementById('mSospeso').checked;
    var canPromote = document.getElementById('mCanPromote') ? document.getElementById('mCanPromote').checked : false;
    // Controlla nome univoco (case-insensitive) se è stato cambiato
    if (nome.toLowerCase() !== m.name.toLowerCase()) {
      var dup = MEMBERS.find(function(mem, idx) {
        return idx !== i && mem.name.toLowerCase() === nome.toLowerCase();
      });
      if (dup) { showToast('// NICKNAME GIÀ UTILIZZATO — SCEGLINE UN ALTRO', 'error'); return; }
    }
    if (nome !== m.name) MEMBERS[i]._oldName = m.name;
    var _oldNameForHistory = m.name;
    MEMBERS[i].name             = nome;
    MEMBERS[i].initial          = nome.charAt(0).toUpperCase();
    MEMBERS[i].role             = ruolo;
    MEMBERS[i].sospeso          = sospeso;
    MEMBERS[i].canPromote = canPromote;
    if (pw) sha256(pw).then(function(h){ MEMBERS[i].password = h; saveMembers(); });
    addLog('ha modificato account: ' + nome + (sospeso ? ' [SOSPESO]' : '') + (canPromote ? ' [PUÒ PROMUOVERE]' : ''));
    // Cronologia: cambio nome da admin
    if (nome !== _oldNameForHistory && typeof historyAddNameChange === 'function') {
      historyAddNameChange(_oldNameForHistory, nome, currentUser ? currentUser.name : 'admin');
    }
    saveMembers();
    buildMembriList();
    closeModal();
  };
  openModal();
}

function rimuoviMembro(i) {
  if (!isStaff()) return;
  // Lo staff può eliminare solo utenti di livello inferiore (non altri staff o admin)
  var m = MEMBERS[i];
  var myLevel = roleLabel(currentUser.role).level;
  var theirLevel = roleLabel(m.role).level;
  if (currentUser && m.name === currentUser.name) return;
  if (!isAdmin() && theirLevel >= myLevel) { showToast('// PERMESSO NEGATO', 'error'); return; }
  var nome = m.name;
  showConfirm('Rimuovere l\'account di ' + nome + '? L\'operazione è irreversibile.', async function() {
    addLog('ha rimosso account: ' + nome);
    // Cancella da Supabase prima di rimuovere dall'array
    if (_sbReady) {
      try { await getSupabase().from('members').delete().eq('name', nome); } catch(e) {}
    }
    MEMBERS.splice(i, 1);
    saveMembers();
    buildMembriList();
    showToast('// ACCOUNT RIMOSSO', 'error');
  }, 'RIMUOVI ACCOUNT', 'RIMUOVI');
}

// Sospendi/riattiva membro — usato dallo staff (senza modal completo)
function toggleSospesoMembro(i) {
  if (!isStaff()) return;
  var m = MEMBERS[i];
  var myLevel = roleLabel(currentUser.role).level;
  var theirLevel = roleLabel(m.role).level;
  if (!isAdmin() && theirLevel >= myLevel) { showToast('// PERMESSO NEGATO', 'error'); return; }
  var newSospeso = !m.sospeso;
  var azione = newSospeso ? 'Sospendere' : 'Riattivare';
  var titolo = newSospeso ? 'SOSPENDI ACCOUNT' : 'RIATTIVA ACCOUNT';
  var btnLabel = newSospeso ? 'SOSPENDI' : 'RIATTIVA';
  showConfirm(azione + " l'account di " + m.name + '?', function() {
    MEMBERS[i].sospeso = newSospeso;
    addLog((newSospeso ? 'ha sospeso' : 'ha riattivato') + ' account: ' + m.name);
    saveMembers();
    buildMembriList();
    showToast(newSospeso ? '// ACCOUNT SOSPESO' : '// ACCOUNT RIATTIVATO', newSospeso ? 'error' : 'success');
  }, titolo, btnLabel);
}



// ════════════════════════════════════════
// CERCA HOME (pubblica)
// ════════════════════════════════════════
var _homeCercaOpen = false;

function toggleHomeCerca() {
  _homeCercaOpen = !_homeCercaOpen;
  var panel = document.getElementById('homeCercaPanel');
  var btn   = document.getElementById('homeCercaBtn');
  if (!panel) return;
  panel.style.display = _homeCercaOpen ? 'flex' : 'none';
  btn.style.borderColor = _homeCercaOpen ? 'var(--red)' : '#2a2a2a';
  btn.style.color       = _homeCercaOpen ? 'var(--red)' : '#444';
  btn.textContent       = _homeCercaOpen ? '✕ CHIUDI RICERCA' : '🔍 CERCA EVENTI';
  if (_homeCercaOpen) document.getElementById('homeCercaNome').focus();
}

function eseguiHomeCerca() {
  var query  = document.getElementById('homeCercaNome')  ? document.getElementById('homeCercaNome').value.trim().toLowerCase()  : '';
  var giorno = document.getElementById('homeCercaGiorno') ? parseInt(document.getElementById('homeCercaGiorno').value) : 0;
  var mese   = document.getElementById('homeCercaMese')   ? parseInt(document.getElementById('homeCercaMese').value)   : 0;
  var anno   = document.getElementById('homeCercaAnno')   ? parseInt(document.getElementById('homeCercaAnno').value)   : 0;
  var results = document.getElementById('homeCercaResults');
  if (!results) return;

  // Filtra per tipi visibili in base al ruolo
  var tipiCerca = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
  var found = EVENTI.filter(function(e) {
    if (tipiCerca.indexOf(e.tipo) < 0) return false;
    var matchNome   = !query  || e.nome.toLowerCase().includes(query);
    var matchGiorno = !giorno || e.giorno === giorno;
    var matchMese   = !mese   || e.mese   === mese;
    var matchAnno   = !anno   || e.anno   === anno;
    return matchNome && matchGiorno && matchMese && matchAnno;
  });

  results.innerHTML = '';
  if (!query && !giorno && !mese && !anno) return;

  if (!found.length) {
    results.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:12px;letter-spacing:2px">NESSUN RISULTATO</div>';
    return;
  }

  found.forEach(function(ev) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--black);border:1px solid var(--border);border-left:3px solid ' + TIPO_COLOR[ev.tipo] + ';border-radius:3px;padding:10px;cursor:pointer;transition:background 0.2s';
    var dow = new Date(ev.anno, ev.mese-1, ev.giorno).getDay();
    var dowIdx = dow === 0 ? 6 : dow - 1;
    card.innerHTML =
      '<div style="font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--white);margin-bottom:4px">' + ev.nome + '</div>' +
      '<div style="font-family:monospace;font-size:9px;color:var(--steel);letter-spacing:1px;margin-bottom:4px">🗓️ ' +
        GIORNI_FULL[dowIdx] + ' ' + ev.giorno + ' ' + MESI[ev.mese-1] + ' · ORE ' + ev.ora +
      '</div>' +
      (ev.luogo ? '<div style="font-family:var(--body);font-size:12px;color:#666;line-height:1.4">📍 ' + ev.luogo + '</div>' : '') +
      (ev.desc  ? '<div style="font-family:var(--body);font-size:12px;color:#666;line-height:1.4">ℹ️ ' + ev.desc  + '</div>' : '') +
      (ev.note  ? '<div style="font-family:var(--body);font-size:12px;color:#666;line-height:1.4">✨ ' + ev.note  + '</div>' : '');
    card.classList.add('search-result-card');
    card.onclick = function() {
      calYear  = ev.anno;
      calMonth = ev.mese;
      calSel   = ev.giorno;
      buildCal();
      toggleHomeCerca();
      document.querySelector('#screenHome .scrollable').scrollTop = 0;
    };
    results.appendChild(card);
  });
}

// ════════════════════════════════════════
// CERCA
// ════════════════════════════════════════
var _cercaTipo = '';

function setCercaTipo(btn, tipo) {
  _cercaTipo = tipo;
  document.querySelectorAll('.cerca-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  eseguiCerca();
}

function eseguiCerca() {
  var query  = (document.getElementById('cercaNome')  ? document.getElementById('cercaNome').value.trim().toLowerCase()  : '');
  var mese   = (document.getElementById('cercaMese')  ? parseInt(document.getElementById('cercaMese').value)  : 0);
  var anno   = (document.getElementById('cercaAnno')  ? parseInt(document.getElementById('cercaAnno').value)  : 0);
  var results = document.getElementById('cercaResults');
  var countEl = document.getElementById('cercaCount');
  if (!results) return;

  var found = EVENTI.filter(function(e) {
    var matchNome = !query || e.nome.toLowerCase().includes(query) || (e.desc && e.desc.toLowerCase().includes(query));
    var matchMese = !mese  || e.mese  === mese;
    var matchAnno = !anno  || e.anno  === anno;
    var matchTipo = !_cercaTipo || e.tipo === _cercaTipo;
    return matchNome && matchMese && matchAnno && matchTipo;
  });

  if (countEl) countEl.textContent = found.length;
  results.innerHTML = '';

  if (!found.length) {
    results.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:20px;letter-spacing:2px">NESSUN RISULTATO</div>';
    return;
  }

  found.forEach(function(ev) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-left:3px solid ' + TIPO_COLOR[ev.tipo] + ';border-radius:3px;padding:12px;cursor:pointer;transition:opacity 0.2s';
    var dow = new Date(ev.anno, ev.mese-1, ev.giorno).getDay();
    var dowIdx = dow === 0 ? 6 : dow - 1;
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '<div style="font-family:var(--display);font-size:18px;letter-spacing:2px;color:var(--white);line-height:1.1">' + ev.nome + '</div>' +
        '<span class="tag ' + TIPO_TAG_CLASS[ev.tipo] + '">' + TIPO_LABEL[ev.tipo] + '</span>' +
      '</div>' +
      '<div style="font-family:monospace;font-size:9px;color:var(--steel);letter-spacing:1px;margin-bottom:4px">🗓️ ' +
        GIORNI_FULL[dowIdx] + ' ' + ev.giorno + ' ' + MESI[ev.mese-1] + ' · ORE ' + ev.ora +
      '</div>' +
      (ev.luogo ? '<div style="font-family:var(--body);font-size:12px;color:#666;margin-top:4px;line-height:1.4">📍 ' + ev.luogo + '</div>' : '') +
      (ev.desc  ? '<div style="font-family:var(--body);font-size:12px;color:#666;margin-top:4px;line-height:1.4">ℹ️ ' + ev.desc  + '</div>' : '') +
      (ev.note  ? '<div style="font-family:var(--body);font-size:12px;color:#666;margin-top:4px;line-height:1.4">✨ ' + ev.note  + '</div>' : '');
    card.onclick = function() {
      sCalYear  = ev.anno;
      sCalMonth = ev.mese;
      sCalSel   = ev.giorno;
      showTab('calendario');
      buildSCal();
    };
    results.appendChild(card);
  });
}

// ════════════════════════════════════════
// ESPORTA / IMPORTA
// ════════════════════════════════════════
function esportaDati() {
  var data = {
    version: '2.0',
    exported: new Date().toISOString(),
    EVENTI:  EVENTI,
    BACHECA: BACHECA,
    INFO:    INFO,
    SPESA:   SPESA,
    LAVORI:  LAVORI,
    MAGAZZINO: MAGAZZINO,
    PAGAMENTI: PAGAMENTI,
    CONSIGLIATI: CONSIGLIATI,
    SUGGERIMENTI: SUGGERIMENTI,
    VALUTAZIONI: VALUTAZIONI,
    EVENTI_VALUTAZIONI: EVENTI_VALUTAZIONI,
    MEMBERS: MEMBERS.map(function(m){ return { name:m.name, initial:m.initial, color:m.color, password:m.password, role:m.role, photo:m.photo||null }; }),
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = 'bunker23-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  addLog('ha esportato i dati');
}

function importaDati(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.EVENTI || !data.BACHECA) throw new Error('File non valido');
      EVENTI  = data.EVENTI;
      BACHECA = data.BACHECA;
      INFO    = data.INFO    || INFO;
      SPESA   = data.SPESA   || SPESA;
      LAVORI  = data.LAVORI  || LAVORI;
      MAGAZZINO = data.MAGAZZINO || MAGAZZINO;
      // Valida formato PAGAMENTI (nuovo formato ha .saldo e .movimenti)
    if (data.PAGAMENTI && data.PAGAMENTI.length && 'saldo' in data.PAGAMENTI[0]) {
      PAGAMENTI = data.PAGAMENTI;
    } else if (data.PAGAMENTI && data.PAGAMENTI.length) {
      // Vecchio formato — ignora, usa default
    }
      CONSIGLIATI  = data.CONSIGLIATI  || CONSIGLIATI;
      SUGGERIMENTI = data.SUGGERIMENTI || SUGGERIMENTI;
      VALUTAZIONI  = data.VALUTAZIONI  || VALUTAZIONI;
      EVENTI_VALUTAZIONI = data.EVENTI_VALUTAZIONI || EVENTI_VALUTAZIONI;
    if (data.LOG) LOG = data.LOG;
      if (data.MEMBERS) {
        data.MEMBERS.forEach(function(dm) {
          var existing = MEMBERS.find(function(m){ return m.name === dm.name; });
          if (existing) { existing.color = dm.color; existing.role = dm.role; existing.password = dm.password; if (dm.photo) existing.photo = dm.photo; }
          else MEMBERS.push(dm);
        });
      }
      var msg = document.getElementById('importMsg');
      if (msg) { msg.style.color='var(--green)'; msg.textContent = '// DATI IMPORTATI CON SUCCESSO ✓'; setTimeout(function(){ msg.textContent=''; }, MS_TOAST); }
      addLog('ha importato i dati');
      saveToStorage();
      buildAll();
    } catch(err) {
      var msg = document.getElementById('importMsg');
      if (msg) { msg.style.color='var(--red)'; msg.textContent = '// ERRORE: ' + err.message; }
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}
// ════════════════════════════════════════
// EVENTI CONSIGLIATI
// ════════════════════════════════════════
function buildConsigliati() {
  var list = document.getElementById('consigliatiList');
  if (!list) return;
  list.innerHTML = '';

  // Cerca il prossimo evento di tipo 'consigliato' nel calendario
  var today = new Date(); today.setHours(0,0,0,0);
  var prossimo = EVENTI
    .filter(function(e) { return e.tipo === 'consigliato' && new Date(e.anno, e.mese-1, e.giorno) >= today; })
    .sort(function(a,b) { return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno); })[0];

  if (!prossimo) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;padding:12px;letter-spacing:2px">NESSUN EVENTO CONSIGLIATO IN PROGRAMMA</div>';
    return;
  }

  var card = document.createElement('div');
  card.style.cssText = 'background:var(--panel);border:1px solid rgba(0,180,220,0.25);border-radius:4px;overflow:hidden;cursor:pointer';
  card.onclick = function() {
    calSel = prossimo.giorno; calMonth = prossimo.mese; calYear = prossimo.anno;
    buildCal();
    document.querySelector('#screenHome .scrollable').scrollTop = 0;
  };

  var locHtml = prossimo.locandina
    ? '<div class="loc-img-wrap" onclick="event.stopPropagation();openLightbox(\'' + prossimo.locandina + '\')"><img src="' + prossimo.locandina + '" style="width:100%;max-height:200px;object-fit:contain;display:block;background:#0a0a0a"/><span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>'
    : '';

  var dow = new Date(prossimo.anno, prossimo.mese-1, prossimo.giorno).getDay();
  var dowIdx = dow === 0 ? 6 : dow - 1;
  var dataStr = '🗓️ ' + GIORNI_FULL[dowIdx] + ' ' + prossimo.giorno + ' ' + MESI[prossimo.mese-1] + ' · ORE ' + prossimo.ora;

  card.innerHTML = locHtml +
    '<div style="padding:12px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
        '<div style="width:5px;height:5px;border-radius:50%;background:#00b4dc;animation:blink 1.4s infinite;flex-shrink:0"></div>' +
        '<span style="font-family:var(--mono);font-size:8px;color:#00b4dc;letter-spacing:3px">PROSSIMO CONSIGLIATO</span>' +
      '</div>' +
      '<div style="font-family:var(--display);font-size:18px;letter-spacing:2px;color:var(--white);margin-bottom:4px">' + prossimo.nome + '</div>' +
      '<div style="font-family:var(--mono);font-size:9px;color:#00b4dc;letter-spacing:1px;margin-bottom:6px">' + dataStr + '</div>' +
      (prossimo.luogo ? '<div style="font-family:var(--body);font-size:12px;color:var(--light);line-height:1.5;margin-bottom:4px">📍 ' + prossimo.luogo + '</div>' : '') +
      (prossimo.desc  ? '<div style="font-family:var(--body);font-size:12px;color:var(--light);line-height:1.5;margin-bottom:4px">ℹ️ ' + prossimo.desc  + '</div>' : '') +
      (prossimo.note  ? '<div style="font-family:var(--body);font-size:12px;color:var(--light);line-height:1.5">✨ '             + prossimo.note  + '</div>' : '') +
    '</div>';

  list.appendChild(card);
}

/** Ricostruisce tutta la UI */
// Nasconde/mostra widget e tab staff in base al ruolo dell'utente corrente
// Lv1/Lv2: nasconde tutte le tabelle staff (spesa, lavori, magazzino, pagamenti)
// Lv3 (aiutante): rispetta AIUTANTE_CONFIG per ogni sezione
// Lv4+: nessuna restrizione aggiuntiva
function _applyRoleVisibility() {
  if (!currentUser) return;
  var role = currentUser.role;
  var isLv12 = (role === 'utente' || role === 'premium');
  var isAiut = (role === 'aiutante');
  var staffSections = ['spesa','lavori','magazzino','pagamenti'];

  function _setSection(id, visible) {
    // Tab
    var tabEl = document.getElementById('tab-' + id);
    if (tabEl) tabEl.dataset.cfgDisabled = visible ? '' : '1';
    // Widget dashboard
    var wEl = document.querySelector('#tab-dashboard .dash-widget[onclick*="showTab(\'' + id + '\')"]');
    if (wEl && !wEl.classList.contains('admin-only')) wEl.style.display = visible ? '' : 'none';
  }

  if (isLv12) {
    // Tabelle staff: nascoste, tranne pagamenti se l'utente è presente nella lista
    staffSections.forEach(function(id) {
      if (id === 'pagamenti') {
        var inPagamenti = currentUser && PAGAMENTI.some(function(p){ return p.name === currentUser.name; });
        _setSection('pagamenti', !!inPagamenti);
      } else {
        _setSection(id, false);
      }
    });
  } else if (isAiut && typeof AIUTANTE_CONFIG !== 'undefined') {
    staffSections.forEach(function(id) {
      if (id === 'pagamenti' && AIUTANTE_CONFIG.pagamenti) {
        // Aiutante con pagamenti abilitato: mostra solo se è in lista
        var inPagamenti = currentUser && PAGAMENTI.some(function(p){ return p.name === currentUser.name; });
        _setSection('pagamenti', !!inPagamenti);
      } else {
        _setSection(id, !!AIUTANTE_CONFIG[id]);
      }
    });
  }
  // Staff/admin: nessuna modifica — applyWidgetConfig e applyTabConfig gestiscono già tutto
}

function buildAll() {
  buildHomeNextEvent();
  buildEventoInCorsoBanner();
  buildProfilo();
  buildCal();
  buildSCal();
  buildBacheca();
  buildInfo();
  buildMagazzino();   // prima del magazzino così syncMagazzinoWithSpesa ha i dati
  syncMagazzinoWithSpesa(); // ricalcola lista spesa da magazzino aggiornato (prezzi, _categoria)
  buildSpesa();       // ridisegna con dati già corretti
  buildLavori();
  buildPagamenti();
  buildLog();
  buildConsigliati();
  buildSuggerimenti();
  buildValutazioni();
  buildInviti();
  updateDash();
  updateLogoutBtns();
  updateStaffNavBtns();
  applyGuestMessage();
  _applyRoleVisibility();
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  updateClocks();
  setInterval(updateClocks, 1000);

  // Modal overlay click to close
  $id('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Contatore caratteri suggerimenti
  var ta = document.getElementById('sugInput');
  if (ta) ta.addEventListener('input', function() {
    var c = document.getElementById('sugCount');
    if (c) c.textContent = ta.value.length + ' / 150';
  });

  // Swipe gesture per navigare tra schermate pubbliche
  initSwipe();

  // Avvisa prima di chiudere se ci sono dati non salvati
  window.addEventListener('beforeunload', function(e) {
    if (currentUser || LOG.length || SPESA.length || LAVORI.some(function(l){return l.done;})) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Avvio: la config viene caricata da Supabase in loadAllData()
  var splashGear = document.querySelector('.splash-gear');
  if (splashGear) splashGear.style.animationDuration = '3s';

  // ── Ripristino sessione SINCRONO ──────────────────────────────────────────
  // Legge localStorage in modo sincrono PRIMA di buildAll() così la prima
  // render mostra già la schermata corretta senza flash di splash/login.
  // I dati completi arriveranno da Supabase nel blocco async sottostante.
  var _sessionToRestore = null;
  try {
    var _savedSessSync = _pendingInviteToken ? null : localStorage.getItem('bunker23_session');
    if (_savedSessSync) {
      var _sessSync = JSON.parse(_savedSessSync);
      var _elapsedSync = Date.now() - (_sessSync.ts || 0);
      var _isPrivSync = (_sessSync.role === 'admin' || _sessSync.role === 'staff' || _sessSync.role === 'aiutante');
      var _sessValidaSync = _isPrivSync || (_elapsedSync < SESSION_TIMEOUT_USER);
      if (_sessValidaSync && _sessSync.name && _sessSync.role) {
        currentUser = { name: _sessSync.name, role: _sessSync.role };
        _sessionToRestore = _sessSync;
      } else {
        localStorage.removeItem('bunker23_session');
      }
    }
  } catch(e) {}

  buildAll();
  updateHomeAccessLevel();
  startEventoBannerTimer();

  // Naviga subito alla schermata corretta (dati temporanei da localStorage).
  // Il blocco async sotto aggiornerà tutto con i dati freschi da Supabase.
  if (currentUser) {
    if (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.AIUTANTE) {
      var _staffScreenSync = document.getElementById('screenStaff');
      if (_staffScreenSync) _staffScreenSync.classList.toggle('is-admin', currentUser.role === ROLES.ADMIN);
      var _staffNameSync = document.getElementById('staffName');
      if (_staffNameSync) _staffNameSync.textContent = currentUser.name.toUpperCase();
      showTab('dashboard');
      navigate('screenStaff');
    } else {
      navigate('screenHome');
    }
  }

  // Ascolta messaggi dal service worker via BroadcastChannel
  // (usato quando si clicca una notifica push con l'app già aperta)
  try {
    var _pushChannel = new BroadcastChannel('bunker23_push');
    _pushChannel.onmessage = function(event) {
      if (event.data && event.data.type === 'APRI_EVENTO' && event.data.eventoId) {
        if (_sbReady && EVENTI.length > 0) {
          navigaAdEvento(event.data.eventoId);
        } else {
          _pendingEventoId = event.data.eventoId;
        }
      }
    };
  } catch(e) {}

  // Carica tutti i dati da Supabase in background.
  // FLUSSO:
  // 1. currentUser e _sessionToRestore già impostati in modo sincrono sopra
  //    (lettura localStorage prima di buildAll per evitare flash splash/login)
  // 2. Dopo loadAllData(), aggiorna currentUser con i dati freschi dal DB (password, foto, ecc.)
  // 3. syncMagazzinoWithSpesa()+saveSpesa() solo se magazzino è stato caricato da Supabase
  //    → evita di sovrascrivere dati reali con i valori hardcodati (attuale=0)
  (async function() {
    try {
      _sbReady = true;

      // ── Step 2: carica dati con il ruolo già noto ─────────────────────────
      await loadAllData();

      // ── Step 3: aggiorna currentUser con dati freschi dal DB ─────────────
      if (_sessionToRestore) {
        var _memberFresh = MEMBERS.find(function(m) { return m.name === _sessionToRestore.name; });
        if (_memberFresh) {
          currentUser = _memberFresh;
          localStorage.setItem('bunker23_session', JSON.stringify({ name: _memberFresh.name, role: _memberFresh.role, ts: Date.now() }));
          resetSessionTimer();
        } else {
          // Utente non trovato nel DB (eliminato) → invalida la sessione
          currentUser = null;
          localStorage.removeItem('bunker23_session');
        }
      }

      // ── Step 4: cronologia utenti (solo staff/admin) ──────────────────────
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff')) {
        if (typeof historyLoadAll === 'function') {
          MEMBERS_HISTORY = await historyLoadAll();
        }
      }

      // ── Step 5: sync spesa↔magazzino SOLO se magazzino è stato caricato da DB ──
      // Se _magazzinoLoadedFromDb è false significa che il ruolo non aveva accesso
      // al magazzino → MAGAZZINO è ancora hardcodato con attuale=0 → NON salvare
      // su Supabase altrimenti si sovrascrivono i dati reali.
      if (_magazzinoLoadedFromDb) {
        syncMagazzinoWithSpesa();
        saveSpesa();
      }

      // ── Step 6: build UI e navigazione ───────────────────────────────────
      buildAll();
      if (currentUser) {
        applyWidgetConfig();
        applyTabConfig();
        updatePageCfgBtns();
        if (currentUser.role === ROLES.STAFF || currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.AIUTANTE) {
          renderAvatar(document.getElementById('staffAvatar'), currentUser);
          document.getElementById('staffName').textContent = currentUser.name.toUpperCase();
          document.getElementById('staffRole').textContent = roleLabel(currentUser.role).label;
          var staffScreen = document.getElementById('screenStaff');
          staffScreen.classList.toggle('is-admin', currentUser.role === ROLES.ADMIN);
          applyBenvenuto();
          applyWidgetConfig();
          applyTabConfig();
          showTab('dashboard');
        }
        applyPageSections('home');
        applyPageSections('bacheca');
        applyPageSections('info');
        navigate('screenHome');
        showToast('// BENTORNATO ' + currentUser.name.toUpperCase(), 'ok');
      } else {
        applyPageSections('home');
        applyPageSections('bacheca');
        applyPageSections('info');
      }
      updateHomeAccessLevel();

      // ── Step 7: avvia realtime/polling e servizi ──────────────────────────
      if (typeof onUserLogin === 'function') onUserLogin();
      if (typeof requestPushPermissionAndRegister === 'function') requestPushPermissionAndRegister();
      if (typeof ripianificaTuttiReminder === 'function') ripianificaTuttiReminder();
      if (typeof checkInviteToken === 'function') checkInviteToken();
      if (_pendingEventoId && currentUser) navigaAdEvento(_pendingEventoId);

      console.log('Supabase: tutti i dati caricati · ruolo: ' + (currentUser ? currentUser.role : 'guest'));
    } catch(e) {
      console.warn('Supabase non raggiungibile:', e.message);
      _sbReady = false;
    }
  })();
  // Feedback: flash breve sul logo splash prima di mostrare la schermata
  var splashOverlay = document.querySelector('.splash-overlay');
  if (splashOverlay) {
    splashOverlay.style.opacity = '0';
    splashOverlay.style.transition = 'opacity 0.4s';
    setTimeout(function() {
      splashOverlay.style.opacity = '1';
      if (splashGear) splashGear.style.animationDuration = '12s'; // torna normale
    }, 150);
  }
});


// ════════════════════════════════════════════════════════
// BANNER SINCRONIZZAZIONE — blocca modifiche durante loadAllData
// ════════════════════════════════════════════════════════
var _syncBanner = null;

function _showSyncBanner() {
  if (_syncBanner) return;
  _syncBanner = document.createElement('div');
  _syncBanner.id = 'syncBanner';
  _syncBanner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:9999',
    'background:#1a1a00',
    'border-bottom:1px solid #554400',
    'color:#cc8800',
    'font-family:var(--mono)',
    'font-size:9px',
    'letter-spacing:2px',
    'text-align:center',
    'padding:6px 12px',
    'pointer-events:none'
  ].join(';');
  _syncBanner.textContent = '// SINCRONIZZAZIONE IN CORSO...';
  document.body.appendChild(_syncBanner);
  // Disabilita tutti i pulsanti di modifica
  document.querySelectorAll('.mz-qty-btn, .edit-btn-small, .spesa-check, .btn-primary, .cfg-save-btn').forEach(function(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
  });
}

function _hideSyncBanner() {
  if (_syncBanner) {
    _syncBanner.parentNode && _syncBanner.parentNode.removeChild(_syncBanner);
    _syncBanner = null;
  }
  // Riabilita i pulsanti
  document.querySelectorAll('.mz-qty-btn, .edit-btn-small, .spesa-check, .btn-primary, .cfg-save-btn').forEach(function(btn) {
    btn.disabled = false;
    btn.style.opacity = '';
  });
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
var _toastTimer = null;
function showToast(msg, type, duration) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  // force reflow
  void t.offsetWidth;
  t.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { t.classList.remove('show'); }, duration || 2200);
}

// ════════════════════════════════════════
// CONFIRM DIALOG
// ════════════════════════════════════════
var _confirmCb = null;
function showConfirm(msg, onConfirm, title, okLabel) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmTitle').textContent = title || 'CONFERMA ELIMINAZIONE';
  document.getElementById('confirmOkBtn').textContent = okLabel || 'ELIMINA';
  _confirmCb = onConfirm;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm(confirmed) {
  document.getElementById('confirmOverlay').classList.remove('open');
  if (confirmed && _confirmCb) _confirmCb();
  _confirmCb = null;
}

// ════════════════════════════════════════
// NAVIGATE CON ANIMAZIONE
// ════════════════════════════════════════
/** Naviga alla schermata @param {string} id */
var _navHistory = [];

function navigate(id, fromPopstate) {
  var isGuest = guestMode && !currentUser;
  if (isGuest && (id === 'screenBacheca' || id === 'screenInfo')) id = 'screenHome';

  var current = document.querySelector('.screen.active');
  var next = document.getElementById(id);
  if (!next || current === next) return;

  // Gestione history per tasto indietro del telefono
  if (!fromPopstate) {
    var currentId = current ? current.id : null;
    if (currentId) _navHistory.push(currentId);
    history.pushState({ screen: id, histLen: _navHistory.length }, '', '');
  }

  if (current) {
    current.classList.add('slide-out');
    setTimeout(function() {
      current.classList.remove('active', 'slide-out');
    }, 220);
  }
  // piccolo delay per far partire l'animazione in ingresso dopo quella in uscita
  setTimeout(function() {
    next.classList.add('active');
    // Scroll to top — la pagina scrolla sulla window, non sul .screen
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Per eventuali container interni scrollabili
    var scrollable = next.querySelector('.scrollable');
    if (scrollable) scrollable.scrollTop = 0;
  }, 60);

  updateLogoutBtns();
  updateStaffNavBtns();
  updateHomeAccessLevel();
}

// Intercetta tasto indietro del telefono
window.addEventListener('popstate', function(e) {
  var activeScreen = document.querySelector('.screen.active');
  var activeId = activeScreen ? activeScreen.id : null;

  // Se siamo dentro screenStaff (area staff/admin)
  if (activeId === 'screenStaff') {
    if (_currentTab !== 'dashboard') {
      // Da qualsiasi widget → torna alla dashboard
      // Pusha uno stato esplicito per la dashboard, così il prossimo
      // "indietro" avrà sempre un livello disponibile per tornare alla home pubblica
      showTab('dashboard');
      history.pushState({ screen: 'screenStaff', tab: 'dashboard' }, '', '');
    } else {
      // Dalla dashboard → torna alla home pubblica
      guestMode = false;
      navigate('screenHome', true);
    }
    return;
  }

  // Navigazione normale tra schermate pubbliche
  if (_navHistory.length > 0) {
    var prev = _navHistory.pop();
    navigate(prev, true);
  } else {
    history.pushState({}, '', '');
  }
});

// Inizializza history state al primo caricamento
history.replaceState({ screen: 'screenSplash' }, '', '');

// ════════════════════════════════════════
// SWIPE (schermate pubbliche)
// ════════════════════════════════════════
function initSwipe() {
  var PUBLIC_SCREENS = ['screenHome','screenBacheca','screenInfo'];
  var startX = 0, startY = 0;

  document.querySelector('.phone').addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.querySelector('.phone').addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return; // troppo corto o verticale

    var active = document.querySelector('.screen.active');
    if (!active) return;
    var idx = PUBLIC_SCREENS.indexOf(active.id);
    if (idx === -1) return; // swipe solo su schermate pubbliche

    if (dx < 0 && idx < PUBLIC_SCREENS.length - 1) {
      // swipe sinistro → avanti
      if (!currentUser && !guestMode) return; // non navigare se non loggato
      navigate(PUBLIC_SCREENS[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      // swipe destro → indietro
      navigate(PUBLIC_SCREENS[idx - 1]);
    }
  }, { passive: true });
}

// ════════════════════════════════════════
// VALIDAZIONE DATE EVENTI
// ════════════════════════════════════════
function validaDataEvento(giorno, mese, anno) {
  if (anno < 2020 || anno > 2100) return 'Anno non valido';
  if (mese < 1 || mese > 12) return 'Mese non valido (1-12)';
  var maxGiorni = new Date(anno, mese, 0).getDate();
  if (giorno < 1 || giorno > maxGiorni) return 'Giorno non valido per questo mese (1-' + maxGiorni + ')';
  return null; // ok
}

function eventoEsistente(giorno, mese, anno, excludeId) {
  return EVENTI.find(function(e) {
    return e.giorno === giorno && e.mese === mese && e.anno === anno && e.id !== excludeId;
  });
}

// ════════════════════════════════════════
// FEEDBACK MODALE SALVATAGGIO
// ════════════════════════════════════════
function flashModalSave() {
  var footer = document.querySelector('#modalOverlay .modal-footer');
  if (!footer) return;
  var btn = footer.querySelector('.modal-btn-confirm');
  if (!btn) return;
  var orig = btn.textContent;
  btn.textContent = '✓ SALVATO';
  btn.style.background = 'var(--green)';
  btn.style.borderColor = 'var(--green)';
  btn.style.color = '#000';
  setTimeout(function() {
    btn.textContent = orig;
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }, 600);
}

// Wrapper che chiama la callback, mostra feedback e poi chiude
function modalConfirmWithFeedback() {
  if (window._modalCb) {
    flashModalSave();
    setTimeout(function() {
      if (window._modalCb) window._modalCb();
    }, MS_ANIM);
  }
}



function svuotaLog() {
  if (!isAdmin()) { showToast('// SOLO ADMIN', 'error'); return; }
  if (!confirm('Sei sicuro di voler cancellare tutto il log eventi? L\'azione non è reversibile.')) return;
  LOG = [];
  buildLog();
  clearLogRemote();
  showToast('// LOG SVUOTATO ✓', 'success');
}

// ════════════════════════════════════════
// STAMPA PROGRAMMA EVENTI (PDF)
// ════════════════════════════════════════
function stampaProgrammaEventi() {
  var today = new Date(); today.setHours(0,0,0,0);
  var eventi = EVENTI
    .filter(function(e) { return new Date(e.anno, e.mese-1, e.giorno) >= today; })
    .sort(function(a,b) { return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno); });

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<title>Programma Eventi — Bunker 23</title>' +
    '<style>' +
    'body{font-family:"Courier New",monospace;background:#fff;color:#111;margin:0;padding:24px;font-size:12px}' +
    'h1{font-size:22px;letter-spacing:4px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:20px}' +
    '.ev{margin-bottom:16px;padding:12px;border:1px solid #ccc;border-radius:3px;page-break-inside:avoid}' +
    '.ev-nome{font-size:16px;font-weight:bold;letter-spacing:2px;margin-bottom:4px}' +
    '.ev-meta{font-size:10px;color:#555;letter-spacing:1px;margin-bottom:4px}' +
    '.ev-tipo{display:inline-block;font-size:9px;letter-spacing:2px;padding:2px 6px;border:1px solid #999;border-radius:2px;margin-bottom:6px}' +
    '.ev-desc{font-size:11px;color:#333;line-height:1.5}' +
    '.ev-note{font-size:10px;color:#777;margin-top:4px}' +
    '.footer{margin-top:32px;font-size:9px;color:#aaa;text-align:right;letter-spacing:2px}' +
    '@media print{body{padding:12px}}' +
    '</style></head><body>' +
    '<h1>BUNKER 23 · PROGRAMMA EVENTI</h1>';

  if (!eventi.length) {
    html += '<p style="color:#999;letter-spacing:2px">NESSUN EVENTO IN PROGRAMMA</p>';
  } else {
    eventi.forEach(function(e) {
      var tipoLabel = { invito:'SU INVITO', premium:'PREMIUM', privato:'PRIVATO', segreto:'SEGRETO', consigliato:'CONSIGLIATO' }[e.tipo] || e.tipo.toUpperCase();
      html += '<div class="ev">' +
        '<div class="ev-tipo">' + tipoLabel + '</div>' +
        '<div class="ev-nome">' + e.nome + '</div>' +
        '<div class="ev-meta">' + MESI[e.mese-1] + ' ' + e.giorno + ', ' + e.anno + ' · ORE ' + e.ora + '</div>' +
        (e.desc ? '<div class="ev-desc">' + e.desc + '</div>' : '') +
        (e.note ? '<div class="ev-note">NOTE: ' + e.note + '</div>' : '') +
        '</div>';
    });
  }

  var now = new Date();
  html += '<div class="footer">Stampato il ' + now.toLocaleDateString('it-IT') + ' · BUNKER 23</div>' +
    '</body></html>';

  var w = window.open('', '_blank');
  if (!w) { showToast('// POPUP BLOCCATO — ABILITA I POPUP', 'error'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function() { w.print(); }, MS_DEBOUNCE);
}



// ════════════════════════════════════════
// SISTEMA INVITI — QR CODE MONOUSO
// ════════════════════════════════════════

// Token invito rilevato all'avvio (prima di qualsiasi navigazione)
var _pendingInviteToken = (function() {
  var p = new URLSearchParams(window.location.search);
  var t = p.get('invite');
  if (t) window.history.replaceState({}, document.title, window.location.pathname);
  return t || null;
})();
var _currentInviteToken = null;

// Genera stringa casuale per il token
function _generateToken() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function generaNuovoInvito() {
  if (!isStaff()) { showToast('// PERMESSO NEGATO', 'error'); return; }
  if (!_sbReady) { showToast('// CONNESSIONE NON PRONTA', 'error'); return; }

  var token = _generateToken();
  var scadenza = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  try {
    var res = await getSupabase().from('invite_tokens').insert({
      token: token,
      creato_da: currentUser ? currentUser.name : 'staff',
      scadenza: scadenza,
      usato: false,
      usato_da: null,
    });
    if (res.error) { showToast('// ERRORE: ' + res.error.message, 'error'); return; }

    // Mostra QR
    var baseUrl = window.location.origin + window.location.pathname;
    var link = baseUrl + '?invite=' + token;
    _mostraQrInvito(link);
    buildInviti();
    addLog('ha generato un invito');
  } catch(e) {
    showToast('// ERRORE GENERAZIONE INVITO', 'error');
  }
}

function _mostraQrInvito(link) {
  var overlay = document.getElementById('invitoQrOverlay');
  var qrDiv   = document.getElementById('invitoQrCode');
  var linkDiv = document.getElementById('invitoQrLink');
  if (!overlay || !qrDiv) return;

  // Genera QR usando API pubblica gratuita
  qrDiv.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
    encodeURIComponent(link) + '" style="display:block;width:180px;height:180px"/>';
  if (linkDiv) linkDiv.textContent = link;
  overlay.style.display = 'block';
  overlay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function buildInviti() {
  var list = document.getElementById('invitiList');
  if (!list) return;
  if (!_sbReady) { list.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#444;padding:10px">// CARICAMENTO...</div>'; return; }

  try {
    var res = await getSupabase()
      .from('invite_tokens')
      .select('*')
      .order('creato_il', { ascending: false });

    if (res.error) { list.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#cc2200;padding:10px">// ERRORE CARICAMENTO</div>'; return; }

    var inviti = res.data || [];
    // Aggiorna badge dashboard
    var attivi = inviti.filter(function(inv) {
      return !inv.usato && new Date(inv.scadenza) > new Date();
    }).length;
    var wEl = document.getElementById('wInviti');
    if (wEl) wEl.textContent = attivi;

    if (!inviti.length) {
      list.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#333;padding:10px;text-align:center;letter-spacing:2px">// NESSUN INVITO GENERATO</div>';
      return;
    }

    var now = new Date();
    list.innerHTML = inviti.map(function(inv) {
      var scad = new Date(inv.scadenza);
      var scaduto = scad < now;
      var stato, statoColor;
      if (inv.usato) { stato = 'USATO'; statoColor = '#1a6b3c'; }
      else if (scaduto) { stato = 'SCADUTO'; statoColor = '#555'; }
      else { stato = 'ATTIVO'; statoColor = '#4a9abe'; }

      var dataCreazione = new Date(inv.creato_il).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' }) +
        ' · ' + new Date(inv.creato_il).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });

      var revokaBtn = (!inv.usato && !scaduto)
        ? '<button onclick="revokaInvito(' + inv.id + ')" style="padding:3px 8px;background:transparent;border:1px solid #661100;color:#cc2200;font-family:var(--mono);font-size:7px;letter-spacing:1px;cursor:pointer;border-radius:2px;flex-shrink:0">REVOCA</button>'
        : '';

      var usatoDa = inv.usato_da
        ? '<div style="font-family:var(--mono);font-size:7px;color:#1a6b3c;letter-spacing:1px;margin-top:3px">👤 ' + inv.usato_da + '</div>'
        : '';

      return '<div style="background:var(--panel);border:1px solid var(--border);border-radius:3px;padding:10px 12px;margin-bottom:6px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
              '<span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--white)">' + inv.token + '</span>' +
              '<span style="font-family:var(--mono);font-size:7px;letter-spacing:1px;color:' + statoColor + ';border:1px solid ' + statoColor + ';padding:1px 5px;border-radius:2px">' + stato + '</span>' +
            '</div>' +
            '<div style="font-family:var(--mono);font-size:7px;color:#555;letter-spacing:1px">✦ ' + inv.creato_da + ' · ' + dataCreazione + '</div>' +
            usatoDa +
          '</div>' +
          revokaBtn +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#cc2200;padding:10px">// ERRORE: ' + e.message + '</div>';
  }
}

async function revokaInvito(id) {
  if (!confirm('Revocare questo invito?')) return;
  try {
    var res = await getSupabase().from('invite_tokens').delete().eq('id', id);
    if (res.error) { showToast('// ERRORE REVOCA', 'error'); return; }
    showToast('// INVITO REVOCATO ✓', 'success');
    addLog('ha revocato un invito');
    buildInviti();
  } catch(e) {
    showToast('// ERRORE REVOCA', 'error');
  }
}

// ── REGISTRAZIONE TRAMITE INVITO ─────────────────────────────────────────────

var _inviteTokenAttivo = null;

// Controlla all'avvio se c'è un token invito (già letto in _pendingInviteToken)
async function checkInviteToken() {
  if (!_pendingInviteToken) return;
  var token = _pendingInviteToken;

  try {
    var res = await getSupabase()
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (res.error || !res.data) {
      showToast('// INVITO NON VALIDO', 'error');
      return;
    }

    var inv = res.data;
    if (inv.usato) { showToast('// INVITO GIÀ UTILIZZATO', 'error'); return; }
    if (new Date(inv.scadenza) < new Date()) { showToast('// INVITO SCADUTO', 'error'); return; }

    // Token valido — mostra schermata registrazione
    _inviteTokenAttivo = inv;
    _pendingInviteToken = null;
    navigate('screenRegistrazione');
  } catch(e) {
    showToast('// ERRORE VERIFICA INVITO', 'error');
  }
}

async function doRegistrazione() {
  var nome = document.getElementById('regNome').value.trim();
  var pw   = document.getElementById('regPw').value.trim();
  var conf = document.getElementById('regPwConf').value.trim();
  var err  = document.getElementById('regErr');

  if (!nome)           { err.textContent = '// INSERISCI UN NOME UTENTE'; return; }
  if (nome.length < 2) { err.textContent = '// NOME TROPPO CORTO (min 2 caratteri)'; return; }
  if (!pw)             { err.textContent = '// INSERISCI UNA PASSWORD'; return; }
  if (pw.length < 6)   { err.textContent = '// PASSWORD TROPPO CORTA (min 6 caratteri)'; return; }
  if (pw !== conf)     { err.textContent = '// LE PASSWORD NON COINCIDONO'; return; }

  // Controlla nome univoco (case-insensitive)
  var nomeEsiste = MEMBERS.some(function(m) {
    return m.name.toLowerCase() === nome.toLowerCase();
  });
  if (nomeEsiste) { err.textContent = '// NICKNAME GIÀ UTILIZZATO — SCEGLINE UN ALTRO'; return; }

  if (!_inviteTokenAttivo) { err.textContent = '// INVITO NON VALIDO'; return; }

  try {
    // Verifica token ancora valido (double-check)
    var check = await getSupabase()
      .from('invite_tokens')
      .select('*')
      .eq('token', _inviteTokenAttivo.token)
      .single();

    if (check.error || !check.data || check.data.usato) {
      err.textContent = '// INVITO GIÀ UTILIZZATO O NON VALIDO';
      return;
    }

    var hash = await sha256(pw);
    var initial = nome.charAt(0).toUpperCase();
    var color = COLORS[MEMBERS.length % COLORS.length];
    var nuovoMembro = { name: nome, initial: initial, color: color, password: hash, role: 'utente' };

    // Salva membro su Supabase
    var resMem = await getSupabase().from('members').insert({
      name: nome,
      initial: initial,
      color: color,
      password_hash: hash,
      role: 'utente',
      sospeso: false,
      can_create_profiles: false,
      can_promote: false,
    });
    if (resMem.error) {
      if (resMem.error.message.includes('unique') || resMem.error.message.includes('duplicate')) {
        err.textContent = '// NICKNAME GIÀ UTILIZZATO — SCEGLINE UN ALTRO';
      } else {
        err.textContent = '// ERRORE: ' + resMem.error.message;
      }
      return;
    }

    // Marca token come usato
    await getSupabase().from('invite_tokens').update({ usato: true, usato_da: nome }).eq('id', _inviteTokenAttivo.id);

    // Aggiungi a MEMBERS locale e fai login automatico
    MEMBERS.push(nuovoMembro);
    currentUser = nuovoMembro;
    var _invBy = _inviteTokenAttivo ? _inviteTokenAttivo.creato_da : null;
    _inviteTokenAttivo = null;

    try { localStorage.setItem('bunker23_session', JSON.stringify({ name: nome, role: 'utente', ts: Date.now() })); } catch(e) {}

    guestMode = false;
    addLog('si è registrato tramite invito');
    // Cronologia: registrazione via QR
    if (typeof historyCreateMember === 'function') historyCreateMember(nome, 'qr', _invBy);
    buildAll();
    updateHomeAccessLevel();
    if (typeof onUserLogin === 'function') onUserLogin();
    if (typeof requestPushPermissionAndRegister === 'function') requestPushPermissionAndRegister();
    navigate('screenHome');
    showToast('// BENVENUTO, ' + nome.toUpperCase() + ' ✓', 'success');
  } catch(e) {
    err.textContent = '// ERRORE REGISTRAZIONE: ' + e.message;
  }
}

// ════════════════════════════════════════════════════════
// BADGE NUOVI UTENTI — widget profilo dashboard
// ════════════════════════════════════════════════════════

/**
 * Conta i membri con created_at > lastMembersVisit e mostra
 * il numerino verde sull'icona 👤 del widget PROFILO.
 * Usa solo MEMBERS (già in memoria) — zero query extra.
 */
function updateNewMembersBadge() {
  if (!isStaff()) { _removeMembersBadge(); return; }

  var lastVisit = parseInt(localStorage.getItem('lastMembersVisit') || '0', 10);
  var count = 0;
  if (Array.isArray(MEMBERS)) {
    MEMBERS.forEach(function(m) {
      if (m && m.created_at) {
        var ts = new Date(m.created_at).getTime();
        if (!isNaN(ts) && ts > lastVisit) count++;
      }
    });
  }

  var profiloWidget = document.querySelector('.dash-widget[onclick*="profilo"]');
  if (!profiloWidget) return;

  var badge = profiloWidget.querySelector('.members-new-badge');

  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'members-new-badge';
      badge.style.cssText = 'position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;background:#22cc44;color:#000;font-family:monospace;font-size:9px;font-weight:bold;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;pointer-events:none;z-index:10;box-shadow:0 0 0 2px var(--bg,#0a0a0a);line-height:1';
      if (!profiloWidget.style.position || profiloWidget.style.position === 'static') {
        profiloWidget.style.position = 'relative';
      }
      profiloWidget.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = 'flex';
  } else {
    _removeMembersBadge();
  }
}

function _removeMembersBadge() {
  var w = document.querySelector('.dash-widget[onclick*="profilo"]');
  if (!w) return;
  var b = w.querySelector('.members-new-badge');
  if (b) b.style.display = 'none';
}

/**
 * Salva il timestamp corrente come ultima visita alla sezione membri
 * e azzera il badge. Chiamata da showTab() quando si apre 'profilo'.
 */
function markMembersVisited() {
  if (!isStaff()) return;
  localStorage.setItem('lastMembersVisit', String(Date.now()));
  _removeMembersBadge();
}

// ════════════════════════════════════════════════════════
// CRONOLOGIA UTENTE — modal pannello storia
// ════════════════════════════════════════════════════════

async function openMemberHistoryModal(memberName) {
  if (!isStaff()) { showToast('// PERMESSO NEGATO', 'error'); return; }

  $id('modalTitle').textContent = 'CRONOLOGIA · ' + memberName.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#666;text-align:center;padding:20px">// CARICAMENTO...</div>';
  window._modalCb = null;
  openModal();

  // Nascondi pulsante salva (non serve in questo modal)
  setTimeout(function() {
    var mBtn = document.querySelector('#modalOverlay .modal-btn');
    if (mBtn) mBtn.style.display = 'none';
  }, 10);

  var history = await historyLoadMember(memberName);
  var body = '';

  if (!history) {
    body =
      '<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#555;padding:10px 0">' +
        '// NESSUNA CRONOLOGIA DISPONIBILE<br>' +
        '<span style="color:#444;font-size:8px">Questo account è stato creato prima dell\'attivazione della cronologia.</span>' +
      '</div>';
  } else {
    var dataCrea = '—';
    try {
      var d = new Date(history.created_at);
      dataCrea = d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }) +
                 ' · ' + d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    } catch(e) {}

    var metodo = history.creation_method === 'qr'
      ? '📲 QR' + (history.invited_by ? ' — invitato da <b>' + history.invited_by.toUpperCase() + '</b>' : '')
      : '✍ CREAZIONE MANUALE (staff/admin)';

    var nomeIniziale = history.initial_name || memberName;

    body +=
      '<div style="border:1px solid #2a2a2a;border-radius:3px;padding:10px;margin-bottom:10px">' +
        '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px">// REGISTRAZIONE</div>' +
        _historyRow('DATA', dataCrea) +
        _historyRow('METODO', metodo) +
        _historyRow('NOME INIZIALE', '<b>' + nomeIniziale.toUpperCase() + '</b>') +
      '</div>';

    var changes = Array.isArray(history.name_changes) ? history.name_changes : [];
    body +=
      '<div style="border:1px solid #2a2a2a;border-radius:3px;padding:10px">' +
        '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px">' +
          '// STORICO NOMI (' + changes.length + ')' +
        '</div>';

    if (changes.length === 0) {
      body += '<div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1px">Nessun cambio nome.</div>';
    } else {
      var sorted = changes.slice().reverse();
      sorted.forEach(function(c, idx) {
        var dataChange = '—';
        try {
          var dc = new Date(c.changed_at);
          dataChange = dc.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }) +
                       ' · ' + dc.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
        } catch(e) {}
        var selfChange = c.changed_by === c.new_name;
        body +=
          '<div style="border-bottom:1px solid #1a1a1a;padding:6px 0' + (idx === sorted.length - 1 ? ';border-bottom:none' : '') + '">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">' +
              '<span style="font-family:monospace;font-size:10px;color:#888">' + c.old_name.toUpperCase() + '</span>' +
              '<span style="font-family:var(--mono);font-size:9px;color:#cc2200">→</span>' +
              '<span style="font-family:monospace;font-size:10px;color:var(--white)">' + c.new_name.toUpperCase() + '</span>' +
            '</div>' +
            '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px">' +
              dataChange + ' · ' + (selfChange ? 'autonomamente' : 'modificato da ' + (c.changed_by || '—').toUpperCase()) +
            '</div>' +
          '</div>';
      });
    }
    body += '</div>';
  }

  var mb = $id('modalBody');
  if (mb) mb.innerHTML = body;
}

function _historyRow(label, value) {
  return '<div style="display:flex;gap:8px;margin-bottom:5px;align-items:baseline">' +
    '<span style="font-family:var(--mono);font-size:8px;letter-spacing:2px;color:#555;min-width:90px;flex-shrink:0">' + label + '</span>' +
    '<span style="font-family:monospace;font-size:10px;color:var(--white)">' + value + '</span>' +
    '</div>';
}
