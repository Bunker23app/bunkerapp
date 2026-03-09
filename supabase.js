// ════════════════════════════════════════════════════════════════
// supabase.js v2.5 — Bunker23  |  Persistenza Supabase
// ════════════════════════════════════════════════════════════════
// TABELLE:
//   appconfig    — config globale (JSON blob, id=1)
//   members      — utenti
//   calendario   — eventi
//   spesa        — lista spesa
//   lavori       — task/lavori
//   magazzino    — stock quantità
//   pagamenti    — saldi e movimenti
//   suggerimenti — feedback utenti
//   valutazioni  — recensioni eventi
//   chat         — messaggi (realtime)
//   log          — azioni (realtime)
//
// STRATEGIA DI CARICAMENTO v2.5:
//   1. La config viene letta da localStorage (cache) PRIMA di qualsiasi
//      chiamata di rete → la splash/UI si aggiorna istantaneamente.
//   2. Tutte le query Supabase vengono lanciate tramite RPC get_all_data()
//      in una SINGOLA chiamata di rete → minima latenza.
//   3. Fallback automatico alle query separate se la RPC non è disponibile.
//   4. _sbReady e _membersReady sono variabili GLOBALI (no 'use strict')
//      così ui.js può leggerle/scriverle senza conflitti di scope.
//
// FIX v2.5 rispetto a v2.4:
//   - Rimosso 'use strict' che poteva causare problemi di scope con ui.js
//   - _sbReady e _membersReady ora sono variabili globali condivise
//   - loadAllData() usa RPC get_all_data() come percorso primario
//   - Fallback robusto alle 11 query parallele se la RPC manca
//   - Aggiunto try/catch globale in loadAllData() per garantire che
//     _sbReady e _membersReady vengano sempre impostati anche in caso
//     di errore imprevisto
// ════════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────────
var SUPABASE_URL = 'https://ndcpekgxnawxwbvfseba.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kY3Bla2d4bmF3eHdidmZzZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzU5NjksImV4cCI6MjA4ODQ1MTk2OX0.EmvG_iqAO3JcgCPk49fwEGcQQIOkeZhN076PuklD118';

// Chiave localStorage per la cache della config (UNICO uso di localStorage in tutta l'app)
var CONFIG_CACHE_KEY = 'bunker23_config_cache';

// ── STATO GLOBALE (accessibile da ui.js senza conflitti di scope) ──
// NOTA: queste variabili sono dichiarate con var (non let) così sono
// accessibili globalmente anche da ui.js che le imposta nel .then()
var _sb          = null;    // client Supabase (lazy init)
var _sbReady     = false;   // true dopo loadAllData() — usato come guard nelle save*
var _membersReady = false;  // true dopo che i MEMBERS sono stati caricati da Supabase
var _timers      = {};      // debounce timer map  { key → timeoutId }

// Per evitare il "echo" realtime dei propri messaggi.
var _pendingChatKeys = {};
var _PENDING_CHAT_TTL = 15000;

function _setPendingChat(key) {
  _pendingChatKeys[key] = setTimeout(function() { delete _pendingChatKeys[key]; }, _PENDING_CHAT_TTL);
}
function _clearPendingChat(key) {
  clearTimeout(_pendingChatKeys[key]);
  delete _pendingChatKeys[key];
}

// Canali realtime
var _chatChannel = null;
var _logChannel  = null;

// ── CLIENT ────────────────────────────────────────────────────────
function getSupabase() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── HELPERS ───────────────────────────────────────────────────────

/** Debounce generico */
function _debounce(key, fn, ms) {
  ms = ms || 600;
  clearTimeout(_timers[key]);
  _timers[key] = setTimeout(fn, ms);
}

/** Upsert silenzioso */
async function _sbUpsert(table, data) {
  if (!_sbReady) return;
  try {
    var result = await getSupabase().from(table).upsert(data);
    if (result.error) console.warn('[sb.' + table + ']', result.error.message);
  } catch (e) { console.warn('[sb.' + table + ']', e.message); }
}

/** Insert con return del record creato */
async function _sbInsert(table, data) {
  if (!_sbReady) return null;
  try {
    var result = await getSupabase().from(table).insert(data).select().single();
    if (result.error) { console.warn('[sb.' + table + ']', result.error.message); return null; }
    return result.data;
  } catch (e) { console.warn('[sb.' + table + ']', e.message); return null; }
}

