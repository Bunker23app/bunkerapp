// ════════════════════════════════════════════════════════════════
// CONFIGURATORE.JS v2.2 — Admin panel, widget, sezioni, permessi pagine
// ════════════════════════════════════════════════════════════════

// ── Dati di default ──────────────────────────────────────────────

var WIDGET_CONFIG = [
  { id:'calendario', icon:'📅', label:'EVENTI',      enabled:true },
  { id:'spesa',      icon:'🛒', label:'LISTA SPESA', enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true },
  { id:'magazzino',  icon:'📦', label:'MAGAZZINO',   enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:true },
  { id:'chat',       icon:'💬', label:'MESSAGGI',    enabled:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true },
  { id:'log',        icon:'📋', label:'LOG EVENTI',  enabled:true, adminOnly:true },
];

var TAB_CONFIG = [
  { id:'calendario', icon:'📅', label:'CALENDARIO', enabled:true },
  { id:'spesa',      icon:'🛒', label:'SPESA',       enabled:true },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true },
  { id:'magazzino',  icon:'📦', label:'MAGAZZINO',   enabled:true },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:true },
  { id:'chat',       icon:'💬', label:'CHAT',        enabled:true },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true },
  { id:'log',        icon:'📋', label:'LOG',         enabled:true, adminOnly:true },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true },
];

var AIUTANTE_WIDGET_CONFIG = [
  { id:'calendario', icon:'📅', label:'EVENTI',      enabled:true  },
  { id:'spesa',      icon:'🛒', label:'LISTA SPESA', enabled:true  },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true  },
  { id:'magazzino',  icon:'📦', label:'MAGAZZINO',   enabled:true  },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:false },
  { id:'chat',       icon:'💬', label:'MESSAGGI',    enabled:true  },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true  },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true  },
];

