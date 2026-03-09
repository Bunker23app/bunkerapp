// ════════════════════════════════════════
// SUPABASE — PERSISTENZA MULTI-TABELLA
// ════════════════════════════════════════
var SUPABASE_URL = 'https://ndcpekgxnawxwbvfseba.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kY3Bla2d4bmF3eHdidmZzZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzU5NjksImV4cCI6MjA4ODQ1MTk2OX0.EmvG_iqAO3JcgCPk49fwEGcQQIOkeZhN076PuklD118';
var _sb = null;
var _sbReady = false;
// Timer per debounce salvataggi non-realtime
var _saveTimers = {};

function getSupabase() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── HELPERS ──────────────────────────────
function _debounce(key, fn, ms) {
  if (_saveTimers[key]) clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(fn, ms || 600);
}

async function _sbUpsert(table, data, logErr) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from(table).upsert(data);
    if (res.error) console.warn('[sb.' + table + ']', res.error.message);
  } catch(e) { console.warn('[sb.' + table + ']', e.message); }
}

async function _sbInsert(table, data) {
  if (!_sbReady) return null;
  try {
    var res = await getSupabase().from(table).insert(data).select().single();
    if (res.error) { console.warn('[sb.' + table + ']', res.error.message); return null; }
    return res.data;
  } catch(e) { console.warn('[sb.' + table + ']', e.message); return null; }
}

async function _sbDelete(table, col, val) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from(table).delete().eq(col, val);
    if (res.error) console.warn('[sb.' + table + ']', res.error.message);
  } catch(e) {}
}

// ── SAVE FUNCTIONS ───────────────────────

// CONFIG (widget, tab, testi, sezioni, ecc.) — blob JSON su appconfig
function saveConfig() {
  _debounce('config', async function() {
    var cfg = {
      WIDGET_CONFIG: WIDGET_CONFIG,
      TAB_CONFIG: TAB_CONFIG,
      BENVENUTO_TEXT: BENVENUTO_TEXT,
      AIUTANTE_WIDGET_CONFIG: AIUTANTE_WIDGET_CONFIG,
      AIUTANTE_TAB_CONFIG: AIUTANTE_TAB_CONFIG,
      PAGE_SECTIONS: PAGE_SECTIONS,
      PAGE_EDIT_PERMS: PAGE_EDIT_PERMS,
      GUEST_MESSAGE: GUEST_MESSAGE,
      SPLASH_TEXTS: SPLASH_TEXTS,
      LINKS_PAGE: LINKS_PAGE,
      LINKS_EVENTO: LINKS_EVENTO,
      _nextLinkId: _nextLinkId,
      CONSIGLIATI: CONSIGLIATI,
      EVENTI_VALUTAZIONI: EVENTI_VALUTAZIONI,
      BACHECA: BACHECA,
      INFO: INFO,
      _nextIds: _nextIds,
    };
    await _sbUpsert('appconfig', { id: 1, data: cfg });
  }, 800);
}

// MEMBRI
function saveMembers() {
  _debounce('members', async function() {
    if (!_sbReady) return;
    try {
      var rows = MEMBERS.map(function(m) {
        return {
          name: m.name,
          initial: m.initial || m.name.charAt(0).toUpperCase(),
          color: m.color || '#444',
          password_hash: m.password || '',
          role: m.role || 'utente',
          foto_url: m.photo || null,
          sospeso: m.sospeso || false,
        };
      });
      // Upsert uno alla volta per rispettare unique su name
      for (var i = 0; i < rows.length; i++) {
        var res = await getSupabase().from('members').upsert(rows[i], { onConflict: 'name' });
        if (res.error) console.warn('[sb.members]', res.error.message);
      }
    } catch(e) { console.warn('[sb.members]', e.message); }
  }, 600);
}