/** Delete per colonna = valore */
async function _sbDelete(table, col, val) {
  if (!_sbReady) return;
  try {
    var result = await getSupabase().from(table).delete().eq(col, val);
    if (result.error) console.warn('[sb.' + table + ']', result.error.message);
  } catch (e) { console.warn('[sb.' + table + ']', e.message); }
}

/** Delete tutto (dove col numerico > 0) */
async function _sbClear(table, col) {
  col = col || 'id';
  if (!_sbReady) return;
  try {
    var result = await getSupabase().from(table).delete().gt(col, 0);
    if (result.error) console.warn('[sb.' + table + ' clear]', result.error.message);
  } catch (e) { console.warn('[sb.' + table + ' clear]', e.message); }
}

/** Formatta data JS → stringa 'YYYY-MM-DD' */
function _dateStr(anno, mese, giorno) {
  return anno + '-' + String(mese).padStart(2,'0') + '-' + String(giorno).padStart(2,'0');
}

/** Formatta timestamp log */
function _formatLogTime(d) {
  var now = new Date();
  var isToday = d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear();
  var time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return 'OGGI · ' + time;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' · ' + time;
}


// ═════════════════════════════════════════════════════════════════
// SAVE FUNCTIONS
// ═════════════════════════════════════════════════════════════════

/** CONFIG — blob JSON in appconfig (id=1) */
function saveConfig() {
  _debounce('config', async function() {
    var cfg = {
      WIDGET_CONFIG: WIDGET_CONFIG, TAB_CONFIG: TAB_CONFIG,
      BENVENUTO_TEXT: BENVENUTO_TEXT,
      AIUTANTE_WIDGET_CONFIG: AIUTANTE_WIDGET_CONFIG,
      AIUTANTE_TAB_CONFIG: AIUTANTE_TAB_CONFIG,
      PAGE_SECTIONS: PAGE_SECTIONS, PAGE_EDIT_PERMS: PAGE_EDIT_PERMS,
      GUEST_MESSAGE: GUEST_MESSAGE, SPLASH_TEXTS: SPLASH_TEXTS,
      LINKS_PAGE: LINKS_PAGE, LINKS_EVENTO: LINKS_EVENTO,
      _nextLinkId: _nextLinkId,
      CONSIGLIATI: CONSIGLIATI, EVENTI_VALUTAZIONI: EVENTI_VALUTAZIONI,
      BACHECA: BACHECA, INFO: INFO, _nextIds: _nextIds,
    };
    _writeCfgCache(cfg);
    await _sbUpsert('appconfig', { id: 1, data: cfg });
  }, MS_DEBOUNCE);
}

/** MEMBERS — upsert batch (conflict su 'name') */
function saveMembers() {
  _debounce('members', async function() {
    if (!_sbReady) return;
    var rows = MEMBERS.map(function(m) {
      return {
        name:          m.name,
        initial:       m.initial || m.name.charAt(0).toUpperCase(),
        color:         m.color  || '#444',
        password_hash: m.password || '',
        role:          m.role   || 'utente',
        foto_url:      m.photo  || null,
        sospeso:       m.sospeso || false,
      };
    });
    var result = await getSupabase().from('members').upsert(rows, { onConflict: 'name' });
    if (result.error) console.warn('[sb.members]', result.error.message);
  }, MS_DEBOUNCE);
}

