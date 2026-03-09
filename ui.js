// ════════════════════════════════════════════════════════════════════════════
// ui.js — Bunker23 · Rendering, Calendario, Chat, Spesa, Magazzino,
//          Pagamenti, Log, Bacheca, Info, Modali, Navigazione, Toast
// ════════════════════════════════════════════════════════════════════════════

'use strict';

// ── $id, nl2br, nowStr, tag sono definiti in data.js (caricato prima) ──

// ════════════════════════════════════════
// AVATAR
// ════════════════════════════════════════

function renderAvatar(el, member) {
  if (!el || !member) return;
  if (member.photo) {
    el.style.background = 'transparent';
    el.innerHTML = '<img src="' + member.photo +
      '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block"/>';
  } else {
    el.style.background = member.color;
    el.innerHTML = member.initial;
  }
}

function avatarHtml(member, size) {
  size = size || 28;
  var s = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;flex-shrink:0;' +
          'display:flex;align-items:center;justify-content:center;font-family:var(--mono);' +
          'font-size:' + Math.round(size*0.4) + 'px;color:#fff;overflow:hidden;';
  if (!member) {
    return '<div style="' + s + 'background:#333"></div>';
  }
  if (member.photo) {
    return '<div style="' + s + 'background:transparent">' +
           '<img src="' + member.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/>' +
           '</div>';
  }
  return '<div style="' + s + 'background:' + member.color + '">' + member.initial + '</div>';
}

// ════════════════════════════════════════
// CLOCK
// ════════════════════════════════════════