// EVENTI (calendario)
function saveEventi() {
  _debounce('eventi', async function() {
    if (!_sbReady) return;
    try {
      var rows = EVENTI.map(function(e) {
        var dataStr = e.anno + '-' + String(e.mese).padStart(2,'0') + '-' + String(e.giorno).padStart(2,'0');
        var dataFineStr = (e.giornoFine && e.meseFine && e.annoFine)
          ? (e.annoFine + '-' + String(e.meseFine).padStart(2,'0') + '-' + String(e.giornoFine).padStart(2,'0'))
          : null;
        return {
          id: e.id,
          titolo: e.nome,
          data: dataStr,
          data_fine: dataFineStr,
          ora: e.ora || '',
          luogo: e.luogo || '',
          note: e.note || '',
          descrizione: e.desc || '',
          tipo: e.tipo || 'invito',
          locandina: e.locandina || null,
          pubblico: (e.tipo === 'invito' || e.tipo === 'consigliato'),
          created_by: currentUser ? currentUser.name : null,
        };
      });
      // Upsert: aggiorna se esiste, inserisce se non esiste
      var res = await getSupabase().from('calendario').upsert(rows, { onConflict: 'id' });
      if (res.error) console.warn('[sb.calendario save]', res.error.message);
      // Elimina eventi che non sono più in EVENTI (rimossi)
      var ids = EVENTI.map(function(e){ return e.id; });
      if (ids.length) {
        await getSupabase().from('calendario').delete().not('id', 'in', '(' + ids.join(',') + ')');
      } else {
        await getSupabase().from('calendario').delete().gt('id', 0);
      }
    } catch(e) { console.warn('[sb.calendario]', e.message); }
    saveConfig();
  }, 800);
}

// BACHECA e INFO — salvate in appconfig (sono strutture ricche con foto)
// Incluse nella saveConfig()

// SPESA
function saveSpesa() {
  _debounce('spesa', async function() {
    if (!_sbReady) return;
    try {
      await getSupabase().from('spesa').delete().gt('id', 0);
      var rows = SPESA.map(function(s) {
        return {
          id: s.id,
          item: s.nome || s.item || '',
          done: s.done || false,
          qty: s.qty || '',
          costo_unitario: s.costoUnitario || 0,
          unita: s.unita || '',
          from_magazzino: s.fromMagazzino || false,
          magazzino_id: s.magazzinoId || null,
          added_by: currentUser ? currentUser.name : null,
        };
      });
      if (rows.length) {
        var res = await getSupabase().from('spesa').insert(rows);
        if (res.error) console.warn('[sb.spesa]', res.error.message);
      }
    } catch(e) { console.warn('[sb.spesa]', e.message); }
  }, 600);
}

// LAVORI
function saveLavori() {
  _debounce('lavori', async function() {
    if (!_sbReady) return;
    try {
      await getSupabase().from('lavori').delete().gt('id', 0);
      var rows = LAVORI.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      if (rows.length) {
        var res = await getSupabase().from('lavori').insert(rows);
        if (res.error) console.warn('[sb.lavori]', res.error.message);
      }
    } catch(e) { console.warn('[sb.lavori]', e.message); }
  }, 600);
}

// MAGAZZINO
function saveMagazzino() {
  _debounce('magazzino', async function() {
    if (!_sbReady) return;
    try {
      var sb = getSupabase();
      var rows = MAGAZZINO.map(function(m) {
        return { item_id: m.id, attuale: m.attuale };
      });
      // Prima prova upsert con onConflict
      var res = await sb.from('magazzino').upsert(rows, { onConflict: 'item_id' });
      if (res.error) {
        // Fallback: delete + insert
        await sb.from('magazzino').delete().gt('item_id', 0);
        var res2 = await sb.from('magazzino').insert(rows);
        if (res2.error) {
          console.warn('[sb.magazzino] insert fallback:', res2.error.message);
          showToast('// ERRORE SALVATAGGIO MAGAZZINO: ' + res2.error.message, 'error');
        }
      }
    } catch(e) {
      console.warn('[sb.magazzino]', e.message);
      showToast('// ERRORE MAGAZZINO: ' + e.message, 'error');
    }
  }, 600);
}

// PAGAMENTI
function savePagamenti() {
  _debounce('pagamenti', async function() {
    if (!_sbReady) return;
    try {
      var rows = PAGAMENTI.map(function(p) {
        return {
          member_name: p.name,
          saldo: p.saldo || 0,
          movimenti: JSON.stringify(p.movimenti || []),
        };
      });
      var res = await getSupabase().from('pagamenti').upsert(rows, { onConflict: 'member_name' });
      if (res.error) console.warn('[sb.pagamenti]', res.error.message);
    } catch(e) { console.warn('[sb.pagamenti]', e.message); }
  }, 600);
}

