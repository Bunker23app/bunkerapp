// ════════════════════════════════════════════════════════════════
// supabase.js v2.3 — Bunker23  |  Persistenza Supabase
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
// ════════════════════════════════════════════════════════════════

'use strict';

// ── CONFIG ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ndcpekgxnawxwbvfseba.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kY3Bla2d4bmF3eHdidmZzZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzU5NjksImV4cCI6MjA4ODQ1MTk2OX0.EmvG_iqAO3JcgCPk49fwEGcQQIOkeZhN076PuklD118';

// ── STATO INTERNO ─────────────────────────────────────────────────
let _sb       = null;   // client Supabase (lazy init)
let _sbReady  = false;  // true dopo loadAllData()
const _timers = {};     // debounce timer map  { key → timeoutId }

// Per evitare il "echo" realtime dei propri messaggi.
// Le chiavi vengono auto-eliminate dopo 15s come safety net contro memory leak.
const _pendingChatKeys = {};
const _PENDING_CHAT_TTL = 15000;

function _setPendingChat(key) {
  _pendingChatKeys[key] = setTimeout(() => { delete _pendingChatKeys[key]; }, _PENDING_CHAT_TTL);
}
function _clearPendingChat(key) {
  clearTimeout(_pendingChatKeys[key]);
  delete _pendingChatKeys[key];
}

// Canali realtime
let _chatChannel = null;
let _logChannel  = null;

// ── CLIENT ────────────────────────────────────────────────────────
function getSupabase() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── HELPERS ───────────────────────────────────────────────────────

/** Debounce generico: esegue fn dopo ms dall'ultimo invocazione con la stessa key */
function _debounce(key, fn, ms = 600) {
  clearTimeout(_timers[key]);
  _timers[key] = setTimeout(fn, ms);
}

/** Upsert silenzioso — non blocca mai */
async function _sbUpsert(table, data) {
  if (!_sbReady) return;
  try {
    const { error } = await getSupabase().from(table).upsert(data);
    if (error) console.warn(`[sb.${table}]`, error.message);
  } catch (e) { console.warn(`[sb.${table}]`, e.message); }
}

/** Insert con return del record creato */
async function _sbInsert(table, data) {
  if (!_sbReady) return null;
  try {
    const { data: row, error } = await getSupabase().from(table).insert(data).select().single();
    if (error) { console.warn(`[sb.${table}]`, error.message); return null; }
    return row;
  } catch (e) { console.warn(`[sb.${table}]`, e.message); return null; }
}

/** Delete per colonna = valore */
async function _sbDelete(table, col, val) {
  if (!_sbReady) return;
  try {
    const { error } = await getSupabase().from(table).delete().eq(col, val);
    if (error) console.warn(`[sb.${table}]`, error.message);
  } catch (e) { console.warn(`[sb.${table}]`, e.message); }
}

/** Delete tutto (dove col numerico > 0) */
async function _sbClear(table, col = 'id') {
  if (!_sbReady) return;
  try {
    const { error } = await getSupabase().from(table).delete().gt(col, 0);
    if (error) console.warn(`[sb.${table} clear]`, error.message);
  } catch (e) { console.warn(`[sb.${table} clear]`, e.message); }
}

/** Formatta data JS → stringa 'YYYY-MM-DD' */
function _dateStr(anno, mese, giorno) {
  return `${anno}-${String(mese).padStart(2,'0')}-${String(giorno).padStart(2,'0')}`;
}

/** Formatta timestamp log: "OGGI · HH:MM" se oggi, altrimenti "GG/MM · HH:MM" */
function _formatLogTime(d) {
  const now = new Date();
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return 'OGGI · ' + time;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' · ' + time;
}


// ═════════════════════════════════════════════════════════════════

/**
 * CONFIG — blob JSON in appconfig (id=1)
 * Contiene: widget, tab, testi, sezioni, links, bacheca, info, ecc.
 */
function saveConfig() {
  _debounce('config', async () => {
    const cfg = {
      WIDGET_CONFIG, TAB_CONFIG, BENVENUTO_TEXT,
      AIUTANTE_WIDGET_CONFIG, AIUTANTE_TAB_CONFIG,
      PAGE_SECTIONS, PAGE_EDIT_PERMS,
      GUEST_MESSAGE, SPLASH_TEXTS,
      LINKS_PAGE, LINKS_EVENTO, _nextLinkId,
      CONSIGLIATI, EVENTI_VALUTAZIONI,
      BACHECA, INFO, _nextIds,
    };
    await _sbUpsert('appconfig', { id: 1, data: cfg });
  }, MS_DEBOUNCE);
}