function updateClocks() {
  var now = new Date();
  var t = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  document.querySelectorAll('.clock').forEach(function(el) { el.textContent = t; });
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════

var _toastTimer = null;

function showToast(msg, type, duration) {
  var t = $id('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth; // force reflow
  t.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { t.classList.remove('show'); }, duration || 2200);
}

// ════════════════════════════════════════
// CONFIRM DIALOG
// ════════════════════════════════════════

var _confirmCb = null;

function showConfirm(msg, onConfirm, title, okLabel) {
  $id('confirmMsg').textContent = msg;
  $id('confirmTitle').textContent = title || 'CONFERMA ELIMINAZIONE';
  $id('confirmOkBtn').textContent = okLabel || 'ELIMINA';
  _confirmCb = onConfirm;
  $id('confirmOverlay').classList.add('open');
}

function closeConfirm(confirmed) {
  $id('confirmOverlay').classList.remove('open');
  if (confirmed && _confirmCb) _confirmCb();
  _confirmCb = null;
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

function flashModalSave() {
  var footer = document.querySelector('#modalOverlay .modal-footer');
  if (!footer) return;
  var btn = footer.querySelector('.modal-btn-confirm');
  if (!btn) return;
  var orig = btn.textContent;
  btn.textContent = '✓ SALVATO';
  btn.style.background  = 'var(--green)';
  btn.style.borderColor = 'var(--green)';
  btn.style.color = '#000';
  setTimeout(function() {
    btn.textContent = orig;
    btn.style.background = btn.style.borderColor = btn.style.color = '';
  }, 600);
}

function modalConfirmWithFeedback() {
  if (window._modalCb) {
    flashModalSave();
    setTimeout(function() {
      if (window._modalCb) window._modalCb();
    }, MS_ANIM);
  }
}

// ════════════════════════════════════════
// LIGHTBOX
// ════════════════════════════════════════

function openLightbox(src) {
  $id('lightboxImg').src = src;
  $id('lightbox').classList.add('open');
}

function closeLightbox() {
  $id('lightbox').classList.remove('open');
  $id('lightboxImg').src = '';
}

// ════════════════════════════════════════
// NAVIGAZIONE
// ════════════════════════════════════════

var _navHistory = [];

function navigate(id, fromPopstate) {
  var isGuest = guestMode && !currentUser;
  if (isGuest && (id === 'screenBacheca' || id === 'screenInfo')) id = 'screenHome';

  var current = document.querySelector('.screen.active');
  var next    = document.getElementById(id);
  if (!next || current === next) return;

  if (!fromPopstate) {
    var currentId = current ? current.id : null;
    if (currentId) _navHistory.push(currentId);
    history.pushState({ screen: id, histLen: _navHistory.length }, '', '');
  }

  if (current) {
    current.classList.add('slide-out');
    setTimeout(function() { current.classList.remove('active', 'slide-out'); }, 220);
  }

  setTimeout(function() {
    next.classList.add('active');
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    var scrollable = next.querySelector('.scrollable');
    if (scrollable) scrollable.scrollTop = 0;
  }, 60);

  updateLogoutBtns();
  updateStaffNavBtns();
  updateHomeAccessLevel();
}

window.addEventListener('popstate', function() {
  var activeScreen = document.querySelector('.screen.active');
  var activeId     = activeScreen ? activeScreen.id : null;

  if (activeId === 'screenStaff') {
    if (_currentTab !== 'dashboard') {
      showTab('dashboard');
    } else {
      navigate(_navHistory.length > 0 ? _navHistory.pop() : 'screenHome', true);
    }
    history.pushState({}, '', '');
    return;
  }

  if (_navHistory.length > 0) {
    navigate(_navHistory.pop(), true);
  } else {
    history.pushState({}, '', '');
  }
});

history.replaceState({ screen: 'screenSplash' }, '', '');

// ════════════════════════════════════════
// SWIPE (schermate pubbliche)
// ════════════════════════════════════════

function initSwipe() {
  var PUBLIC_SCREENS = ['screenHome', 'screenBacheca', 'screenInfo'];
  var startX = 0, startY = 0;

  var phone = document.querySelector('.phone');
  if (!phone) return;

  phone.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  phone.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return;

    var active = document.querySelector('.screen.active');
    if (!active) return;
    var idx = PUBLIC_SCREENS.indexOf(active.id);
    if (idx === -1) return;

    if (dx < 0 && idx < PUBLIC_SCREENS.length - 1) {
      if (!currentUser && !guestMode) return;
      navigate(PUBLIC_SCREENS[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      navigate(PUBLIC_SCREENS[idx - 1]);
    }
  }, { passive: true });
}

// ════════════════════════════════════════
// LOGOUT / STAFF NAV BUTTONS
// ════════════════════════════════════════

function updateLogoutBtns() {
  var showLogout = !!(currentUser || guestMode);
  ['logoutHome', 'logoutBacheca', 'logoutInfo'].forEach(function(id) {
    var el = $id(id);
    if (!el) return;
    if (showLogout) { el.classList.add('visible'); } else { el.classList.remove('visible'); }
    el.textContent = (guestMode && !currentUser) ? '🔓 ESCI' : '🔓 LOGOUT';
  });
}

function updateStaffNavBtns() {
  var pairs = [
    ['staffNavIcon',  'staffNavLabel'],
    ['staffNavIconB', 'staffNavLabelB'],
    ['staffNavIconI', 'staffNavLabelI'],
  ];
  pairs.forEach(function(p) {
    var ic = $id(p[0]);
    var lb = $id(p[1]);
    if (!ic || !lb) return;
    var btn = ic.closest('button');
    if (isAiutante()) {
      ic.textContent = '⚙️'; lb.textContent = 'Staff';
      if (btn) btn.style.display = '';
    } else if (isUtente()) {
      ic.textContent = '👤'; lb.textContent = 'Profilo';
      if (btn) btn.style.display = '';
    } else {
      ic.textContent = '🔑'; lb.textContent = 'Login';
      if (btn) btn.style.display = '';
    }
  });
}

function updateHomeAccessLevel() {
  var isGuest = guestMode && !currentUser;

  document.querySelectorAll('#screenHome .bottom-nav').forEach(function(nav) {
    nav.style.display = isGuest ? 'none' : '';
  });
  document.querySelectorAll('.nav-btn[onclick*="screenBacheca"]').forEach(function(b) {
    b.style.display = isGuest ? 'none' : '';
  });
  document.querySelectorAll('.nav-btn[onclick*="screenInfo"]').forEach(function(b) {
    b.style.display = isGuest ? 'none' : '';
  });

  var guestMsg = $id('guestMessage');
  if (guestMsg) guestMsg.style.display = isGuest ? 'block' : 'none';

  var cercaBtn = $id('homeCercaBtn');
  if (cercaBtn) cercaBtn.parentElement.style.display = isGuest ? 'none' : '';

  var calWrap = document.querySelector('#screenHome .cal-wrap');
  if (calWrap) calWrap.style.display = isGuest ? 'none' : '';

  var nextEv = $id('homeNextEvent');
  if (nextEv) nextEv.style.display = isGuest ? 'none' : '';
}

// ════════════════════════════════════════
// TABS STAFF
// ════════════════════════════════════════

var TABS = ['dashboard','calendario','spesa','chat','log','cerca',
            'lavori','magazzino','pagamenti','profilo','configura'];
var _currentTab = 'dashboard';

function showTab(name) {
  if (name === 'configura' && !isAdmin()) return;

  TABS.forEach(function(t) {
    var el = $id('tab-' + t);
    if (el) el.style.display = 'none';
  });

  var active = $id('tab-' + name);
  if (active) {
    active.style.display = (name === 'chat') ? 'flex' : 'block';
    if (name !== 'chat') active.scrollTop = 0;
  }

  var staffScreen = $id('screenStaff');
  if (staffScreen && name !== 'chat') staffScreen.scrollTop = 0;

  var btnDash = $id('btnTornaDash');
  if (btnDash) btnDash.style.display = (name === 'dashboard') ? 'none' : '';

  if (name === 'chat') {
    _unreadChat = 0;
    updateDash();
    buildChat();
    var btnSC = $id('btnSvuotaChat');
    if (btnSC) btnSC.style.display = isAdmin() ? 'inline-block' : 'none';
  }

  if (name === 'log') {
    _unreadLog = 0;
    updateDash();
    var btnSL = $id('btnSvuotaLog');
    if (btnSL) btnSL.style.display = isAdmin() ? 'inline-block' : 'none';
  }

  if (name === 'calendario') buildSCal();
  if (name === 'profilo')    buildProfilo();
  if (name === 'configura')  buildConfigura();
  if (name === 'dashboard')  { applyWidgetConfig(); applyTabConfig(); applyBenvenuto(); }

  if (name === 'magazzino') {
    ['alcolico', 'analcolico', 'altro'].forEach(function(cat) {
      _mzCollapsed[cat] = true;
      var body = $id('mz-body-' + cat);
      var icon = $id('mz-icon-' + cat);
      if (body) body.style.display = 'none';
      if (icon) icon.textContent = '▸';
    });
  }

  _currentTab = name;
}

// ════════════════════════════════════════
// DASHBOARD COUNTS
// ════════════════════════════════════════

function updateDash() {
  var today = new Date(); today.setHours(0, 0, 0, 0);

  // Widget: eventi futuri
  var futuri = EVENTI.filter(function(e) {
    return new Date(e.anno, e.mese-1, e.giorno) >= today;
  }).length;
  var we = $id('wEventi'); if (we) we.textContent = futuri;

  // Widget: spesa da fare
  var ws = $id('wSpesa');
  if (ws) ws.textContent = SPESA.filter(function(s) { return !s.done; }).length;

  // Widget: lavori da fare
  var wl = $id('wLavori');
  if (wl) wl.textContent = LAVORI.filter(function(l) { return !l.done; }).length;

  // Widget: pagamenti in sospeso
  var wp = $id('wPagamenti');
  if (wp) wp.textContent = PAGAMENTI.filter(function(p) { return !p.pagato; }).length;

  // Widget: chat non letti
  var wc = $id('wChat'); if (wc) wc.textContent = _unreadChat;

  // Widget: log non visti
  var wll = $id('wLog'); if (wll) wll.textContent = _unreadLog;

  // Widget: magazzino sotto minimo
  var sottoMinimo = MAGAZZINO.filter(function(g) { return g.attuale < g.minimo; });
  var wMag   = $id('wMagazzino');
  var wLabel = $id('wlabel-magazzino');
  if (wMag) {
    wMag.textContent  = sottoMinimo.length;
    wMag.style.color  = sottoMinimo.length > 0 ? '#cc2200' : '';
  }
  if (wLabel) {
    wLabel.textContent = sottoMinimo.length > 0 ? '⚠ SOTTO MINIMO' : 'MAGAZZINO';
    wLabel.style.color = sottoMinimo.length > 0 ? '#cc2200' : '';
  }
}

// ════════════════════════════════════════
// BUILD ALL
// ════════════════════════════════════════

function buildAll() {
  buildCal();
  buildSCal();
  buildHomeNextEvent();
  buildSpesa();
  buildLavori();
  buildMagazzino();
  buildPagamenti();
  buildLog();
  buildChat();
  buildBacheca();
  buildInfo();
  buildSuggerimenti();
  buildValutazioni();
  buildConsigliati();
  updateDash();
  updateLogoutBtns();
  updateStaffNavBtns();
}

// ════════════════════════════════════════
// CALENDARIO PUBBLICO (home)
// ════════════════════════════════════════

var calYear  = new Date().getFullYear();
var calMonth = new Date().getMonth() + 1;
var calSel   = null;

function calPrev() {
  calMonth--;
  if (calMonth < 1) { calMonth = 12; calYear--; }
  calSel = null;
  buildCal();
}
function calNext() {
  calMonth++;
  if (calMonth > 12) { calMonth = 1; calYear++; }
  calSel = null;
  buildCal();
}

function tipiVisibiliPerRole(role) {
  if (role === ROLES.STAFF || role === ROLES.ADMIN)
    return ['invito','premium','privato','segreto','consigliato'];
  if (role === ROLES.AIUTANTE)
    return ['invito','premium','privato','consigliato'];
  if (role === ROLES.PREMIUM)
    return ['invito','premium','consigliato'];
  return ['invito','consigliato'];
}

function buildCal() {
  var label = $id('calLabel');
  if (!label) return;
  label.textContent = MESI[calMonth-1] + ' ' + calYear;

  var dl = $id('calDayLabels');
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

  var today    = new Date();
  var firstDay = new Date(calYear, calMonth-1, 1).getDay();
  var offset   = firstDay === 0 ? 6 : firstDay - 1;
  var days     = new Date(calYear, calMonth, 0).getDate();

  for (var i = 0; i < offset; i++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (var d = 1; d <= days; d++) {
    (function(day) {
      var tipi  = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
      var dayTs = new Date(calYear, calMonth-1, day).getTime();
      var ev = EVENTI.find(function(e) {
        if (tipi.indexOf(e.tipo) < 0) return false;
        var startTs = new Date(e.anno, e.mese-1, e.giorno).getTime();
        if (e.giornoFine && e.meseFine && e.annoFine) {
          var endTs = new Date(e.annoFine, e.meseFine-1, e.giornoFine).getTime();
          return dayTs >= startTs && dayTs <= endTs;
        }
        return e.anno===calYear && e.mese===calMonth && e.giorno===day;
      });

      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;

      if (day===today.getDate() && calMonth===today.getMonth()+1 && calYear===today.getFullYear())
        cell.classList.add('today');

      if (ev) {
        cell.classList.add('has-event');
        cell.classList.add(TIPO_CLASS[ev.tipo]);
        var startTs = new Date(ev.anno, ev.mese-1, ev.giorno).getTime();
        if (dayTs > startTs) cell.classList.add('event-continuation');
      }

      if (calSel === day) cell.classList.add('selected');
      cell.onclick = function() { calSel = day; buildCal(); renderCalDetail(day, ev, false); };
      grid.appendChild(cell);
    })(d);
  }

  if (calSel !== null) {
    var tipiSel = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
    var selEv = EVENTI.find(function(e) {
      return e.anno===calYear && e.mese===calMonth && e.giorno===calSel &&
             tipiSel.indexOf(e.tipo) >= 0;
    });
    renderCalDetail(calSel, selEv, false);
  } else {
    var det = $id('calDetail');
    if (det) det.innerHTML = '';
  }
}

// ════════════════════════════════════════
// CALENDARIO STAFF
// ════════════════════════════════════════

var sCalYear  = new Date().getFullYear();
var sCalMonth = new Date().getMonth() + 1;
var sCalSel   = null;

function sCalPrev() {
  sCalMonth--;
  if (sCalMonth < 1) { sCalMonth = 12; sCalYear--; }
  sCalSel = null;
  buildSCal();
}
function sCalNext() {
  sCalMonth++;
  if (sCalMonth > 12) { sCalMonth = 1; sCalYear++; }
  sCalSel = null;
  buildSCal();
}

function buildSCal() {
  var label = $id('sCalLabel');
  if (!label) return;
  label.textContent = MESI[sCalMonth-1] + ' ' + sCalYear;

  var dl = $id('sCalDayLabels');
  if (dl) {
    dl.innerHTML = '';
    GIORNI.forEach(function(d) {
      var el = document.createElement('div');
      el.className = 'cal-day-label';
      el.textContent = d;
      dl.appendChild(el);
    });
  }

  var grid = $id('sCalGrid');
  if (!grid) return;
  grid.innerHTML = '';

  var today    = new Date();
  var firstDay = new Date(sCalYear, sCalMonth-1, 1).getDay();
  var offset   = firstDay === 0 ? 6 : firstDay - 1;
  var days     = new Date(sCalYear, sCalMonth, 0).getDate();

  for (var i = 0; i < offset; i++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (var d = 1; d <= days; d++) {
    (function(day) {
      var dayTs = new Date(sCalYear, sCalMonth-1, day).getTime();
      var ev = EVENTI.find(function(e) {
        var startTs = new Date(e.anno, e.mese-1, e.giorno).getTime();
        if (e.giornoFine && e.meseFine && e.annoFine) {
          var endTs = new Date(e.annoFine, e.meseFine-1, e.giornoFine).getTime();
          return dayTs >= startTs && dayTs <= endTs;
        }
        return e.anno===sCalYear && e.mese===sCalMonth && e.giorno===day;
      });

      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;

      if (day===today.getDate() && sCalMonth===today.getMonth()+1 && sCalYear===today.getFullYear())
        cell.classList.add('today');

      if (ev) {
        cell.classList.add('has-event');
        cell.classList.add(TIPO_CLASS[ev.tipo]);
        var startTs = new Date(ev.anno, ev.mese-1, ev.giorno).getTime();
        if (dayTs > startTs) cell.classList.add('event-continuation');
      }

      if (sCalSel === day) cell.classList.add('selected');
      cell.onclick = function() { sCalSel = day; buildSCal(); renderCalDetail(day, ev, true); };
      grid.appendChild(cell);
    })(d);
  }

  if (sCalSel !== null) {
    var selEv = EVENTI.find(function(e) {
      return e.anno===sCalYear && e.mese===sCalMonth && e.giorno===sCalSel;
    });
    renderCalDetail(sCalSel, selEv, true);
  } else {
    var det = $id('sCalDetail');
    if (det) det.innerHTML = '';
  }
}

// ════════════════════════════════════════
// CALENDARIO DETAIL CARD
// ════════════════════════════════════════

function renderCalDetail(day, ev, isStaffView) {
  var detId = isStaffView ? 'sCalDetail' : 'calDetail';
  var det = $id(detId);
  if (!det) return;
  det.innerHTML = '';

  if (ev) {
    var card = document.createElement('div');
    card.className = 'cal-detail-card';
    card.style.borderLeft = '3px solid ' + TIPO_COLOR[ev.tipo];

    // Header
    var header = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">' +
      '<div class="cal-detail-title">' + ev.nome + '</div>' +
      tag(ev.tipo) +
      '</div>';

    // Data
    var dateStr;
    if (ev.giornoFine && ev.meseFine && ev.annoFine) {
      dateStr = '🗓️ ' + ev.giorno + ' ' + MESI[ev.mese-1] +
                ' → ' + ev.giornoFine + ' ' + MESI[ev.meseFine-1] +
                (ev.annoFine !== ev.anno ? ' ' + ev.annoFine : '');
    } else {
      var refMonth = isStaffView ? sCalMonth : calMonth;
      var dow = new Date(ev.anno, ev.mese-1, day).getDay();
      var dowIdx = dow === 0 ? 6 : dow - 1;
      dateStr = '🗓️ ' + GIORNI_FULL[dowIdx] + ' ' + day + ' ' + MESI[refMonth-1];
    }
    var meta = '<div class="cal-detail-meta">' + dateStr + ' · ORE ' + ev.ora + '</div>';

    // Body
    var desc      = ev.desc  ? '<div class="cal-detail-desc">ℹ️ ' + ev.desc  + '</div>' : '';
    var luogo     = ev.luogo ? '<div class="cal-detail-desc">📍 ' + ev.luogo + '</div>' : '';
    var note      = ev.note  ? '<div class="cal-detail-desc">✨ ' + ev.note  + '</div>' : '';
    var locandina = ev.locandina
      ? '<div class="loc-img-wrap" onclick="event.stopPropagation();openLightbox(\'' + ev.locandina + '\')" style="margin-top:10px">' +
        '<img src="' + ev.locandina + '" style="width:100%;border-radius:4px;max-height:220px;object-fit:contain;display:block"/>' +
        '<span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>'
      : '';

    // Azioni staff
    var actions = '';
    if (isStaffView && canEdit()) {
      var idx = EVENTI.indexOf(ev);
      actions = '<div style="margin-top:10px;display:flex;gap:6px">' +
        '<button class="cal-action-btn" style="color:' + TIPO_COLOR[ev.tipo] + ';border-color:' + TIPO_COLOR[ev.tipo] + '" onclick="openEventoModal(' + idx + ')">✏ MODIFICA</button>' +
        '<button class="cal-action-btn" style="color:#555;border-color:#333" onclick="deleteEvento(' + idx + ')">🗑 ELIMINA</button>' +
        '</div>';
    }

    card.innerHTML = header + meta + desc + luogo + note + locandina + actions;
    det.appendChild(card);
    buildEventLinks(ev, card);

    // Valutazioni evento (solo vista pubblica)
    if (!isStaffView) {
      _renderEventValutazioni(ev, det);
    }

  } else if (isStaffView && currentUser) {
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

function _renderEventValutazioni(ev, container) {
  var evId     = ev.id;
  var vList    = (EVENTI_VALUTAZIONI[evId] || []);
  var canDel   = isStaff();
  var giàVotato = currentUser && vList.some(function(v) { return v.nome === currentUser.name; });

  var block = document.createElement('div');
  block.style.cssText = 'margin-top:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px';

  var titolo = document.createElement('div');
  titolo.style.cssText = 'font-family:var(--mono);font-size:8px;color:#555;letter-spacing:3px;margin-bottom:8px';
  titolo.textContent = '// VALUTAZIONI EVENTO';
  block.appendChild(titolo);

  // Form voto
  if (currentUser && !giàVotato) {
    var formDiv = document.createElement('div');
    formDiv.style.cssText = 'margin-bottom:10px';
    formDiv.innerHTML =
      '<div style="display:flex;gap:4px;margin-bottom:6px">' +
        [1,2,3,4,5].map(function(n) {
          return '<span class="star-btn" data-v="' + n + '" data-ev="' + evId + '" ' +
                 'onclick="setEvStarVal(' + evId + ',' + n + ')" ' +
                 'style="font-size:20px;cursor:pointer;opacity:0.3">★</span>';
        }).join('') +
      '</div>' +
      '<textarea id="evValInput_' + evId + '" rows="2" placeholder="Scrivi una valutazione..." ' +
      'style="width:100%;box-sizing:border-box;padding:8px;background:#111;border:1px solid #2a2a2a;' +
      'border-radius:3px;color:var(--light);font-family:var(--body);font-size:12px;resize:none;outline:none"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:4px">' +
        '<button onclick="inviaValutazioneEvento(' + evId + ')" ' +
        'style="padding:6px 12px;background:transparent;border:1px solid #333;color:#888;' +
        'font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">INVIA</button>' +
      '</div>';
    block.appendChild(formDiv);
  } else if (giàVotato) {
    var done = document.createElement('div');
    done.style.cssText = 'font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px;margin-bottom:8px';
    done.textContent = '✓ HAI GIÀ VALUTATO QUESTO EVENTO';
    block.appendChild(done);
  }

  // Lista valutazioni
  vList.forEach(function(v, vi) {
    var row = document.createElement('div');
    row.style.cssText = 'background:#0d0d0d;border:1px solid #1a1a1a;border-radius:3px;' +
                        'padding:8px;display:flex;align-items:flex-start;gap:8px;margin-bottom:6px';
    var stelle = v.stelle > 0
      ? '<div style="color:#c8a84b;font-size:12px;margin-bottom:3px">' +
        '★'.repeat(v.stelle) + '<span style="color:#222">' + '★'.repeat(5-v.stelle) + '</span></div>'
      : '';
    row.innerHTML =
      '<div style="flex:1">' +
        stelle +
        (v.testo ? '<div style="font-family:var(--body);font-size:12px;color:var(--light);line-height:1.4">' +
                   nl2br(v.testo) + '</div>' : '') +
        '<div style="font-family:var(--mono);font-size:8px;color:#333;margin-top:3px">' +
        v.nome.toUpperCase() + ' · ' + v.tempo + '</div>' +
      '</div>' +
      (canDel ? '<button style="background:none;border:none;color:#cc2200;cursor:pointer;' +
                'font-size:11px;padding:0;flex-shrink:0" ' +
                'onclick="deleteValutazioneEvento(' + evId + ',' + vi + ')">✕</button>' : '');
    block.appendChild(row);
  });

  container.appendChild(block);
}

// ════════════════════════════════════════
// PROSSIMO EVENTO (home)
// ════════════════════════════════════════

var _nextEventInterval = null;

function buildHomeNextEvent() {
  var el = $id('homeNextEvent');
  if (!el) return;

  if (_nextEventInterval) { clearInterval(_nextEventInterval); _nextEventInterval = null; }

  var today = new Date(); today.setHours(0,0,0,0);
  var next = EVENTI
    .filter(function(e) { return e.tipo === 'invito' && new Date(e.anno, e.mese-1, e.giorno) >= today; })
    .sort(function(a,b) { return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno); })[0];

  if (!next) { el.innerHTML = ''; return; }

  var editBtn = canEdit()
    ? '<button class="nec-edit-btn visible" onclick="event.stopPropagation();openEventoModal(' + EVENTI.indexOf(next) + ')">✏</button>'
    : '';

  var locandinaHtml = next.locandina
    ? '<img class="nec-locandina" src="' + next.locandina +
      '" onclick="event.stopPropagation();openLightbox(\'' + next.locandina + '\')" title="Clicca per ingrandire"/>'
    : '';

  var oraParts = (next.ora || '00:00').split(':');
  var target   = new Date(next.anno, next.mese-1, next.giorno,
                          parseInt(oraParts[0])||0, parseInt(oraParts[1])||0, 0, 0);

  function formatCountdown() {
    var now  = new Date();
    var diff = target - now;
    if (diff <= 0) return '<span style="color:var(--red)">IN CORSO</span>';
    var days  = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins  = Math.floor((diff % 3600000)  / 60000);
    var secs  = Math.floor((diff % 60000)    / 1000);
    var parts = [];
    if (days)  parts.push(days + 'g');
    if (hours) parts.push(hours + 'h');
    parts.push(String(mins).padStart(2,'0') + 'm');
    parts.push(String(secs).padStart(2,'0') + 's');
    return parts.join(' ');
  }

  var d     = new Date(next.anno, next.mese-1, next.giorno);
  var dow   = [6,0,1,2,3,4,5][d.getDay()];
  var dtStr = GIORNI_FULL[dow] + ' ' + next.giorno + ' ' +
              MESI[next.mese-1].charAt(0) + MESI[next.mese-1].slice(1).toLowerCase();

  el.innerHTML =
    '<div class="next-event-card" onclick="calSel=' + next.giorno +
    ';calMonth=' + next.mese + ';calYear=' + next.anno + ';buildCal()">' +
      locandinaHtml +
      '<div class="nec-info">' +
        '<div class="nec-tag"><div class="blink-dot"></div> PROSSIMO EVENTO</div>' +
        '<div class="nec-title">' + next.nome + '</div>' +
        '<div class="nec-meta">' + dtStr + ' · ORE ' + next.ora +
        (next.luogo ? ' · ' + next.luogo.toUpperCase() : '') + '</div>' +
        '<div id="necCountdown" style="font-family:var(--mono);font-size:11px;letter-spacing:2px;' +
        'color:var(--red);margin-top:6px">' + formatCountdown() + '</div>' +
      '</div>' +
      editBtn +
    '</div>';

  _nextEventInterval = setInterval(function() {
    var cd = $id('necCountdown');
    if (!cd) { clearInterval(_nextEventInterval); return; }
    cd.innerHTML = formatCountdown();
  }, 1000);
}

// ════════════════════════════════════════
// CERCA EVENTI
// ════════════════════════════════════════

var _cercaTipo = '';

function setCercaTipo(btn, tipo) {
  _cercaTipo = tipo;
  document.querySelectorAll('#cercaTipoFilter .cerca-filter-btn').forEach(function(b) {
    b.classList.toggle('active', b === btn);
  });
  eseguiCerca();
}

function eseguiCerca() {
  var nome   = ($id('cercaNome')  || {value:''}).value.trim().toLowerCase();
  var mese   = parseInt(($id('cercaMese')  || {value:''}).value) || 0;
  var anno   = parseInt(($id('cercaAnno')  || {value:''}).value) || 0;
  var tipo   = _cercaTipo;
  var result = $id('cercaResults');
  if (!result) return;

  var tipiVisibili = tipiVisibiliPerRole(currentUser ? currentUser.role : null);
  var filtered = EVENTI.filter(function(e) {
    if (tipiVisibili.indexOf(e.tipo) < 0) return false;
    if (tipo && e.tipo !== tipo) return false;
    if (mese && e.mese !== mese) return false;
    if (anno && e.anno !== anno) return false;
    if (nome && e.nome.toLowerCase().indexOf(nome) < 0 &&
                (e.desc || '').toLowerCase().indexOf(nome) < 0) return false;
    return true;
  }).sort(function(a,b) {
    return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno);
  });

  result.innerHTML = '';
  if (!filtered.length) {
    result.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:#333;' +
                       'text-align:center;padding:20px;letter-spacing:2px">NESSUN RISULTATO</div>';
    return;
  }

  filtered.forEach(function(ev) {
    var d    = new Date(ev.anno, ev.mese-1, ev.giorno);
    var dow  = d.getDay();
    var dowI = dow === 0 ? 6 : dow - 1;
    var item = document.createElement('div');
    item.className = 'cal-detail-card';
    item.style.borderLeft = '3px solid ' + TIPO_COLOR[ev.tipo];
    item.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '<div class="cal-detail-title" style="font-size:13px">' + ev.nome + '</div>' +
        tag(ev.tipo) +
      '</div>' +
      '<div class="cal-detail-meta">' +
        '🗓️ ' + GIORNI_FULL[dowI] + ' ' + ev.giorno + ' ' + MESI[ev.mese-1] + ' ' + ev.anno +
        ' · ORE ' + ev.ora +
      '</div>' +
      (ev.desc ? '<div class="cal-detail-desc" style="margin-top:4px">ℹ️ ' + ev.desc + '</div>' : '');
    item.onclick = function() {
      calSel = ev.giorno; calMonth = ev.mese; calYear = ev.anno;
      buildCal();
      navigate('screenHome');
    };
    result.appendChild(item);
  });
}

// ════════════════════════════════════════
// SPESA
// ════════════════════════════════════════

function buildSpesa() {
  var list = $id('spesaList');
  if (!list) return;
  list.innerHTML = '';

  var todo           = 0;
  var totaleGenerale = 0;

  function itemTotale(item) {
    return (parseFloat(item.qtyNum) > 0 && parseFloat(item.costoUnitario) > 0)
      ? parseFloat(item.qtyNum) * parseFloat(item.costoUnitario)
      : 0;
  }

  function renderHeader(label, color, totCat) {
    var h = document.createElement('div');
    h.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:' + color +
                      ';margin:10px 0 4px;display:flex;justify-content:space-between;align-items:center';
    h.innerHTML = '<span>' + label + '</span>' +
                  '<span style="color:' + color + ';font-weight:bold">' + totCat.toFixed(2) + '€</span>';
    list.appendChild(h);
  }

  function renderVoce(item) {
    var i = SPESA.indexOf(item);
    if (!item.done) {
      todo++;
      totaleGenerale += itemTotale(item);
    }
    var totaleStr = itemTotale(item) > 0 ? itemTotale(item).toFixed(2) + '€' : '—';
    var badge = item.fromMagazzino
      ? '<span style="font-family:var(--mono);font-size:7px;color:#2a6b6b;letter-spacing:1px;margin-left:4px">[AUTO]</span>'
      : '';

    var row = document.createElement('div');
    row.className = 'spesa-row' + (item.done ? ' done' : '');
    row.innerHTML =
      '<div class="spesa-check ' + (item.done ? 'checked' : '') + '" onclick="toggleSpesa(' + i + ')">' +
        (item.done ? '✓' : '') +
      '</div>' +
      '<span class="spesa-name">' + item.nome + badge + '</span>' +
      '<span class="spesa-qty">' + (item.qty || '') + '</span>' +
      '<span style="color:#0066cc;font-weight:bold;min-width:50px;text-align:right">' + totaleStr + '</span>' +
      '<div class="spesa-actions">' +
        '<button class="edit-btn-small visible" onclick="openSpesaModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteSpesa(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  }

  function catTotale(arr) {
    return arr.reduce(function(acc, item) { return acc + (!item.done ? itemTotale(item) : 0); }, 0);
  }

  var alcolici   = SPESA.filter(function(s) { return s.fromMagazzino && s._categoria === 'alcolico'; });
  var analcolici = SPESA.filter(function(s) { return s.fromMagazzino && s._categoria === 'analcolico'; });
  var altroAuto  = SPESA.filter(function(s) {
    return s.fromMagazzino && s._categoria !== 'alcolico' && s._categoria !== 'analcolico';
  });
  var manual     = SPESA.filter(function(s) { return !s.fromMagazzino; });

  if (alcolici.length)   { renderHeader('// ALCOLICI',        '#8b2200', catTotale(alcolici));   alcolici.forEach(renderVoce);   }
  if (analcolici.length) { renderHeader('// ANALCOLICI',      '#2a6b6b', catTotale(analcolici)); analcolici.forEach(renderVoce); }
  if (altroAuto.length)  { renderHeader('// ALTRO (AUTO)',    '#555',    catTotale(altroAuto));  altroAuto.forEach(renderVoce);  }
  if (manual.length)     { renderHeader('// VOCI MANUALI',   '#555',    catTotale(manual));     manual.forEach(renderVoce);     }

  if (!SPESA.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;' +
                     'padding:20px;letter-spacing:2px">LISTA VUOTA</div>';
  }

  var badge = $id('spesaCount');
  if (badge) badge.innerHTML = todo + ' DA FARE • Tot: <span style="color:#0066cc;font-weight:bold">' +
                                totaleGenerale.toFixed(2) + '€</span>';
  updateDash();
}

function toggleSpesa(i) {
  if (i < 0 || i >= SPESA.length) return;
  var item = SPESA[i];

  if (!item.done) {
    // Mostra modale di conferma acquisto
    var suggerito = item.qtyNum || '';
    var unita     = item.unita ? ' (' + item.unita + ')' : '';
    var modale    = document.createElement('div');
    modale.id = 'acquisto-modal';
    modale.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);' +
                           'display:flex;align-items:center;justify-content:center;padding:24px';
    modale.innerHTML =
      '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:4px;' +
      'width:100%;max-width:300px;padding:20px;display:flex;flex-direction:column;gap:14px">' +
        '<div style="font-family:var(--mono);font-size:9px;color:var(--red);letter-spacing:3px">// ACQUISTO CONFERMATO</div>' +
        '<div style="font-family:var(--body);font-size:14px;color:var(--light)">' + item.nome + '</div>' +
        '<div>' +
          '<label style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;display:block;margin-bottom:6px">' +
          '// QTÀ ACQUISTATA' + unita + '</label>' +
          '<input id="acquisto-qty" type="number" min="0" step="any" value="' + suggerito +
          '" style="width:100%;padding:8px 10px;background:#111;border:1px solid #333;' +
          'border-radius:2px;color:var(--white);font-family:var(--mono);font-size:14px;outline:none"/>' +
        '</div>' +
        (item.fromMagazzino && item.magazzinoId
          ? '<div style="font-family:var(--mono);font-size:8px;color:#2a6b6b;letter-spacing:1px">' +
            '→ Il magazzino di <b style="color:#4a9b9b">' + item.nome + '</b> verrà aggiornato</div>'
          : '') +
        '<div style="display:flex;gap:8px;margin-top:4px">' +
          '<button onclick="confermaAcquisto(' + i + ')" style="flex:1;padding:10px;' +
          'background:var(--red);border:none;color:#fff;font-family:var(--mono);' +
          'font-size:10px;letter-spacing:2px;cursor:pointer;border-radius:2px">✓ CONFERMA</button>' +
          '<button onclick="annullaAcquisto()" style="flex:1;padding:10px;background:transparent;' +
          'border:1px solid #333;color:#888;font-family:var(--mono);font-size:10px;' +
          'letter-spacing:2px;cursor:pointer;border-radius:2px">ANNULLA</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modale);
    setTimeout(function() {
      var inp = $id('acquisto-qty');
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  } else {
    item.done = false;
    addLog('riaperto spesa: ' + item.nome);
    saveSpesa();
    buildSpesa();
  }
}

function annullaAcquisto() {
  var m = $id('acquisto-modal');
  if (m) m.remove();
}

function confermaAcquisto(i) {
  var inp          = $id('acquisto-qty');
  var qtyAcquistata = inp ? parseFloat(inp.value) : 0;
  annullaAcquisto();

  var item = SPESA[i];
  if (!item) return;
  item.done = true;
  addLog('acquistato spesa: ' + item.nome + (qtyAcquistata ? ' x' + qtyAcquistata + (item.unita ? ' ' + item.unita : '') : ''));

  if (item.fromMagazzino && item.magazzinoId && qtyAcquistata > 0) {
    var gIdx = MAGAZZINO.findIndex(function(g) { return g.id === item.magazzinoId; });
    if (gIdx !== -1) {
      var vecchio = MAGAZZINO[gIdx].attuale;
      MAGAZZINO[gIdx].attuale = vecchio + qtyAcquistata;
      addLog('magazzino aggiornato: ' + MAGAZZINO[gIdx].nome + ' da ' + vecchio +
             ' a ' + MAGAZZINO[gIdx].attuale + ' ' + MAGAZZINO[gIdx].unita);
      syncMagazzinoWithSpesa();
      buildMagazzino();
    }
  }

  buildSpesa();
  saveMagazzino();
  saveSpesa();
  showToast('Acquisto registrato!', 'success');
}

function deleteSpesa(i) { deleteItem(SPESA, i, 'spesa', buildSpesa, saveSpesa); }

// ════════════════════════════════════════
// LAVORI
// ════════════════════════════════════════

function buildLavori() {
  var list = $id('lavoriList');
  if (!list) return;
  list.innerHTML = '';
  var todo = 0;

  LAVORI.forEach(function(item, i) {
    if (!item.done) todo++;
    var row = document.createElement('div');
    row.className = 'spesa-row' + (item.done ? ' done' : '');
    row.innerHTML =
      '<div class="spesa-check ' + (item.done ? 'checked' : '') + '" onclick="toggleLavori(' + i + ')">' +
        (item.done ? '✓' : '') +
      '</div>' +
      '<span class="spesa-name">' + item.lavoro + '</span>' +
      '<span class="spesa-who">' + (item.who !== '-' ? item.who : '') + '</span>' +
      '<div class="spesa-actions">' +
        '<button class="edit-btn-small visible" onclick="openLavoriModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteLavori(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  });

  var badge = $id('lavoriCount');
  if (badge) badge.textContent = todo + ' DA FARE';
  updateDash();
}

function toggleLavori(i) { toggleItem(LAVORI, i, 'lavoro', buildLavori, saveLavori); }
function deleteLavori(i) { deleteItem(LAVORI, i, 'lavoro', buildLavori, saveLavori); }

// ════════════════════════════════════════
// MAGAZZINO
// ════════════════════════════════════════

var _mzCollapsed = { alcolico: true, analcolico: true, altro: true };

function buildMagazzino() {
  var cats = ['alcolico', 'analcolico', 'altro'];
  cats.forEach(function(cat) {
    var el = $id('magazzinoList-' + cat);
    if (el) el.innerHTML = '';
  });

  var sottominimo = 0;
  var catCounts   = { alcolico: 0, analcolico: 0, altro: 0 };

  MAGAZZINO.forEach(function(item, i) {
    if (item.attuale < item.minimo) sottominimo++;
    var cat = (item.categoria === 'alcolico' || item.categoria === 'analcolico')
              ? item.categoria : 'altro';
    catCounts[cat]++;

    var list = $id('magazzinoList-' + cat);
    if (!list) return;

    var isLow = item.attuale < item.minimo;
    var row   = document.createElement('div');
    row.className = 'spesa-row' + (isLow ? ' low-stock' : '');
    row.id = 'magazzino-row-' + item.id;
    row.innerHTML =
      '<span class="spesa-name">' + item.nome + '</span>' +
      '<span class="magazzino-qty" style="font-weight:bold;color:' +
        (isLow ? '#cc2200' : '#2a2') + '">' +
        item.attuale + '/' + item.minimo + ' ' + item.unita +
      '</span>' +
      '<div class="spesa-actions" style="align-items:center;gap:4px">' +
        '<button class="mz-qty-btn" onclick="stepMagazzino(' + item.id + ',-1)" ' +
        'style="width:26px;height:26px;border-radius:3px;border:1px solid #333;' +
        'background:#1a1a1a;color:#aaa;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0">−</button>' +
        '<input type="number" id="qty-' + item.id + '" value="' + item.attuale + '" min="0" ' +
        'style="width:52px;padding:4px 2px;border:1px solid #2a2a2a;border-radius:2px;' +
        'background:#111;color:var(--light);font-family:var(--mono);font-size:12px;text-align:center" ' +
        'onchange="updateMagazzinoById(' + item.id + ',this.value)"/>' +
        '<button class="mz-qty-btn" onclick="stepMagazzino(' + item.id + ',1)" ' +
        'style="width:26px;height:26px;border-radius:3px;border:1px solid #333;' +
        'background:#1a1a1a;color:#aaa;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0">+</button>' +
        '<button class="edit-btn-small visible" onclick="openMagazzinoModal(' + i + ')">✏</button>' +
        '<button class="edit-btn-small visible" style="color:#cc2200" onclick="deleteMagazzino(' + i + ')">✕</button>' +
      '</div>';
    list.appendChild(row);
  });

  cats.forEach(function(cat) {
    var badge = $id('mz-badge-' + cat);
    if (badge) badge.textContent = catCounts[cat];
  });

  var badge = $id('magazzinoCount');
  if (badge) badge.textContent = sottominimo + ' SOTTO MINIMO';
  updateDash();
}

function toggleMzSection(cat) {
  _mzCollapsed[cat] = !_mzCollapsed[cat];
  var body = $id('mz-body-' + cat);
  var icon = $id('mz-icon-' + cat);
  if (body) body.style.display = _mzCollapsed[cat] ? 'none' : 'block';
  if (icon) icon.textContent = _mzCollapsed[cat] ? '▸' : '▾';
}

function stepMagazzino(itemId, delta) {
  var input   = $id('qty-' + itemId);
  var current = parseInt((input && input.value) || 0) || 0;
  var newVal  = Math.max(0, current + delta);
  if (input) input.value = newVal;
  updateMagazzinoById(itemId, newVal);
}

function updateMagazzinoById(itemId, newQty) {
  newQty = Math.max(0, parseInt(newQty) || 0);
  var idx = MAGAZZINO.findIndex(function(m) { return m.id === itemId; });
  if (idx < 0) return;
  var item   = MAGAZZINO[idx];
  var oldQty = item.attuale;
  if (oldQty === newQty) return;
  item.attuale = newQty;

  var inp = $id('qty-' + itemId);
  if (inp && parseInt(inp.value) !== newQty) inp.value = newQty;
  addLog('aggiornato magazzino: ' + item.nome + ' da ' + oldQty + ' a ' + newQty + ' ' + item.unita);

  var isLow = item.attuale < item.minimo;
  var row   = $id('magazzino-row-' + item.id);
  if (row) {
    row.className = 'spesa-row' + (isLow ? ' low-stock' : '');
    var qtySpan = row.querySelector('.magazzino-qty');
    if (qtySpan) {
      qtySpan.style.color  = isLow ? '#cc2200' : '#2a2';
      qtySpan.textContent  = item.attuale + '/' + item.minimo + ' ' + item.unita;
    }
  }

  var sottominimo = MAGAZZINO.filter(function(g) { return g.attuale < g.minimo; }).length;
  var badge = $id('magazzinoCount');
  if (badge) badge.textContent = sottominimo + ' SOTTO MINIMO';

  syncMagazzinoWithSpesa();
  updateDash();
  saveMagazzino();
  saveSpesa();
}

function syncMagazzinoWithSpesa() {
  MAGAZZINO.forEach(function(item) {
    var existingIdx = SPESA.findIndex(function(s) {
      return s.fromMagazzino && s.magazzinoId === item.id;
    });
    if (item.attuale < item.minimo) {
      var qty = item.minimo - item.attuale;
      if (existingIdx >= 0) {
        var s             = SPESA[existingIdx];
        s.nome            = item.nome;
        s.qty             = qty + ' ' + item.unita;
        s.qtyNum          = qty;
        s.costoUnitario   = item.costoUnitario;
        s.unita           = item.unita;
        s._categoria      = item.categoria;
        s.done            = false;
      } else {
        SPESA.push({
          id:            getNextId('spesa'),
          fromMagazzino: true,
          magazzinoId:   item.id,
          nome:          item.nome,
          qty:           qty + ' ' + item.unita,
          qtyNum:        qty,
          costoUnitario: item.costoUnitario,
          unita:         item.unita,
          _categoria:    item.categoria,
          who:           '—',
          done:          false,
        });
      }
    } else {
      if (existingIdx >= 0) SPESA.splice(existingIdx, 1);
    }
  });
  buildSpesa();
}

// ════════════════════════════════════════
// PAGAMENTI
// ════════════════════════════════════════

function buildPagamenti() {
  var list = $id('pagamentiList');
  if (!list) return;
  list.innerHTML = '';

  var inDebito = 0;

  PAGAMENTI.forEach(function(p, i) {
    if (p.saldo < 0) inDebito++;

    var member     = MEMBERS.find(function(m) { return m.name === p.name; });
    var saldoColor = p.saldo > 0 ? '#2a9a2a' : p.saldo < 0 ? '#cc2200' : '#555';
    var saldoLabel = p.saldo > 0 ? '+' + p.saldo.toFixed(2) + '€ CREDITO'
                   : p.saldo < 0 ? Math.abs(p.saldo).toFixed(2) + '€ DEBITO'
                   : 'IN PARI';

    var avHtml = member
      ? avatarHtml(member, 34)
      : '<div style="width:34px;height:34px;border-radius:50%;background:#333;flex-shrink:0"></div>';

    var canAdmin  = isAdmin();
    var isSelf    = currentUser && currentUser.name === p.name;
    var canPay    = isSelf && p.saldo < 0;
    var canCharge = isAdmin() || isSelf;

    var card = document.createElement('div');
    card.style.cssText = 'background:var(--panel);border:1px solid #1e1e1e;border-radius:4px;margin-bottom:8px;overflow:hidden';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer';
    header.innerHTML =
      avHtml +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--white)">' +
          p.name.toUpperCase() +
        '</div>' +
        '<div style="font-family:var(--mono);font-size:10px;font-weight:bold;color:' + saldoColor +
        ';margin-top:2px">' + saldoLabel + '</div>' +
      '</div>' +
      '<div style="font-family:var(--mono);font-size:14px;color:#555;flex-shrink:0" class="pay-arrow">▶</div>';

    var body = document.createElement('div');
    body.style.cssText = 'display:none;border-top:1px solid #1a1a1a;padding:10px 14px;' +
                         'flex-direction:column;gap:8px';

    var btns = [
      { label:'📋 MOVIMENTI', border:'#2a3a4a', txtColor:'var(--light)', action: function(){ apriDettaglioPagamento(i); } },
    ];
    if (canCharge) {
      btns.push({ label:'− ADDEBITA',  border:'#cc2200', txtColor:'#cc2200', action: function(){ autoAddebito(i);      } });
      btns.push({ label:'+ ACCREDITA', border:'#2a9a2a', txtColor:'#2a9a2a', action: function(){ accreditaManuale(i);  } });
    }
    if (canAdmin) {
      btns.push({ label:'✏ MODIFICA SALDO', border:'#334488', txtColor:'#6688cc', action: function(){ modificaSaldo(i); } });
    }
    if (canPay) {
      btns.push({ label:'✓ REGISTRA PAGAMENTO', border:'#2a9a2a', txtColor:'#2a9a2a', action: function(){ registraPagamento(i); } });
    }

    btns.forEach(function(b) {
      var btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = 'width:100%;padding:10px;background:transparent;border:1px solid ' + b.border +
                          ';color:' + (b.txtColor||'var(--light)') +
                          ';font-family:var(--mono);font-size:10px;letter-spacing:2px;' +
                          'border-radius:2px;cursor:pointer;text-align:left';
      btn.addEventListener('click', b.action);
      body.appendChild(btn);
    });

    header.addEventListener('click', function() {
      var open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'flex';
      header.querySelector('.pay-arrow').textContent = open ? '▶' : '▼';
    });

    card.appendChild(header);
    card.appendChild(body);
    list.appendChild(card);
  });

  var wp = $id('wPagamenti');
  if (wp) wp.textContent = inDebito;
}

function apriDettaglioPagamento(i) {
  var p = PAGAMENTI[i];

  var rows = p.movimenti.length
    ? p.movimenti.slice().reverse().map(function(m) {
        var isEntrata = m.importo > 0;
        var color     = isEntrata ? '#2a9a2a' : '#cc2200';
        var icon      = isEntrata ? '▲' : '▼';
        return '<div class="spesa-row" style="font-size:10px">' +
          '<span style="font-family:var(--mono);font-size:8px;color:#555;min-width:75px">' + m.data + '</span>' +
          '<span style="flex:1;color:var(--light)">' + (m.nota || m.tipo) + '</span>' +
          '<span style="font-weight:bold;color:' + color + ';font-family:var(--mono)">' +
            icon + ' ' + Math.abs(m.importo).toFixed(2) + '€</span>' +
        '</div>';
      }).join('')
    : '<div style="font-family:var(--mono);font-size:9px;color:#444;text-align:center;padding:16px">NESSUN MOVIMENTO</div>';

  var saldo      = p.saldo;
  var saldoColor = saldo > 0 ? '#2a9a2a' : saldo < 0 ? '#cc2200' : '#555';
  var saldoLabel = saldo > 0 ? '+' + saldo.toFixed(2) + '€ CREDITO'
                 : saldo < 0 ? '-' + Math.abs(saldo).toFixed(2) + '€ DEBITO'
                 : 'IN PARI';

  // Grafico SVG andamento saldo
  var grafico = '';
  if (p.movimenti.length >= 2) {
    var saldoTemp = 0;
    var punti = [0];
    p.movimenti.forEach(function(m) { saldoTemp += m.importo; punti.push(saldoTemp); });
    var minV  = Math.min.apply(null, punti);
    var maxV  = Math.max.apply(null, punti);
    var range = maxV - minV || 1;
    var W = 280, H = 50, pad = 4;
    var pts = punti.map(function(v, idx) {
      var x = pad + (idx / (punti.length-1)) * (W - pad*2);
      var y = pad + (1 - (v - minV) / range) * (H - pad*2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var zeroY = pad + (1 - (0 - minV) / range) * (H - pad*2);
    grafico =
      '<div style="margin-bottom:12px;background:var(--dark);border:1px solid var(--border);' +
      'padding:8px;border-radius:2px">' +
        '<div style="font-family:var(--mono);font-size:7px;color:#555;letter-spacing:2px;margin-bottom:4px">ANDAMENTO SALDO</div>' +
        '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block">' +
          '<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W-pad) + '" y2="' + zeroY.toFixed(1) +
          '" stroke="#333" stroke-width="1" stroke-dasharray="3,3"/>' +
          '<polyline points="' + pts + '" fill="none" stroke="' + (saldo >= 0 ? '#2a9a2a' : '#cc2200') + '" stroke-width="1.5"/>' +
          '<circle cx="' + (pad + (W - pad*2)).toFixed(1) +
          '" cy="' + (pad + (1 - (saldo - minV) / range) * (H - pad*2)).toFixed(1) +
          '" r="3" fill="' + saldoColor + '"/>' +
        '</svg>' +
      '</div>';
  }

  $id('modalTitle').textContent = 'MOVIMENTI · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;' +
    'background:var(--dark);border:1px solid var(--border);margin-bottom:12px;font-family:var(--mono)">' +
      '<span style="font-size:9px;letter-spacing:2px;color:#888">SALDO ATTUALE</span>' +
      '<span style="font-size:13px;font-weight:bold;color:' + saldoColor + '">' + saldoLabel + '</span>' +
    '</div>' +
    grafico +
    '<div style="max-height:45vh;overflow-y:auto">' + rows + '</div>';
  window._modalCb = null;
  openModal();
}

function registraPagamento(i) {
  var p     = PAGAMENTI[i];
  var dovuto = Math.abs(p.saldo).toFixed(2);
  $id('modalTitle').textContent = 'REGISTRA PAGAMENTO · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#cc2200;letter-spacing:2px;margin-bottom:12px">' +
    'DEBITO ATTUALE: ' + dovuto + '€</div>' +
    '<div><label class="modal-label">// IMPORTO PAGATO (€)</label>' +
    '<input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" max="' + dovuto +
    '" value="' + dovuto + '"/></div>' +
    '<div><label class="modal-label">// NOTA (opzionale)</label>' +
    '<input class="modal-input" id="mvNota" placeholder="es. Bonifico, contanti..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota  = $id('mvNota').value.trim() || 'pagamento';
    var data  = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: importo, tipo: 'pagamento', nota: nota });
    addLog('pagamento registrato: ' + p.name + ' +' + importo + '€ — ' + nota);
    closeModal(); buildPagamenti(); savePagamenti();
  };
  openModal();
}

function modificaSaldo(i) {
  if (!isAdmin()) return;
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'MODIFICA SALDO · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
    'SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// TIPO MOVIMENTO</label>' +
    '<select class="modal-input" id="mvTipo">' +
      '<option value="debito">Addebita (debito)</option>' +
      '<option value="credito">Accredita (credito)</option>' +
    '</select></div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label>' +
    '<input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01"/></div>' +
    '<div><label class="modal-label">// NOTA</label>' +
    '<input class="modal-input" id="mvNota" placeholder="es. Quota serata, rimborso..."/></div>';
  window._modalCb = function() {
    var tipo   = $id('mvTipo').value;
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota  = $id('mvNota').value.trim() || tipo;
    var data  = new Date().toISOString().slice(0,10);
    var delta = tipo === 'debito' ? -importo : importo;
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + delta).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: delta, tipo: tipo, nota: nota });
    addLog('saldo modificato: ' + p.name + ' ' + (delta >= 0 ? '+' : '') + delta + '€ — ' + nota);
    closeModal(); buildPagamenti(); savePagamenti();
  };
  openModal();
}

function autoAccredito(i) {
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'ACCREDITA · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
    'SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label>' +
    '<input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" placeholder="es. 20.00"/></div>' +
    '<div><label class="modal-label">// NOTA</label>' +
    '<input class="modal-input" id="mvNota" placeholder="es. Anticipato spesa, rimborso spettante..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'auto-accredito';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: importo, tipo: 'credito', nota: nota });
    addLog('auto-accredito: ' + p.name + ' +' + importo + '€ — ' + nota);
    closeModal(); buildPagamenti(); savePagamenti();
  };
  openModal();
}

function autoAddebito(i) {
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'ADDEBITA · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
    'SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label>' +
    '<input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" placeholder="es. 20.00"/></div>' +
    '<div><label class="modal-label">// NOTA</label>' +
    '<input class="modal-input" id="mvNota" placeholder="es. Preso dalla cassa, consumazione..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'auto-addebito';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo - importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: -importo, tipo: 'debito', nota: nota });
    addLog('auto-addebito: ' + p.name + ' -' + importo + '€ — ' + nota);
    closeModal(); buildPagamenti(); savePagamenti();
  };
  openModal();
}

function accreditaManuale(i) {
  var p = PAGAMENTI[i];
  $id('modalTitle').textContent = 'ACCREDITA · ' + p.name.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:#888;letter-spacing:2px;margin-bottom:12px">' +
    'SALDO ATTUALE: ' + (p.saldo >= 0 ? '+' : '') + p.saldo.toFixed(2) + '€</div>' +
    '<div><label class="modal-label">// IMPORTO (€)</label>' +
    '<input class="modal-input" id="mvImporto" type="number" step="0.01" min="0.01" placeholder="es. 20.00"/></div>' +
    '<div><label class="modal-label">// NOTA</label>' +
    '<input class="modal-input" id="mvNota" placeholder="es. Versamento, rimborso..."/></div>';
  window._modalCb = function() {
    var importo = parseFloat($id('mvImporto').value) || 0;
    if (importo <= 0) return;
    var nota = $id('mvNota').value.trim() || 'accredito manuale';
    var data = new Date().toISOString().slice(0,10);
    PAGAMENTI[i].saldo = parseFloat((PAGAMENTI[i].saldo + importo).toFixed(2));
    PAGAMENTI[i].movimenti.push({ data: data, importo: importo, tipo: 'credito', nota: nota });
    addLog('accredito: ' + p.name + ' +' + importo + '€ — ' + nota);
    closeModal(); buildPagamenti(); savePagamenti();
  };
  openModal();
}

// ════════════════════════════════════════
// CHAT
// ════════════════════════════════════════

function buildChat() {
  var box = $id('chatMessages');
  if (!box) return;
  box.innerHTML = '';

  if (!CHAT.length) {
    box.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:#333;text-align:center;' +
                    'padding:30px;letter-spacing:2px">NESSUN MESSAGGIO</div>';
    return;
  }

  CHAT.forEach(function(msg) {
    var isMine = currentUser && msg.who === currentUser.name;
    var member = MEMBERS.find(function(m) { return m.name === msg.who; });
    var avHTML = member && member.photo
      ? '<div class="bubble-avatar" style="background:transparent;overflow:hidden">' +
        '<img src="' + member.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/></div>'
      : '<div class="bubble-avatar" style="background:' + (member ? member.color : '#444') + '">' +
        (member ? member.initial : msg.who.charAt(0).toUpperCase()) + '</div>';

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble' + (isMine ? ' mine' : '');
    bubble.innerHTML =
      avHTML +
      '<div class="bubble-body">' +
        '<div class="bubble-name">' + msg.who.toUpperCase() + '</div>' +
        '<div class="bubble-text">' + msg.testo.replace(/</g,'&lt;') + '</div>' +
        '<div class="bubble-time">' + msg.ora + '</div>' +
      '</div>';
    box.appendChild(bubble);
  });

  function scrollBottom() { box.scrollTop = box.scrollHeight; }
  requestAnimationFrame(function() { requestAnimationFrame(scrollBottom); });
  setTimeout(scrollBottom, 80);
}

function sendChat() {
  if (!currentUser) return;
  var input = $id('chatInput');
  var testo = input.value.trim();
  if (!testo) return;

  var now = new Date();
  var ora = now.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}) + ' · ' +
            now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  var msg = { who: currentUser.name, testo: testo, ora: ora, ts: now.getTime() };

  var key = currentUser.name + '|' + testo;
  _pendingChatKeys[key] = true;
  setTimeout(function() { delete _pendingChatKeys[key]; }, 5000);

  CHAT.push(msg);
  input.value = '';
  buildChat();
  _unreadChat = 0;
  saveChatMessage(msg);
}