/** EVENTI (calendario) — upsert + pulizia righe orfane */
function saveEventi() {
  _debounce('eventi', async function() {
    if (!_sbReady) return;
    try {
      var rows = EVENTI.map(function(e) {
        return {
          id:          e.id,
          titolo:      e.nome,
          data:        _dateStr(e.anno, e.mese, e.giorno),
          data_fine:   (e.giornoFine && e.meseFine && e.annoFine)
                         ? _dateStr(e.annoFine, e.meseFine, e.giornoFine)
                         : null,
          ora:         e.ora       || '',
          luogo:       e.luogo     || '',
          note:        e.note      || '',
          descrizione: e.desc      || '',
          tipo:        e.tipo      || 'invito',
          locandina:   e.locandina || null,
          pubblico:    (e.tipo === 'invito' || e.tipo === 'consigliato'),
          created_by:  currentUser ? currentUser.name : null,
        };
      });

      var result = await getSupabase().from('calendario').upsert(rows, { onConflict: 'id' });
      if (result.error) { console.warn('[sb.calendario]', result.error.message); return; }

      var ids = EVENTI.map(function(e) { return e.id; });
      if (ids.length) {
        await getSupabase().from('calendario').delete().not('id', 'in', '(' + ids.join(',') + ')');
      } else {
        await _sbClear('calendario');
      }
    } catch (e) { console.warn('[sb.calendario]', e.message); }
  }, MS_DEBOUNCE);
}

/** SPESA — replace totale (delete + insert) */
function saveSpesa() {
  _debounce('spesa', async function() {
    if (!_sbReady) return;
    try {
      await _sbClear('spesa');
      if (!SPESA.length) return;
      var rows = SPESA.map(function(s) {
        return {
          id:             s.id,
          item:           s.nome || s.item || '',
          done:           s.done || false,
          qty:            s.qty  || '',
          costo_unitario: s.costoUnitario || 0,
          unita:          s.unita || '',
          from_magazzino: s.fromMagazzino || false,
          magazzino_id:   s.magazzinoId  || null,
          added_by:       currentUser ? currentUser.name : null,
        };
      });
      var result = await getSupabase().from('spesa').insert(rows);
      if (result.error) console.warn('[sb.spesa]', result.error.message);
    } catch (e) { console.warn('[sb.spesa]', e.message); }
  }, MS_DEBOUNCE);
}

/** LAVORI — replace totale */
function saveLavori() {
  _debounce('lavori', async function() {
    if (!_sbReady) return;
    try {
      await _sbClear('lavori');
      if (!LAVORI.length) return;
      var rows = LAVORI.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      var result = await getSupabase().from('lavori').insert(rows);
      if (result.error) console.warn('[sb.lavori]', result.error.message);
    } catch (e) { console.warn('[sb.lavori]', e.message); }
  }, MS_DEBOUNCE);
}

/** MAGAZZINO — upsert quantità (solo item_id + attuale) */
function saveMagazzino() {
  _debounce('magazzino', async function() {
    if (!_sbReady) return;
    try {
      var sb   = getSupabase();
      var rows = MAGAZZINO.map(function(m) { return { item_id: m.id, attuale: m.attuale }; });
      var result = await sb.from('magazzino').upsert(rows, { onConflict: 'item_id' });
      if (result.error) {
        console.warn('[sb.magazzino] upsert fallback:', result.error.message);
        await _sbClear('magazzino', 'item_id');
        var result2 = await sb.from('magazzino').insert(rows);
        if (result2.error) {
          console.warn('[sb.magazzino]', result2.error.message);
          if (typeof showToast === 'function') showToast('// ERRORE MAGAZZINO: ' + result2.error.message, 'error');
        }
      }
    } catch (e) {
      console.warn('[sb.magazzino]', e.message);
      if (typeof showToast === 'function') showToast('// ERRORE MAGAZZINO: ' + e.message, 'error');
    }
  }, MS_DEBOUNCE);
}

/** PAGAMENTI — upsert per member_name */
function savePagamenti() {
  _debounce('pagamenti', async function() {
    if (!_sbReady) return;
    try {
      var rows = PAGAMENTI.map(function(p) {
        return {
          member_name: p.name,
          saldo:       p.saldo     || 0,
          movimenti:   JSON.stringify(p.movimenti || []),
        };
      });
      var result = await getSupabase().from('pagamenti').upsert(rows, { onConflict: 'member_name' });
      if (result.error) console.warn('[sb.pagamenti]', result.error.message);
    } catch (e) { console.warn('[sb.pagamenti]', e.message); }
  }, MS_DEBOUNCE);
}