/** MEMBERS — upsert batch in una sola chiamata (conflict su 'name') */
function saveMembers() {
  _debounce('members', async () => {
    if (!_sbReady) return;
    const rows = MEMBERS.map(m => ({
      name:          m.name,
      initial:       m.initial || m.name.charAt(0).toUpperCase(),
      color:         m.color  || '#444',
      password_hash: m.password || '',
      role:          m.role   || 'utente',
      foto_url:      m.photo  || null,
      sospeso:       m.sospeso || false,
    }));
    const { error } = await getSupabase().from('members').upsert(rows, { onConflict: 'name' });
    if (error) console.warn('[sb.members]', error.message);
  }, MS_DEBOUNCE);
}

/** EVENTI (calendario) — upsert + pulizia righe orfane */
function saveEventi() {
  _debounce('eventi', async () => {
    if (!_sbReady) return;
    try {
      const rows = EVENTI.map(e => ({
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
      }));

      const { error } = await getSupabase().from('calendario').upsert(rows, { onConflict: 'id' });
      if (error) { console.warn('[sb.calendario]', error.message); return; }

      // Rimuovi eventi cancellati localmente
      const ids = EVENTI.map(e => e.id);
      if (ids.length) {
        await getSupabase().from('calendario').delete().not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _sbClear('calendario');
      }
    } catch (e) { console.warn('[sb.calendario]', e.message); }
  }, MS_DEBOUNCE);
}

/** SPESA — replace totale (delete + insert) */
function saveSpesa() {
  _debounce('spesa', async () => {
    if (!_sbReady) return;
    try {
      await _sbClear('spesa');
      if (!SPESA.length) return;
      const rows = SPESA.map(s => ({
        id:             s.id,
        item:           s.nome || s.item || '',
        done:           s.done || false,
        qty:            s.qty  || '',
        costo_unitario: s.costoUnitario || 0,
        unita:          s.unita || '',
        from_magazzino: s.fromMagazzino || false,
        magazzino_id:   s.magazzinoId  || null,
        added_by:       currentUser ? currentUser.name : null,
      }));
      const { error } = await getSupabase().from('spesa').insert(rows);
      if (error) console.warn('[sb.spesa]', error.message);
    } catch (e) { console.warn('[sb.spesa]', e.message); }
  }, MS_DEBOUNCE);
}

/** LAVORI — replace totale */
function saveLavori() {
  _debounce('lavori', async () => {
    if (!_sbReady) return;
    try {
      await _sbClear('lavori');
      if (!LAVORI.length) return;
      const rows = LAVORI.map(l => ({
        id:     l.id,
        lavoro: l.lavoro,
        who:    l.who  || '-',
        done:   l.done || false,
      }));
      const { error } = await getSupabase().from('lavori').insert(rows);
      if (error) console.warn('[sb.lavori]', error.message);
    } catch (e) { console.warn('[sb.lavori]', e.message); }
  }, MS_DEBOUNCE);
}

/** MAGAZZINO — upsert quantità (solo item_id + attuale) */
function saveMagazzino() {
  _debounce('magazzino', async () => {
    if (!_sbReady) return;
    try {
      const sb   = getSupabase();
      const rows = MAGAZZINO.map(m => ({ item_id: m.id, attuale: m.attuale }));
      const { error } = await sb.from('magazzino').upsert(rows, { onConflict: 'item_id' });
      if (error) {
        // Fallback: delete + insert
        console.warn('[sb.magazzino] upsert fallback:', error.message);
        await _sbClear('magazzino', 'item_id');
        const { error: e2 } = await sb.from('magazzino').insert(rows);
        if (e2) { console.warn('[sb.magazzino]', e2.message); showToast('// ERRORE MAGAZZINO: ' + e2.message, 'error'); }
      }
    } catch (e) { console.warn('[sb.magazzino]', e.message); showToast('// ERRORE MAGAZZINO: ' + e.message, 'error'); }
  }, MS_DEBOUNCE);
}