function filterChat(query) {
  var q = query.toLowerCase().trim();
  document.querySelectorAll('#chatMessages .chat-bubble').forEach(function(b) {
    var text = b.querySelector('.bubble-text');
    if (!text) return;
    if (!q) {
      b.style.display = '';
      text.innerHTML = text.textContent;
      return;
    }
    var content = text.textContent;
    if (content.toLowerCase().indexOf(q) >= 0) {
      b.style.display = '';
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
      text.innerHTML = content.replace(re,
        '<mark style="background:#cc220044;color:var(--red);border-radius:1px">$1</mark>');
    } else {
      b.style.display = 'none';
    }
  });
}

function clearChatSearch() {
  var input = $id('chatSearch');
  if (input) { input.value = ''; filterChat(''); }
}

function svuotaChat() {
  if (!isAdmin()) { showToast('// SOLO ADMIN', 'error'); return; }
  if (!confirm('Sei sicuro di voler cancellare tutta la chat? L\'azione non è reversibile.')) return;
  CHAT = [];
  buildChat();
  clearChatRemote();
  showToast('// CHAT SVUOTATA ✓', 'success');
}

// ════════════════════════════════════════
// LOG
// ════════════════════════════════════════

function buildLog() {
  var list = $id('logList');
  if (!list) return;
  list.innerHTML = '';

  var fUtente = ($id('logFiltroUtente') || {value:''}).value.trim().toLowerCase();
  var fAzione = ($id('logFiltroAzione') || {value:''}).value.trim().toLowerCase();
  var fData   = ($id('logFiltroData')   || {value:''}).value.trim().toLowerCase();

  var filtered = LOG.filter(function(entry) {
    var okUtente = !fUtente || entry.member.name.toLowerCase().indexOf(fUtente) >= 0;
    var okAzione = !fAzione || entry.azione.toLowerCase().indexOf(fAzione) >= 0;
    var okData   = !fData   || entry.tempo.toLowerCase().indexOf(fData)   >= 0;
    return okUtente && okAzione && okData;
  });

  if (!filtered.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;' +
                     'padding:20px;letter-spacing:2px">' + (LOG.length ? 'NESSUN RISULTATO' : 'NESSUNA ATTIVITÀ') + '</div>';
    return;
  }

  filtered.forEach(function(entry) {
    var rl     = roleLabel(entry.member.role);
    var avHTML = entry.member.photo
      ? '<div class="log-avatar" style="background:transparent;overflow:hidden">' +
        '<img src="' + entry.member.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/></div>'
      : '<div class="log-avatar" style="background:' + entry.member.color + '">' + entry.member.initial + '</div>';

    var item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML =
      avHTML +
      '<div>' +
        '<div class="log-text">' +
          '<strong>' + entry.member.name + '</strong>' +
          '<span style="font-family:var(--mono);font-size:7px;color:' + rl.color +
          ';letter-spacing:1px;margin-left:4px">[' + rl.label + ']</span>' +
          ' ' + entry.azione +
        '</div>' +
        '<div class="log-time">' + entry.tempo + '</div>' +
      '</div>';
    list.appendChild(item);
  });
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
// BACHECA
// ════════════════════════════════════════

function buildBacheca() {
  var list = $id('bachecaList');
  if (!list) return;
  list.innerHTML = '';

  var addBtn = $id('bacheca-add-btn');
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
        '<span style="font-family:var(--mono);font-size:7px;color:#444;letter-spacing:1px;white-space:nowrap;margin-right:6px">' +
          item.tempo + '</span>' +
        '<span class="istr-arrow">▶</span>' +
      '</div>' +
      '<div class="istr-body">' +
        (item.testo ? '<div style="color:var(--light);font-size:13px;line-height:1.5;margin-bottom:' +
                      (item.foto ? '10px' : '0') + '">' + nl2br(item.testo) + '</div>' : '') +
        (item.foto  ? '<img src="' + item.foto + '" onclick="event.stopPropagation();openLightbox(\'' + item.foto + '\')" ' +
                      'style="width:100%;border-radius:4px;max-height:200px;object-fit:cover;display:block;cursor:zoom-in"/>' : '') +
      '</div>';

    var header    = div.querySelector('.istr-header');
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

function toggleIstr(header) {
  var body   = header.nextElementSibling;
  var isOpen = body.classList.contains('open');
  document.querySelectorAll('.istr-body').forEach(function(b) { b.classList.remove('open'); });
  document.querySelectorAll('.istr-arrow').forEach(function(a) { a.style.transform = ''; });
  if (!isOpen) {
    body.classList.add('open');
    header.querySelector('.istr-arrow').style.transform = 'rotate(90deg)';
  }
}

// ════════════════════════════════════════
// INFO
// ════════════════════════════════════════

function buildInfo() {
  var list = $id('infoList');
  if (!list) return;
  list.innerHTML = '';

  var addBtn = $id('info-add-btn');
  if (addBtn) addBtn.style.display = canEdit() ? 'block' : 'none';

  buildLinks('info');

  INFO.forEach(function(item, i) {
    if (item.hidden) return;
    var div = document.createElement('div');
    div.className = 'istr-card';
    div.innerHTML =
      '<div class="istr-header">' +
        '<span class="istr-icon">' + item.icon + '</span>' +
        '<span class="istr-title">' + item.titolo + '</span>' +
        '<span class="istr-arrow">▶</span>' +
      '</div>' +
      '<div class="istr-body">' +
        nl2br(item.testo) +
        (item.foto ? '<div class="loc-img-wrap" style="margin-top:10px" ' +
          'onclick="event.stopPropagation();openLightbox(\'' + item.foto + '\')">' +
          '<img src="' + item.foto + '" style="width:100%;border-radius:4px;max-height:180px;object-fit:contain;display:block"/>' +
          '<span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' : '') +
      '</div>';

    var header     = div.querySelector('.istr-header');
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

// ════════════════════════════════════════
// LONG PRESS MENU
// ════════════════════════════════════════

function attachLongPress(el, callback) {
  var timer = null;

  function start() {
    el.style.transition = 'box-shadow 1s ease';
    el.style.boxShadow  = '0 0 0 2px var(--red)';
    timer = setTimeout(function() {
      el.style.boxShadow = '';
      el.style.transition = '';
      callback();
    }, 1000);
  }

  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    el.style.boxShadow  = '';
    el.style.transition = '';
  }

  el.addEventListener('touchstart',  start,  { passive: true });
  el.addEventListener('touchend',    cancel);
  el.addEventListener('touchmove',   cancel, { passive: true });
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     cancel);
  el.addEventListener('mouseleave',  cancel);
  el.addEventListener('contextmenu', function(e) { e.preventDefault(); });
}

function showLongPressMenu(type, index) {
  var old = $id('longPressMenu');
  if (old) old.remove();

  var label = type === 'bacheca'
    ? (BACHECA[index] ? BACHECA[index].titolo : '')
    : (INFO[index]    ? INFO[index].titolo    : '');

  var overlay = document.createElement('div');
  overlay.id = 'longPressOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.5)';
  overlay.onclick = closeLongPressMenu;

  var menu = document.createElement('div');
  menu.id = 'longPressMenu';
  menu.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
                       'background:#161616;border:1px solid #2a2a2a;border-radius:6px;' +
                       'z-index:9999;min-width:220px;overflow:hidden;' +
                       'box-shadow:0 8px 32px rgba(0,0,0,0.8);animation:menuFadeIn 0.15s ease';
  menu.innerHTML =
    '<div style="padding:10px 14px 8px;font-family:var(--mono);font-size:8px;color:#555;' +
    'letter-spacing:3px;border-bottom:1px solid #1e1e1e">// ' + label.toUpperCase() + '</div>' +
    '<button onclick="closeLongPressMenu();' +
      (type === 'bacheca' ? 'openBachecaModal(' + index + ')' : 'openInfoModal(' + index + ')') +
    '" style="width:100%;padding:14px 16px;background:transparent;border:none;border-bottom:1px solid #1a1a1a;' +
    'color:var(--white);font-family:var(--body);font-size:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px">' +
      '<span>✏️</span><span>Modifica</span></button>' +
    '<button onclick="closeLongPressMenu();' +
      (type === 'bacheca' ? 'deleteBacheca(' + index + ')' : 'deleteInfo(' + index + ')') +
    '" style="width:100%;padding:14px 16px;background:transparent;border:none;border-bottom:1px solid #1a1a1a;' +
    'color:#cc2200;font-family:var(--body);font-size:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px">' +
      '<span>🗑️</span><span>Elimina</span></button>' +
    '<button onclick="closeLongPressMenu()" style="width:100%;padding:12px 16px;background:transparent;' +
    'border:none;color:#555;font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer">ANNULLA</button>';

  document.body.appendChild(overlay);
  document.body.appendChild(menu);
}

function closeLongPressMenu() {
  var menu    = $id('longPressMenu');
  var overlay = $id('longPressOverlay');
  if (menu)    menu.remove();
  if (overlay) overlay.remove();
}

// ════════════════════════════════════════
// LINKS ESTERNI
// ════════════════════════════════════════

function _renderLinkBlock(container, arr, tipo, contesto) {
  container.innerHTML = '';

  arr.forEach(function(link, i) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = canEdit() ? '4px' : '8px';

    var a = document.createElement('a');
    a.href   = link.url;
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
        '<button class="cal-action-btn" style="font-size:8px;padding:3px 10px" ' +
          'data-tipo="' + tipo + '" data-contesto="' + contesto + '" data-idx="' + i + '" data-action="edit">✏ MODIFICA</button>' +
        '<button class="cal-action-btn" style="font-size:8px;padding:3px 10px;color:#555;border-color:#333" ' +
          'data-tipo="' + tipo + '" data-contesto="' + contesto + '" data-idx="' + i + '" data-action="del">🗑 ELIMINA</button>';

      editRow.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var t  = this.dataset.tipo;
          var c  = t === 'evento' ? parseInt(this.dataset.contesto) : this.dataset.contesto;
          var ii = parseInt(this.dataset.idx);
          if (this.dataset.action === 'edit') openLinkModal(t, c, ii);
          else                                deleteLink(t, c, ii);
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
  var container = $id('linksSection-' + pagina);
  if (!container) return;
  var arr = LINKS_PAGE[pagina] || [];
  if (!arr.length && !canEdit()) { container.innerHTML = ''; return; }
  _renderLinkBlock(container, arr, 'page', pagina);
}

function buildAllLinks() {
  ['info', 'bacheca'].forEach(buildLinks);
}

function buildEventLinks(ev, container) {
  if (!ev) return;
  var arr = LINKS_EVENTO[ev.id] || [];
  if (!arr.length && !canEdit()) return;

  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,229,255,0.08);padding-top:10px';
  wrap.id = 'eventLinksWrap-' + ev.id;

  if (arr.length > 0 || canEdit()) {
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:var(--mono);font-size:8px;color:rgba(0,229,255,0.4);' +
                        'letter-spacing:3px;margin-bottom:8px';
    lbl.textContent = '// LINK UTILI';
    wrap.appendChild(lbl);
  }

  _renderLinkBlock(wrap, arr, 'evento', ev.id);
  container.appendChild(wrap);
}

// ════════════════════════════════════════
// SUGGERIMENTI
// ════════════════════════════════════════

var _starVal      = 0;

function setStarVal(v) {
  _starVal = v;
  document.querySelectorAll('.star-btn').forEach(function(s) {
    var n = parseInt(s.dataset.v);
    s.style.opacity = n <= v ? '1' : '0.3';
    s.style.color   = n <= v ? '#c8a84b' : '';
  });
}

function inviaSuggerimento() {
  var ta = $id('sugInput');
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
  SUGGERIMENTI.unshift({ id: Date.now(), testo: testo, tempo: nowStr() });
  ta.value = '';
  var cnt = $id('sugCount');
  if (cnt) cnt.textContent = '0 / 150';
  buildSuggerimenti();
  saveSuggerimenti();
  showToast('// SUGGERIMENTO INVIATO ✓', 'success');
}

function buildSuggerimenti() {
  var section = $id('suggerimentiSection');
  var list    = $id('suggerimentiList');
  if (!list) return;
  list.innerHTML = '';

  var canSee = isStaff();
  if (section) section.style.display = canSee ? 'block' : 'none';
  if (!canSee) return;

  if (!SUGGERIMENTI.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;' +
                     'padding:12px;letter-spacing:2px">NESSUN SUGGERIMENTO</div>';
    return;
  }

  SUGGERIMENTI.forEach(function(s, i) {
    var div = document.createElement('div');
    div.style.cssText = 'background:#111;border:1px solid #1e1e1e;border-radius:3px;padding:10px;' +
                        'display:flex;align-items:flex-start;gap:10px';
    div.innerHTML =
      '<div style="flex:1">' +
        '<div style="font-family:var(--body);font-size:13px;color:var(--light);line-height:1.5">' +
          nl2br(s.testo) + '</div>' +
        '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;margin-top:4px">' +
          '👤 ANONIMO · ' + s.tempo + '</div>' +
      '</div>' +
      '<button class="edit-btn-small visible" style="color:#cc2200;flex-shrink:0" ' +
        'onclick="deleteSuggerimento(' + i + ')">✕</button>';
    list.appendChild(div);
  });
}

function deleteSuggerimento(i) {
  SUGGERIMENTI.splice(i, 1);
  addLog('eliminato suggerimento anonimo');
  saveSuggerimenti();
  buildSuggerimenti();
}

// ════════════════════════════════════════
// VALUTAZIONI LOCALE (bacheca)
// ════════════════════════════════════════

function inviaValutazione() {
  var ta    = $id('valInput');
  if (!ta) return;
  var testo = ta.value.trim();
  if (!testo && !_starVal) return;
  if (!currentUser) return;
  var nome = currentUser.name;
  if (VALUTAZIONI.some(function(v) { return v.nome === nome; })) return;
  VALUTAZIONI.unshift({ id: Date.now(), nome: nome, stelle: _starVal || 0, testo: testo, tempo: nowStr() });
  ta.value = '';
  setStarVal(0);
  buildValutazioni();
  saveValutazioni();
}

function buildValutazioni() {
  var form = $id('valutazioniForm');
  var list = $id('valutazioniList');
  if (!list) return;
  list.innerHTML = '';

  var canDel    = isStaff();
  var giàVotato = currentUser && VALUTAZIONI.some(function(v) { return v.nome === currentUser.name; });

  if (form) {
    if (!currentUser) {
      form.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;' +
                       'padding:4px 0 10px">// ACCEDI PER LASCIARE UNA VALUTAZIONE</div>';
    } else if (giàVotato) {
      form.innerHTML = '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px;' +
                       'padding:4px 0 10px">✓ HAI GIÀ LASCIATO UNA VALUTAZIONE</div>';
    } else {
      form.innerHTML =
        '<div style="display:flex;gap:6px;margin-bottom:8px" id="starInput">' +
          [1,2,3,4,5].map(function(n) {
            return '<span class="star-btn" data-v="' + n + '" onclick="setStarVal(' + n + ')" ' +
                   'style="font-size:22px;cursor:pointer;opacity:0.3">★</span>';
          }).join('') +
        '</div>' +
        '<textarea id="valInput" placeholder="Scrivi la tua recensione..." rows="3" ' +
        'style="width:100%;box-sizing:border-box;padding:10px;background:#111;border:1px solid #2a2a2a;' +
        'border-radius:3px;color:var(--light);font-family:var(--body);font-size:13px;resize:none;outline:none"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:6px">' +
          '<button onclick="inviaValutazione()" style="padding:8px 16px;background:transparent;border:1px solid #333;' +
          'color:#888;font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">INVIA RECENSIONE</button>' +
        '</div>';
    }
  }

  if (!VALUTAZIONI.length) {
    list.innerHTML = '<div style="font-family:monospace;font-size:9px;color:#333;text-align:center;' +
                     'padding:12px;letter-spacing:2px">NESSUNA RECENSIONE</div>';
    return;
  }

  // Media stelle
  var totStelle = VALUTAZIONI.filter(function(v) { return v.stelle > 0; });
  if (totStelle.length) {
    var media    = (totStelle.reduce(function(a,v) { return a + v.stelle; }, 0) / totStelle.length).toFixed(1);
    var mediaDiv = document.createElement('div');
    mediaDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;' +
                             'background:#111;border-radius:3px;border:1px solid #1e1e1e';
    mediaDiv.innerHTML =
      '<span style="font-family:var(--display);font-size:22px;color:#c8a84b">' + media + '</span>' +
      '<div>' +
        '<div style="color:#c8a84b;font-size:16px;letter-spacing:2px">' +
          '★'.repeat(Math.round(parseFloat(media))) +
          '<span style="color:#333">' + '★'.repeat(5 - Math.round(parseFloat(media))) + '</span>' +
        '</div>' +
        '<div style="font-family:var(--mono);font-size:8px;color:#444;letter-spacing:1px">' +
          totStelle.length + ' VOTI · ' + VALUTAZIONI.length + ' RECENSIONI</div>' +
      '</div>';
    list.appendChild(mediaDiv);
  }

  VALUTAZIONI.forEach(function(v, i) {
    var stelle = v.stelle > 0
      ? '<div style="color:#c8a84b;font-size:14px;margin-bottom:4px">' +
        '★'.repeat(v.stelle) + '<span style="color:#333">' + '★'.repeat(5-v.stelle) + '</span></div>'
      : '';
    var div = document.createElement('div');
    div.style.cssText = 'background:#111;border:1px solid #1e1e1e;border-radius:3px;padding:10px;' +
                        'display:flex;align-items:flex-start;gap:10px';
    div.innerHTML =
      '<div style="flex:1">' +
        stelle +
        (v.testo ? '<div style="font-family:var(--body);font-size:13px;color:var(--light);line-height:1.5">' +
                   nl2br(v.testo) + '</div>' : '') +
        '<div style="font-family:var(--mono);font-size:8px;color:#333;letter-spacing:1px;margin-top:4px">' +
          v.nome.toUpperCase() + ' · ' + v.tempo + '</div>' +
      '</div>' +
      (canDel ? '<button class="edit-btn-small visible" style="color:#cc2200;flex-shrink:0" ' +
                'onclick="deleteValutazione(' + i + ')">✕</button>' : '');
    list.appendChild(div);
  });
}

function deleteValutazione(i) {
  VALUTAZIONI.splice(i, 1);
  addLog('eliminata valutazione');
  saveValutazioni();
  buildValutazioni();
}

// ════════════════════════════════════════
// VALUTAZIONI EVENTI
// ════════════════════════════════════════

var _evStarVals = {};

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
  var ta    = $id('evValInput_' + evId);
  var testo = ta ? ta.value.trim() : '';
  var stelle = _evStarVals[evId] || 0;
  if (!testo && !stelle) return;

  if (!EVENTI_VALUTAZIONI[evId]) EVENTI_VALUTAZIONI[evId] = [];
  if (EVENTI_VALUTAZIONI[evId].some(function(v) { return v.nome === currentUser.name; })) return;

  EVENTI_VALUTAZIONI[evId].unshift({
    nome: currentUser.name, stelle: stelle, testo: testo, tempo: nowStr()
  });
  delete _evStarVals[evId];
  addLog('ha valutato un evento');
  saveConfig();
  renderCalDetail(calSel, EVENTI.find(function(e) { return e.id === evId; }) || null, false);
}

function deleteValutazioneEvento(evId, vi) {
  if (EVENTI_VALUTAZIONI[evId]) {
    EVENTI_VALUTAZIONI[evId].splice(vi, 1);
    if (!EVENTI_VALUTAZIONI[evId].length) delete EVENTI_VALUTAZIONI[evId];
  }
  addLog('eliminata valutazione evento');
  saveConfig();
  renderCalDetail(calSel, EVENTI.find(function(e) { return e.id === evId; }) || null, false);
}

// ════════════════════════════════════════
// CONSIGLIATI (home)
// ════════════════════════════════════════

function buildConsigliati() {
  var list = $id('consigliatiList');
  if (!list) return;
  list.innerHTML = '';

  var visibili = CONSIGLIATI.filter(function(c) {
    if (!c.attivo) return false;
    if (!currentUser) return false;
    return true;
  });

  if (!visibili.length) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:#333;' +
                     'text-align:center;padding:12px;letter-spacing:2px">NESSUN EVENTO CONSIGLIATO</div>';
    return;
  }

  visibili.forEach(function(c) {
    var card = document.createElement('div');
    card.className = 'cal-detail-card';
    card.style.borderLeft = '3px solid ' + TIPO_COLOR['consigliato'];
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '<div class="cal-detail-title" style="font-size:13px">' + c.nome + '</div>' +
        tag('consigliato') +
      '</div>' +
      (c.data ? '<div class="cal-detail-meta">🗓️ ' + c.data + '</div>' : '') +
      (c.luogo ? '<div class="cal-detail-desc">📍 ' + c.luogo + '</div>' : '') +
      (c.desc  ? '<div class="cal-detail-desc">ℹ️ ' + c.desc  + '</div>' : '') +
      (c.locandina ? '<div class="loc-img-wrap" onclick="openLightbox(\'' + c.locandina + '\')" style="margin-top:8px">' +
        '<img src="' + c.locandina + '" style="width:100%;border-radius:4px;max-height:160px;object-fit:contain;display:block"/>' +
        '<span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' : '');
    list.appendChild(card);
  });
}

// ════════════════════════════════════════
// PROFILO (tab staff)
// ════════════════════════════════════════

function buildProfilo() {
  if (!currentUser) return;

  var cp = $id('colorPicker');
  if (cp) {
    cp.innerHTML = '';
    ['#cc2200','#1a6b3c','#1a3a7a','#6b1a6b','#7a4a1a','#2a6b6b',
     '#5a5a1a','#4a2a6b','#6b4a2a','#1a5a5a','#8b2200','#2a4a8b',
     '#5a1a3a','#1a5a2a','#8b6b00','#3a1a6b'].forEach(function(col) {
      var sw = document.createElement('div');
      sw.className = 'color-swatch' + (col === currentUser.color ? ' selected' : '');
      sw.style.background = col;
      sw.onclick = function() {
        currentUser.color = col;
        document.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('selected'); });
        sw.classList.add('selected');
        $id('profiloAvatar').style.background = col;
        var sAv = $id('staffAvatar');
        if (sAv) sAv.style.background = col;
        addLog('ha cambiato colore avatar');
        saveMembers();
        buildMembriList();
      };
      cp.appendChild(sw);
    });
  }

  var av = $id('profiloAvatar');
  var nm = $id('profiloNome');
  var rl = $id('profiloRuolo');
  if (av) renderAvatar(av, currentUser);
  var staffAv = $id('staffAvatar');
  if (staffAv) renderAvatar(staffAv, currentUser);
  var staffNm = $id('staffName');
  if (staffNm) staffNm.textContent = currentUser.name.toUpperCase();
  if (nm) nm.textContent = currentUser.name.toUpperCase();
  if (rl) rl.textContent = roleLabel(currentUser.role).label;

  // Pulsante foto
  var fp       = $id('fotoProfilo');
  var fpRemove = $id('fotoProfiloRemove');
  if (fpRemove) {
    fpRemove.style.display = currentUser.photo ? 'flex' : 'none';
    fpRemove.onclick = function() {
      currentUser.photo = null;
      renderAvatar($id('profiloAvatar'), currentUser);
      var sAv = $id('staffAvatar');
      if (sAv) renderAvatar(sAv, currentUser);
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
          renderAvatar($id('profiloAvatar'), currentUser);
          var sAv = $id('staffAvatar');
          if (sAv) renderAvatar(sAv, currentUser);
          if (fpRemove) fpRemove.style.display = 'flex';
          addLog('ha aggiornato la foto profilo');
          saveMembers();
          buildMembriList();
        });
      };
      inp.click();
    };
  }

  var ga = $id('gestioneAccountSection');
  if (ga) ga.style.display = currentUser.role === ROLES.ADMIN ? 'block' : 'none';
  var es = $id('esportaSection');
  if (es) es.style.display = currentUser.role === ROLES.ADMIN ? 'block' : 'none';

  buildMembriList();
}