/** SUGGERIMENTI — replace totale */
function saveSuggerimenti() {
  _debounce('suggerimenti', async function() {
    if (!_sbReady) return;
    try {
      await _sbClear('suggerimenti');
      if (!SUGGERIMENTI.length) return;
      var rows = SUGGERIMENTI.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author || null, ts: new Date(s.id).toISOString() };
      });
      var result = await getSupabase().from('suggerimenti').insert(rows);
      if (result.error) console.warn('[sb.suggerimenti]', result.error.message);
    } catch (e) { console.warn('[sb.suggerimenti]', e.message); }
  }, MS_DEBOUNCE);
}

/** VALUTAZIONI — replace totale */
function saveValutazioni() {
  _debounce('valutazioni', async function() {
    if (!_sbReady) return;
    try {
      await _sbClear('valutazioni');
      if (!VALUTAZIONI.length) return;
      var rows = VALUTAZIONI.map(function(v) {
        return { id: v.id, author: v.nome, stelle: v.stelle || 0, testo: v.testo || '', ts: new Date(v.id).toISOString() };
      });
      var result = await getSupabase().from('valutazioni').insert(rows);
      if (result.error) console.warn('[sb.valutazioni]', result.error.message);
    } catch (e) { console.warn('[sb.valutazioni]', e.message); }
  }, MS_DEBOUNCE);
}

// ── INSERT SINGOLI (chat / log) ───────────────────────────────────

async function saveChatMessage(msg) {
  if (!_sbReady) return;
  var key = msg.who + '|' + msg.testo;
  _setPendingChat(key);
  try {
    var result = await getSupabase().from('chat').insert({
      author: msg.who,
      text:   msg.testo,
      ts:     new Date(msg.ts).toISOString(),
    });
    if (result.error) { console.warn('[sb.chat]', result.error.message); _clearPendingChat(key); }
  } catch (e) { console.warn('[sb.chat]', e.message); _clearPendingChat(key); }
}

async function saveLogEntry(entry) {
  if (!_sbReady) return;
  try {
    var result = await getSupabase().from('log').insert({
      author: entry.member.name,
      action: entry.azione,
      ts:     new Date().toISOString(),
    });
    if (result.error) console.warn('[sb.log]', result.error.message);
  } catch (e) { console.warn('[sb.log]', e.message); }
}

// ── SVUOTA REMOTO ─────────────────────────────────────────────────
async function clearChatRemote() { await _sbClear('chat'); }
async function clearLogRemote()  { await _sbClear('log');  }

/** Usata SOLO da importaDati() dopo import backup */
function saveToStorage() {
  saveConfig();
  saveMembers();
  saveEventi();
  saveSpesa();
  saveLavori();
  saveMagazzino();
  savePagamenti();
  saveSuggerimenti();
  saveValutazioni();
}

// ═════════════════════════════════════════════════════════════════
// CONFIG CACHE  (localStorage — UNICO uso in tutta l'app)
// ═════════════════════════════════════════════════════════════════

function _readCfgCache() {
  try {
    var raw = localStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function _writeCfgCache(cfg) {
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg));
  } catch(e) { console.warn('[cfg cache write]', e.message); }
}

// ═════════════════════════════════════════════════════════════════
// APPLY CONFIG
// ═════════════════════════════════════════════════════════════════

function _applyOrdered(local, saved, applyFn) {
  if (!saved || !saved.length) return;
  saved.forEach(function(ds) {
    var item = local.find(function(x) { return x.id === ds.id; });
    if (!item) return;
    item.enabled = ds.enabled;
    if (applyFn) applyFn(item, ds);
  });
  var ordered = [];
  saved.forEach(function(ds) {
    var item = local.find(function(x) { return x.id === ds.id; });
    if (item) ordered.push(item);
  });
  local.forEach(function(item) { if (!ordered.find(function(x) { return x.id === item.id; })) ordered.push(item); });
  local.splice(0, local.length).concat(ordered).forEach(function(_, i, arr) {}); // no-op dopo splice
  ordered.forEach(function(item) { local.push(item); });
}