// SUGGERIMENTI
function saveSuggerimenti() {
  _debounce('suggerimenti', async function() {
    if (!_sbReady) return;
    try {
      await getSupabase().from('suggerimenti').delete().gt('id', 0);
      var rows = SUGGERIMENTI.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author || null, ts: new Date(s.id).toISOString() };
      });
      if (rows.length) {
        var res = await getSupabase().from('suggerimenti').insert(rows);
        if (res.error) console.warn('[sb.suggerimenti]', res.error.message);
      }
    } catch(e) { console.warn('[sb.suggerimenti]', e.message); }
  }, 600);
}

// VALUTAZIONI
function saveValutazioni() {
  _debounce('valutazioni', async function() {
    if (!_sbReady) return;
    try {
      await getSupabase().from('valutazioni').delete().gt('id', 0);
      var rows = VALUTAZIONI.map(function(v) {
        return { id: v.id, author: v.nome, stelle: v.stelle || 0, testo: v.testo || '', ts: new Date(v.id).toISOString() };
      });
      if (rows.length) {
        var res = await getSupabase().from('valutazioni').insert(rows);
        if (res.error) console.warn('[sb.valutazioni]', res.error.message);
      }
    } catch(e) { console.warn('[sb.valutazioni]', e.message); }
  }, 600);
}

// CHAT — inserimento singolo messaggio (realtime nativo)
async function saveChatMessage(msg) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from('chat').insert({
      author: msg.who,
      text: msg.testo,
      ts: new Date(msg.ts).toISOString(),
    });
    if (res.error) console.warn('[sb.chat]', res.error.message);
  } catch(e) { console.warn('[sb.chat]', e.message); }
}

// LOG — inserimento singola riga (realtime nativo)
async function saveLogEntry(entry) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from('log').insert({
      author: entry.member.name,
      action: entry.azione,
      ts: new Date().toISOString(),
    });
    if (res.error) console.warn('[sb.log]', res.error.message);
  } catch(e) { console.warn('[sb.log]', e.message); }
}

// SVUOTA CHAT / LOG
async function clearChatRemote() {
  if (!_sbReady) return;
  try { await getSupabase().from('chat').delete().gt('id', 0); } catch(e) {}
}
async function clearLogRemote() {
  if (!_sbReady) return;
  try { await getSupabase().from('log').delete().gt('id', 0); } catch(e) {}
}

// ── LOAD FUNCTIONS ───────────────────────