function buildMembriList() {
  var list = $id('membriList');
  if (!list) return;
  list.innerHTML = '';

  var groups = [
    { role: 'utente',   title: 'LV.1 · UTENTI'   },
    { role: 'premium',  title: 'LV.2 · PREMIUM'  },
    { role: 'aiutante', title: 'LV.3 · AIUTANTI' },
    { role: 'staff',    title: 'LV.4 · STAFF'    },
    { role: 'admin',    title: 'LV.5 · ADMIN'    },
  ];

  groups.forEach(function(g) {
    var members = MEMBERS.map(function(m, i) { return { m: m, i: i }; })
                         .filter(function(x) { return x.m.role === g.role; });
    if (!members.length) return;

    var header = document.createElement('div');
    header.style.cssText = 'font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin:10px 0 4px';
    header.textContent = '// ' + g.title;
    list.appendChild(header);

    members.forEach(function(x) {
      var m  = x.m;
      var i  = x.i;
      var rl = roleLabel(m.role);

      var row = document.createElement('div');
      row.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-radius:3px;' +
                          'padding:10px;margin-bottom:4px;display:flex;align-items:center;gap:10px';
      var isSelf = currentUser && m.name === currentUser.name;

      row.innerHTML =
        avatarHtml(m, 32) +
        '<div style="flex:1">' +
          '<div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:' +
            (m.sospeso ? '#555' : 'var(--white)') + '">' +
            m.name.toUpperCase() +
            (m.sospeso ? '<span style="font-family:var(--mono);font-size:7px;color:#cc2200;' +
                         'letter-spacing:1px;margin-left:6px">⛔ SOSPESO</span>' : '') +
          '</div>' +
          '<div style="font-family:monospace;font-size:8px;color:' + rl.color + ';letter-spacing:1px">' +
            rl.label + '</div>' +
        '</div>' +
        '<button class="edit-btn-small visible" onclick="openEditMembroModal(' + i + ')" style="margin-right:4px">✏</button>' +
        (!isSelf ? '<button class="edit-btn-small visible" style="color:#cc2200;border-color:#661100" ' +
                   'onclick="rimuoviMembro(' + i + ')">✕</button>'
                 : '<span style="width:28px"></span>');
      list.appendChild(row);
    });
  });
}