function _applyConfig(cfg) {
  if (!cfg) return;

  if (cfg.WIDGET_CONFIG) {
    _applyOrdered(WIDGET_CONFIG, cfg.WIDGET_CONFIG, function(item, ds) { if (ds.label) item.label = ds.label; });
  }

  if (cfg.TAB_CONFIG) {
    cfg.TAB_CONFIG.forEach(function(dt) {
      var t = TAB_CONFIG.find(function(x) { return x.id === dt.id; });
      if (t) t.enabled = dt.enabled;
    });
  }

  if (typeof cfg.BENVENUTO_TEXT === 'string') BENVENUTO_TEXT = cfg.BENVENUTO_TEXT;

  if (cfg.AIUTANTE_WIDGET_CONFIG) {
    _applyOrdered(AIUTANTE_WIDGET_CONFIG, cfg.AIUTANTE_WIDGET_CONFIG, function(item, ds) { if (ds.label) item.label = ds.label; });
  }

  if (cfg.AIUTANTE_TAB_CONFIG) {
    cfg.AIUTANTE_TAB_CONFIG.forEach(function(dt) {
      var t = AIUTANTE_TAB_CONFIG.find(function(x) { return x.id === dt.id; });
      if (t) t.enabled = dt.enabled;
    });
  }

  if (cfg.PAGE_SECTIONS) {
    ['home', 'bacheca', 'info'].forEach(function(page) {
      if (!cfg.PAGE_SECTIONS[page]) return;
      _applyOrdered(PAGE_SECTIONS[page], cfg.PAGE_SECTIONS[page], function(item, ds) { item.enabled = ds.enabled; });
    });
  }

  if (cfg.PAGE_EDIT_PERMS) Object.assign(PAGE_EDIT_PERMS, cfg.PAGE_EDIT_PERMS);
  if (cfg.GUEST_MESSAGE)   Object.assign(GUEST_MESSAGE, cfg.GUEST_MESSAGE);
  if (cfg.SPLASH_TEXTS)    Object.assign(SPLASH_TEXTS, cfg.SPLASH_TEXTS);
  if (cfg.LINKS_PAGE)      Object.assign(LINKS_PAGE, cfg.LINKS_PAGE);
  if (cfg.LINKS_EVENTO)    Object.assign(LINKS_EVENTO, cfg.LINKS_EVENTO);
  if (cfg._nextLinkId)     _nextLinkId = cfg._nextLinkId;

  var _maxLinkId = 0;
  Object.values(LINKS_PAGE).forEach(function(arr) { arr.forEach(function(l) { if ((l.id || 0) >= _maxLinkId) _maxLinkId = l.id + 1; }); });
  Object.values(LINKS_EVENTO).forEach(function(arr) { arr.forEach(function(l) { if ((l.id || 0) >= _maxLinkId) _maxLinkId = l.id + 1; }); });
  if (_maxLinkId > _nextLinkId) _nextLinkId = _maxLinkId;

  if (cfg.CONSIGLIATI)        CONSIGLIATI = cfg.CONSIGLIATI;
  if (cfg.EVENTI_VALUTAZIONI) EVENTI_VALUTAZIONI = cfg.EVENTI_VALUTAZIONI;
  if (cfg._nextIds)           Object.assign(_nextIds, cfg._nextIds);

  if (cfg.BACHECA) {
    BACHECA = cfg.BACHECA;
    var maxBId = BACHECA.reduce(function(m, b) { return Math.max(m, b.id || 0); }, 0);
    if (maxBId >= _nextIds.bacheca) _nextIds.bacheca = maxBId + 1;
  }
  if (cfg.INFO) {
    INFO = cfg.INFO;
    var maxIId = INFO.reduce(function(m, b) { return Math.max(m, b.id || 0); }, 0);
    if (maxIId >= _nextIds.info) _nextIds.info = maxIId + 1;
  }
}

// ═════════════════════════════════════════════════════════════════
// APPLICA RISULTATI  (helper condiviso tra RPC e query separate)
// ═════════════════════════════════════════════════════════════════