/** PAGAMENTI — upsert per member_name */
function savePagamenti() {
  _debounce('pagamenti', async () => {
    if (!_sbReady) return;
    try {
      const rows = PAGAMENTI.map(p => ({
        member_name: p.name,
        saldo:       p.saldo     || 0,
        movimenti:   JSON.stringify(p.movimenti || []),
      }));
      const { error } = await getSupabase().from('pagamenti').upsert(rows, { onConflict: 'member_name' });
      if (error) console.warn('[sb.pagamenti]', error.message);
    } catch (e) { console.warn('[sb.pagamenti]', e.message); }
  }, MS_DEBOUNCE);
}

/** SUGGERIMENTI — replace totale */
function saveSuggerimenti() {
  _debounce('suggerimenti', async () => {
    if (!_sbReady) return;
    try {
      await _sbClear('suggerimenti');
      if (!SUGGERIMENTI.length) return;
      const rows = SUGGERIMENTI.map(s => ({
        id:     s.id,
        testo:  s.testo,
        author: s.author || null,
        ts:     new Date(s.id).toISOString(),
      }));
      const { error } = await getSupabase().from('suggerimenti').insert(rows);
      if (error) console.warn('[sb.suggerimenti]', error.message);
    } catch (e) { console.warn('[sb.suggerimenti]', e.message); }
  }, MS_DEBOUNCE);
}

/** VALUTAZIONI — replace totale */
function saveValutazioni() {
  _debounce('valutazioni', async () => {
    if (!_sbReady) return;
    try {
      await _sbClear('valutazioni');
      if (!VALUTAZIONI.length) return;
      const rows = VALUTAZIONI.map(v => ({
        id:     v.id,
        author: v.nome,
        stelle: v.stelle || 0,
        testo:  v.testo  || '',
        ts:     new Date(v.id).toISOString(),
      }));
      const { error } = await getSupabase().from('valutazioni').insert(rows);
      if (error) console.warn('[sb.valutazioni]', error.message);
    } catch (e) { console.warn('[sb.valutazioni]', e.message); }
  }, MS_DEBOUNCE);
}

// ── INSERT SINGOLI (chat / log) ───────────────────────────────────

/** Inserisce un messaggio in chat */
async function saveChatMessage(msg) {
  if (!_sbReady) return;
  const key = `${msg.who}|${msg.testo}`;
  _setPendingChat(key);
  try {
    const { error } = await getSupabase().from('chat').insert({
      author: msg.who,
      text:   msg.testo,
      ts:     new Date(msg.ts).toISOString(),
    });
    if (error) { console.warn('[sb.chat]', error.message); _clearPendingChat(key); }
  } catch (e) { console.warn('[sb.chat]', e.message); _clearPendingChat(key); }
}

/** Inserisce una riga nel log azioni */
async function saveLogEntry(entry) {
  if (!_sbReady) return;
  try {
    const { error } = await getSupabase().from('log').insert({
      author: entry.member.name,
      action: entry.azione,
      ts:     new Date().toISOString(),
    });
    if (error) console.warn('[sb.log]', error.message);
  } catch (e) { console.warn('[sb.log]', e.message); }
}

// ── SVUOTA REMOTO ─────────────────────────────────────────────────
async function clearChatRemote() { await _sbClear('chat'); }
async function clearLogRemote()  { await _sbClear('log');  }

// ── saveToStorage() — usata SOLO da importaDati() dopo import backup ────────
// Non va chiamata in altri contesti: ogni save-function ha già il proprio debounce.
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
// APPLY CONFIG  (idempotente — usata da loadAllData)
// ═════════════════════════════════════════════════════════════════

/**
 * Applica enabled/label dal salvataggio remoto e riordina l'array locale
 * rispettando l'ordinamento salvato, preservando item non presenti nel salvataggio.
 * @param {Array} local  - array locale (es. WIDGET_CONFIG)
 * @param {Array} saved  - array salvato su Supabase
 * @param {Function} [applyFn] - funzione opzionale per applicare props extra (es. label)
 */
function _applyOrdered(local, saved, applyFn) {
  if (!saved || !saved.length) return;
  saved.forEach(ds => {
    const item = local.find(x => x.id === ds.id);
    if (!item) return;
    item.enabled = ds.enabled;
    if (applyFn) applyFn(item, ds);
  });
  const ordered = [];
  saved.forEach(ds => {
    const item = local.find(x => x.id === ds.id);
    if (item) ordered.push(item);
  });
  local.forEach(item => { if (!ordered.find(x => x.id === item.id)) ordered.push(item); });
  local.splice(0, local.length, ...ordered);
}