function _applyConfig(cfg) {
  if (!cfg) return;
  if (cfg.WIDGET_CONFIG) {
    cfg.WIDGET_CONFIG.forEach(function(dw) {
      var w = WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
      if (w) { w.enabled = dw.enabled; if (dw.label) w.label = dw.label; }
    });
    var ordered = [];
    cfg.WIDGET_CONFIG.forEach(function(dw) {
      var w = WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
      if (w) ordered.push(w);
    });
    WIDGET_CONFIG.forEach(function(w) {
      if (!ordered.find(function(x){ return x.id === w.id; })) ordered.push(w);
    });
    WIDGET_CONFIG.length = 0;
    ordered.forEach(function(w){ WIDGET_CONFIG.push(w); });
  }
  if (cfg.TAB_CONFIG) cfg.TAB_CONFIG.forEach(function(dt) {
    var t = TAB_CONFIG.find(function(x){ return x.id === dt.id; }); if (t) t.enabled = dt.enabled;
  });
  if (typeof cfg.BENVENUTO_TEXT === 'string') BENVENUTO_TEXT = cfg.BENVENUTO_TEXT;
  if (cfg.AIUTANTE_WIDGET_CONFIG) cfg.AIUTANTE_WIDGET_CONFIG.forEach(function(dw) {
    var w = AIUTANTE_WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
    if (w) { w.enabled = dw.enabled; if (dw.label) w.label = dw.label; }
  });
  if (cfg.AIUTANTE_TAB_CONFIG) cfg.AIUTANTE_TAB_CONFIG.forEach(function(dt) {
    var t = AIUTANTE_TAB_CONFIG.find(function(x){ return x.id === dt.id; }); if (t) t.enabled = dt.enabled;
  });
  if (cfg.PAGE_SECTIONS) {
    ['home','bacheca','info'].forEach(function(page) {
      if (!cfg.PAGE_SECTIONS[page]) return;
      var ordered = [];
      cfg.PAGE_SECTIONS[page].forEach(function(ds) {
        var s = PAGE_SECTIONS[page].find(function(x){ return x.id === ds.id; });
        if (s) { s.enabled = ds.enabled; ordered.push(s); }
      });
      PAGE_SECTIONS[page].forEach(function(s) {
        if (!ordered.find(function(x){ return x.id === s.id; })) ordered.push(s);
      });
      PAGE_SECTIONS[page].length = 0;
      ordered.forEach(function(s){ PAGE_SECTIONS[page].push(s); });
    });
  }
  if (cfg.PAGE_EDIT_PERMS) Object.assign(PAGE_EDIT_PERMS, cfg.PAGE_EDIT_PERMS);
  if (cfg.GUEST_MESSAGE)   Object.assign(GUEST_MESSAGE, cfg.GUEST_MESSAGE);
  if (cfg.SPLASH_TEXTS)    Object.assign(SPLASH_TEXTS, cfg.SPLASH_TEXTS);
  if (cfg.LINKS_PAGE)      Object.assign(LINKS_PAGE, cfg.LINKS_PAGE);
  if (cfg.LINKS_EVENTO)    Object.assign(LINKS_EVENTO, cfg.LINKS_EVENTO);
  if (cfg._nextLinkId)     _nextLinkId = cfg._nextLinkId;
  // Safety net: ricalcola _nextLinkId dal max id presente
  var _maxLinkId = 0;
  Object.values(LINKS_PAGE).forEach(function(arr){ arr.forEach(function(l){ if ((l.id||0) >= _maxLinkId) _maxLinkId = l.id+1; }); });
  Object.values(LINKS_EVENTO).forEach(function(arr){ arr.forEach(function(l){ if ((l.id||0) >= _maxLinkId) _maxLinkId = l.id+1; }); });
  if (_maxLinkId > _nextLinkId) _nextLinkId = _maxLinkId;
  if (cfg.CONSIGLIATI)     CONSIGLIATI = cfg.CONSIGLIATI;
  if (cfg.EVENTI_VALUTAZIONI) EVENTI_VALUTAZIONI = cfg.EVENTI_VALUTAZIONI;
  if (cfg._nextIds)        Object.assign(_nextIds, cfg._nextIds);
  // BACHECA e INFO sono dentro appconfig
  if (cfg.BACHECA) {
    BACHECA = cfg.BACHECA;
    var maxBId = BACHECA.reduce(function(m,b){ return Math.max(m, b.id||0); }, 0);
    if (maxBId >= _nextIds.bacheca) _nextIds.bacheca = maxBId + 1;
  }
  if (cfg.INFO) {
    INFO = cfg.INFO;
    var maxIId = INFO.reduce(function(m,b){ return Math.max(m, b.id||0); }, 0);
    if (maxIId >= _nextIds.info) _nextIds.info = maxIId + 1;
  }
}