// ════════════════════════════════════════
// CAMBIO PASSWORD (tab profilo)
// ════════════════════════════════════════

async function cambiaPassword() {
  var errEl    = $id('pwError');
  var attuale  = $id('pwAttuale').value;
  var nuova    = $id('pwNuova').value.trim();
  var conferma = $id('pwConferma').value.trim();

  if (!attuale || !nuova || !conferma) { errEl.textContent = '// COMPILA TUTTI I CAMPI'; return; }
  if (!(await pwMatch(attuale, currentUser.password))) { errEl.textContent = '// PASSWORD ATTUALE ERRATA'; return; }
  if (nuova.length < 4) { errEl.textContent = '// PASSWORD TROPPO CORTA (min 4)'; return; }
  if (nuova !== conferma) { errEl.textContent = '// LE PASSWORD NON COINCIDONO'; return; }

  var nuovaHash = await sha256(nuova);
  for (var mi = 0; mi < MEMBERS.length; mi++) {
    if (MEMBERS[mi].name !== currentUser.name && MEMBERS[mi].password === nuovaHash) {
      errEl.textContent = "// PASSWORD NON DISPONIBILE — SCEGLINE UN'ALTRA"; return;
    }
  }

  currentUser.password = nuovaHash;
  $id('pwAttuale').value = $id('pwNuova').value = $id('pwConferma').value = '';
  errEl.style.color    = 'var(--green)';
  errEl.textContent    = '// PASSWORD AGGIORNATA ✓';
  addLog('ha cambiato la password');
  saveMembers();
  showToast('// PASSWORD AGGIORNATA ✓', 'success');
  setTimeout(function() { errEl.textContent = ''; errEl.style.color = 'var(--red)'; }, MS_TOAST);
}