function _applyConfig(cfg) {
  if (!cfg) return;

  // Widget config — applica enabled/label e rispetta ordinamento salvato
  if (cfg.WIDGET_CONFIG) {
    _applyOrdered(WIDGET_CONFIG, cfg.WIDGET_CONFIG, (item, ds) => { if (ds.label) item.label = ds.label; });
  }

  if (cfg.TAB_CONFIG) {
    cfg.TAB_CONFIG.forEach(dt => {
      const t = TAB_CONFIG.find(x => x.id === dt.id);
      if (t) t.enabled = dt.enabled;
    });
  }

  if (typeof cfg.BENVENUTO_TEXT === 'string') BENVENUTO_TEXT = cfg.BENVENUTO_TEXT;

  if (cfg.AIUTANTE_WIDGET_CONFIG) {
    _applyOrdered(AIUTANTE_WIDGET_CONFIG, cfg.AIUTANTE_WIDGET_CONFIG, (item, ds) => { if (ds.label) item.label = ds.label; });
  }

  if (cfg.AIUTANTE_TAB_CONFIG) {
    cfg.AIUTANTE_TAB_CONFIG.forEach(dt => {
      const t = AIUTANTE_TAB_CONFIG.find(x => x.id === dt.id);
      if (t) t.enabled = dt.enabled;
    });
  }

  if (cfg.PAGE_SECTIONS) {
    ['home', 'bacheca', 'info'].forEach(page => {
      if (!cfg.PAGE_SECTIONS[page]) return;
      _applyOrdered(PAGE_SECTIONS[page], cfg.PAGE_SECTIONS[page], (item, ds) => { item.enabled = ds.enabled; });
    });
  }

  if (cfg.PAGE_EDIT_PERMS) Object.assign(PAGE_EDIT_PERMS, cfg.PAGE_EDIT_PERMS);
  if (cfg.GUEST_MESSAGE)   Object.assign(GUEST_MESSAGE, cfg.GUEST_MESSAGE);
  if (cfg.SPLASH_TEXTS)    Object.assign(SPLASH_TEXTS, cfg.SPLASH_TEXTS);
  if (cfg.LINKS_PAGE)      Object.assign(LINKS_PAGE, cfg.LINKS_PAGE);
  if (cfg.LINKS_EVENTO)    Object.assign(LINKS_EVENTO, cfg.LINKS_EVENTO);
  if (cfg._nextLinkId)     _nextLinkId = cfg._nextLinkId;

  // Safety net _nextLinkId
  let _maxLinkId = 0;
  Object.values(LINKS_PAGE).forEach(arr => arr.forEach(l => { if ((l.id || 0) >= _maxLinkId) _maxLinkId = l.id + 1; }));
  Object.values(LINKS_EVENTO).forEach(arr => arr.forEach(l => { if ((l.id || 0) >= _maxLinkId) _maxLinkId = l.id + 1; }));
  if (_maxLinkId > _nextLinkId) _nextLinkId = _maxLinkId;

  if (cfg.CONSIGLIATI)        CONSIGLIATI = cfg.CONSIGLIATI;
  if (cfg.EVENTI_VALUTAZIONI) EVENTI_VALUTAZIONI = cfg.EVENTI_VALUTAZIONI;
  if (cfg._nextIds)           Object.assign(_nextIds, cfg._nextIds);

  if (cfg.BACHECA) {
    BACHECA = cfg.BACHECA;
    const maxBId = BACHECA.reduce((m, b) => Math.max(m, b.id || 0), 0);
    if (maxBId >= _nextIds.bacheca) _nextIds.bacheca = maxBId + 1;
  }
  if (cfg.INFO) {
    INFO = cfg.INFO;
    const maxIId = INFO.reduce((m, b) => Math.max(m, b.id || 0), 0);
    if (maxIId >= _nextIds.info) _nextIds.info = maxIId + 1;
  }
}