async function loadAllData() {
  var sb = getSupabase();

  // ── BATCH 1 (parallelo): config + members ─────────────────────────────────
  // members deve essere disponibile prima del LOG (batch 2) che lo referenzia
  var batch1 = await Promise.all([
    sb.from('appconfig').select('data').eq('id', 1).single(),
    sb.from('members').select('*'),
  ]);

  // 1. CONFIG
  try {
    var cfgRes = batch1[0];
    if (cfgRes.data && cfgRes.data.data) _applyConfig(cfgRes.data.data);
  } catch(e) { console.warn('[load config]', e.message); }

  // 2. MEMBERS
  try {
    var mRes = batch1[1];
    if (mRes.data && mRes.data.length) {
      mRes.data.forEach(function(dm) {
        var existing = MEMBERS.find(function(m){ return m.name === dm.name; });
        var mapped = {
          name: dm.name, initial: dm.initial, color: dm.color,
          password: dm.password_hash, role: dm.role,
          photo: dm.foto_url || null, sospeso: dm.sospeso || false,
        };
        if (existing) Object.assign(existing, mapped);
        else MEMBERS.push(mapped);
      });
    }
  } catch(e) { console.warn('[load members]', e.message); }

  // Migra password in chiaro → hash ora che MEMBERS è popolato da DB
  if (typeof migratePasswords === 'function') migratePasswords();

  // ── BATCH 2 (parallelo): tutte le altre tabelle ───────────────────────────
  var batch2 = await Promise.all([
    sb.from('calendario').select('*').order('data', { ascending: true }),   // 0
    sb.from('spesa').select('*'),                                            // 1
    sb.from('lavori').select('*'),                                           // 2
    sb.from('magazzino').select('*'),                                        // 3
    sb.from('pagamenti').select('*'),                                        // 4
    sb.from('chat').select('*').order('ts', { ascending: true }).limit(200), // 5
    sb.from('log').select('*').order('ts', { ascending: false }).limit(500), // 6
    sb.from('suggerimenti').select('*').order('ts', { ascending: false }),   // 7
    sb.from('valutazioni').select('*').order('ts', { ascending: false }),    // 8
  ]);

  // 3. CALENDARIO
  try {
    var calRes = batch2[0];
    if (calRes.data && calRes.data.length) {
      EVENTI = calRes.data.map(function(e) {
        var d = new Date(e.data);
        var obj = {
          id: e.id,
          nome: e.titolo,
          anno: d.getUTCFullYear(),
          mese: d.getUTCMonth() + 1,
          giorno: d.getUTCDate(),
          ora: e.ora || '21:00',
          tipo: e.tipo || 'invito',
          desc: e.descrizione || '',
          luogo: e.luogo || '',
          note: e.note || '',
          locandina: e.locandina || null,
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
      var maxId = EVENTI.reduce(function(m,e){ return Math.max(m, e.id); }, 0);
      if (maxId >= _nextIds.event) _nextIds.event = maxId + 1;
    }
  } catch(e) { console.warn('[load calendario]', e.message); }

  // 4. SPESA
  try {
    var spRes = batch2[1];
    if (spRes.data && spRes.data.length) {
      SPESA = spRes.data.map(function(s) {
        return {
          id: s.id, nome: s.item, done: s.done || false,
          qty: s.qty || '', costoUnitario: s.costo_unitario || 0,
          unita: s.unita || '', fromMagazzino: s.from_magazzino || false,
          magazzinoId: s.magazzino_id || null,
        };
      });
      var maxId = SPESA.reduce(function(m,s){ return Math.max(m,s.id); }, 0);
      if (maxId >= _nextIds.spesa) _nextIds.spesa = maxId + 1;
    }
  } catch(e) { console.warn('[load spesa]', e.message); }

  // 5. LAVORI
  try {
    var lavRes = batch2[2];
    if (lavRes.data && lavRes.data.length) {
      LAVORI = lavRes.data.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      var maxId = LAVORI.reduce(function(m,l){ return Math.max(m,l.id); }, 0);
      if (maxId >= _nextIds.lavori) _nextIds.lavori = maxId + 1;
    }
  } catch(e) { console.warn('[load lavori]', e.message); }

  // 6. MAGAZZINO (solo quantità)
  try {
    var mzRes = batch2[3];
    if (mzRes.data && mzRes.data.length) {
      mzRes.data.forEach(function(row) {
        var item = MAGAZZINO.find(function(m){ return m.id === row.item_id; });
        if (item) item.attuale = row.attuale;
      });
    }
  } catch(e) { console.warn('[load magazzino]', e.message); }

  // 7. PAGAMENTI
  try {
    var pagRes = batch2[4];
    if (pagRes.data && pagRes.data.length) {
      pagRes.data.forEach(function(row) {
        var existing = PAGAMENTI.find(function(p){ return p.name === row.member_name; });
        var movimenti = [];
        try { movimenti = typeof row.movimenti === 'string' ? JSON.parse(row.movimenti) : (row.movimenti || []); } catch(e) {}
        if (existing) {
          existing.saldo = row.saldo || 0;
          existing.movimenti = movimenti;
        } else {
          PAGAMENTI.push({ name: row.member_name, saldo: row.saldo || 0, movimenti: movimenti });
        }
      });
    }
  } catch(e) { console.warn('[load pagamenti]', e.message); }

  // 8. CHAT (ultimi 200 messaggi)
  try {
    var chatRes = batch2[5];
    if (chatRes.data && chatRes.data.length) {
      CHAT = chatRes.data.map(function(c) {
        var d = new Date(c.ts);
        var ora = d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}) + ' · ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
        return { id: c.id, who: c.author, testo: c.text, ora: ora, ts: d.getTime() };
      });
    }
  } catch(e) { console.warn('[load chat]', e.message); }

  // 9. LOG (ultimi 500)
  try {
    var logRes = batch2[6];
    if (logRes.data && logRes.data.length) {
      LOG = logRes.data.map(function(l) {
        var d = new Date(l.ts);
        var tempo = 'OGGI · ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
        var member = MEMBERS.find(function(m){ return m.name === l.author; }) || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
        return { member: member, azione: l.action, tempo: tempo, _id: l.id };
      });
    }
  } catch(e) { console.warn('[load log]', e.message); }

  // 10. SUGGERIMENTI
  try {
    var sugRes = batch2[7];
    if (sugRes.data && sugRes.data.length) {
      SUGGERIMENTI = sugRes.data.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author, tempo: new Date(s.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch(e) { console.warn('[load suggerimenti]', e.message); }

  // 11. VALUTAZIONI
  try {
    var valRes = batch2[8];
    if (valRes.data && valRes.data.length) {
      VALUTAZIONI = valRes.data.map(function(v) {
        return { id: v.id, nome: v.author, stelle: v.stelle || 0, testo: v.testo || '', tempo: new Date(v.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch(e) { console.warn('[load valutazioni]', e.message); }

  // Migrazione da appstate: non più necessaria, gestita via SQL fix_primary_keys.sql
}

// ── REALTIME ─────────────────────────────
// Il realtime è attivato SOLO per utenti con ruolo admin o staff.
// Per tutti gli altri ruoli non viene aperta nessuna connessione realtime.

var _chatChannel = null;
var _logChannel  = null;
// Set di "author|testo" dei messaggi inviati da noi, per bloccare il realtime echo
var _pendingChatKeys = {};

function initRealtime() {
  // Controllo ruolo: solo admin e staff possono usare il realtime
  var role = currentUser && currentUser.role ? currentUser.role : '';
  if (role !== 'admin' && role !== 'staff') {
    console.log('Realtime disabilitato per ruolo: ' + (role || 'guest'));
    return;
  }

  var sb = getSupabase();

  // CHAT realtime — INSERT in tempo reale
  _chatChannel = sb.channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, function(payload) {
      var c = payload.new;
      if (!c) return;
      // Evita duplicati: controlla se questo messaggio è stato inviato da noi
      var key = c.author + '|' + c.text;
      if (_pendingChatKeys[key]) {
        delete _pendingChatKeys[key];
        // Aggiorna l'id reale sul messaggio già in CHAT
        var existing = CHAT.find(function(m){ return m.who === c.author && m.testo === c.text && !m.id; });
        if (existing) existing.id = c.id;
        return;
      }
      if (CHAT.some(function(m){ return m.id === c.id; })) return;
      var d = new Date(c.ts);
      var ora = d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}) + ' · ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      CHAT.push({ id: c.id, who: c.author, testo: c.text, ora: ora, ts: d.getTime() });
      _unreadChat++;
      buildChat();
      updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat' }, function() {
      // Svuotamento remoto
      CHAT = []; buildChat(); updateDash();
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Chat realtime OK'); });

  // LOG realtime — INSERT in tempo reale
  _logChannel = sb.channel('log-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'log' }, function(payload) {
      var l = payload.new;
      if (!l) return;
      // Evita duplicati
      if (LOG.some(function(e){ return e._id === l.id; })) return;
      var d = new Date(l.ts);
      var tempo = 'OGGI · ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      var member = MEMBERS.find(function(m){ return m.name === l.author; }) || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
      LOG.unshift({ member: member, azione: l.action, tempo: tempo, _id: l.id });
      _unreadLog++;
      buildLog();
      updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'log' }, function() {
      LOG = []; buildLog(); updateDash();
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Log realtime OK'); });
}

// ── COMPATIBILITÀ: saveToStorage() ora smista ai save specifici ──
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

// ── PATCH addLog per salvare su tabella log ──
// migratePasswords() viene chiamata dentro loadAllData() dopo aver caricato i MEMBERS da DB

var _origAddLog = addLog;
addLog = async function(azione) {
  _origAddLog(azione);
  // Il log viene salvato direttamente su Supabase (realtime lo riceverà)
  if (currentUser) {
    await saveLogEntry({ member: currentUser, azione: azione });
  }
};