var AIUTANTE_TAB_CONFIG = [
  { id:'calendario', icon:'📅', label:'CALENDARIO', enabled:true  },
  { id:'spesa',      icon:'🛒', label:'SPESA',       enabled:true  },
  { id:'lavori',     icon:'✓',  label:'LAVORI',      enabled:true  },
  { id:'magazzino',  icon:'📦', label:'MAGAZZINO',   enabled:true  },
  { id:'pagamenti',  icon:'💳', label:'PAGAMENTI',   enabled:false },
  { id:'chat',       icon:'💬', label:'CHAT',        enabled:true  },
  { id:'cerca',      icon:'🔍', label:'CERCA',       enabled:true  },
  { id:'profilo',    icon:'👤', label:'PROFILO',     enabled:true  },
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

// ── Struttura sezioni pagine pubbliche ───────────────────────────

var PAGE_SECTIONS = {
  home: [
    { id:'cal',          icon:'📅', label:'CALENDARIO',         sublabel:'calendario eventi pubblico',        enabled:true },
    { id:'consigliati',  icon:'⭐', label:'EVENTI CONSIGLIATI', sublabel:'prossimo evento in evidenza',        enabled:true },
    { id:'nextEvent',    icon:'🔔', label:'PROSSIMO EVENTO',    sublabel:'banner prossimo evento',             enabled:true },
    { id:'search',       icon:'🔍', label:'CERCA EVENTI',       sublabel:'barra di ricerca pubblica',          enabled:true },
  ],
  bacheca: [
    { id:'posts',        icon:'📢', label:'COMUNICAZIONI',      sublabel:'post bacheca · tocca per gestire',   enabled:true },
    { id:'links',        icon:'🔗', label:'LINK UTILI',         sublabel:'link e risorse esterne',             enabled:true },
    { id:'valutazioni',  icon:'★',  label:'VALUTAZIONI',        sublabel:'form e lista valutazioni',           enabled:true },
    { id:'suggerimenti', icon:'💬', label:'SUGGERIMENTI',       sublabel:'form suggerimenti anonimi',          enabled:true },
  ],
  info: [
    { id:'cards',        icon:'📋', label:'SCHEDE INFO',        sublabel:'schede informative · tocca per gestire', enabled:true },
    { id:'links',        icon:'🔗', label:'LINK UTILI',         sublabel:'link e risorse esterne',             enabled:true },
  ],
};

// Map sezione id → id elemento DOM
var PAGE_SECTION_ELS = {
  home:    { cal:'homeSection_cal', consigliati:'homeSection_consigliati', nextEvent:'homeSection_nextEvent', search:'homeSection_search' },
  bacheca: { posts:'bachecaSection_posts', links:'bachecaSection_links', valutazioni:'bachecaSection_valutazioni', suggerimenti:'bachecaSection_suggerimenti' },
  info:    { cards:'infoSection_cards', links:'infoSection_links' },
};

// Chi può modificare ogni pagina: 'admin' | 'staff' | 'aiutante'
var PAGE_EDIT_PERMS = { home:'admin', bacheca:'admin', info:'admin' };

// ── Stato drag locale ────────────────────────────────────────────

var _cfgDragSrc     = null;   // drag widget admin tab
var _cfgPageCurrent = null;   // pagina aperta nel pannello cfg
var _cfgPageDragSrc = null;   // drag sezioni pagina
var _cfgSubOpen     = null;   // { page, secId }

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

// Applica drag & drop a un container con figli [data-idx] o [data-id]
// onDrop(fromIdx, toIdx) viene chiamato dopo ogni drop
function _attachDrag(container, getDragRows, swapFn, idxKey) {
  idxKey = idxKey || 'idx';
  var src = null;
  function rows() { return container.querySelectorAll('.cfg-drag-row, .cfg-item-row'); }

  container.addEventListener('dragstart', function(e) {
    var row = e.target.closest('[data-' + idxKey + '], [draggable]');
    if (!row) return;
    src = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  container.addEventListener('dragend', function() {
    rows().forEach(function(r){ r.classList.remove('dragging','drag-over'); });
    src = null;
  });
  container.addEventListener('dragover', function(e) {
    var row = e.target.closest('[data-' + idxKey + '], [draggable]');
    if (!row || row === src) return;
    e.preventDefault();
    rows().forEach(function(r){ r.classList.remove('drag-over'); });
    row.classList.add('drag-over');
  });
  container.addEventListener('dragleave', function(e) {
    var row = e.target.closest('[data-' + idxKey + '], [draggable]');
    if (row) row.classList.remove('drag-over');
  });
  container.addEventListener('drop', function(e) {
    var row = e.target.closest('[data-' + idxKey + '], [draggable]');
    if (!row || !src || row === src) return;
    e.preventDefault();
    row.classList.remove('drag-over');
    swapFn(src, row);
  });
}

// Crea una riga cfg-toggle semplice (per aiutante, sub-items)
function _makeCfgToggleRow(labelHtml, checked, onChange) {
  var row = document.createElement('div');
  row.className = 'cfg-toggle-row';
  row.innerHTML =
    '<div><div class="cfg-toggle-label">' + labelHtml + '</div></div>' +
    '<label class="cfg-toggle"><input type="checkbox"' + (checked ? ' checked' : '') +
    '><span class="cfg-toggle-slider"></span></label>';
  row.querySelector('input').addEventListener('change', function(){ onChange(this.checked); });
  return row;
}

// ════════════════════════════════════════════════════════════════
// TESTI APPLICAZIONE LIVE
// ════════════════════════════════════════════════════════════════

function applyBenvenuto() {
  var el = document.getElementById('staffBenvenutoMsg');
  if (!el) return;
  el.textContent    = BENVENUTO_TEXT;
  el.style.display  = BENVENUTO_TEXT.trim() ? 'block' : 'none';
}

function applySplashTexts() {
  var b = document.getElementById('splashBadgeEl');
  var t = document.getElementById('splashTaglineEl');
  if (b) b.textContent = SPLASH_TEXTS.badge   || 'LOVE IS A WORLD INSIDE THE MUSIC';
  if (t) t.textContent = SPLASH_TEXTS.tagline || 'Disco Storia     ·     Techno     ·     HardStyle';
}

function applyGuestMessage() {
  var els = { tag:'guestMsgTag', main:'guestMsgMain', sub:'guestMsgSub' };
  var map  = { tag:'// ', main:'', sub:'' };
  Object.keys(els).forEach(function(k) {
    var el = document.getElementById(els[k]);
    if (el) el.textContent = map[k] + (GUEST_MESSAGE[k] || '');
  });
}

// ════════════════════════════════════════════════════════════════
// WIDGET CONFIG — tab admin Configura
// ════════════════════════════════════════════════════════════════

function buildConfigura() {
  if (!isAdmin()) return;

  // ── Widget list (draggable) ──
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
        '<input class="cfg-label-input" type="text" value="' + w.label + '" maxlength="16"' +
        ' style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--light);' +
        'background:transparent;border:none;border-bottom:1px solid #2a2a2a;outline:none;' +
        'flex:1;min-width:0;padding:2px 4px;text-transform:uppercase">' +
        (w.adminOnly ? '<span style="color:#555;font-size:7px;font-family:var(--mono);flex-shrink:0">ADMIN</span>' : '') +
        '<label class="cfg-toggle"><input type="checkbox"' + (w.enabled ? ' checked' : '') +
        '><span class="cfg-toggle-slider"></span></label>';

      row.querySelector('.cfg-label-input').addEventListener('change', function() {
        var lbl = this.value.toUpperCase();
        w.label = lbl;
        syncWidgetLabel(w.id, lbl);
        saveConfig();
      });
      row.querySelector('input[type="checkbox"]').addEventListener('change', function() {
        syncWidgetTabEnabled(w.id, this.checked);
        saveConfig();
      });
      wList.appendChild(row);
    });

    // Drag sul container
    _attachDrag(wList, null, function(srcRow, dstRow) {
      var fi = parseInt(srcRow.dataset.idx);
      var ti = parseInt(dstRow.dataset.idx);
      WIDGET_CONFIG.splice(ti, 0, WIDGET_CONFIG.splice(fi, 1)[0]);
      saveConfig();
      buildConfigura();
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
  _cfgSetVal('cfgGuestTag',  GUEST_MESSAGE.tag);
  _cfgSetVal('cfgGuestMain', GUEST_MESSAGE.main);
  _cfgSetVal('cfgGuestSub',  GUEST_MESSAGE.sub);

  // ── Testi Splash ──
  _cfgSetVal('cfgSplashBadge',    SPLASH_TEXTS.badge);
  _cfgSetVal('cfgSplashTagline',  SPLASH_TEXTS.tagline);

  // ── Vista Aiutante ──
  var awList = document.getElementById('cfgAiutanteWidgetList');
  if (awList) {
    awList.innerHTML = '';
    AIUTANTE_WIDGET_CONFIG.forEach(function(w) {
      awList.appendChild(_makeCfgToggleRow(w.icon + ' ' + w.label, w.enabled, function(val) {
        syncAiutanteEnabled(w.id, val);
        saveConfig();
      }));
    });
  }

  // ── Permessi pagine ──
  var ppList = document.getElementById('cfgPermPagine');
  if (ppList) buildPermPagine(ppList);
}

function _cfgSetVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val || '';
}

// ════════════════════════════════════════════════════════════════
// SALVA — azioni del pannello admin
// ════════════════════════════════════════════════════════════════

function salvaConfigura() {
  if (!isAdmin()) return;
  BENVENUTO_TEXT = (_getVal('cfgBenvenuto') || BENVENUTO_TEXT);
  applyWidgetConfig();
  applyTabConfig();
  applyBenvenuto();
  saveConfig();
  showToast('// CONFIGURAZIONE SALVATA ✓', 'success');
  addLog('ha aggiornato la configurazione staff');
}

function salvaConfiguraAiutante() {
  if (!isAdmin()) return;
  applyAiutanteConfig();
  saveConfig();
  showToast('// VISTA AIUTANTE SALVATA ✓', 'success');
  addLog('ha aggiornato la configurazione aiutante');
}

function salvaSplashTexts() {
  SPLASH_TEXTS.badge   = _getVal('cfgSplashBadge')   || 'LOVE IS A WORLD INSIDE THE MUSIC';
  SPLASH_TEXTS.tagline = _getVal('cfgSplashTagline')  || 'Disco Storia     ·     Techno     ·     HardStyle';
  applySplashTexts();
  saveConfig();
  showToast('// TESTI SPLASH SALVATI ✓', 'success');
  addLog('ha aggiornato i testi della splash');
}

function salvaGuestMessage() {
  GUEST_MESSAGE.tag  = (_getVal('cfgGuestTag')  || 'ACCESSO LIMITATO').toUpperCase().trim();
  GUEST_MESSAGE.main =  _getVal('cfgGuestMain') || 'Vuoi accedere a tutte le aree?';
  GUEST_MESSAGE.sub  =  _getVal('cfgGuestSub')  || 'Contatta gli amministratori';
  applyGuestMessage();
  saveConfig();
  showToast('// MESSAGGIO SALVATO ✓', 'success');
  addLog('ha aggiornato il messaggio ospite');
}

function salvaPermPagine() {
  if (!isAdmin()) return;
  updatePageCfgBtns();
  saveConfig();
  showToast('// PERMESSI SALVATI ✓', 'success');
  addLog('ha aggiornato i permessi delle pagine pubbliche');
}

function _getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ════════════════════════════════════════════════════════════════
// APPLY — propagazione config al DOM
// ════════════════════════════════════════════════════════════════

function applyWidgetConfig() {
  applyWidgetConfigForRole(currentUser ? currentUser.role : 'staff');
}

function applyWidgetConfigForRole(role) {
  var config = (role === ROLES.AIUTANTE) ? AIUTANTE_WIDGET_CONFIG : WIDGET_CONFIG;
  var grid   = document.querySelector('#tab-dashboard .dash-grid');
  if (!grid) return;

  // Raccoglie widget esistenti indicizzati per id
  var existing = {};
  grid.querySelectorAll('.dash-widget').forEach(function(el) {
    var m = (el.getAttribute('onclick') || '').match(/showTab\('([^']+)'\)/);
    if (m) existing[m[1]] = el;
  });
  Array.from(grid.querySelectorAll('.dash-widget')).forEach(function(el){ el.remove(); });

  // Riappende nell'ordine configurato
  config.forEach(function(w) {
    var el = existing[w.id];
    if (!el) return;
    if (!el.classList.contains('admin-only')) el.style.display = w.enabled ? '' : 'none';
    grid.appendChild(el);
  });

  // Admin-only sempre in coda (visibilità via CSS .is-admin)
  ['log','configura'].forEach(function(id) {
    var el = existing[id] ||
             document.querySelector('#tab-dashboard .dash-widget[onclick*="showTab(\'' + id + '\')"]');
    if (el) { el.style.removeProperty('display'); grid.appendChild(el); }
  });

  applyWidgetLabels();
}

function applyWidgetLabels() {
  WIDGET_CONFIG.forEach(function(w) {
    var el = document.getElementById('wlabel-' + w.id);
    if (el) el.textContent = w.label;
  });
}

function applyTabConfig() {
  applyTabConfigForRole(currentUser ? currentUser.role : 'staff');
}

function applyTabConfigForRole(role) {
  var config = (role === ROLES.AIUTANTE) ? AIUTANTE_TAB_CONFIG : TAB_CONFIG;
  config.forEach(function(t) {
    var el = document.getElementById('tab-' + t.id);
    if (el) el.dataset.cfgDisabled = t.enabled ? '' : '1';
  });
}

function applyAiutanteConfig() {
  if (!currentUser || currentUser.role !== ROLES.AIUTANTE) return;
  applyWidgetConfigForRole('aiutante');
  applyTabConfigForRole('aiutante');
}

// ════════════════════════════════════════════════════════════════
// SYNC — aggiornamento sincrono tra widget e tab
// ════════════════════════════════════════════════════════════════

function syncWidgetTabEnabled(id, enabled) {
  _findById(WIDGET_CONFIG, id, function(w){ w.enabled = enabled; });
  _findById(TAB_CONFIG,    id, function(t){ t.enabled = enabled; });
}

function syncAiutanteEnabled(id, enabled) {
  _findById(AIUTANTE_WIDGET_CONFIG, id, function(w){ w.enabled = enabled; });
  _findById(AIUTANTE_TAB_CONFIG,    id, function(t){ t.enabled = enabled; });
}

function syncWidgetLabel(id, label) {
  _findById(AIUTANTE_WIDGET_CONFIG, id, function(w){ w.label = label; });
  var el = document.getElementById('wlabel-' + id);
  if (el) el.textContent = label;
}

function _findById(arr, id, fn) {
  var item = arr.find(function(x){ return x.id === id; });
  if (item) fn(item);
}

// ════════════════════════════════════════════════════════════════
// PERMESSI PAGINE
// ════════════════════════════════════════════════════════════════

function buildPermPagine(container) {
  container.innerHTML = '';
  var pages      = [{ id:'home', label:'HOME' }, { id:'bacheca', label:'BACHECA' }, { id:'info', label:'INFO' }];
  var permLabels = { admin:'Solo Admin', staff:'Staff+', aiutante:'Aiutante+' };

  pages.forEach(function(p) {
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#777;margin:10px 0 4px';
    hdr.textContent   = '// ' + p.label;
    container.appendChild(hdr);

    [ROLES.ADMIN, ROLES.STAFF, ROLES.AIUTANTE].forEach(function(perm) {
      var row = document.createElement('div');
      row.className = 'cfg-perm-row';
      row.innerHTML =
        '<span class="cfg-perm-label">' + permLabels[perm] + '</span>' +
        '<label class="cfg-toggle" style="flex-shrink:0">' +
        '<input type="radio" name="cfgPermPage_' + p.id + '" value="' + perm + '"' +
        (PAGE_EDIT_PERMS[p.id] === perm ? ' checked' : '') + '>' +
        '<span class="cfg-toggle-slider"></span></label>';
      row.querySelector('input').addEventListener('change', function() {
        PAGE_EDIT_PERMS[p.id] = this.value;
      });
      container.appendChild(row);
    });
  });
}

function canEditPage(page) {
  if (!currentUser) return false;
  var req = PAGE_EDIT_PERMS[page] || ROLES.ADMIN;
  return hasRole(req);
}

function updatePageCfgBtns() {
  ['home','bacheca','info'].forEach(function(page) {
    var btn = document.getElementById(page + 'CfgBtn');
    if (!btn) return;
    btn.classList.toggle('visible', canEditPage(page));
  });
}

// ════════════════════════════════════════════════════════════════
// PANNELLO CONFIGURA PAGINE (slide-in)
// ════════════════════════════════════════════════════════════════

var PAGE_TITLES = { home:'HOME', bacheca:'BACHECA', info:'INFO' };

function openCfgPanel(page) {
  if (!canEditPage(page)) return;
  _cfgPageCurrent = page;
  document.getElementById('cfgPanelTitle').textContent = '⚙ CONFIGURA · ' + (PAGE_TITLES[page] || page);
  buildCfgPanelBody(page);
  document.getElementById('cfgOverlay').classList.add('open');
  document.getElementById('cfgPanel').classList.add('open');
}

function closeCfgPanel() {
  document.getElementById('cfgOverlay').classList.remove('open');
  document.getElementById('cfgPanel').classList.remove('open');
  _cfgPageCurrent = null;
}

function salvaCfgPanel() {
  if (!_cfgPageCurrent) return;
  applyPageSections(_cfgPageCurrent);
  if (_cfgPageCurrent === 'bacheca') buildBacheca();
  if (_cfgPageCurrent === 'info')    buildInfo();
  saveConfig();
  showToast('// CONFIGURAZIONE SALVATA ✓', 'success');
  addLog('ha configurato la pagina: ' + _cfgPageCurrent.toUpperCase());
  closeCfgPanel();
}

// ── Builder corpo pannello ───────────────────────────────────────

function buildCfgPanelBody(page) {
  var body     = document.getElementById('cfgPanelBody');
  body.innerHTML = '';
  var sections = PAGE_SECTIONS[page];

  var hdr = document.createElement('div');
  hdr.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px';
  hdr.textContent   = '// SEZIONI · TRASCINA PER RIORDINARE';
  body.appendChild(hdr);

  function renderRows() {
    body.querySelectorAll('.cfg-item-row, .cfg-sub-panel').forEach(function(r){ r.remove(); });

    sections.forEach(function(sec) {
      var hasItems = (page === 'bacheca' && sec.id === 'posts') ||
                     (page === 'info'    && sec.id === 'cards');
      var row = document.createElement('div');
      row.className = 'cfg-item-row';
      row.draggable = true;
      row.dataset.id = sec.id;
      row.innerHTML =
        '<span class="cfg-item-handle">⠿</span>' +
        '<span class="cfg-item-icon">' + sec.icon + '</span>' +
        '<span class="cfg-item-label">' + sec.label + '<small>' + sec.sublabel + '</small></span>' +
        (hasItems
          ? '<button class="cfg-expand-btn" style="background:transparent;border:1px solid #333;color:#555;' +
            'font-family:var(--mono);font-size:7px;letter-spacing:1px;padding:3px 7px;cursor:pointer;' +
            'border-radius:2px;flex-shrink:0">▶ ITEMS</button>'
          : '') +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="checkbox"' +
        (sec.enabled ? ' checked' : '') + '><span class="cfg-toggle-slider"></span></label>';

      row.querySelector('input[type="checkbox"]').addEventListener('change', function() {
        sec.enabled = this.checked;
        saveConfig();
      });
      if (hasItems) {
        row.querySelector('.cfg-expand-btn').addEventListener('click', function() {
          toggleCfgSubPanel(page, sec.id, this);
        });
      }
      body.appendChild(row);
    });

    // Drag sezioni
    _attachDrag(body, null, function(srcRow, dstRow) {
      var fi = sections.findIndex(function(s){ return s.id === srcRow.dataset.id; });
      var ti = sections.findIndex(function(s){ return s.id === dstRow.dataset.id; });
      if (fi < 0 || ti < 0) return;
      sections.splice(ti, 0, sections.splice(fi, 1)[0]);
      saveConfig();
      renderRows();
    }, 'id');
  }

  renderRows();
}

// ── Sub-panel: singoli item (post bacheca / schede info) ─────────

function toggleCfgSubPanel(page, secId, btn) {
  var body     = document.getElementById('cfgPanelBody');
  var existing = body.querySelector('.cfg-sub-panel[data-sec="' + secId + '"]');
  if (existing) {
    existing.remove();
    btn.textContent = '▶ ITEMS';
    _cfgSubOpen = null;
    return;
  }
  body.querySelectorAll('.cfg-sub-panel').forEach(function(p){ p.remove(); });
  body.querySelectorAll('.cfg-expand-btn').forEach(function(b){ b.textContent = '▶ ITEMS'; });
  btn.textContent = '▼ ITEMS';
  _cfgSubOpen = { page:page, secId:secId };

  var arr   = (page === 'info') ? INFO : BACHECA;
  var panel = document.createElement('div');
  panel.className     = 'cfg-sub-panel';
  panel.dataset.sec   = secId;
  panel.style.cssText = 'background:#0d0d0d;border:1px solid #1e1e1e;border-radius:3px;padding:10px 10px 6px;margin-bottom:6px';

  function renderSubRows() {
    panel.innerHTML = '';
    var subHdr = document.createElement('div');
    subHdr.style.cssText = 'font-family:var(--mono);font-size:7px;letter-spacing:3px;color:#444;margin-bottom:8px';
    subHdr.textContent   = '// SINGOLI ITEM · TRASCINA · TOGGLE VISIBILITÀ';
    panel.appendChild(subHdr);

    arr.forEach(function(item, i) {
      var label = (item.icon ? item.icon + ' ' : '') + (item.titolo || item.testo || '').substring(0, item.icon ? 28 : 32);
      if ((item.titolo || item.testo || '').length > (item.icon ? 28 : 32)) label += '…';

      var row = document.createElement('div');
      row.draggable = true;
      row.dataset.idx = i;
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 8px;background:var(--panel);' +
        'border:1px solid var(--border);border-radius:2px;margin-bottom:4px;cursor:grab;user-select:none;transition:border-color 0.15s';
      row.innerHTML =
        '<span style="color:#333;font-size:12px;flex-shrink:0">⠿</span>' +
        '<span style="font-family:var(--mono);font-size:8px;letter-spacing:1px;color:var(--light);flex:1;' +
        (item.hidden ? 'opacity:0.35' : '') + '">' + label + '</span>' +
        '<label class="cfg-toggle" style="flex-shrink:0"><input type="checkbox"' +
        (!item.hidden ? ' checked' : '') + '><span class="cfg-toggle-slider"></span></label>';

      var textEl = row.querySelector('span:nth-child(2)');
      row.querySelector('input').addEventListener('change', function() {
        item.hidden = !this.checked;
        textEl.style.opacity = item.hidden ? '0.35' : '';
        saveConfig();
      });
      panel.appendChild(row);
    });

    // Drag sub-items
    _attachDrag(panel, null, function(srcRow, dstRow) {
      var fi = parseInt(srcRow.dataset.idx);
      var ti = parseInt(dstRow.dataset.idx);
      arr.splice(ti, 0, arr.splice(fi, 1)[0]);
      saveConfig();
      renderSubRows();
    });
  }

  renderSubRows();

  var parentRow = body.querySelector('.cfg-item-row[data-id="' + secId + '"]');
  if (parentRow && parentRow.nextSibling) body.insertBefore(panel, parentRow.nextSibling);
  else body.appendChild(panel);
}

// ════════════════════════════════════════════════════════════════
// APPLY SEZIONI — aggiorna il DOM delle pagine pubbliche
// ════════════════════════════════════════════════════════════════

function applyPageSections(page) {
  var scrollable = document.querySelector('#screen' + page.charAt(0).toUpperCase() + page.slice(1) + ' .scrollable');
  if (!scrollable) return;
  var map = PAGE_SECTION_ELS[page];
  PAGE_SECTIONS[page].forEach(function(sec) {
    var el = document.getElementById(map[sec.id]);
    if (!el) return;
    el.style.display = sec.enabled ? '' : 'none';
    scrollable.appendChild(el); // riordina
  });
}

// Alias nominali per compatibilità con eventuali chiamate esterne
function applyHomeSections()    { applyPageSections('home');    }
function applyBachecaSections() { applyPageSections('bacheca'); }
function applyInfoSections()    { applyPageSections('info');    }

// ════════════════════════════════════════════════════════════════
// GESTIONE MEMBRI (admin)
// ════════════════════════════════════════════════════════════════

var COLORS = ['#cc2200','#1a6b3c','#1a3a7a','#6b1a6b','#7a4a1a','#2a6b6b','#5a5a1a','#4a2a6b','#6b4a2a','#1a5a5a'];

function openNuovoMembroModal() {
  if (!isAdmin()) return;
  $id('modalTitle').textContent = 'NUOVO MEMBRO';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="mNomeAcc" type="text" placeholder="Nome"/></div>' +
    '<div><label class="modal-label">// PASSWORD</label>' +
    '<input class="modal-input" id="mPwAcc" type="text" placeholder="Password iniziale"/></div>' +
    '<div><label class="modal-label">// RUOLO</label>' +
    _ruoloSelect('mRuoloAcc', null) + '</div>';

  window._modalCb = async function() {
    var nome  = document.getElementById('mNomeAcc').value.trim();
    var pw    = document.getElementById('mPwAcc').value.trim();
    var ruolo = document.getElementById('mRuoloAcc').value;
    if (!nome || !pw) return;
    MEMBERS.push({ name:nome, initial:nome.charAt(0).toUpperCase(), color:COLORS[MEMBERS.length % COLORS.length], password:await sha256(pw), role:ruolo });
    saveMembers();
    addLog('ha creato account: ' + nome);
    buildMembriList();
    closeModal();
  };
  openModal();
}

function openEditMembroModal(i) {
  if (!isAdmin()) return;
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
    _ruoloSelect('mRuoloAcc', m.role) + '</div>' +
    '<div style="margin-top:12px;padding:10px;border:1px solid ' + (m.sospeso ? '#cc2200' : '#333') + ';border-radius:3px;background:' + (m.sospeso ? 'rgba(204,34,0,0.08)' : 'transparent') + '">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
    '<input type="checkbox" id="mSospeso"' + (m.sospeso ? ' checked' : '') + ' style="width:16px;height:16px;cursor:pointer"/>' +
    '<span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:' + (m.sospeso ? '#cc2200' : '#888') + '">ACCOUNT SOSPESO</span>' +
    '</label></div>';

  setTimeout(function() {
    _attachFotoButtons(i);
  }, 50);

  window._modalCb = function() {
    var nome    = document.getElementById('mNomeAcc').value.trim() || m.name;
    var pw      = document.getElementById('mPwAcc').value.trim();
    var ruolo   = document.getElementById('mRuoloAcc').value;
    var sospeso = document.getElementById('mSospeso').checked;
    MEMBERS[i].name    = nome;
    MEMBERS[i].initial = nome.charAt(0).toUpperCase();
    MEMBERS[i].role    = ruolo;
    MEMBERS[i].sospeso = sospeso;
    if (pw) sha256(pw).then(function(h){ MEMBERS[i].password = h; saveMembers(); });
    addLog('ha modificato account: ' + nome + (sospeso ? ' [SOSPESO]' : ''));
    saveMembers();
    buildMembriList();
    closeModal();
  };
  openModal();
}

function rimuoviMembro(i) {
  if (!isAdmin()) return;
  var nome = MEMBERS[i].name;
  if (nome === currentUser.name) return;
  showConfirm('Rimuovere l\'account di ' + nome + '? L\'operazione è irreversibile.', async function() {
    addLog('ha rimosso account: ' + nome);
    if (_sbReady) {
      try { await getSupabase().from('members').delete().eq('name', nome); } catch(e) {}
    }
    MEMBERS.splice(i, 1);
    saveMembers();
    buildMembriList();
    showToast('// ACCOUNT RIMOSSO', 'error');
  }, 'RIMUOVI ACCOUNT', 'RIMUOVI');
}

// ── Helper: select ruolo ─────────────────────────────────────────
function _ruoloSelect(id, selected) {
  var opts = [
    [ROLES.UTENTE,   'Lv.1 · Utente'],
    [ROLES.PREMIUM,  'Lv.2 · Premium'],
    [ROLES.AIUTANTE, 'Lv.3 · Aiutante'],
    [ROLES.STAFF,    'Lv.4 · Staff'],
    [ROLES.ADMIN,    'Lv.5 · Admin'],
  ];
  return '<select class="modal-input" id="' + id + '">' +
    opts.map(function(o){
      return '<option value="' + o[0] + '"' + (selected === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') +
  '</select>';
}

// ── Gestione foto membro nel modal ───────────────────────────────
function _attachFotoButtons(memberIdx) {
  var mfBtn = document.getElementById('memFotoBtn');
  if (mfBtn) {
    mfBtn.onclick = function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        compressAndSavePhoto(inp.files[0], function(b64) {
          MEMBERS[memberIdx].photo = b64;
          var av = document.getElementById('memAvatar');
          if (av) { av.style.background = 'transparent'; av.innerHTML = '<img src="' + b64 + '" style="width:100%;height:100%;object-fit:cover;display:block"/>'; }
          var delBtn = document.getElementById('memDelFotoBtn');
          if (!delBtn) {
            delBtn = document.createElement('button');
            delBtn.id = 'memDelFotoBtn'; delBtn.title = 'Elimina foto';
            delBtn.style.cssText = 'position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#1a0000;border:1px solid #cc2200;color:#cc2200;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0';
            delBtn.textContent = '✕';
            mfBtn.parentNode.appendChild(delBtn);
          }
          _attachDelFoto(delBtn, memberIdx);
          saveMembers(); buildMembriList();
        });
      };
      inp.click();
    };
  }
  var mDelBtn = document.getElementById('memDelFotoBtn');
  if (mDelBtn) _attachDelFoto(mDelBtn, memberIdx);
}

function _attachDelFoto(btn, memberIdx) {
  btn.onclick = function() {
    MEMBERS[memberIdx].photo = null;
    var av = document.getElementById('memAvatar');
    if (av) { av.style.background = MEMBERS[memberIdx].color; av.innerHTML = MEMBERS[memberIdx].initial; }
    btn.remove();
    saveMembers(); buildMembriList();
  };
}