// ═════════════════════════════════════════════════════════════════
// LOAD ALL DATA  — tutte le query in parallelo con Promise.all
// ═════════════════════════════════════════════════════════════════
async function loadAllData() {
  const sb = getSupabase();

  // ── Lancia tutte le query in parallelo ───────────────────────────
  const [
    cfgResult,
    membersResult,
    calendarioResult,
    spesaResult,
    lavoriResult,
    magazzinoResult,
    pagamentiResult,
    chatResult,
    logResult,
    suggerimentiResult,
    valutazioniResult,
  ] = await Promise.all([
    // 1. CONFIG
    sb.from('appconfig').select('data').eq('id', 1).single().catch(e => ({ error: e })),
    // 2. MEMBERS
    sb.from('members').select('*').catch(e => ({ error: e })),
    // 3. CALENDARIO
    sb.from('calendario').select('*').order('data', { ascending: true }).catch(e => ({ error: e })),
    // 4. SPESA
    sb.from('spesa').select('*').catch(e => ({ error: e })),
    // 5. LAVORI
    sb.from('lavori').select('*').catch(e => ({ error: e })),
    // 6. MAGAZZINO
    sb.from('magazzino').select('*').catch(e => ({ error: e })),
    // 7. PAGAMENTI
    sb.from('pagamenti').select('*').catch(e => ({ error: e })),
    // 8. CHAT (ultimi 200)
    sb.from('chat').select('*').order('ts', { ascending: true }).limit(200).catch(e => ({ error: e })),
    // 9. LOG (ultimi 500)
    sb.from('log').select('*').order('ts', { ascending: false }).limit(500).catch(e => ({ error: e })),
    // 10. SUGGERIMENTI
    sb.from('suggerimenti').select('*').order('ts', { ascending: false }).catch(e => ({ error: e })),
    // 11. VALUTAZIONI
    sb.from('valutazioni').select('*').order('ts', { ascending: false }).catch(e => ({ error: e })),
  ]);

  // ── Applica i risultati ───────────────────────────────────────────

  // 1. CONFIG
  try {
    if (!cfgResult.error && cfgResult.data?.data) _applyConfig(cfgResult.data.data);
  } catch (e) { console.warn('[load appconfig]', e.message); }

  // 2. MEMBERS
  // IMPORTANTE: _membersReady viene impostato qui — restoreSession() può ora
  // validare ruoli e stato sospeso con dati affidabili da Supabase.
  try {
    const { data, error } = membersResult;
    if (!error && data?.length) {
      data.forEach(dm => {
        const mapped = {
          name: dm.name, initial: dm.initial, color: dm.color,
          password: dm.password_hash, role: dm.role,
          photo: dm.foto_url || null, sospeso: dm.sospeso || false,
        };
        const existing = MEMBERS.find(m => m.name === dm.name);
        if (existing) Object.assign(existing, mapped);
        else MEMBERS.push(mapped);
      });
    }
  } catch (e) { console.warn('[load members]', e.message); }
  // Segna i membri come pronti: il flag viene impostato sempre, anche in caso
  // di errore parziale, così restoreSession() non resta bloccata per sempre.
  _membersReady = true;

  // 3. CALENDARIO
  try {
    const { data, error } = calendarioResult;
    if (!error && data?.length) {
      EVENTI = data.map(e => {
        const d   = new Date(e.data);
        const obj = {
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
          const df = new Date(e.data_fine);
          obj.giornoFine = df.getUTCDate();
          obj.meseFine   = df.getUTCMonth() + 1;
          obj.annoFine   = df.getUTCFullYear();
        }
        return obj;
      });
      const maxId = EVENTI.reduce((m, e) => Math.max(m, e.id), 0);
      if (maxId >= _nextIds.event) _nextIds.event = maxId + 1;
    }
  } catch (e) { console.warn('[load calendario]', e.message); }

  // 4. SPESA
  try {
    const { data, error } = spesaResult;
    if (!error && data?.length) {
      SPESA = data.map(s => ({
        id: s.id, nome: s.item, done: s.done || false,
        qty: s.qty || '', costoUnitario: s.costo_unitario || 0,
        unita: s.unita || '', fromMagazzino: s.from_magazzino || false,
        magazzinoId: s.magazzino_id || null,
      }));
      const maxId = SPESA.reduce((m, s) => Math.max(m, s.id), 0);
      if (maxId >= _nextIds.spesa) _nextIds.spesa = maxId + 1;
    }
  } catch (e) { console.warn('[load spesa]', e.message); }

  // 5. LAVORI
  try {
    const { data, error } = lavoriResult;
    if (!error && data?.length) {
      LAVORI = data.map(l => ({ id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false }));
      const maxId = LAVORI.reduce((m, l) => Math.max(m, l.id), 0);
      if (maxId >= _nextIds.lavori) _nextIds.lavori = maxId + 1;
    }
  } catch (e) { console.warn('[load lavori]', e.message); }

  // 6. MAGAZZINO (solo quantità)
  try {
    const { data, error } = magazzinoResult;
    if (!error && data?.length) {
      data.forEach(row => {
        const item = MAGAZZINO.find(m => m.id === row.item_id);
        if (item) item.attuale = row.attuale;
      });
    }
  } catch (e) { console.warn('[load magazzino]', e.message); }

  // 7. PAGAMENTI
  try {
    const { data, error } = pagamentiResult;
    if (!error && data?.length) {
      data.forEach(row => {
        let movimenti = [];
        try { movimenti = typeof row.movimenti === 'string' ? JSON.parse(row.movimenti) : (row.movimenti || []); } catch (e) {}
        const existing = PAGAMENTI.find(p => p.name === row.member_name);
        if (existing) { existing.saldo = row.saldo || 0; existing.movimenti = movimenti; }
        else PAGAMENTI.push({ name: row.member_name, saldo: row.saldo || 0, movimenti });
      });
    }
  } catch (e) { console.warn('[load pagamenti]', e.message); }

  // 8. CHAT (ultimi 200)
  try {
    const { data, error } = chatResult;
    if (!error && data?.length) {
      CHAT = data.map(c => {
        const d = new Date(c.ts);
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
    const { data, error } = logResult;
    if (!error && data?.length) {
      LOG = data.map(l => {
        const d = new Date(l.ts);
        const member = MEMBERS.find(m => m.name === l.author)
          || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
        return {
          member,
          azione: l.action,
          tempo:  _formatLogTime(d),
          _id:    l.id,
        };
      });
    }
  } catch (e) { console.warn('[load log]', e.message); }

  // 10. SUGGERIMENTI
  try {
    const { data, error } = suggerimentiResult;
    if (!error && data?.length) {
      SUGGERIMENTI = data.map(s => ({
        id:     s.id,
        testo:  s.testo,
        author: s.author,
        tempo:  new Date(s.ts).toLocaleDateString('it-IT'),
      }));
    }
  } catch (e) { console.warn('[load suggerimenti]', e.message); }

  // 11. VALUTAZIONI
  try {
    const { data, error } = valutazioniResult;
    if (!error && data?.length) {
      VALUTAZIONI = data.map(v => ({
        id:     v.id,
        nome:   v.author,
        stelle: v.stelle || 0,
        testo:  v.testo  || '',
        tempo:  new Date(v.ts).toLocaleDateString('it-IT'),
      }));
    }
  } catch (e) { console.warn('[load valutazioni]', e.message); }

  // _sbReady = true garantisce che tutte le save-functions possano operare.
  _sbReady = true;
}

// ═════════════════════════════════════════════════════════════════
// REALTIME  (chat + log)
// ═════════════════════════════════════════════════════════════════
function initRealtime() {
  const sb = getSupabase();

  // ── CHAT ──
  _chatChannel = sb.channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, payload => {
      const c = payload.new;
      if (!c) return;

      // Blocca eco dei propri messaggi
      const key = `${c.author}|${c.text}`;
      if (_pendingChatKeys[key]) {
        _clearPendingChat(key);
        // Aggiorna id reale sul messaggio ottimistico
        const local = CHAT.find(m => m.who === c.author && m.testo === c.text && !m.id);
        if (local) local.id = c.id;
        return;
      }
      if (CHAT.some(m => m.id === c.id)) return;

      const d = new Date(c.ts);
      CHAT.push({
        id:    c.id,
        who:   c.author,
        testo: c.text,
        ora:   d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' · ' +
               d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        ts:    d.getTime(),
      });
      _unreadChat++;
      buildChat();
      updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat' }, () => {
      CHAT = []; buildChat(); updateDash();
    })
    .subscribe(status => { if (status === 'SUBSCRIBED') console.log('Chat realtime OK'); });

  // ── LOG ──
  _logChannel = sb.channel('log-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'log' }, payload => {
      const l = payload.new;
      if (!l) return;
      if (LOG.some(e => e._id === l.id)) return;

      const d      = new Date(l.ts);
      const member = MEMBERS.find(m => m.name === l.author)
        || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
      LOG.unshift({
        member,
        azione: l.action,
        tempo:  _formatLogTime(d),
        _id:    l.id,
      });
      _unreadLog++;
      buildLog();
      updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'log' }, () => {
      LOG = []; buildLog(); updateDash();
    })
    .subscribe(status => { if (status === 'SUBSCRIBED') console.log('Log realtime OK'); });
}
