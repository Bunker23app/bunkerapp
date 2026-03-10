// ════════════════════════════════════════
// CONFIGURATORE ADMIN
// ════════════════════════════════════════

var WIDGET_CONFIG = [
  { id:'calendario', icon:'📅', label:'EVENTI',           enabled:true },
  { id:'spesa',      icon:'🛒', label:'LISTA SPESA',      enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',           enabled:true },
  { id:'magazzino',   icon:'📦', label:'MAGAZZINO',         enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',        enabled:true },
  { id:'chat',       icon:'💬', label:'MESSAGGI',         enabled:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',          enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',            enabled:true },
  { id:'log',        icon:'📋', label:'LOG EVENTI',       enabled:true, adminOnly:true },
  { id:'contatori',  icon:'🔢', label:'CONTATORI',        enabled:true, staffOnly:true },
];

var TAB_CONFIG = [
  { id:'calendario', icon:'📅', label:'CALENDARIO',  enabled:true },
  { id:'spesa',      icon:'🛒', label:'SPESA',        enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',       enabled:true },
  { id:'magazzino',   icon:'📦', label:'MAGAZZINO',     enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',    enabled:true },
  { id:'chat',       icon:'💬', label:'CHAT',         enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',        enabled:true },
  { id:'log',        icon:'📋', label:'LOG',          enabled:true, adminOnly:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',      enabled:true },
  { id:'contatori',  icon:'🔢', label:'CONTATORI',    enabled:true, staffOnly:true },
];

var BENVENUTO_TEXT = '';

var SPLASH_TEXTS = {
  badge:   'LOVE IS A WORLD INSIDE THE MUSIC',
  tagline: 'Disco Storia     ·     Techno     ·     HardStyle',
};

var GUEST_MESSAGE = {
  tag:  'ACCESSO LIMITATO',
  main: 'Vuoi accedere a tutte le aree?',
  sub:  'Contatta gli amministratori',
};

function applyGuestMessage() {
  var tag  = document.getElementById('guestMsgTag');
  var main = document.getElementById('guestMsgMain');
  var sub  = document.getElementById('guestMsgSub');
  if (tag)  tag.textContent  = '// ' + (GUEST_MESSAGE.tag  || 'ACCESSO LIMITATO');
  if (main) main.textContent = GUEST_MESSAGE.main || '';
  if (sub)  sub.textContent  = GUEST_MESSAGE.sub  || '';
}

function applySplashTexts() {
  var b = document.getElementById('splashBadgeEl');
  var t = document.getElementById('splashTaglineEl');
  if (b) b.textContent = SPLASH_TEXTS.badge   || 'LOVE IS A WORLD INSIDE THE MUSIC';
  if (t) t.textContent = SPLASH_TEXTS.tagline || 'Disco Storia     ·     Techno     ·     HardStyle';
}

function salvaSplashTexts() {
  var b = document.getElementById('cfgSplashBadge');
  var t = document.getElementById('cfgSplashTagline');
  SPLASH_TEXTS.badge   = (b ? b.value.trim() : '') || 'LOVE IS A WORLD INSIDE THE MUSIC';
  SPLASH_TEXTS.tagline = (t ? t.value.trim() : '') || 'Disco Storia     ·     Techno     ·     HardStyle';
  applySplashTexts();
  saveConfig();
  showToast('// TESTI SPLASH SALVATI ✓', 'success');
  addLog('ha aggiornato i testi della splash');
}

function salvaGuestMessage() {
  var gTag  = document.getElementById('cfgGuestTag');
  var gMain = document.getElementById('cfgGuestMain');
  var gSub  = document.getElementById('cfgGuestSub');
  GUEST_MESSAGE.tag  = (gTag  ? gTag.value.toUpperCase().trim()  : '') || 'ACCESSO LIMITATO';
  GUEST_MESSAGE.main = (gMain ? gMain.value.trim() : '') || 'Vuoi accedere a tutte le aree?';
  GUEST_MESSAGE.sub  = (gSub  ? gSub.value.trim()  : '') || 'Contatta gli amministratori';
  applyGuestMessage();
  applySplashTexts();
  saveConfig();
  showToast('// MESSAGGIO SALVATO ✓', 'success');
  addLog('ha aggiornato il messaggio ospite');
}

var AIUTANTE_WIDGET_CONFIG = [
  { id:'calendario', icon:'📅', label:'EVENTI',      enabled:true },
  { id:'spesa',      icon:'🛒', label:'LISTA SPESA', enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true },
  { id:'magazzino',   icon:'📦', label:'MAGAZZINO',    enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:false },
  { id:'chat',       icon:'💬', label:'MESSAGGI',    enabled:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true },
];

var AIUTANTE_TAB_CONFIG = [
  { id:'calendario', icon:'📅', label:'CALENDARIO', enabled:true },
  { id:'spesa',      icon:'🛒', label:'SPESA',       enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true },
  { id:'magazzino',   icon:'📦', label:'MAGAZZINO',    enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:false },
  { id:'chat',       icon:'💬', label:'CHAT',        enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true },
];

var _cfgDragSrc = null;

function buildConfigura() {
  if (!isAdmin()) return;

  // ── Widget list ──
  var wList = document.getElementById('cfgWidgetList');
  if (wList) {
    wList.innerHTML = '';
    WIDGET_CONFIG.forEach(function(w, i) {
      var row = document.createElement('div');
      row.className = 'cfg-drag-row';
      row.draggable = true;
      row.dataset.idx = i;
      row.innerHTML =
        '<span class="cfg-drag-handle">⠿</span>' +
        '<span class="cfg-drag-icon">' + w.icon + '</span>' +
        '<input class="cfg-label-input" type="text" value="' + w.label + '" maxlength="16" ' +
        'style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--light);' +
        'background:transparent;border:none;border-bottom:1px solid #2a2a2a;outline:none;' +
        'flex:1;min-width:0;padding:2px 4px;text-transform:uppercase"' +
        ' onchange="WIDGET_CONFIG[' + i + '].label=this.value.toUpperCase();syncWidgetLabel(\'' + w.id + '\',this.value.toUpperCase());saveConfig()"' +
        '/>' +
        (w.adminOnly ? '<span style="color:#555;font-size:7px;font-family:var(--mono);flex-shrink:0">ADMIN</span>' : '') +
        (w.staffOnly ? '<span style="color:#2a6b6b;font-size:7px;font-family:var(--mono);flex-shrink:0">STAFF+</span>' : '') +
        '<label class="cfg-toggle"><input type="checkbox"' + (w.enabled ? ' checked' : '') +
        ' onchange="syncWidgetTabEnabled(\'' + w.id + '\',this.checked);saveConfig()"><span class="cfg-toggle-slider"></span></label>';

      row.addEventListener('dragstart', function(e) {
        _cfgDragSrc = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        wList.querySelectorAll('.cfg-drag-row').forEach(function(r){ r.classList.remove('drag-over'); });
      });
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (_cfgDragSrc !== this) this.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
      row.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (_cfgDragSrc === this) return;
        var fromIdx = parseInt(_cfgDragSrc.dataset.idx);
        var toIdx   = parseInt(this.dataset.idx);
        WIDGET_CONFIG.splice(toIdx, 0, WIDGET_CONFIG.splice(fromIdx, 1)[0]);
        saveConfig();
        buildConfigura();
      });
      wList.appendChild(row);
    });
  }

  // ── Benvenuto ──
  var ta = document.getElementById('cfgBenvenuto');
  if (ta) {
    ta.value = BENVENUTO_TEXT;
    ta.oninput = function() {
      BENVENUTO_TEXT = this.value;
      var c = document.getElementById('cfgBenvenutoCount');
      if (c) c.textContent = this.value.length + ' / 300';
    };
    var c = document.getElementById('cfgBenvenutoCount');
    if (c) c.textContent = ta.value.length + ' / 300';
  }

  // ── Messaggio ospite ──
  var gTag  = document.getElementById('cfgGuestTag');
  var gMain = document.getElementById('cfgGuestMain');
  var gSub  = document.getElementById('cfgGuestSub');
  if (gTag)  gTag.value  = GUEST_MESSAGE.tag;
  if (gMain) gMain.value = GUEST_MESSAGE.main;
  if (gSub)  gSub.value  = GUEST_MESSAGE.sub;

  // ── Testi Splash ──
  var sb = document.getElementById('cfgSplashBadge');
  var st = document.getElementById('cfgSplashTagline');
  if (sb) sb.value = SPLASH_TEXTS.badge;
  if (st) st.value = SPLASH_TEXTS.tagline;

  // ── Aiutante: lista unificata widget+tab ──
  var awList = document.getElementById('cfgAiutanteWidgetList');
  if (awList) {
    awList.innerHTML = '';
    AIUTANTE_WIDGET_CONFIG.forEach(function(w, i) {
      var row = document.createElement('div');
      row.className = 'cfg-toggle-row';
      row.innerHTML =
        '<div><div class="cfg-toggle-label">' + w.icon + ' ' + w.label + '</div></div>' +
        '<label class="cfg-toggle"><input type="checkbox"' + (w.enabled ? ' checked' : '') +
        ' onchange="syncAiutanteEnabled(\'' + w.id + '\',this.checked);saveConfig()"><span class="cfg-toggle-slider"></span></label>';
      awList.appendChild(row);
    });
  }

  // ── Permessi pagine ──
  var ppList = document.getElementById('cfgPermPagine');
  if (ppList) buildPermPagine(ppList);
}

function buildPermPagine(container) {
  container.innerHTML = '';
  var permLabels = { admin:'Solo Admin', staff:'Staff+', aiutante:'Aiutante+' };

  // ── Sezione: Pagine pubbliche ──
  var hPages = document.createElement('div');
  hPages.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#444;margin:0 0 6px;text-transform:uppercase';
  hPages.textContent = '// PAGINE PUBBLICHE · CHI PUÒ MODIFICARE';
  container.appendChild(hPages);

  var pages = [
    { id:'home',    label:'HOME' },
    { id:'bacheca', label:'BACHECA' },
    { id:'info',    label:'INFO' },
  ];
  pages.forEach(function(p) {
    var header = document.createElement('div');
    header.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#777;margin:10px 0 4px';
    header.textContent = '// ' + p.label;
    container.appendChild(header);

    [ROLES.ADMIN, ROLES.STAFF, ROLES.AIUTANTE].forEach(function(perm) {
      var row = document.createElement('div');
      row.className = 'cfg-perm-row';
      row.innerHTML =
        '<span class="cfg-perm-label">' + permLabels[perm] + '</span>' +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="radio" name="cfgPermPage_' + p.id + '" value="' + perm + '"' +
        (PAGE_EDIT_PERMS[p.id] === perm ? ' checked' : '') +
        ' onchange="PAGE_EDIT_PERMS[\'' + p.id + '\']=this.value"><span class="cfg-toggle-slider"></span></label>';
      container.appendChild(row);
    });
  });

  // ── Separatore ──
  var sep1 = document.createElement('div');
  sep1.style.cssText = 'border-top:1px solid #1a1a1a;margin:14px 0 10px';
  container.appendChild(sep1);

  // ── Sezione: Widget Contatori ──
  var hCnt = document.createElement('div');
  hCnt.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#444;margin:0 0 6px;text-transform:uppercase';
  hCnt.textContent = '// 🔢 WIDGET CONTATORI';
  container.appendChild(hCnt);

  var cntItems = [
    { key:'contatori_view',  label:'VEDERE i contatori' },
    { key:'contatori_reset', label:'RESETTARE i contatori' },
  ];
  cntItems.forEach(function(ci) {
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:2px;color:#777;margin:10px 0 4px';
    lbl.textContent = '// ' + ci.label;
    container.appendChild(lbl);

    [ROLES.ADMIN, ROLES.STAFF, ROLES.AIUTANTE].forEach(function(perm) {
      var row = document.createElement('div');
      row.className = 'cfg-perm-row';
      row.innerHTML =
        '<span class="cfg-perm-label">' + permLabels[perm] + '</span>' +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="radio" name="cfgPermWidget_' + ci.key + '" value="' + perm + '"' +
        (WIDGET_PERMS[ci.key] === perm ? ' checked' : '') +
        ' onchange="WIDGET_PERMS[\'' + ci.key + '\']=this.value"><span class="cfg-toggle-slider"></span></label>';
      container.appendChild(row);
    });
  });

  // ── Separatore ──
  var sep2 = document.createElement('div');
  sep2.style.cssText = 'border-top:1px solid #1a1a1a;margin:14px 0 10px';
  container.appendChild(sep2);

  // ── Sezione: Aggiunta nuovi utenti ──
  var hAdd = document.createElement('div');
  hAdd.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#444;margin:0 0 6px;text-transform:uppercase';
  hAdd.textContent = '// 👥 AGGIUNTA NUOVI UTENTI';
  container.appendChild(hAdd);

  var addLbl = document.createElement('div');
  addLbl.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:2px;color:#777;margin:6px 0 4px';
  addLbl.textContent = '// CHI PUÒ AGGIUNGERE MEMBRI';
  container.appendChild(addLbl);

  [ROLES.ADMIN, ROLES.STAFF].forEach(function(perm) {
    var row = document.createElement('div');
    row.className = 'cfg-perm-row';
    row.innerHTML =
      '<span class="cfg-perm-label">' + permLabels[perm] + '</span>' +
      '<label class="cfg-toggle" style="flex-shrink:0"><input type="radio" name="cfgPermAddUser" value="' + perm + '"' +
      (ADD_USER_PERM === perm ? ' checked' : '') +
      ' onchange="ADD_USER_PERM=this.value"><span class="cfg-toggle-slider"></span></label>';
    container.appendChild(row);
  });
}

function salvaPermPagine() {
  if (!isAdmin()) return;
  updatePageCfgBtns();
  saveConfig();
  showToast('// PERMESSI SALVATI ✓', 'success');
  addLog('ha aggiornato i permessi (pagine, contatori, utenti)');
}

function salvaConfigura() {
  if (!isAdmin()) return;
  applyWidgetConfig();
  applyTabConfig();
  BENVENUTO_TEXT = (document.getElementById('cfgBenvenuto') || {}).value || BENVENUTO_TEXT;
  applyBenvenuto();
  saveConfig();
  showToast(T_CFG_SAVED, 'success');
  addLog('ha aggiornato la configurazione staff');
}

function salvaConfiguraAiutante() {
  if (!isAdmin()) return;
  applyAiutanteConfig();
  saveConfig();
  showToast('// VISTA AIUTANTE SALVATA ✓', 'success');
  addLog('ha aggiornato la configurazione aiutante');
}

function applyAiutanteConfig() {
  if (!currentUser) return;
  var isAiut = currentUser.role === ROLES.AIUTANTE;
  // Applica solo se loggato come aiutante per vedere l'effetto live
  if (!isAiut) return;
  applyWidgetConfigForRole('aiutante');
  applyTabConfigForRole('aiutante');
}

function applyWidgetConfig() {
  var role = currentUser ? currentUser.role : 'staff';
  applyWidgetConfigForRole(role);
}

function applyWidgetConfigForRole(role) {
  var config = (role === ROLES.AIUTANTE) ? AIUTANTE_WIDGET_CONFIG : WIDGET_CONFIG;
  var grid = document.querySelector('#tab-dashboard .dash-grid');
  if (!grid) return;

  // Salva TUTTI i widget esistenti prima di rimuoverli
  var existing = {};
  grid.querySelectorAll('.dash-widget').forEach(function(el) {
    var onclick = el.getAttribute('onclick') || '';
    var m = onclick.match(/showTab\('([^']+)'\)/);
    if (m) existing[m[1]] = el;
  });
  Array.from(grid.querySelectorAll('.dash-widget')).forEach(function(el) { el.remove(); });

  // Rimetti i widget configurabili nell'ordine corretto
  config.forEach(function(w) {
    var el = existing[w.id];
    if (!el) return;
    if (!el.classList.contains('admin-only')) {
      el.style.display = w.enabled ? '' : 'none';
    }
    grid.appendChild(el);
  });

  // Rimetti SEMPRE log e configura (admin-only) — visibilità gestita da .is-admin CSS
  ['log', 'configura'].forEach(function(id) {
    var el = existing[id];
    if (!el) el = document.querySelector('#tab-dashboard .dash-widget[onclick*="showTab(\'' + id + '\')"]');
    if (el) {
      el.style.removeProperty('display');
      grid.appendChild(el); // sempre, parentNode è già null dopo remove
    }
  });

  // Gestione contatori: visibilità basata sul permesso configurato
  var contatoriEl = existing['contatori'];
  if (!contatoriEl) contatoriEl = document.querySelector('#tab-dashboard .dash-widget[onclick*="showTab(\'contatori\')"]');
  if (contatoriEl) {
    var wContCfg = (config === AIUTANTE_WIDGET_CONFIG)
      ? AIUTANTE_WIDGET_CONFIG.find(function(x){ return x.id === 'contatori'; })
      : WIDGET_CONFIG.find(function(x){ return x.id === 'contatori'; });
    var hasViewPerm = canViewContatori();
    contatoriEl.style.display = (hasViewPerm && wContCfg && wContCfg.enabled) ? '' : 'none';
    grid.appendChild(contatoriEl);
  }

  applyWidgetLabels();
}

// Aggiorna i label nel dashboard in base a WIDGET_CONFIG
function applyWidgetLabels() {
  WIDGET_CONFIG.forEach(function(w) {
    var el = document.getElementById('wlabel-' + w.id);
    if (el) el.textContent = w.label;
  });
}

// Sincronizza abilitazione widget → anche tab corrispondente
function syncWidgetTabEnabled(id, enabled) {
  var w = WIDGET_CONFIG.find(function(x){ return x.id === id; });
  if (w) w.enabled = enabled;
  var t = TAB_CONFIG.find(function(x){ return x.id === id; });
  if (t) t.enabled = enabled;
}

// Sincronizza abilitazione aiutante widget → anche tab aiutante
function syncAiutanteEnabled(id, enabled) {
  var w = AIUTANTE_WIDGET_CONFIG.find(function(x){ return x.id === id; });
  if (w) w.enabled = enabled;
  var t = AIUTANTE_TAB_CONFIG.find(function(x){ return x.id === id; });
  if (t) t.enabled = enabled;
}

// Sincronizza il label di un widget sull'AIUTANTE_WIDGET_CONFIG (stessa label)
function syncWidgetLabel(id, label) {
  var aw = AIUTANTE_WIDGET_CONFIG.find(function(w){ return w.id === id; });
  if (aw) aw.label = label;
  var el = document.getElementById('wlabel-' + id);
  if (el) el.textContent = label;
}

function applyTabConfig() {
  var role = currentUser ? currentUser.role : 'staff';
  applyTabConfigForRole(role);
}

function applyTabConfigForRole(role) {
  var config = (role === ROLES.AIUTANTE) ? AIUTANTE_TAB_CONFIG : TAB_CONFIG;
  config.forEach(function(t) {
    var tabEl = document.getElementById('tab-' + t.id);
    if (!tabEl) return;
    tabEl.dataset.cfgDisabled = t.enabled ? '' : '1';
  });
}

function applyBenvenuto() {
  var el = document.getElementById('staffBenvenutoMsg');
  if (!el) return;
  el.textContent = BENVENUTO_TEXT;
  el.style.display = BENVENUTO_TEXT.trim() ? 'block' : 'none';
}

// ════════════════════════════════════════
// CONFIGURATORE PAGINE (Home / Bacheca / Info)
// ════════════════════════════════════════

// Struttura dati delle sezioni di ogni pagina
var PAGE_SECTIONS = {
  home: [
    { id:'cal',         icon:'📅', label:'CALENDARIO',          sublabel:'calendario eventi pubblico',  enabled:true },
    { id:'consigliati', icon:'⭐', label:'EVENTI CONSIGLIATI',  sublabel:'prossimo evento in evidenza',  enabled:true },
    { id:'nextEvent',   icon:'🔔', label:'PROSSIMO EVENTO',     sublabel:'banner prossimo evento',       enabled:true },
    { id:'search',      icon:'🔍', label:'CERCA EVENTI',        sublabel:'barra di ricerca pubblica',    enabled:true },
  ],
  bacheca: [
    { id:'posts',       icon:'📢', label:'COMUNICAZIONI',       sublabel:'post bacheca · tocca per gestire singoli',  enabled:true },
    { id:'links',       icon:'🔗', label:'LINK UTILI',          sublabel:'link e risorse esterne',       enabled:true },
    { id:'valutazioni', icon:'★',  label:'VALUTAZIONI',         sublabel:'form e lista valutazioni',     enabled:true },
    { id:'suggerimenti',icon:'💬', label:'SUGGERIMENTI',        sublabel:'form suggerimenti anonimi',    enabled:true },
  ],
  info: [
    { id:'cards',       icon:'📋', label:'SCHEDE INFO',         sublabel:'schede informative · tocca per gestire singole', enabled:true },
    { id:'links',       icon:'🔗', label:'LINK UTILI',          sublabel:'link e risorse esterne',       enabled:true },
  ],
};

// Permessi: chi può modificare ogni pagina
// Valori: 'admin' | 'staff' | 'aiutante'
var PAGE_EDIT_PERMS = {
  home:    'admin',
  bacheca: 'admin',
  info:    'admin',
};

// Permessi widget speciali — vedere e resettare i contatori
// Valori: 'admin' | 'staff' | 'aiutante'
var WIDGET_PERMS = {
  contatori_view:  'staff',
  contatori_reset: 'staff',
};

// Permesso per aggiungere nuovi utenti
// Valori: 'admin' | 'staff'
var ADD_USER_PERM = 'admin';

var _cfgPageCurrent = null;
var _cfgPageDragSrc = null;

function canEditPage(page) {
  if (!currentUser) return false;
  var req = PAGE_EDIT_PERMS[page] || 'admin';
  if (req === ROLES.ADMIN)    return isAdmin();
  if (req === ROLES.STAFF)    return isStaff();
  if (req === ROLES.AIUTANTE) return isAiutante();
  return false;
}

function updatePageCfgBtns() {
  ['home','bacheca','info'].forEach(function(page) {
    var btn = document.getElementById(page + 'CfgBtn');
    if (!btn) return;
    if (canEditPage(page)) btn.classList.add('visible');
    else btn.classList.remove('visible');
  });
}

function openCfgPanel(page) {
  if (!canEditPage(page)) return;
  _cfgPageCurrent = page;
  var titles = { home:'HOME', bacheca:'BACHECA', info:'INFO' };
  document.getElementById('cfgPanelTitle').textContent = '⚙ CONFIGURA · ' + titles[page];
  buildCfgPanelBody(page);
  document.getElementById('cfgOverlay').classList.add('open');
  document.getElementById('cfgPanel').classList.add('open');
}

function closeCfgPanel() {
  document.getElementById('cfgOverlay').classList.remove('open');
  document.getElementById('cfgPanel').classList.remove('open');
  _cfgPageCurrent = null;
}

function buildCfgPanelBody(page) {
  var body = document.getElementById('cfgPanelBody');
  body.innerHTML = '';
  var sections = PAGE_SECTIONS[page];

  var h1 = document.createElement('div');
  h1.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px';
  h1.textContent = '// SEZIONI · TRASCINA PER RIORDINARE';
  body.appendChild(h1);

  function renderRows() {
    body.querySelectorAll('.cfg-item-row, .cfg-sub-panel').forEach(function(r){ r.remove(); });
    var insertBefore = body.querySelector('.cfg-section-sep');

    sections.forEach(function(sec) {
      // Main section row
      var row = document.createElement('div');
      row.className = 'cfg-item-row';
      row.draggable = true;
      row.dataset.id = sec.id;

      // Expandable indicator for posts/cards
      var hasItems = (page === 'bacheca' && sec.id === 'posts') ||
                     (page === 'info'    && sec.id === 'cards');
      var expandBtn = hasItems
        ? '<button class="cfg-expand-btn" onclick="toggleCfgSubPanel(\'' + page + '\',\'' + sec.id + '\',this)" ' +
          'style="background:transparent;border:1px solid #333;color:#555;font-family:var(--mono);font-size:7px;' +
          'letter-spacing:1px;padding:3px 7px;cursor:pointer;border-radius:2px;flex-shrink:0">▶ ITEMS</button>'
        : '';

      row.innerHTML =
        '<span class="cfg-item-handle">⠿</span>' +
        '<span class="cfg-item-icon">' + sec.icon + '</span>' +
        '<span class="cfg-item-label">' + sec.label + '<small>' + sec.sublabel + '</small></span>' +
        expandBtn +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="checkbox"' +
        (sec.enabled ? ' checked' : '') +
        '><span class="cfg-toggle-slider"></span></label>';

      row.querySelector('input[type="checkbox"]').addEventListener('change', function() {
        sec.enabled = this.checked;
        saveConfig();
      });

      // Drag
      row.addEventListener('dragstart', function(e) {
        _cfgPageDragSrc = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        body.querySelectorAll('.cfg-item-row').forEach(function(r){ r.classList.remove('drag-over'); });
      });
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (_cfgPageDragSrc && _cfgPageDragSrc !== this) this.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
      row.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (!_cfgPageDragSrc || _cfgPageDragSrc === this) return;
        var srcId = _cfgPageDragSrc.dataset.id;
        var dstId = this.dataset.id;
        var arr = PAGE_SECTIONS[page];
        var fi = arr.findIndex(function(s){ return s.id === srcId; });
        var ti = arr.findIndex(function(s){ return s.id === dstId; });
        if (fi < 0 || ti < 0) return;
        arr.splice(ti, 0, arr.splice(fi, 1)[0]);
        saveConfig();
        renderRows();
      });

      if (insertBefore) body.insertBefore(row, insertBefore);
      else body.appendChild(row);
    });
  }

  renderRows();


}

// ── Sub-panel: gestione singoli item (bacheca posts / info cards) ──
var _cfgSubOpen = null; // { page, secId }

function toggleCfgSubPanel(page, secId, btn) {
  var body = document.getElementById('cfgPanelBody');
  var existing = body.querySelector('.cfg-sub-panel[data-sec="' + secId + '"]');
  if (existing) {
    existing.remove();
    btn.textContent = '▶ ITEMS';
    _cfgSubOpen = null;
    return;
  }
  // Close any open sub-panel
  body.querySelectorAll('.cfg-sub-panel').forEach(function(p){ p.remove(); });
  body.querySelectorAll('.cfg-expand-btn').forEach(function(b){ b.textContent = '▶ ITEMS'; });
  _cfgSubOpen = { page: page, secId: secId };
  btn.textContent = '▼ ITEMS';

  var arr = (page === 'info') ? INFO : BACHECA;

  var panel = document.createElement('div');
  panel.className = 'cfg-sub-panel';
  panel.dataset.sec = secId;
  panel.style.cssText = 'background:#0d0d0d;border:1px solid #1e1e1e;border-radius:3px;padding:10px 10px 6px;margin-bottom:6px';

  function renderSubRows() {
    panel.innerHTML = '';
    var subH = document.createElement('div');
    subH.style.cssText = 'font-family:var(--mono);font-size:7px;letter-spacing:3px;color:#444;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between';
    subH.innerHTML = '<span>// SINGOLI ITEM · TRASCINA · TOGGLE VISIBILITÀ</span>';
    panel.appendChild(subH);

    var _subDragSrc = null;

    arr.forEach(function(item, i) {
      var row = document.createElement('div');
      row.draggable = true;
      row.dataset.idx = i;
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 8px;background:var(--panel);' +
        'border:1px solid var(--border);border-radius:2px;margin-bottom:4px;cursor:grab;user-select:none;transition:border-color 0.15s';

      var label = item.icon
        ? item.icon + ' ' + (item.titolo || item.testo || '').substring(0, 28)
        : (item.titolo || item.testo || '').substring(0, 32);
      if ((item.titolo || item.testo || '').length > (item.icon ? 28 : 32)) label += '…';

      row.innerHTML =
        '<span style="color:#333;font-size:12px;flex-shrink:0">⠿</span>' +
        '<span style="font-family:var(--mono);font-size:8px;letter-spacing:1px;color:var(--light);flex:1;' +
        (item.hidden ? 'opacity:0.35;' : '') + '">' + label + '</span>' +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="checkbox"' +
        (!item.hidden ? ' checked' : '') +
        '><span class="cfg-toggle-slider"></span></label>';

      row.querySelector('input').addEventListener('change', function() {
        item.hidden = !this.checked;
        saveConfig();
        row.querySelector('span:nth-child(2)').style.opacity = item.hidden ? '0.35' : '';
      });

      // Drag for sub-rows
      row.addEventListener('dragstart', function(e) {
        _subDragSrc = this;
        this.style.opacity = '0.35';
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function() {
        this.style.opacity = '';
        panel.querySelectorAll('[data-idx]').forEach(function(r){ r.style.borderColor = ''; });
      });
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (_subDragSrc && _subDragSrc !== this) this.style.borderColor = 'var(--red)';
      });
      row.addEventListener('dragleave', function() { this.style.borderColor = ''; });
      row.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '';
        if (!_subDragSrc || _subDragSrc === this) return;
        var fi = parseInt(_subDragSrc.dataset.idx);
        var ti = parseInt(this.dataset.idx);
        arr.splice(ti, 0, arr.splice(fi, 1)[0]);
        saveConfig();
        renderSubRows();
      });

      panel.appendChild(row);
    });
  }

  renderSubRows();

  // Insert after the parent section row
  var parentRow = body.querySelector('.cfg-item-row[data-id="' + secId + '"]');
  if (parentRow && parentRow.nextSibling) {
    body.insertBefore(panel, parentRow.nextSibling);
  } else {
    var sep = body.querySelector('.cfg-section-sep');
    if (sep) body.insertBefore(panel, sep);
    else body.appendChild(panel);
  }
}