function _applyAllResults(results) {
  var cfgData          = results.cfg;
  var membersData      = results.members;
  var calendarioData   = results.calendario;
  var spesaData        = results.spesa;
  var lavoriData       = results.lavori;
  var magazzinoData    = results.magazzino;
  var pagamentiData    = results.pagamenti;
  var chatData         = results.chat;
  var logData          = results.log;
  var suggerimentiData = results.suggerimenti;
  var valutazioniData  = results.valutazioni;

  // 1. CONFIG
  try {
    if (cfgData) {
      _writeCfgCache(cfgData);
      _applyConfig(cfgData);
    }
  } catch (e) { console.warn('[load appconfig]', e.message); }

  // 2. MEMBERS
  try {
    if (membersData && membersData.length) {
      membersData.forEach(function(dm) {
        var mapped = {
          name: dm.name, initial: dm.initial, color: dm.color,
          password: dm.password_hash, role: dm.role,
          photo: dm.foto_url || null, sospeso: dm.sospeso || false,
        };
        var existing = MEMBERS.find(function(m) { return m.name === dm.name; });
        if (existing) Object.assign(existing, mapped);
        else MEMBERS.push(mapped);
      });
    }
  } catch (e) { console.warn('[load members]', e.message); }
  // Sempre impostato, anche in caso di errore parziale
  _membersReady = true;

  // 3. CALENDARIO
  try {
    if (calendarioData && calendarioData.length) {
      EVENTI = calendarioData.map(function(e) {
        var d   = new Date(e.data);
        var obj = {
          id:       e.id,
          nome:     e.titolo,
          anno:     d.getUTCFullYear(),
          mese:     d.getUTCMonth() + 1,
          giorno:   d.getUTCDate(),
          ora:      e.ora         || '21:00',
          tipo:     e.tipo        || 'invito',
          desc:     e.descrizione || '',
          luogo:    e.luogo       || '',
          note:     e.note        || '',
          locandina: e.locandina  || null,
          giornoFine: null, meseFine: null, annoFine: null,
        };
        if (e.data_fine) {
          var df = new Date(e.data_fine);
          obj.giornoFine = df.getUTCDate();
          obj.meseFine   = df.getUTCMonth() + 1;
          obj.annoFine   = df.getUTCFullYear();
        }
        return obj;
      });
      var maxEvId = EVENTI.reduce(function(m, e) { return Math.max(m, e.id); }, 0);
      if (maxEvId >= _nextIds.event) _nextIds.event = maxEvId + 1;
    }
  } catch (e) { console.warn('[load calendario]', e.message); }

  // 4. SPESA
  try {
    if (spesaData && spesaData.length) {
      SPESA = spesaData.map(function(s) {
        return {
          id: s.id, nome: s.item, done: s.done || false,
          qty: s.qty || '', costoUnitario: s.costo_unitario || 0,
          unita: s.unita || '', fromMagazzino: s.from_magazzino || false,
          magazzinoId: s.magazzino_id || null,
        };
      });
      var maxSpId = SPESA.reduce(function(m, s) { return Math.max(m, s.id); }, 0);
      if (maxSpId >= _nextIds.spesa) _nextIds.spesa = maxSpId + 1;
    }
  } catch (e) { console.warn('[load spesa]', e.message); }

  // 5. LAVORI
  try {
    if (lavoriData && lavoriData.length) {
      LAVORI = lavoriData.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      var maxLvId = LAVORI.reduce(function(m, l) { return Math.max(m, l.id); }, 0);
      if (maxLvId >= _nextIds.lavori) _nextIds.lavori = maxLvId + 1;
    }
  } catch (e) { console.warn('[load lavori]', e.message); }

  // 6. MAGAZZINO (solo quantità)
  try {
    if (magazzinoData && magazzinoData.length) {
      magazzinoData.forEach(function(row) {
        var item = MAGAZZINO.find(function(m) { return m.id === row.item_id; });
        if (item) item.attuale = row.attuale;
      });
    }
  } catch (e) { console.warn('[load magazzino]', e.message); }

  // 7. PAGAMENTI
  try {
    if (pagamentiData && pagamentiData.length) {
      pagamentiData.forEach(function(row) {
        var movimenti = [];
        try { movimenti = typeof row.movimenti === 'string' ? JSON.parse(row.movimenti) : (row.movimenti || []); } catch (e) {}
        var existing = PAGAMENTI.find(function(p) { return p.name === row.member_name; });
        if (existing) { existing.saldo = row.saldo || 0; existing.movimenti = movimenti; }
        else PAGAMENTI.push({ name: row.member_name, saldo: row.saldo || 0, movimenti: movimenti });
      });
    }
  } catch (e) { console.warn('[load pagamenti]', e.message); }

  // 8. CHAT (ultimi 200)
  try {
    if (chatData && chatData.length) {
      CHAT = chatData.map(function(c) {
        var d = new Date(c.ts);
        return {
          id:    c.id,
          who:   c.author,
          testo: c.text,
          ora:   d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' · ' +
                 d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          ts:    d.getTime(),
        };
      });
    }
  } catch (e) { console.warn('[load chat]', e.message); }

  // 9. LOG (ultimi 500)
  try {
    if (logData && logData.length) {
      LOG = logData.map(function(l) {
        var d = new Date(l.ts);
        var member = MEMBERS.find(function(m) { return m.name === l.author; })
          || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
        return { member: member, azione: l.action, tempo: _formatLogTime(d), _id: l.id };
      });
    }
  } catch (e) { console.warn('[load log]', e.message); }

  // 10. SUGGERIMENTI
  try {
    if (suggerimentiData && suggerimentiData.length) {
      SUGGERIMENTI = suggerimentiData.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author, tempo: new Date(s.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch (e) { console.warn('[load suggerimenti]', e.message); }

  // 11. VALUTAZIONI
  try {
    if (valutazioniData && valutazioniData.length) {
      VALUTAZIONI = valutazioniData.map(function(v) {
        return { id: v.id, nome: v.author, stelle: v.stelle || 0, testo: v.testo || '', tempo: new Date(v.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch (e) { console.warn('[load valutazioni]', e.message); }

  // Sblocca tutte le save-functions
  _sbReady = true;
  console.log('[supabase] loadAllData completato — _sbReady=true, _membersReady=true');
}

// ═════════════════════════════════════════════════════════════════
// LOAD ALL DATA
//
// PERCORSO PRIMARIO: RPC get_all_data() — una sola chiamata di rete.
// FALLBACK AUTOMATICO: 11 query parallele se la RPC non è disponibile.
//
// In entrambi i casi:
//   • _membersReady viene impostato prima di risolvere la Promise
//   • _sbReady viene impostato alla fine
//   • try/catch globale garantisce che i flag vengano sempre impostati
// ═════════════════════════════════════════════════════════════════

async function loadAllData() {
  var sb = getSupabase();

  // ── FASE 0: config dalla cache locale (sincrona, istantanea) ────
  var cachedCfg = _readCfgCache();
  if (cachedCfg) {
    try { _applyConfig(cachedCfg); } catch(e) { console.warn('[cfg cache apply]', e.message); }
  }

  // ── FASE 1: tenta RPC, fallback a query separate ─────────────────
  try {
    var rpcResult = await sb.rpc('get_all_data');

    if (!rpcResult.error && rpcResult.data) {
      // ── PERCORSO RPC (singola chiamata) ─────────────────────────
      var d = rpcResult.data;
      _applyAllResults({
        cfg:          d.config || null,
        members:      d.members || [],
        calendario:   d.calendario || [],
        spesa:        d.spesa || [],
        lavori:       d.lavori || [],
        magazzino:    d.magazzino || [],
        pagamenti:    d.pagamenti || [],
        chat:         d.chat || [],
        log:          d.log || [],
        suggerimenti: d.suggerimenti || [],
        valutazioni:  d.valutazioni || [],
      });
      console.log('[supabase] Dati caricati via RPC get_all_data()');
    } else {
      // ── FALLBACK: 11 query parallele ────────────────────────────
      console.warn('[supabase] RPC non disponibile, fallback a query separate:', rpcResult.error && rpcResult.error.message);
      await _loadAllDataFallback(sb);
    }
  } catch (err) {
    // Protezione massima: anche in caso di errore imprevisto i flag vengono impostati
    console.warn('[supabase] loadAllData errore critico:', err.message || err);
    try { await _loadAllDataFallback(sb); } catch(e2) {
      console.warn('[supabase] anche fallback fallito:', e2.message || e2);
    }
    // Garantisce sempre che il login sia sbloccato
    _membersReady = true;
    _sbReady      = true;
  }
}

/** Fallback: 11 query Supabase in parallelo (comportamento v2.4) */
async function _loadAllDataFallback(sb) {
  var settled = await Promise.allSettled([
    sb.from('appconfig').select('data').eq('id', 1).single(),
    sb.from('members').select('*'),
    sb.from('calendario').select('*').order('data', { ascending: true }),
    sb.from('spesa').select('*'),
    sb.from('lavori').select('*'),
    sb.from('magazzino').select('*'),
    sb.from('pagamenti').select('*'),
    sb.from('chat').select('*').order('ts', { ascending: true }).limit(200),
    sb.from('log').select('*').order('ts', { ascending: false }).limit(500),
    sb.from('suggerimenti').select('*').order('ts', { ascending: false }),
    sb.from('valutazioni').select('*').order('ts', { ascending: false }),
  ]);

  function _unwrap(s) {
    if (s.status === 'rejected') return { data: null, error: s.reason };
    return s.value;
  }

  var cfg          = _unwrap(settled[0]);
  var members      = _unwrap(settled[1]);
  var calendario   = _unwrap(settled[2]);
  var spesa        = _unwrap(settled[3]);
  var lavori       = _unwrap(settled[4]);
  var magazzino    = _unwrap(settled[5]);
  var pagamenti    = _unwrap(settled[6]);
  var chat         = _unwrap(settled[7]);
  var log          = _unwrap(settled[8]);
  var suggerimenti = _unwrap(settled[9]);
  var valutazioni  = _unwrap(settled[10]);

  _applyAllResults({
    cfg:          (!cfg.error && cfg.data && cfg.data.data) ? cfg.data.data : null,
    members:      (!members.error && members.data)      ? members.data      : [],
    calendario:   (!calendario.error && calendario.data)? calendario.data   : [],
    spesa:        (!spesa.error && spesa.data)          ? spesa.data        : [],
    lavori:       (!lavori.error && lavori.data)        ? lavori.data       : [],
    magazzino:    (!magazzino.error && magazzino.data)  ? magazzino.data    : [],
    pagamenti:    (!pagamenti.error && pagamenti.data)  ? pagamenti.data    : [],
    chat:         (!chat.error && chat.data)            ? chat.data         : [],
    log:          (!log.error && log.data)              ? log.data          : [],
    suggerimenti: (!suggerimenti.error && suggerimenti.data) ? suggerimenti.data : [],
    valutazioni:  (!valutazioni.error && valutazioni.data)   ? valutazioni.data  : [],
  });

  console.log('[supabase] Dati caricati via query parallele (fallback)');
}

// ═════════════════════════════════════════════════════════════════
// REALTIME  (chat + log)
// ═════════════════════════════════════════════════════════════════
function initRealtime() {
  var sb = getSupabase();

  // ── CHAT ──
  _chatChannel = sb.channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, function(payload) {
      var c = payload.new;
      if (!c) return;

      var key = c.author + '|' + c.text;
      if (_pendingChatKeys[key]) {
        _clearPendingChat(key);
        var local = CHAT.find(function(m) { return m.who === c.author && m.testo === c.text && !m.id; });
        if (local) local.id = c.id;
        return;
      }
      if (CHAT.some(function(m) { return m.id === c.id; })) return;

      var d = new Date(c.ts);
      CHAT.push({
        id:    c.id,
        who:   c.author,
        testo: c.text,
        ora:   d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' · ' +
               d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        ts:    d.getTime(),
      });
      _unreadChat++;
      if (typeof buildChat   === 'function') buildChat();
      if (typeof updateDash  === 'function') updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat' }, function() {
      CHAT = [];
      if (typeof buildChat  === 'function') buildChat();
      if (typeof updateDash === 'function') updateDash();
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Chat realtime OK'); });

  // ── LOG ──
  _logChannel = sb.channel('log-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'log' }, function(payload) {
      var l = payload.new;
      if (!l) return;
      if (LOG.some(function(e) { return e._id === l.id; })) return;

      var d      = new Date(l.ts);
      var member = MEMBERS.find(function(m) { return m.name === l.author; })
        || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
      LOG.unshift({ member: member, azione: l.action, tempo: _formatLogTime(d), _id: l.id });
      _unreadLog++;
      if (typeof buildLog   === 'function') buildLog();
      if (typeof updateDash === 'function') updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'log' }, function() {
      LOG = [];
      if (typeof buildLog   === 'function') buildLog();
      if (typeof updateDash === 'function') updateDash();
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Log realtime OK'); });
}