// ════════════════════════════════════════
// COMPRESSIONE IMMAGINI
// ════════════════════════════════════════

function compressAndSavePhoto(file, onDone) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 100;
      var ctx  = canvas.getContext('2d');
      var size = Math.min(img.width, img.height);
      var sx   = (img.width  - size) / 2;
      var sy   = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 100, 100);
      onDone(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

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

// ════════════════════════════════════════
// FOTO WIDGET HELPER (bacheca / info modal)
// ════════════════════════════════════════

function _fotoWidgetHtml(currentFoto) {
  return '<div><label class="modal-label">// FOTO (URL)</label>' +
    '<input class="modal-input" id="bFotoUrl" placeholder="https://..." value="' + (currentFoto || '') + '"/></div>' +
    '<div><label class="modal-label">// OPPURE CARICA</label>' +
    '<input type="file" id="bFotoFile" accept="image/*" style="display:none" onchange="previewFoto(this)"/>' +
    '<button onclick="document.getElementById(\'bFotoFile\').click()" ' +
    'style="width:100%;padding:10px;background:transparent;border:1px dashed #2a2a2a;color:#555;' +
    'font-family:monospace;font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">📷 CARICA FOTO</button>' +
    '<div id="fotoPreview" style="margin-top:6px">' +
      (currentFoto
        ? '<img src="' + currentFoto + '" id="fotoPreviewImg" ' +
          'style="width:100%;border-radius:3px;max-height:100px;object-fit:cover"/>' +
          '<button onclick="_clearFoto()" style="margin-top:4px;width:100%;padding:6px;background:transparent;' +
          'border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;' +
          'letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI FOTO</button>'
        : '') +
    '</div></div>';
}

window._clearFoto = function() {
  var prev = $id('fotoPreview');
  if (prev) prev.innerHTML = '';
  var fi = $id('bFotoFile');
  if (fi) { fi._b64 = null; fi.value = ''; }
  var url = $id('bFotoUrl');
  if (url) url.value = '';
  window._fotoCancellata = true;
};

function previewFoto(input) {
  if (!input.files || !input.files[0]) return;
  window._fotoCancellata = false;
  var reader = new FileReader();
  reader.onload = function(e) {
    input._b64 = e.target.result;
    var urlEl = $id('bFotoUrl');
    if (urlEl) urlEl.value = '';
    var prev = $id('fotoPreview');
    if (prev) prev.innerHTML =
      '<img src="' + e.target.result + '" style="width:100%;border-radius:3px;max-height:100px;object-fit:cover"/>' +
      '<button onclick="_clearFoto()" style="margin-top:4px;width:100%;padding:6px;background:transparent;' +
      'border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;' +
      'letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI FOTO</button>';
  };
  reader.readAsDataURL(input.files[0]);
}

function _getFotoFinal() {
  var fi  = $id('bFotoFile');
  var url = $id('bFotoUrl');
  if (fi && fi._b64) return fi._b64;
  if (url && url.value.trim()) return url.value.trim();
  return null;
}

// ════════════════════════════════════════
// MODAL BACHECA
// ════════════════════════════════════════

function openBachecaModal(i) {
  if (!canEdit()) return;
  var item = BACHECA[i];
  $id('modalTitle').textContent = 'MODIFICA BACHECA';
  $id('modalBody').innerHTML =
    '<div class="modal-row">' +
      '<div style="flex:0 0 60px"><label class="modal-label">// ICONA</label>' +
      '<input class="modal-input" id="bIcon" style="font-size:18px" value="' + item.icon + '"/></div>' +
      '<div><label class="modal-label">// TITOLO</label>' +
      '<input class="modal-input" id="bTitolo" value="' + item.titolo + '"/></div>' +
    '</div>' +
    '<div><label class="modal-label">// TESTO</label>' +
    '<textarea class="modal-input" id="bTesto" rows="4" style="resize:none">' + item.testo + '</textarea></div>' +
    _fotoWidgetHtml(item.foto);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var fotoFinal = window._fotoCancellata ? null
                  : (_getFotoFinal() || (window._fotoCancellata ? null : item.foto));
    var now = new Date();
    BACHECA[i] = {
      id:     item.id,
      icon:   $id('bIcon').value   || item.icon,
      titolo: $id('bTitolo').value.trim() || item.titolo,
      testo:  $id('bTesto').value.trim(),
      tempo:  String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0'),
      foto:   fotoFinal,
    };
    saveConfig();
    addLog('modificato bacheca: ' + BACHECA[i].titolo);
    buildBacheca();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

function openBachecaModalNew() {
  if (!canEdit()) return;
  $id('modalTitle').textContent = 'NUOVO POST BACHECA';
  $id('modalBody').innerHTML =
    '<div class="modal-row">' +
      '<div style="flex:0 0 60px"><label class="modal-label">// ICONA</label>' +
      '<input class="modal-input" id="bIcon" style="font-size:18px" value="📌"/></div>' +
      '<div><label class="modal-label">// TITOLO</label>' +
      '<input class="modal-input" id="bTitolo" placeholder="Titolo..."/></div>' +
    '</div>' +
    '<div><label class="modal-label">// TESTO</label>' +
    '<textarea class="modal-input" id="bTesto" rows="4" style="resize:none" placeholder="Testo..."></textarea></div>' +
    _fotoWidgetHtml(null);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var titolo = $id('bTitolo').value.trim();
    if (!titolo) return;
    var now = new Date();
    BACHECA.unshift({
      id:     getNextId('bacheca'),
      icon:   $id('bIcon').value || '📌',
      titolo: titolo,
      testo:  $id('bTesto').value.trim(),
      tempo:  String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0'),
      foto:   window._fotoCancellata ? null : _getFotoFinal(),
    });
    saveConfig();
    addLog('aggiunto post bacheca: ' + titolo);
    buildBacheca();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

function deleteBacheca(i) {
  showConfirm('Eliminare "' + BACHECA[i].titolo + '"?', function() {
    addLog('eliminato bacheca: ' + BACHECA[i].titolo);
    BACHECA.splice(i, 1);
    saveConfig();
    buildBacheca();
    showToast('// ELIMINATO', 'error');
  });
}

// ════════════════════════════════════════
// MODAL INFO
// ════════════════════════════════════════

function openInfoModal(i) {
  if (!canEdit()) return;
  var item = INFO[i];
  $id('modalTitle').textContent = 'MODIFICA INFO';
  $id('modalBody').innerHTML =
    '<div class="modal-row">' +
      '<div style="flex:0 0 60px"><label class="modal-label">// ICONA</label>' +
      '<input class="modal-input" id="bIcon" style="font-size:18px" value="' + item.icon + '"/></div>' +
      '<div><label class="modal-label">// TITOLO</label>' +
      '<input class="modal-input" id="bTitolo" value="' + item.titolo + '"/></div>' +
    '</div>' +
    '<div><label class="modal-label">// TESTO</label>' +
    '<textarea class="modal-input" id="bTesto" rows="5" style="resize:none">' + item.testo + '</textarea></div>' +
    _fotoWidgetHtml(item.foto);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var fotoFinal = window._fotoCancellata ? null
                  : (_getFotoFinal() || (window._fotoCancellata ? null : item.foto));
    INFO[i] = {
      id:     item.id,
      icon:   $id('bIcon').value   || item.icon,
      titolo: $id('bTitolo').value.trim() || item.titolo,
      testo:  $id('bTesto').value.trim(),
      foto:   fotoFinal,
    };
    saveConfig();
    addLog('modificato info: ' + INFO[i].titolo);
    buildInfo();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

function openInfoModalNew() {
  if (!canEdit()) return;
  $id('modalTitle').textContent = 'NUOVA INFO';
  $id('modalBody').innerHTML =
    '<div class="modal-row">' +
      '<div style="flex:0 0 60px"><label class="modal-label">// ICONA</label>' +
      '<input class="modal-input" id="bIcon" style="font-size:18px" value="ℹ️"/></div>' +
      '<div><label class="modal-label">// TITOLO</label>' +
      '<input class="modal-input" id="bTitolo" placeholder="Titolo..."/></div>' +
    '</div>' +
    '<div><label class="modal-label">// TESTO</label>' +
    '<textarea class="modal-input" id="bTesto" rows="5" style="resize:none" placeholder="Testo..."></textarea></div>' +
    _fotoWidgetHtml(null);

  window._fotoCancellata = false;
  window._modalCb = function() {
    var titolo = $id('bTitolo').value.trim();
    if (!titolo) return;
    INFO.push({
      id:     getNextId('info'),
      icon:   $id('bIcon').value || 'ℹ️',
      titolo: titolo,
      testo:  $id('bTesto').value.trim(),
      foto:   window._fotoCancellata ? null : _getFotoFinal(),
    });
    saveConfig();
    addLog('aggiunta info: ' + titolo);
    buildInfo();
    showToast(T_SAVED, 'success');
    closeModal();
  };
  openModal();
}

function deleteInfo(i) {
  showConfirm('Eliminare "' + INFO[i].titolo + '"?', function() {
    addLog('eliminata info: ' + INFO[i].titolo);
    INFO.splice(i, 1);
    saveConfig();
    buildInfo();
    showToast('// ELIMINATA', 'error');
  });
}

// ════════════════════════════════════════
// MODAL LINK
// ════════════════════════════════════════

function openLinkModal(tipo, contesto, editIdx) {
  var isEdit = editIdx !== null && editIdx !== undefined;
  var arr    = tipo === 'page' ? (LINKS_PAGE[contesto] || []) : (LINKS_EVENTO[contesto] || []);
  var item   = isEdit ? arr[editIdx] : null;

  $id('modalTitle').textContent = isEdit ? 'MODIFICA LINK' : 'NUOVO LINK';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// ETICHETTA</label>' +
    '<input class="modal-input" id="lLabel" value="' + (isEdit ? item.label : '') +
    '" placeholder="es. COME ARRIVARE"/></div>' +
    '<div><label class="modal-label">// URL</label>' +
    '<input class="modal-input" id="lUrl" value="' + (isEdit ? item.url : '') +
    '" placeholder="https://..."/></div>' +
    '<div style="display:flex;gap:10px">' +
      '<div style="flex:0 0 80px"><label class="modal-label">// ICONA</label>' +
      '<input class="modal-input" id="lIcon" value="' + (isEdit ? (item.icon||'🔗') : '🔗') + '"/></div>' +
      '<div style="flex:1"><label class="modal-label">// DESCRIZIONE</label>' +
      '<input class="modal-input" id="lDesc" value="' + (isEdit ? (item.desc||'') : '') +
      '" placeholder="es. Apri in Maps"/></div>' +
    '</div>';

  window._modalCb = function() {
    var label = $id('lLabel').value.trim();
    var url   = $id('lUrl').value.trim();
    if (!label || !url) { showToast('// COMPILA TUTTI I CAMPI', 'error'); return; }
    var obj = {
      id:    isEdit ? item.id : _nextLinkId++,
      label: label,
      url:   url,
      icon:  $id('lIcon').value.trim() || '🔗',
      desc:  $id('lDesc').value.trim(),
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
// MODAL EVENTO
// ════════════════════════════════════════

function openEventoModal(editIdx, preDay, preMese, preAnno) {
  if (!canEdit()) return;
  var isEdit = editIdx !== null && editIdx !== undefined;
  var ev     = isEdit ? EVENTI[editIdx] : null;

  $id('modalTitle').textContent = isEdit ? 'MODIFICA EVENTO' : 'NUOVO EVENTO';
  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="mNome" value="' + (isEdit ? ev.nome : '') + '"/></div>' +
    '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;margin:10px 0 4px">// DATA INIZIO</div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">GG</label>' +
      '<input class="modal-input" id="mGiorno" type="number" min="1" max="31" value="' + (isEdit ? ev.giorno : (preDay||'')) + '"/></div>' +
      '<div><label class="modal-label">MM</label>' +
      '<input class="modal-input" id="mMese" type="number" min="1" max="12" value="' + (isEdit ? ev.mese : (preMese||'')) + '"/></div>' +
      '<div><label class="modal-label">AAAA</label>' +
      '<input class="modal-input" id="mAnno" type="number" value="' + (isEdit ? ev.anno : (preAnno||new Date().getFullYear())) + '"/></div>' +
    '</div>' +
    '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:2px;margin:10px 0 4px">' +
    '// DATA FINE <span style="color:#333">(opzionale)</span></div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">GG</label>' +
      '<input class="modal-input" id="mGiornoFine" type="number" min="1" max="31" value="' + (isEdit && ev.giornoFine ? ev.giornoFine : '') + '" placeholder="—"/></div>' +
      '<div><label class="modal-label">MM</label>' +
      '<input class="modal-input" id="mMeseFine" type="number" min="1" max="12" value="' + (isEdit && ev.meseFine ? ev.meseFine : '') + '" placeholder="—"/></div>' +
      '<div><label class="modal-label">AAAA</label>' +
      '<input class="modal-input" id="mAnnoFine" type="number" value="' + (isEdit && ev.annoFine ? ev.annoFine : '') + '" placeholder="—"/></div>' +
    '</div>' +
    '<div><label class="modal-label">// ORA INIZIO</label>' +
    '<input class="modal-input" id="mOra" type="text" placeholder="22:00" value="' + (isEdit ? ev.ora : '') + '"/></div>' +
    '<div><label class="modal-label">// TIPO</label>' +
    '<select class="modal-input" id="mTipo">' +
      ['invito','premium','privato','segreto','consigliato'].map(function(t) {
        return '<option value="' + t + '"' + (isEdit && ev.tipo===t ? ' selected' : '') + '>' +
               t.toUpperCase() + '</option>';
      }).join('') +
    '</select></div>' +
    '<div><label class="modal-label">// DESCRIZIONE</label>' +
    '<textarea class="modal-input" id="mDesc" rows="3" style="resize:none">' + (isEdit ? ev.desc : '') + '</textarea></div>' +
    '<div><label class="modal-label">// NOTE</label>' +
    '<input class="modal-input" id="mNote" value="' + (isEdit ? ev.note : '') + '"/></div>' +
    '<div><label class="modal-label">// LUOGO <span style="font-size:9px;color:#444">(opzionale)</span></label>' +
    '<input class="modal-input" id="mLuogo" placeholder="es. Warehouse, Milano" value="' + (isEdit && ev.luogo ? ev.luogo : '') + '"/></div>' +
    '<div><label class="modal-label">// LOCANDINA</label>' +
    '<input type="file" id="mLocandinaFile" accept="image/*" style="display:none"/>' +
    '<button onclick="document.getElementById(\'mLocandinaFile\').click()" ' +
    'style="width:100%;padding:10px;background:transparent;border:1px dashed #2a2a2a;color:#555;' +
    'font-family:var(--mono);font-size:9px;letter-spacing:2px;cursor:pointer;border-radius:2px">📷 CARICA LOCANDINA</button>' +
    '<div id="mLocandinaPreview" style="margin-top:6px">' +
      (isEdit && ev.locandina
        ? '<div class="loc-img-wrap" onclick="openLightbox(this.querySelector(\'img\').src)">' +
          '<img src="' + ev.locandina + '" style="width:100%;border-radius:3px;max-height:160px;object-fit:contain"/>' +
          '<span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>'
        : '') +
    '</div></div>';

  setTimeout(function() {
    var fileInput = $id('mLocandinaFile');
    window._locandinaCancellata = false;

    window._clearLocandina = function() {
      var prev = $id('mLocandinaPreview');
      if (prev) prev.innerHTML = '';
      if (fileInput) { fileInput._b64 = null; fileInput.value = ''; }
      window._locandinaCancellata = true;
    };

    function showLocandinaPreview(src) {
      var prev = $id('mLocandinaPreview');
      if (!prev) return;
      prev.innerHTML =
        '<div class="loc-img-wrap" onclick="openLightbox(this.querySelector(\'img\').src)">' +
        '<img src="' + src + '" style="width:100%;border-radius:3px;max-height:160px;object-fit:contain"/>' +
        '<span class="loc-zoom-hint">🔍 INGRANDISCI</span></div>' +
        '<button onclick="_clearLocandina()" style="margin-top:4px;width:100%;padding:6px;background:transparent;' +
        'border:1px solid #cc2200;color:#cc2200;font-family:var(--mono);font-size:8px;' +
        'letter-spacing:2px;cursor:pointer;border-radius:2px">🗑 RIMUOVI LOCANDINA</button>';
    }

    if (fileInput) {
      fileInput.onchange = function() {
        var file = this.files[0];
        if (!file) return;
        window._locandinaCancellata = false;
        compressLocandina(file, function(b64) {
          fileInput._b64 = b64;
          showLocandinaPreview(b64);
        });
      };
    }

    // Aggiungi pulsante rimuovi se c'era già una locandina in modifica
    var prevEl = $id('mLocandinaPreview');
    if (prevEl && prevEl.querySelector('img')) {
      prevEl.innerHTML += '<button onclick="_clearLocandina()" style="margin-top:4px;width:100%;' +
        'padding:6px;background:transparent;border:1px solid #cc2200;color:#cc2200;' +
        'font-family:var(--mono);font-size:8px;letter-spacing:2px;cursor:pointer;border-radius:2px">' +
        '🗑 RIMUOVI LOCANDINA</button>';
    }
  }, 50);

  window._modalCb = function() {
    var locandinaFile = $id('mLocandinaFile');
    var nome   = $id('mNome').value.trim();
    var giorno = parseInt($id('mGiorno').value) || 1;
    var mese   = parseInt($id('mMese').value)   || 1;
    var anno   = parseInt($id('mAnno').value)   || new Date().getFullYear();

    var ggFRaw = $id('mGiornoFine').value.trim();
    var mmFRaw = $id('mMeseFine').value.trim();
    var aaFRaw = $id('mAnnoFine').value.trim();
    var hasDateFine = ggFRaw || mmFRaw || aaFRaw;
    var giornoFine = hasDateFine ? (parseInt(ggFRaw) || giorno) : null;
    var meseFine   = hasDateFine ? (parseInt(mmFRaw) || mese)   : null;
    var annoFine   = hasDateFine ? (parseInt(aaFRaw) || anno)   : null;

    if (!nome) { showToast('// INSERISCI IL NOME EVENTO', 'error'); return; }

    var errData = validaDataEvento(giorno, mese, anno);
    if (errData) { showToast('// ' + errData.toUpperCase(), 'error'); return; }

    if (hasDateFine) {
      var errFine = validaDataEvento(giornoFine, meseFine, annoFine);
      if (errFine) { showToast('// DATA FINE: ' + errFine.toUpperCase(), 'error'); return; }
      if (new Date(annoFine, meseFine-1, giornoFine) < new Date(anno, mese-1, giorno)) {
        showToast("// DATA FINE PRECEDENTE ALL'INIZIO", 'error'); return;
      }
    }

    var esistente = eventoEsistente(giorno, mese, anno, isEdit ? ev.id : -1);
    if (esistente) showToast('⚠ DATA GIÀ OCCUPATA DA: ' + esistente.nome, 'error', 3500);

    var obj = {
      id:         isEdit ? ev.id : getNextId('event'),
      nome:       nome,
      giorno:     giorno,
      mese:       mese,
      anno:       anno,
      giornoFine: giornoFine,
      meseFine:   meseFine,
      annoFine:   annoFine,
      ora:        $id('mOra').value.trim(),
      tipo:       $id('mTipo').value,
      desc:       $id('mDesc').value.trim(),
      note:       $id('mNote').value.trim(),
      luogo:      $id('mLuogo').value.trim(),
      locandina:  (locandinaFile && locandinaFile._b64)
                  ? locandinaFile._b64
                  : (window._locandinaCancellata ? null : (isEdit ? ev.locandina : null)),
    };

    if (isEdit) { EVENTI[editIdx] = obj; } else { EVENTI.push(obj); }
    saveEventi();
    addLog((isEdit ? 'modificato' : 'aggiunto') + ' evento: ' + obj.nome);
    buildAll();
    showToast('// EVENTO ' + (isEdit ? 'AGGIORNATO' : 'AGGIUNTO') + ' ✓', 'success');
    closeModal();
  };
  openModal();
}

function deleteEvento(i) {
  if (!canEdit()) return;
  showConfirm('Eliminare "' + EVENTI[i].nome + '"?', function() {
    var evId = EVENTI[i].id;
    addLog('eliminato evento: ' + EVENTI[i].nome);
    EVENTI.splice(i, 1);
    if (evId && EVENTI_VALUTAZIONI[evId]) { delete EVENTI_VALUTAZIONI[evId]; saveConfig(); }
    saveEventi();
    sCalSel = null;
    buildAll();
    showToast('// EVENTO ELIMINATO', 'error');
  });
}

// ════════════════════════════════════════
// MODAL SPESA
// ════════════════════════════════════════

function openSpesaModal(editIdx) {
  var isEdit = editIdx !== undefined && editIdx !== null;
  var item   = isEdit ? SPESA[editIdx] : null;
  $id('modalTitle').textContent = isEdit ? 'MODIFICA VOCE' : 'NUOVA VOCE';

  var staffMembers = MEMBERS.filter(function(m) {
    return m.role === ROLES.STAFF || m.role === ROLES.ADMIN || m.role === ROLES.AIUTANTE;
  });
  var whoOptions = staffMembers.map(function(m) {
    return '<option value="' + m.name + '"' + (isEdit && item.who===m.name ? ' selected' : '') + '>' +
           m.name + '</option>';
  }).join('');

  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// ARTICOLO</label>' +
    '<input class="modal-input" id="sNome" value="' + (isEdit ? item.nome : '') + '"/></div>' +
    '<div><label class="modal-label">// QUANTITÀ</label>' +
    '<input class="modal-input" id="sQty" value="' + (isEdit ? item.qty : '') + '"/></div>' +
    '<div><label class="modal-label">// ASSEGNATO A</label>' +
    '<select class="modal-input" id="sWho"><option value="-">—</option>' + whoOptions + '</select></div>';

  window._modalCb = function() {
    var obj = {
      id:            isEdit ? item.id : getNextId('spesa'),
      nome:          $id('sNome').value.trim(),
      qty:           $id('sQty').value.trim(),
      who:           $id('sWho').value,
      done:          isEdit ? item.done : false,
      fromMagazzino: isEdit ? (item.fromMagazzino || false) : false,
      magazzinoId:   isEdit ? (item.magazzinoId   || null)  : null,
      qtyNum:        isEdit ? (item.qtyNum        || null)  : null,
      costoUnitario: isEdit ? (item.costoUnitario || null)  : null,
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
// MODAL LAVORI
// ════════════════════════════════════════

function openLavoriModal(editIdx) {
  var isEdit = editIdx !== undefined && editIdx !== null;
  var item   = isEdit ? LAVORI[editIdx] : null;
  $id('modalTitle').textContent = isEdit ? 'MODIFICA LAVORO' : 'NUOVO LAVORO';

  var staffMembers = MEMBERS.filter(function(m) {
    return m.role === ROLES.STAFF || m.role === ROLES.ADMIN || m.role === ROLES.AIUTANTE;
  });
  var whoOptions = staffMembers.map(function(m) {
    return '<option value="' + m.name + '"' + (isEdit && item.who===m.name ? ' selected' : '') + '>' +
           m.name + '</option>';
  }).join('');

  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// DESCRIZIONE</label>' +
    '<input class="modal-input" id="lDesc" value="' + (isEdit ? item.lavoro : '') + '"/></div>' +
    '<div><label class="modal-label">// ASSEGNATO A</label>' +
    '<select class="modal-input" id="lWho"><option value="-">—</option>' + whoOptions + '</select></div>';

  window._modalCb = function() {
    var obj = {
      id:     isEdit ? item.id : getNextId('lavori'),
      lavoro: $id('lDesc').value.trim(),
      who:    $id('lWho').value,
      done:   isEdit ? item.done : false,
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

// ════════════════════════════════════════
// MODAL MAGAZZINO
// ════════════════════════════════════════

function openMagazzinoModal(editIdx, defaultCat) {
  var isEdit     = editIdx !== undefined && editIdx !== null;
  var item       = isEdit ? MAGAZZINO[editIdx] : null;
  var currentCat = isEdit ? (item.categoria || 'altro') : (defaultCat || 'altro');
  $id('modalTitle').textContent = isEdit ? 'MODIFICA MAGAZZINO' : 'NUOVO ARTICOLO';

  function catOpt(val, label) {
    return '<option value="' + val + '"' + (currentCat === val ? ' selected' : '') + '>' + label + '</option>';
  }

  $id('modalBody').innerHTML =
    '<div><label class="modal-label">// PRODOTTO</label>' +
    '<input class="modal-input" id="gNome" value="' + (isEdit ? item.nome : '') + '" placeholder="es. Birra, Bibite..."/></div>' +
    '<div><label class="modal-label">// CATEGORIA</label>' +
    '<select class="modal-input" id="gCategoria">' +
      catOpt('alcolico','🍺 ALCOLICI') + catOpt('analcolico','🥤 ANALCOLICI') + catOpt('altro','📦 ALTRO') +
    '</select></div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">// QTÀ ATTUALE</label>' +
      '<input class="modal-input" id="gAttuale" type="number" value="' + (isEdit ? item.attuale : '') + '"/></div>' +
      '<div><label class="modal-label">// MINIMO</label>' +
      '<input class="modal-input" id="gMinimo" type="number" value="' + (isEdit ? item.minimo : '') + '"/></div>' +
    '</div>' +
    '<div class="modal-row">' +
      '<div><label class="modal-label">// UNITÀ</label>' +
      '<input class="modal-input" id="gUnita" value="' + (isEdit ? item.unita : '') + '" placeholder="es. casse, kg, pz..."/></div>' +
      '<div><label class="modal-label">// COSTO UNITARIO (€)</label>' +
      '<input class="modal-input" id="gCosto" type="number" step="0.01" value="' + (isEdit ? item.costoUnitario : '') + '"/></div>' +
    '</div>';

  window._modalCb = function() {
    var obj = {
      id:            isEdit ? item.id : getNextId('magazzino'),
      nome:          $id('gNome').value.trim(),
      categoria:     $id('gCategoria').value,
      attuale:       parseInt($id('gAttuale').value)  || 0,
      minimo:        parseInt($id('gMinimo').value)   || 0,
      unita:         $id('gUnita').value.trim() || 'unità',
      costoUnitario: parseFloat($id('gCosto').value) || 0,
    };
    if (!obj.nome) return;

    // Aggiorna voci spesa collegate se in modifica
    if (isEdit) {
      SPESA.forEach(function(s) {
        if (s.fromMagazzino && s.magazzinoId === obj.id) {
          s.nome          = obj.nome;
          s.costoUnitario = obj.costoUnitario;
          s.unita         = obj.unita;
        }
      });
    }

    if (isEdit) { MAGAZZINO[editIdx] = obj; } else { MAGAZZINO.push(obj); }
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

function deleteMagazzino(i) {
  var item = MAGAZZINO[i];
  addLog('rimosso magazzino: ' + item.nome);
  for (var j = SPESA.length - 1; j >= 0; j--) {
    if (SPESA[j].fromMagazzino && SPESA[j].magazzinoId === item.id) SPESA.splice(j, 1);
  }
  MAGAZZINO.splice(i, 1);
  saveMagazzino();
  saveSpesa();
  buildMagazzino();
  buildSpesa();
}

// ════════════════════════════════════════
// MODAL ACCOUNT MEMBRO
// ════════════════════════════════════════

var COLORS_MEMBERS = [
  '#cc2200','#1a6b3c','#1a3a7a','#6b1a6b','#7a4a1a','#2a6b6b',
  '#5a5a1a','#4a2a6b','#6b4a2a','#1a5a5a',
];

// ════════════════════════════════════════
// PROFILO (modal openProfiloUtente — per utenti non-staff)
// ════════════════════════════════════════

function openProfiloUtente() {
  if (!currentUser) return;
  $id('modalTitle').textContent = 'IL MIO PROFILO';

  var colorSwatches = COLORS_MEMBERS.concat(['#4a2a6b','#6b4a2a','#1a5a5a','#8b2200','#2a4a8b','#5a1a3a']);
  var swatchesHtml  = colorSwatches.map(function(col) {
    return '<div class="color-swatch' + (col === currentUser.color ? ' selected' : '') +
           '" style="background:' + col + '" onclick="selectUtenteColor(this,\'' + col + '\')"></div>';
  }).join('');

  $id('modalBody').innerHTML =
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">' +
      '<div style="position:relative;flex-shrink:0">' +
        '<div id="uteAvatar" style="width:48px;height:48px;border-radius:50%;background:' + currentUser.color +
        ';display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:20px;' +
        'color:#fff;overflow:hidden">' +
          (currentUser.photo ? '<img src="' + currentUser.photo + '" style="width:100%;height:100%;object-fit:cover;display:block"/>'
                              : currentUser.initial) +
        '</div>' +
        '<button id="UteFotoBtn" title="Carica foto" style="position:absolute;bottom:-4px;right:-4px;' +
        'width:20px;height:20px;border-radius:50%;background:#222;border:1px solid #444;color:#aaa;' +
        'font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">📷</button>' +
        (currentUser.photo ? '<button id="UteDelFotoBtn" title="Elimina foto" style="position:absolute;top:-4px;right:-4px;' +
                             'width:18px;height:18px;border-radius:50%;background:#1a0000;border:1px solid #cc2200;color:#cc2200;' +
                             'font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>' : '') +
      '</div>' +
      '<div>' +
        '<div style="font-family:monospace;font-size:12px;letter-spacing:3px;color:var(--white)" id="uteNomeLabel">' +
          currentUser.name.toUpperCase() + '</div>' +
        '<div style="font-family:monospace;font-size:8px;color:#444;letter-spacing:1px">' +
          roleLabel(currentUser.role).label + '</div>' +
      '</div>' +
    '</div>' +
    '<div><label class="modal-label">// NOME</label>' +
    '<input class="modal-input" id="uteNome" value="' + currentUser.name + '" ' +
    'oninput="var av=$id(\'uteAvatar\');if(!av.querySelector(\'img\')){av.textContent=this.value.charAt(0).toUpperCase();}' +
    '$id(\'uteNomeLabel\').textContent=this.value.toUpperCase()"/></div>' +
    '<div style="margin-top:12px"><label class="modal-label">// COLORE AVATAR</label>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="uteColorPicker">' + swatchesHtml + '</div></div>' +
    '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">' +
    '<label class="modal-label">// CAMBIA PASSWORD</label>' +
    '<input class="modal-input" id="utePwAttuale" type="password" placeholder="Password attuale" style="margin-bottom:6px"/>' +
    '<input class="modal-input" id="utePwNuova" type="password" placeholder="Nuova password" style="margin-bottom:6px"/>' +
    '<input class="modal-input" id="utePwConferma" type="password" placeholder="Conferma password"/>' +
    '<div id="utePwError" style="font-family:var(--mono);font-size:9px;color:var(--red);' +
    'letter-spacing:2px;min-height:16px;margin-top:4px"></div></div>';

  window._modalCb = async function() {
    var nome = $id('uteNome').value.trim();
    if (!nome) return;
    var att   = $id('utePwAttuale').value;
    var nuova = $id('utePwNuova').value.trim();
    var conf  = $id('utePwConferma').value.trim();
    var errEl = $id('utePwError');
    if (att || nuova || conf) {
      if (!(await pwMatch(att, currentUser.password))) { errEl.textContent = '// PASSWORD ATTUALE ERRATA'; return; }
      if (nuova.length < 4) { errEl.textContent = '// PASSWORD TROPPO CORTA (min 4)'; return; }
      if (nuova !== conf)   { errEl.textContent = '// LE PASSWORD NON COINCIDONO'; return; }
      var nuovaHash = await sha256(nuova);
      for (var mi = 0; mi < MEMBERS.length; mi++) {
        if (MEMBERS[mi].name !== currentUser.name && MEMBERS[mi].password === nuovaHash) {
          errEl.textContent = "// PASSWORD NON DISPONIBILE — SCEGLINE UN'ALTRA"; return;
        }
      }
      currentUser.password = nuovaHash;
      addLog('ha cambiato la password');
    }
    currentUser.name    = nome;
    currentUser.initial = nome.charAt(0).toUpperCase();
    addLog('ha aggiornato il profilo');
    saveMembers();
    buildAll();
    closeModal();
  };

  openModal();

  setTimeout(function() {
    var fotoBtn = $id('UteFotoBtn');
    if (fotoBtn) {
      fotoBtn.onclick = function() {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function() {
          if (!inp.files[0]) return;
          compressAndSavePhoto(inp.files[0], function(b64) {
            currentUser.photo = b64;
            var av = $id('uteAvatar');
            if (av) {
              av.style.background = 'transparent';
              av.innerHTML = '<img src="' + b64 + '" style="width:100%;height:100%;object-fit:cover;display:block"/>';
            }
            addLog('ha aggiornato la foto profilo');
            saveMembers();
          });
        };
        inp.click();
      };
    }
    var delFotoBtn = $id('UteDelFotoBtn');
    if (delFotoBtn) {
      delFotoBtn.onclick = function() {
        currentUser.photo = null;
        var av = $id('uteAvatar');
        if (av) { av.style.background = currentUser.color; av.innerHTML = currentUser.initial; }
        delFotoBtn.remove();
        addLog('ha rimosso la foto profilo');
        saveMembers();
      };
    }
  }, 50);
}

function selectUtenteColor(el, col) {
  currentUser.color = col;
  document.querySelectorAll('#uteColorPicker .color-swatch').forEach(function(s) {
    s.classList.remove('selected');
  });
  el.classList.add('selected');
  $id('uteAvatar').style.background = col;
  saveMembers();
}

// ════════════════════════════════════════
// VALIDAZIONE DATE
// ════════════════════════════════════════

function validaDataEvento(giorno, mese, anno) {
  if (anno < 2020 || anno > 2100) return 'Anno non valido';
  if (mese < 1   || mese > 12)   return 'Mese non valido (1-12)';
  var maxGiorni = new Date(anno, mese, 0).getDate();
  if (giorno < 1 || giorno > maxGiorni) return 'Giorno non valido (1-' + maxGiorni + ')';
  return null;
}

function eventoEsistente(giorno, mese, anno, excludeId) {
  return EVENTI.find(function(e) {
    return e.giorno === giorno && e.mese === mese && e.anno === anno && e.id !== excludeId;
  });
}

// ════════════════════════════════════════
// STAMPA PROGRAMMA EVENTI (PDF)
// ════════════════════════════════════════

function stampaProgrammaEventi() {
  var today  = new Date(); today.setHours(0,0,0,0);
  var eventi = EVENTI
    .filter(function(e) { return new Date(e.anno, e.mese-1, e.giorno) >= today; })
    .sort(function(a,b)  { return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno); });

  var rows = eventi.map(function(e) {
    return '<div class="ev">' +
      '<div class="ev-nome">' + e.nome + '</div>' +
      '<div class="ev-meta">' + e.giorno + '/' + e.mese + '/' + e.anno + ' · ' + e.ora + '</div>' +
      '<div class="ev-tipo">' + e.tipo.toUpperCase() + '</div>' +
      (e.desc ? '<div class="ev-desc">' + e.desc + '</div>' : '') +
      (e.note ? '<div class="ev-note">' + e.note + '</div>' : '') +
    '</div>';
  }).join('');

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<title>Programma Eventi — Bunker 23</title>' +
    '<style>body{font-family:"Courier New",monospace;background:#fff;color:#111;margin:0;padding:24px;font-size:12px}' +
    'h1{font-size:22px;letter-spacing:4px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:20px}' +
    '.ev{margin-bottom:16px;padding:12px;border:1px solid #ccc;border-radius:3px;page-break-inside:avoid}' +
    '.ev-nome{font-size:16px;font-weight:bold;letter-spacing:2px;margin-bottom:4px}' +
    '.ev-meta{font-size:10px;color:#555;letter-spacing:1px;margin-bottom:4px}' +
    '.ev-tipo{display:inline-block;font-size:9px;letter-spacing:2px;padding:2px 6px;border:1px solid #999;border-radius:2px;margin-bottom:6px}' +
    '.ev-desc{font-size:11px;color:#333;line-height:1.5}.ev-note{font-size:10px;color:#777;margin-top:4px}' +
    '.footer{margin-top:32px;font-size:9px;color:#aaa;text-align:right;letter-spacing:2px}' +
    '@media print{body{padding:12px}}</style></head><body>' +
    '<h1>BUNKER 23 · PROGRAMMA EVENTI</h1>' +
    (rows || '<p style="color:#aaa;font-style:italic">Nessun evento futuro</p>') +
    '<div class="footer">Generato il ' + new Date().toLocaleDateString('it-IT') + ' · BUNKER 23</div>' +
    '</body></html>';

  var win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(function() { win.print(); }, 400);
  }
}

// ════════════════════════════════════════
// BOOT — splash & navigazione iniziale
// ════════════════════════════════════════

function enterAsGuest() {
  guestMode   = true;
  currentUser = null;

  loadAllData().then(function() {
    _sbReady = true;
    initRealtime();
    buildAll();
    if (typeof applyPageSections === 'function') {
      applyPageSections('home');
      applyPageSections('bacheca');
      applyPageSections('info');
    }
    if (typeof applyGuestMessage === 'function') applyGuestMessage();
    if (typeof applySplashTexts  === 'function') applySplashTexts();
    updateHomeAccessLevel();
    navigate('screenHome');
  }).catch(function(err) {
    console.warn('[enterAsGuest] loadAllData error:', err);
    buildAll();
    updateHomeAccessLevel();
    navigate('screenHome');
  });

  setInterval(updateClocks, 30000);
  updateClocks();
  initSwipe();
  restoreSession();
}

function handleStaffBtn() {
  if (isAiutante()) {
    navigate('screenStaff');
  } else if (currentUser) {
    navigate('screenStaff');
  } else {
    goToLogin();
  }
}

// ════════════════════════════════════════
// CERCA EVENTI HOME (pubblica)
// ════════════════════════════════════════

function toggleHomeCerca() {
  var panel = $id('homeCercaPanel');
  var btn   = $id('homeCercaBtn');
  if (!panel) return;
  var isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (btn) {
    btn.style.borderColor  = isOpen ? '' : 'var(--red)';
    btn.style.color        = isOpen ? '' : 'var(--red)';
  }
  if (!isOpen) eseguiHomeCerca();
}

function eseguiHomeCerca() {
  var nome   = ($id('homeCercaNome')   || {value:''}).value.trim().toLowerCase();
  var giorno = parseInt(($id('homeCercaGiorno') || {value:''}).value) || 0;
  var mese   = parseInt(($id('homeCercaMese')   || {value:''}).value) || 0;
  var anno   = parseInt(($id('homeCercaAnno')   || {value:''}).value) || 0;
  var result = $id('homeCercaResults');
  if (!result) return;

  var filtered = EVENTI.filter(function(e) {
    if (['privato','segreto'].indexOf(e.tipo) >= 0) return false;
    if (nome   && e.nome.toLowerCase().indexOf(nome) < 0 &&
                  (e.desc || '').toLowerCase().indexOf(nome) < 0) return false;
    if (giorno && e.giorno !== giorno) return false;
    if (mese   && e.mese   !== mese)   return false;
    if (anno   && e.anno   !== anno)   return false;
    return true;
  }).sort(function(a,b) {
    return new Date(a.anno,a.mese-1,a.giorno) - new Date(b.anno,b.mese-1,b.giorno);
  });

  result.innerHTML = '';
  if (!nome && !giorno && !mese && !anno) return;

  if (!filtered.length) {
    result.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:#333;' +
      'text-align:center;padding:12px;letter-spacing:2px">NESSUN RISULTATO</div>';
    return;
  }

  filtered.forEach(function(ev) {
    var d    = new Date(ev.anno, ev.mese-1, ev.giorno);
    var dow  = d.getDay();
    var dowI = dow === 0 ? 6 : dow - 1;
    var item = document.createElement('div');
    item.className = 'cal-detail-card';
    item.style.borderLeft = '3px solid ' + TIPO_COLOR[ev.tipo];
    item.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">' +
        '<div class="cal-detail-title" style="font-size:12px">' + ev.nome + '</div>' +
        tag(ev.tipo) +
      '</div>' +
      '<div class="cal-detail-meta">' +
        '🗓️ ' + GIORNI_FULL[dowI] + ' ' + ev.giorno + ' ' + MESI[ev.mese-1] + ' ' + ev.anno +
        ' · ORE ' + ev.ora +
      '</div>';
    item.onclick = function() {
      calSel = ev.giorno; calMonth = ev.mese; calYear = ev.anno;
      buildCal();
      toggleHomeCerca();
    };
    result.appendChild(item);
  });
}

// ════════════════════════════════════════
// ESPORTA / IMPORTA DATI (admin)
// ════════════════════════════════════════

function esportaDati() {
  if (!isAdmin()) return;
  var payload = {
    _version:        2,
    _exportedAt:     new Date().toISOString(),
    MEMBRI:          MEMBERS,
    EVENTI:          EVENTI,
    SPESA:           SPESA,
    LAVORI:          LAVORI,
    MAGAZZINO:       MAGAZZINO,
    PAGAMENTI:       PAGAMENTI,
    SUGGERIMENTI:    SUGGERIMENTI,
    VALUTAZIONI:     VALUTAZIONI,
    EVENTI_VALUTAZIONI: EVENTI_VALUTAZIONI,
    BACHECA:         BACHECA,
    INFO:            INFO,
    CONSIGLIATI:     CONSIGLIATI,
    LINKS_PAGE:      LINKS_PAGE,
    LINKS_EVENTO:    LINKS_EVENTO,
    WIDGET_CONFIG:   WIDGET_CONFIG,
    TAB_CONFIG:      TAB_CONFIG,
    PAGE_SECTIONS:   PAGE_SECTIONS,
    PAGE_EDIT_PERMS: PAGE_EDIT_PERMS,
    GUEST_MESSAGE:   GUEST_MESSAGE,
    SPLASH_TEXTS:    SPLASH_TEXTS,
    BENVENUTO_TEXT:  BENVENUTO_TEXT,
  };

  var json = JSON.stringify(payload, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  var ts   = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = 'bunker23-backup-' + ts + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('// BACKUP ESPORTATO ✓', 'success');
}

function importaDati(input) {
  if (!isAdmin()) return;
  var file = input && input.files && input.files[0];
  if (!file) return;

  var msg = $id('importMsg');
  if (msg) msg.textContent = '// LETTURA IN CORSO...';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);

      if (data.MEMBRI)              MEMBERS           = data.MEMBRI;
      if (data.EVENTI)              EVENTI            = data.EVENTI;
      if (data.SPESA)               SPESA             = data.SPESA;
      if (data.LAVORI)              LAVORI            = data.LAVORI;
      if (data.MAGAZZINO)           MAGAZZINO         = data.MAGAZZINO;
      if (data.PAGAMENTI)           PAGAMENTI         = data.PAGAMENTI;
      if (data.SUGGERIMENTI)        SUGGERIMENTI      = data.SUGGERIMENTI;
      if (data.VALUTAZIONI)         VALUTAZIONI       = data.VALUTAZIONI;
      if (data.EVENTI_VALUTAZIONI)  EVENTI_VALUTAZIONI = data.EVENTI_VALUTAZIONI;
      if (data.BACHECA)             BACHECA           = data.BACHECA;
      if (data.INFO)                INFO              = data.INFO;
      if (data.CONSIGLIATI)         CONSIGLIATI       = data.CONSIGLIATI;
      if (data.LINKS_PAGE)          Object.assign(LINKS_PAGE,      data.LINKS_PAGE);
      if (data.LINKS_EVENTO)        Object.assign(LINKS_EVENTO,    data.LINKS_EVENTO);
      if (data.WIDGET_CONFIG)       Object.assign(WIDGET_CONFIG,   data.WIDGET_CONFIG);
      if (data.TAB_CONFIG)          Object.assign(TAB_CONFIG,      data.TAB_CONFIG);
      if (data.PAGE_SECTIONS)       Object.assign(PAGE_SECTIONS,   data.PAGE_SECTIONS);
      if (data.PAGE_EDIT_PERMS)     Object.assign(PAGE_EDIT_PERMS, data.PAGE_EDIT_PERMS);
      if (data.GUEST_MESSAGE)       Object.assign(GUEST_MESSAGE,   data.GUEST_MESSAGE);
      if (data.SPLASH_TEXTS)        Object.assign(SPLASH_TEXTS,    data.SPLASH_TEXTS);
      if (typeof data.BENVENUTO_TEXT === 'string') BENVENUTO_TEXT = data.BENVENUTO_TEXT;

      saveToStorage();
      buildAll();
      if (msg) msg.textContent = '// IMPORTAZIONE COMPLETATA ✓';
      showToast('// DATI IMPORTATI ✓', 'success');
      addLog('ha importato un backup dati');
      if (input) input.value = '';
    } catch (err) {
      console.error('[importaDati]', err);
      if (msg) msg.textContent = '// ERRORE: FILE NON VALIDO';
      showToast('// ERRORE IMPORTAZIONE', 'error');
    }
  };
  reader.readAsText(file);
}