function salvaCfgPanel() {
  if (!_cfgPageCurrent) return;
  var page = _cfgPageCurrent;
  applyPageSections(page);
  // Rebuild item lists so hidden/order changes are reflected immediately
  if (page === 'bacheca') buildBacheca();
  if (page === 'info')    buildInfo();
  saveConfig();
  showToast(T_CFG_SAVED, 'success');
  addLog('ha configurato la pagina: ' + page.toUpperCase());
  closeCfgPanel();
}

function applyPageSections(page) {
  if (page === 'home')    applyHomeSections();
  if (page === 'bacheca') applyBachecaSections();
  if (page === 'info')    applyInfoSections();
}

// Map section id → DOM element id for each page
var PAGE_SECTION_ELS = {
  home: {
    nextEvent:   'homeSection_nextEvent',
    cal:         'homeSection_cal',
    search:      'homeSection_search',
    consigliati: 'homeSection_consigliati',
  },
  bacheca: {
    posts:        'bachecaSection_posts',
    links:        'bachecaSection_links',
    valutazioni:  'bachecaSection_valutazioni',
    suggerimenti: 'bachecaSection_suggerimenti',
  },
  info: {
    cards: 'infoSection_cards',
    links: 'infoSection_links',
  },
};

function applyHomeSections() {
  var scrollable = document.querySelector('#screenHome .scrollable');
  if (!scrollable) return;
  var map = PAGE_SECTION_ELS.home;
  PAGE_SECTIONS.home.forEach(function(sec) {
    var elId = map[sec.id];
    if (!elId) return;
    var el = document.getElementById(elId);
    if (el) el.style.display = sec.enabled ? '' : 'none';
  });
  // Reorder DOM
  PAGE_SECTIONS.home.forEach(function(sec) {
    var elId = map[sec.id];
    if (!elId) return;
    var el = document.getElementById(elId);
    if (el) scrollable.appendChild(el);
  });
}

function applyBachecaSections() {
  var scrollable = document.querySelector('#screenBacheca .scrollable');
  if (!scrollable) return;
  var map = PAGE_SECTION_ELS.bacheca;
  PAGE_SECTIONS.bacheca.forEach(function(sec) {
    var elId = map[sec.id];
    if (!elId) return;
    var el = document.getElementById(elId);
    if (el) {
      el.style.display = sec.enabled ? '' : 'none';
      scrollable.appendChild(el);
    }
  });
}

function applyInfoSections() {
  var scrollable = document.querySelector('#screenInfo .scrollable');
  if (!scrollable) return;
  var map = PAGE_SECTION_ELS.info;
  PAGE_SECTIONS.info.forEach(function(sec) {
    var elId = map[sec.id];
    if (!elId) return;
    var el = document.getElementById(elId);
    if (el) {
      el.style.display = sec.enabled ? '' : 'none';
      scrollable.appendChild(el);
    }
  });
}
