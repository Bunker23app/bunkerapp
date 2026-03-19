// ════════════════════════════════════════
// SUPABASE — PERSISTENZA MULTI-TABELLA
// ════════════════════════════════════════
var SUPABASE_URL = 'https://ndcpekgxnawxwbvfseba.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kY3Bla2d4bmF3eHdidmZzZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzU5NjksImV4cCI6MjA4ODQ1MTk2OX0.EmvG_iqAO3JcgCPk49fwEGcQQIOkeZhN076PuklD118';
var _sb = null;
var _sbReady = false;
// true solo quando magazzino è stato caricato da Supabase con dati reali.
// Usato per evitare che syncMagazzinoWithSpesa+saveSpesa sovrascrivano i dati
// reali su Supabase quando magazzino è ancora quello hardcodato (attuale=0).
var _magazzinoLoadedFromDb = false;
// Timer per debounce salvataggi non-realtime
var _saveTimers = {};
// Guard temporale realtime: diventa true solo dopo che loadAllData() ha completato.
// Impedisce che gli eventi iniziali mandati da Supabase all'attivazione dei canali
// (prima che i dati siano in memoria) causino duplicati negli array locali.
var _realtimeReady = false;
var _cacheLoadingInProgress = false; // true durante loadAllData — blocca salvataggio cache con dati parziali
// Configurazione sezioni DB caricate per gli aiutanti (letta da appconfig.AIUTANTE_SECTIONS)
var AIUTANTE_CONFIG = { spesa:true, lavori:true, magazzino:true, pagamenti:false };

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

// Elimina una singola riga per id — usata dalle funzioni di delete esplicite in ui.js
async function _sbDeleteById(table, id) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from(table).delete().eq('id', id);
    if (res.error) console.warn('[sb.' + table + ' deleteById]', res.error.message);
  } catch(e) { console.warn('[sb.' + table + ' deleteById]', e.message); }
}

// ── SAVE FUNCTIONS ───────────────────────

// CONFIG (widget, tab, testi, sezioni, ecc.) — blob JSON su appconfig
function saveConfig() {
  // Guard: solo admin può sovrascrivere la configurazione globale (widget, tab, sezioni, ecc.).
  var _role = currentUser ? currentUser.role : '';
  if (_role !== 'admin') return;
  _debounce('config', async function() {
    var cfg = {
      WIDGET_CONFIG: WIDGET_CONFIG,
      TAB_CONFIG: TAB_CONFIG,
      BENVENUTO_TEXT: BENVENUTO_TEXT,
      AIUTANTE_WIDGET_CONFIG: AIUTANTE_WIDGET_CONFIG,
      AIUTANTE_TAB_CONFIG: AIUTANTE_TAB_CONFIG,
      PAGE_SECTIONS: PAGE_SECTIONS,
      PAGE_EDIT_PERMS: PAGE_EDIT_PERMS,
      ADD_USER_PERM: ADD_USER_PERM,
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
      NOTIFICHE_CONFIG: NOTIFICHE_CONFIG,
      AIUTANTE_SECTIONS: AIUTANTE_CONFIG,
      // Articoli magazzino aggiunti dinamicamente (id >= 23)
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
        var row = {
          name: m.name,
          initial: m.initial || m.name.charAt(0).toUpperCase(),
          color: m.color || '#444',
          role: m.role || 'utente',
          foto_url: m.photo || null,
          sospeso: m.sospeso || false,
          can_create_profiles: m.canCreateProfiles || false,
        };
        // Includi password_hash SOLO se presente in memoria — evita di
        // sovrascrivere con stringa vuota quando i membri sono stati caricati
        // senza password_hash (es. ruolo guest/Lv1 che usa select ridotto)
        if (m.password) row.password_hash = m.password;
        return row;
      });
      // Upsert uno alla volta per rispettare unique su name
      // Se il membro ha _oldName (nome cambiato) → UPDATE WHERE name=oldName
      // altrimenti → upsert normale (inserisce se non esiste, aggiorna se esiste)
      for (var i = 0; i < rows.length; i++) {
        var m0 = MEMBERS[i];
        var res;
        if (m0 && m0._oldName && m0._oldName !== m0.name) {
          // Nome cambiato: aggiorna la riga esistente senza creare duplicati
          res = await getSupabase().from('members').update(rows[i]).eq('name', m0._oldName);
          if (!res.error) delete m0._oldName; // pulizia dopo successo
        } else {
          res = await getSupabase().from('members').upsert(rows[i], { onConflict: 'name' });
        }
        if (res.error) console.warn('[sb.members]', res.error.message);
        // Aggiorna ruolo e sospensione nelle push_subscriptions
        var m = MEMBERS[i];
        if (m && m.name) {
          if (m.sospeso) {
            // Utente sospeso: elimina tutte le sue subscription
            await getSupabase().from('push_subscriptions').delete().eq('user_name', m.name);
          } else {
            // Aggiorna il ruolo nelle subscription esistenti
            await getSupabase().from('push_subscriptions').update({ user_role: m.role || 'utente' }).eq('user_name', m.name);
          }
        }
      }
    } catch(e) { console.warn('[sb.members]', e.message); }
  }, 600);
}

// EVENTI (calendario) — solo upsert. Il DELETE avviene in deleteEvento() via _sbDeleteById().
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
          ora_fine: e.ora_fine || null,
          terminato: e.terminato || false,
          luogo: e.luogo || '',
          note: e.note || '',
          descrizione: e.desc || '',
          tipo: e.tipo || 'invito',
          locandina: e.locandina || null,
          pubblico: (e.tipo === 'invito' || e.tipo === 'consigliato'),
          created_by: currentUser ? currentUser.name : null,
          notifica_nuovo: e.notifica_nuovo || false,
          notifica_reminder: e.notifica_reminder || false,
        };
      });
      if (rows.length) {
        var res = await getSupabase().from('calendario').upsert(rows, { onConflict: 'id' });
        if (res.error) console.warn('[sb.calendario save]', res.error.message);
      }
    } catch(e) { console.warn('[sb.calendario]', e.message); }
    saveConfig();
  }, 800);
}

// BACHECA e INFO — salvate in appconfig (sono strutture ricche con foto)
// Incluse nella saveConfig()

// SPESA — upsert intelligente: aggiorna/inserisce le righe presenti, elimina quelle rimosse
// SPESA — solo upsert. Il DELETE avviene in deleteSpesa() via deleteSpesaRow(), mai qui.
function saveSpesa() {
  _debounce('spesa', async function() {
    if (!_sbReady) return;
    try {
      var sb = getSupabase();
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
        var res = await sb.from('spesa').upsert(rows, { onConflict: 'id' });
        if (res.error) console.warn('[sb.spesa upsert]', res.error.message);
      }
    } catch(e) { console.warn('[sb.spesa]', e.message); }
  }, 600);
}

// Salva/aggiorna UNA singola riga spesa — chirurgico, nessuna race condition
async function saveSpesaRow(s) {
  if (!_sbReady) return;
  try {
    var row = {
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
    var res = await getSupabase().from('spesa').upsert(row, { onConflict: 'id' });
    if (res.error) console.warn('[sb.spesaRow upsert]', res.error.message);
  } catch(e) { console.warn('[sb.spesaRow]', e.message); }
}

// Elimina UNA singola riga spesa per ID — chirurgico, nessuna race condition
async function deleteSpesaRow(id) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from('spesa').delete().eq('id', id);
    if (res.error) console.warn('[sb.spesaRow delete]', res.error.message);
  } catch(e) { console.warn('[sb.spesaRow delete]', e.message); }
}

// Salva/aggiorna UNA singola riga lavoro — chirurgico, tocca SOLO il campo done
// di quel lavoro specifico, senza sovrascrivere gli stati degli altri lavori.
async function saveLavoroRow(l) {
  if (!_sbReady) return;
  try {
    var row = { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
    var res = await getSupabase().from('lavori').upsert(row, { onConflict: 'id' });
    if (res.error) console.warn('[sb.lavoroRow upsert]', res.error.message);
  } catch(e) { console.warn('[sb.lavoroRow]', e.message); }
}

// Aggiorna la quantità di UN singolo articolo magazzino — chirurgico.
// updateMagazzinoById e confermaAcquisto toccano solo item.attuale di quell'articolo;
// saveMagazzino() bulk sovrascriveva gli attuale di tutti gli altri.
async function saveMagazzinoRow(m) {
  if (!_sbReady) return;
  try {
    var row = {
      item_id:        m.id,
      attuale:        m.attuale,
      nome:           m.nome,
      minimo:         m.minimo,
      unita:          m.unita,
      categoria:      m.categoria,
      costo_unitario: m.costoUnitario || 0,
    };
    var res = await getSupabase().from('magazzino').upsert(row, { onConflict: 'item_id' });
    if (res.error) console.warn('[sb.magazzinoRow upsert]', res.error.message);
  } catch(e) { console.warn('[sb.magazzinoRow]', e.message); }
}

// Aggiorna UN singolo evento (solo campo terminato) — chirurgico.
// segnaTerminato tocca solo terminato di quell'evento;
// saveEventi() bulk sovrascriveva tutti gli altri eventi.
async function saveEventoRow(e) {
  if (!_sbReady) return;
  try {
    var dataStr = e.anno + '-' + String(e.mese).padStart(2,'0') + '-' + String(e.giorno).padStart(2,'0');
    var dataFineStr = (e.giornoFine && e.meseFine && e.annoFine)
      ? (e.annoFine + '-' + String(e.meseFine).padStart(2,'0') + '-' + String(e.giornoFine).padStart(2,'0'))
      : null;
    var row = {
      id: e.id, titolo: e.nome, data: dataStr, data_fine: dataFineStr,
      ora: e.ora || '', ora_fine: e.ora_fine || null, terminato: e.terminato || false,
      luogo: e.luogo || '', note: e.note || '', descrizione: e.desc || '',
      tipo: e.tipo || 'invito', locandina: e.locandina || null,
      pubblico: (e.tipo === 'invito' || e.tipo === 'consigliato'),
      notifica_nuovo: e.notifica_nuovo || false, notifica_reminder: e.notifica_reminder || false,
    };
    var res = await getSupabase().from('calendario').upsert(row, { onConflict: 'id' });
    if (res.error) console.warn('[sb.eventoRow upsert]', res.error.message);
  } catch(e) { console.warn('[sb.eventoRow]', e.message); }
}

// LAVORI — solo upsert della riga modificata.
// Il DELETE avviene in deleteLavori() via _sbDeleteById(), mai qui.
// Questo evita che un aiutante che salva sovrascriva righe aggiunte in concorrenza.
function saveLavori() {
  // Guard: bulk upsert di tutti i lavori — solo staff/admin.
  // Le azioni utente usano saveLavoroRow() chirurgico, non questa.
  var _role = currentUser ? currentUser.role : '';
  if (_role !== 'staff' && _role !== 'admin') return;
  _debounce('lavori', async function() {
    if (!_sbReady) return;
    try {
      var rows = LAVORI.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      if (rows.length) {
        var res = await getSupabase().from('lavori').upsert(rows, { onConflict: 'id' });
        if (res.error) console.warn('[sb.lavori upsert]', res.error.message);
      }
    } catch(e) { console.warn('[sb.lavori]', e.message); }
  }, 600);
}

// MAGAZZINO — salva tutti i campi (metadati + quantità)
function saveMagazzino() {
  _debounce('magazzino', async function() {
    if (!_sbReady) return;
    try {
      var sb = getSupabase();
      var rows = MAGAZZINO.map(function(m) {
        return {
          item_id:        m.id,
          attuale:        m.attuale,
          nome:           m.nome,
          minimo:         m.minimo,
          unita:          m.unita,
          categoria:      m.categoria,
          costo_unitario: m.costoUnitario || 0,
        };
      });
      var res = await sb.from('magazzino').upsert(rows, { onConflict: 'item_id' });
      if (res.error) console.warn('[sb.magazzino upsert]', res.error.message);
    } catch(e) {
      console.warn('[sb.magazzino]', e.message);
      showToast('// ERRORE MAGAZZINO: ' + e.message, 'error');
    }
  }, 600);
}

// PAGAMENTI
function savePagamenti() {
  // Guard: solo staff/admin possono sovrascrivere l'intera tabella pagamenti.
  // Gli utenti non-staff caricano solo la propria riga → usare _saveRigaPagamenti().
  var _role = currentUser ? currentUser.role : '';
  if (_role !== 'staff' && _role !== 'admin') return;
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

// Salva una singola riga pagamenti su Supabase in modo sincrono (per operazioni atomiche come rimborsa).
// Restituisce true se ok, false se errore.
async function _saveRigaPagamenti(p) {
  if (!_sbReady) return false;
  try {
    var res = await getSupabase().from('pagamenti').upsert({
      member_name: p.name,
      saldo: p.saldo || 0,
      movimenti: JSON.stringify(p.movimenti || []),
    }, { onConflict: 'member_name' });
    if (res.error) { console.warn('[sb._saveRigaPagamenti]', res.error.message); return false; }
    return true;
  } catch(e) { console.warn('[sb._saveRigaPagamenti]', e.message); return false; }
}

// SUGGERIMENTI — solo upsert. Il DELETE avviene in deleteSuggerimento() via _sbDeleteById().
function saveSuggerimenti() {
  _debounce('suggerimenti', async function() {
    if (!_sbReady) return;
    try {
      var rows = SUGGERIMENTI.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author || null, ts: s.ts || new Date().toISOString() };
      });
      if (rows.length) {
        var res = await getSupabase().from('suggerimenti').upsert(rows, { onConflict: 'id' });
        if (res.error) console.warn('[sb.suggerimenti upsert]', res.error.message);
      }
    } catch(e) { console.warn('[sb.suggerimenti]', e.message); }
  }, 600);
}

// VALUTAZIONI — solo upsert. Il DELETE avviene in deleteValutazione() via _sbDeleteById().
function saveValutazioni() {
  _debounce('valutazioni', async function() {
    if (!_sbReady) return;
    try {
      var rows = VALUTAZIONI.map(function(v) {
        return { id: v.id, author: v.nome, stelle: v.stelle || 0, testo: v.testo || '', ts: v.ts || new Date().toISOString() };
      });
      if (rows.length) {
        var res = await getSupabase().from('valutazioni').upsert(rows, { onConflict: 'id' });
        if (res.error) console.warn('[sb.valutazioni upsert]', res.error.message);
      }
    } catch(e) { console.warn('[sb.valutazioni]', e.message); }
  }, 600);
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

// ── STORAGE LOCANDINE ────────────────────────────────────────────────────────
// Carica un blob (da base64) nel bucket "locandine" e restituisce l'URL pubblico.
// eventoId: usato come nome file univoco (es. "evento_42.jpg")
async function uploadLocandina(b64, eventoId) {
  if (!_sbReady) return null;
  try {
    // Converte base64 → Blob
    var parts = b64.split(',');
    var mime  = parts[0].match(/:(.*?);/)[1];           // es. image/jpeg
    var ext   = mime.split('/')[1] || 'jpg';
    var byteStr = atob(parts[1]);
    var arr = new Uint8Array(byteStr.length);
    for (var i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    var blob = new Blob([arr], { type: mime });

    var fileName = 'evento_' + eventoId + '_' + Date.now() + '.' + ext;
    var res = await getSupabase().storage.from('locandine').upload(fileName, blob, {
      contentType: mime,
      upsert: true,
    });
    if (res.error) { console.warn('[storage.locandine upload]', res.error.message); return null; }

    var urlRes = getSupabase().storage.from('locandine').getPublicUrl(fileName);
    return urlRes.data.publicUrl || null;
  } catch(e) { console.warn('[storage.locandine upload]', e.message); return null; }
}

// Cancella il file dal bucket "locandine" dato il suo URL pubblico.
async function deleteLocandina(url) {
  if (!_sbReady || !url) return;
  try {
    // Estrai il nome file dall'URL pubblico
    var marker = '/object/public/locandine/';
    var idx = url.indexOf(marker);
    if (idx === -1) return; // non è un file Storage nostro, skip
    var fileName = url.slice(idx + marker.length);
    var res = await getSupabase().storage.from('locandine').remove([fileName]);
    if (res.error) console.warn('[storage.locandine delete]', res.error.message);
  } catch(e) { console.warn('[storage.locandine delete]', e.message); }
}

// SVUOTA LOG
async function clearLogRemote() {
  if (!_sbReady) return;
  try { await getSupabase().from('log').delete().gt('id', 0); } catch(e) {}
}

// Ricarica le tabelle staff/aiutante dopo un cambio ruolo in sessione (senza reload pagina)
async function reloadStaffData() {
  if (!_sbReady) return;
  var sb = getSupabase();
  var _role = currentUser ? currentUser.role : '';
  var _isAiut = (_role === 'aiutante');
  var _loadSpesa     = !_isAiut || AIUTANTE_CONFIG.spesa;
  var _loadLavori    = !_isAiut || AIUTANTE_CONFIG.lavori;
  var _loadMagazzino = !_isAiut || AIUTANTE_CONFIG.magazzino;
  var _loadPagamenti = !_isAiut || AIUTANTE_CONFIG.pagamenti;
  var _empty = Promise.resolve({ data: [], error: null });

  try {
    var res = await Promise.all([
      _loadSpesa     ? sb.from('spesa').select('*')                                      : _empty,
      _loadLavori    ? sb.from('lavori').select('*')                                     : _empty,
      _loadMagazzino ? sb.from('magazzino').select('*')                                  : _empty,
      _loadPagamenti ? sb.from('pagamenti').select('*')                                  : _empty,
    ]);
    if (_loadSpesa && res[0].data) {
      SPESA = res[0].data.map(function(s) {
        var obj = { id:s.id, nome:s.item, done:s.done||false, qty:s.qty||'', costoUnitario:s.costo_unitario||0, unita:s.unita||'', fromMagazzino:s.from_magazzino||false, magazzinoId:s.magazzino_id||null, qtyNum:0, _categoria:null };
        if (obj.qty) { var p = parseFloat(obj.qty); if (!isNaN(p)) obj.qtyNum = p; }
        if (obj.fromMagazzino && obj.magazzinoId) { var mz = MAGAZZINO.find(function(m){ return m.id === obj.magazzinoId; }); if (mz) { obj._categoria=mz.categoria; obj.costoUnitario=mz.costoUnitario; obj.unita=mz.unita; } }
        return obj;
      });
    }
    if (_loadLavori && res[1].data) {
      LAVORI = res[1].data.map(function(l) { return { id:l.id, lavoro:l.lavoro, who:l.who||'-', done:l.done||false }; });
    }
    if (_loadMagazzino && res[2].data) {
      res[2].data.forEach(function(row) { var item = MAGAZZINO.find(function(m){ return m.id === row.item_id; }); if (item) item.attuale = row.attuale; });
    }
    if (_loadPagamenti && res[3].data) {
      res[3].data.forEach(function(row) {
        var existing = PAGAMENTI.find(function(p){ return p.name === row.member_name; });
        var mov = []; try { mov = typeof row.movimenti === 'string' ? JSON.parse(row.movimenti) : (row.movimenti||[]); } catch(e) {}
        if (existing) { existing.saldo = row.saldo||0; existing.movimenti = mov; }
        else PAGAMENTI.push({ name:row.member_name, saldo:row.saldo||0, movimenti:mov });
      });
    }
    console.log('[reloadStaffData] completato per ruolo: ' + _role);
  } catch(e) {
    console.warn('[reloadStaffData]', e.message);
  } finally {
    _realtimeReady = true; // garantito anche in caso di errore
  }
}

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
  if (typeof cfg.ADD_USER_PERM === 'string') ADD_USER_PERM = cfg.ADD_USER_PERM;
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
  // Magazzino gestito interamente da Supabase — MAGAZZINO_EXTRA non più necessario
  // Notifiche push
  if (cfg.NOTIFICHE_CONFIG) Object.assign(NOTIFICHE_CONFIG, cfg.NOTIFICHE_CONFIG);
  // Sezioni DB accessibili agli aiutanti
  if (cfg.AIUTANTE_SECTIONS) Object.assign(AIUTANTE_CONFIG, cfg.AIUTANTE_SECTIONS);
}

// ════════════════════════════════════════════════════════
// CACHE LOCALSTORAGE — tutti i ruoli (guest, utente, premium, aiutante, staff, admin)
// Chiave: bunker23_cache_v8 (aggiornare versione ad ogni cambio struttura dati)
// Campi cachati per ruolo:
//   Tutti:        EVENTI, BACHECA, INFO, CONSIGLIATI, SUGGERIMENTI, VALUTAZIONI, MEMBERS ridotto
//                 + WIDGET_CONFIG (ordine+enabled), TAB_CONFIG (enabled)
//   Aiutante:     + SPESA/LAVORI/MAGAZZINO/PAGAMENTI secondo AIUTANTE_CONFIG
//                 + AIUTANTE_CONFIG, AIUTANTE_WIDGET_CONFIG, AIUTANTE_TAB_CONFIG
//   Staff/Admin:  + SPESA, LAVORI, MAGAZZINO, PAGAMENTI, LOG
// Ottimizzazione egress: lastFetch per tabella — scarica solo se updated_at è cambiato
// NON cachati: password, log raw, dati sensibili
// ════════════════════════════════════════════════════════

var _CACHE_KEY = 'bunker23_cache_v8';

// Timestamp dell'ultimo fetch riuscito per ogni tabella (popolato da _restorePublicCache)
var _lastFetch = {}; // { appconfig: ISOstring, calendario: ISOstring, members: ISOstring, ... }

function _savePublicCache() {
  if (_cacheLoadingInProgress) return; // non salvare durante loadAllData
  var role = currentUser && currentUser.role ? currentUser.role : '';
  var _isStaffAdmin = (role === 'admin' || role === 'staff');
  var _isAiut       = (role === 'aiutante');
  var _isPublic     = (role === '' || role === 'utente' || role === 'premium');
  // Cache attiva per tutti i ruoli
  try {
    var payload = {
      ts:        Date.now(),
      role:      role, // salvato per sapere quali campi aspettarsi al restore
      lastFetch: _lastFetch, // timestamp ultimo fetch riuscito per tabella (check updated_at)
      // ── Dati pubblici (tutti i ruoli) ────────────────────────────────────
      EVENTI:       EVENTI,
      BACHECA:      BACHECA,
      INFO:         INFO,
      CONSIGLIATI:  CONSIGLIATI,
      SUGGERIMENTI: SUGGERIMENTI,
      VALUTAZIONI:  VALUTAZIONI,
      // ── Config UI (tutti i ruoli) — serializzati slim per evitare di perdere adminOnly ecc.
      WIDGET_CONFIG: WIDGET_CONFIG.map(function(w){ return { id: w.id, enabled: w.enabled, label: w.label }; }),
      TAB_CONFIG:    TAB_CONFIG.map(function(t){ return { id: t.id, enabled: t.enabled }; }),
      // Fix updated_at: questi dati vengono da appconfig e vengono persi se appconfig
      // viene skippata dal check updated_at. Salvati per tutti i ruoli.
      BENVENUTO_TEXT: BENVENUTO_TEXT,
      LINKS_PAGE:     LINKS_PAGE,
      LINKS_EVENTO:   LINKS_EVENTO,
      PAGE_SECTIONS:  PAGE_SECTIONS,
    };

    if (_isPublic) {
      // guest/utente/premium: MEMBERS ridotto (no password, no can_create_profiles)
      payload.MEMBERS = MEMBERS.map(function(m) {
        return { name: m.name, initial: m.initial, color: m.color, role: m.role, photo: m.photo, sospeso: m.sospeso };
      });
    } else {
      // aiutante/staff/admin: MEMBERS completo
      payload.MEMBERS = MEMBERS;
    }

    if (_isStaffAdmin) {
      // Staff e admin: cache completa di tutte le tabelle
      payload.SPESA     = SPESA;
      payload.LAVORI    = LAVORI;
      payload.MAGAZZINO = MAGAZZINO;
      payload.PAGAMENTI = PAGAMENTI;
      payload.LOG       = LOG;
      // Config aiutante — staff/admin possono modificarla, deve sopravvivere al check updated_at
      payload.AIUTANTE_CONFIG        = AIUTANTE_CONFIG;
      payload.AIUTANTE_WIDGET_CONFIG = AIUTANTE_WIDGET_CONFIG.map(function(w){ return { id: w.id, enabled: w.enabled, label: w.label }; });
      payload.AIUTANTE_TAB_CONFIG    = AIUTANTE_TAB_CONFIG.map(function(t){ return { id: t.id, enabled: t.enabled }; });
    } else if (_isAiut) {
      // Aiutante: solo le sezioni abilitate in AIUTANTE_CONFIG
      if (AIUTANTE_CONFIG.spesa)     payload.SPESA     = SPESA;
      if (AIUTANTE_CONFIG.lavori)    payload.LAVORI    = LAVORI;
      if (AIUTANTE_CONFIG.magazzino) payload.MAGAZZINO = MAGAZZINO;
      if (AIUTANTE_CONFIG.pagamenti) payload.PAGAMENTI = PAGAMENTI;
      // Config sezioni aiutante — essenziale per il fix updated_at: senza questo
      // vengono perse se appconfig non cambia e viene skippata dal check updated_at
      payload.AIUTANTE_CONFIG        = AIUTANTE_CONFIG;
      payload.AIUTANTE_WIDGET_CONFIG = AIUTANTE_WIDGET_CONFIG.map(function(w){ return { id: w.id, enabled: w.enabled, label: w.label }; });
      payload.AIUTANTE_TAB_CONFIG    = AIUTANTE_TAB_CONFIG.map(function(t){ return { id: t.id, enabled: t.enabled }; });
    }

    localStorage.setItem(_CACHE_KEY, JSON.stringify(payload));
    console.log('[cache] salvata · ruolo=' + (role || 'guest') + ' · ' + EVENTI.length + ' eventi, ' + MEMBERS.length + ' membri');
  } catch(e) {
    // Quota exceeded o browser privato: ignora silenziosamente
    console.warn('[cache] salvataggio fallito:', e.message);
  }
}

function _restorePublicCache() {
  try {
    var raw = localStorage.getItem(_CACHE_KEY);
    if (!raw) return false;
    var payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return false;

    var cachedRole = payload.role || '';
    var _wasStaffAdmin = (cachedRole === 'admin' || cachedRole === 'staff');
    var _wasAiut       = (cachedRole === 'aiutante');

    // ── Ripristina lastFetch per il check updated_at ──────────────────────
    if (payload.lastFetch && typeof payload.lastFetch === 'object') {
      _lastFetch = payload.lastFetch;
    } else {
      _lastFetch = {};
    }

    // ── Dati pubblici (tutti i ruoli) ────────────────────────────────────
    if (Array.isArray(payload.EVENTI) && payload.EVENTI.length)  EVENTI       = payload.EVENTI;
    if (Array.isArray(payload.BACHECA))                           BACHECA      = payload.BACHECA;
    if (payload.INFO && typeof payload.INFO === 'object')         INFO         = payload.INFO;
    if (Array.isArray(payload.CONSIGLIATI))                       CONSIGLIATI  = payload.CONSIGLIATI;
    if (Array.isArray(payload.SUGGERIMENTI))                      SUGGERIMENTI = payload.SUGGERIMENTI;
    if (Array.isArray(payload.VALUTAZIONI))                       VALUTAZIONI  = payload.VALUTAZIONI;

    // ── MEMBERS ──────────────────────────────────────────────────────────
    if (Array.isArray(payload.MEMBERS) && payload.MEMBERS.length) {
      if (_wasStaffAdmin || _wasAiut) {
        // Cache completa: sostituisci direttamente
        MEMBERS = payload.MEMBERS;
      } else {
        // Cache pubblica ridotta: merge per evitare duplicati
        payload.MEMBERS.forEach(function(cm) {
          var existing = MEMBERS.find(function(m){ return m.name === cm.name; });
          if (existing) {
            existing.initial = cm.initial; existing.color = cm.color;
            existing.role = cm.role; existing.photo = cm.photo; existing.sospeso = cm.sospeso;
          } else {
            MEMBERS.push(cm);
          }
        });
      }
    }

    // ── Dati staff/admin ─────────────────────────────────────────────────
    if (_wasStaffAdmin || _wasAiut) {
      if (Array.isArray(payload.SPESA)     && payload.SPESA.length)     SPESA     = payload.SPESA;
      if (Array.isArray(payload.LAVORI)    && payload.LAVORI.length)    LAVORI    = payload.LAVORI;
      if (Array.isArray(payload.PAGAMENTI) && payload.PAGAMENTI.length) {
        // PAGAMENTI ha struttura {name, saldo, movimenti} — assegna direttamente
        PAGAMENTI = payload.PAGAMENTI;
      }
      if (Array.isArray(payload.LOG)       && payload.LOG.length)        LOG       = payload.LOG;
      // MAGAZZINO: aggiorna quantità hardcodati, replace completo custom (id>=23) per evitare duplicati
      if (Array.isArray(payload.MAGAZZINO) && payload.MAGAZZINO.length) {
        payload.MAGAZZINO.forEach(function(cm) {
          var existing = MAGAZZINO.find(function(m){ return m.id === cm.id; });
          if (existing) existing.attuale = cm.attuale;
        });
        var customFromCache = payload.MAGAZZINO.filter(function(cm){ return cm.id >= 23; });
        MAGAZZINO = MAGAZZINO.filter(function(m){ return m.id < 23; });
        customFromCache.forEach(function(cm){ MAGAZZINO.push(cm); });
      }
    }

    // ── Config UI (tutti i ruoli) ─────────────────────────────────────────
    // Fix updated_at: WIDGET_CONFIG/TAB_CONFIG/AIUTANTE_* vengono applicati
    // solo quando appconfig viene scaricata da Supabase. Con il sistema updated_at
    // che skippa appconfig se non cambiata, senza questa cache le config tornano
    // ai valori hardcodati ad ogni reload.
    if (typeof payload.BENVENUTO_TEXT === 'string') BENVENUTO_TEXT = payload.BENVENUTO_TEXT;
    if (payload.LINKS_PAGE && typeof payload.LINKS_PAGE === 'object')   Object.assign(LINKS_PAGE, payload.LINKS_PAGE);
    if (payload.LINKS_EVENTO && typeof payload.LINKS_EVENTO === 'object') Object.assign(LINKS_EVENTO, payload.LINKS_EVENTO);
    if (payload.PAGE_SECTIONS && typeof payload.PAGE_SECTIONS === 'object') {
      Object.keys(payload.PAGE_SECTIONS).forEach(function(page) {
        if (!PAGE_SECTIONS[page] || !Array.isArray(payload.PAGE_SECTIONS[page])) return;
        var ordered = [];
        payload.PAGE_SECTIONS[page].forEach(function(ds) {
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
    if (Array.isArray(payload.WIDGET_CONFIG)) {
      payload.WIDGET_CONFIG.forEach(function(dw) {
        var w = WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
        if (w) { w.enabled = dw.enabled; if (dw.label) w.label = dw.label; }
      });
      // Ripristina anche l'ordine (salvato implicitamente nell'array)
      var _orderedW = [];
      payload.WIDGET_CONFIG.forEach(function(dw) {
        var w = WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
        if (w) _orderedW.push(w);
      });
      WIDGET_CONFIG.forEach(function(w) {
        if (!_orderedW.find(function(x){ return x.id === w.id; })) _orderedW.push(w);
      });
      WIDGET_CONFIG.length = 0;
      _orderedW.forEach(function(w){ WIDGET_CONFIG.push(w); });
    }
    if (Array.isArray(payload.TAB_CONFIG)) {
      payload.TAB_CONFIG.forEach(function(dt) {
        var t = TAB_CONFIG.find(function(x){ return x.id === dt.id; });
        if (t) t.enabled = dt.enabled;
      });
    }
    // ── Config UI aiutante ───────────────────────────────────────────────
    if (_wasAiut || _wasStaffAdmin) {
      if (payload.AIUTANTE_CONFIG && typeof payload.AIUTANTE_CONFIG === 'object') {
        Object.assign(AIUTANTE_CONFIG, payload.AIUTANTE_CONFIG);
      }
      if (Array.isArray(payload.AIUTANTE_WIDGET_CONFIG)) {
        payload.AIUTANTE_WIDGET_CONFIG.forEach(function(dw) {
          var w = AIUTANTE_WIDGET_CONFIG.find(function(x){ return x.id === dw.id; });
          if (w) { w.enabled = dw.enabled; if (dw.label) w.label = dw.label; }
        });
      }
      if (Array.isArray(payload.AIUTANTE_TAB_CONFIG)) {
        payload.AIUTANTE_TAB_CONFIG.forEach(function(dt) {
          var t = AIUTANTE_TAB_CONFIG.find(function(x){ return x.id === dt.id; });
          if (t) t.enabled = dt.enabled;
        });
      }
    }

    console.log('[cache] ripristinata · ruolo=' + (cachedRole || 'guest') + ' · ts=' + new Date(payload.ts).toLocaleTimeString('it-IT'));
    return true;
  } catch(e) {
    console.warn('[cache] ripristino fallito:', e.message);
    return false;
  }
}

async function loadAllData() {
  _realtimeReady = false;
  _cacheLoadingInProgress = true; // blocca salvataggio cache durante il caricamento
  console.log('[loadAllData] START · ruolo=' + (currentUser ? currentUser.role : 'guest'));
  if (typeof _showSyncBanner === 'function') _showSyncBanner();
  var sb = getSupabase();
  try {

  // ── CACHE: ripristino immediato per tutti i ruoli ───────────────────────────
  // Se la cache esiste, mostra subito i dati dell'ultima sessione mentre
  // Supabase carica in background (realtime o polling aggiorneranno in tempo reale).
  var _cacheRestored = _restorePublicCache();
  if (_cacheRestored && typeof buildAll === 'function') buildAll(); // UI immediata con dati cached

  // ── OTTIMIZZAZIONE EGRESS: helper check updated_at ───────────────────────
  // Per ogni tabella controlla se updated_at è cambiato rispetto all'ultimo fetch.
  // Se non è cambiato, salta il download e usa i dati già in memoria (da cache).
  // Ritorna true se la tabella va scaricata, false se è ancora valida.
  async function _needsRefresh(tableName, idFilter) {
    try {
      var q = sb.from(tableName).select('updated_at').order('updated_at', { ascending: false }).limit(1);
      if (idFilter) q = q.eq('id', idFilter); // per appconfig (id=1)
      var res = await q.single ? q.single() : q;
      // appconfig usa single(), le altre no — gestiamo entrambi
      var row = res.data;
      if (!row) return true; // tabella vuota o errore: scarica comunque
      // Per query senza .single() res.data è array
      var remoteTs = Array.isArray(row) ? (row[0] && row[0].updated_at) : row.updated_at;
      if (!remoteTs) return true; // colonna assente: scarica comunque
      var cached = _lastFetch[tableName];
      if (!cached) return true; // primo accesso: scarica
      // Scarica solo se il DB è più recente della cache
      var changed = new Date(remoteTs).getTime() > new Date(cached).getTime();
      console.log('[egress] ' + tableName + ': ' + (changed ? 'CAMBIATA → download' : 'invariata → skip'));
      return changed;
    } catch(e) {
      console.warn('[egress] check ' + tableName + ':', e.message);
      return true; // in caso di errore scarica sempre (safe fallback)
    }
  }

  // ── BATCH 0 (parallelo): check updated_at per tutte le tabelle ───────────
  // Un solo round-trip leggero (solo il MAX updated_at per tabella) prima
  // di decidere quali tabelle scaricare per intero.
  var _roleEarly  = currentUser ? currentUser.role : '';
  var _isLv12Early = (_roleEarly === 'utente' || _roleEarly === 'premium' || _roleEarly === '');
  var _isAiutEarly = (_roleEarly === 'aiutante');
  var _isStaffEarly = (_roleEarly === 'staff' || _roleEarly === 'admin');

  var _chkLoadSpesa     = !_isLv12Early && (!_isAiutEarly || AIUTANTE_CONFIG.spesa);
  var _chkLoadLavori    = !_isLv12Early && (!_isAiutEarly || AIUTANTE_CONFIG.lavori);
  var _chkLoadMagazzino = !_isLv12Early && (!_isAiutEarly || AIUTANTE_CONFIG.magazzino);
  var _chkLoadPagamenti = _isStaffEarly || _isLv12Early || (_isAiutEarly && AIUTANTE_CONFIG.pagamenti);

  var _chkAppconfig  = sb.from('appconfig').select('updated_at').eq('id', 1).single();
  var _chkMembers    = sb.from('members').select('updated_at').order('updated_at', { ascending: false }).limit(1);
  var _chkCalendario = sb.from('calendario').select('updated_at').order('updated_at', { ascending: false }).limit(1);
  var _chkSpesa      = _chkLoadSpesa     ? sb.from('spesa').select('updated_at').order('updated_at', { ascending: false }).limit(1)     : Promise.resolve({ data: null });
  var _chkLavori     = _chkLoadLavori    ? sb.from('lavori').select('updated_at').order('updated_at', { ascending: false }).limit(1)    : Promise.resolve({ data: null });
  var _chkMagazzino  = _chkLoadMagazzino ? sb.from('magazzino').select('updated_at').order('updated_at', { ascending: false }).limit(1) : Promise.resolve({ data: null });
  var _chkPagamenti  = _chkLoadPagamenti ? sb.from('pagamenti').select('updated_at').order('updated_at', { ascending: false }).limit(1) : Promise.resolve({ data: null });

  var checks = await Promise.all([_chkAppconfig, _chkMembers, _chkCalendario, _chkSpesa, _chkLavori, _chkMagazzino, _chkPagamenti]);

  function _isChanged(checkRes, tableName) {
    try {
      var row = checkRes.data;
      if (!row) return true;
      var remoteTs = Array.isArray(row) ? (row[0] && row[0].updated_at) : row.updated_at;
      if (!remoteTs) return true;
      var cached = _lastFetch[tableName];
      if (!cached) return true;
      var changed = new Date(remoteTs).getTime() > new Date(cached).getTime();
      console.log('[egress] ' + tableName + ': ' + (changed ? 'CAMBIATA → download' : 'invariata → skip'));
      return changed;
    } catch(e) { return true; }
  }

  var _fetchAppconfig  = _isChanged(checks[0], 'appconfig');
  var _fetchMembers    = _isChanged(checks[1], 'members');
  var _fetchCalendario = _isChanged(checks[2], 'calendario');
  var _fetchSpesa      = _chkLoadSpesa     && _isChanged(checks[3], 'spesa');
  var _fetchLavori     = _chkLoadLavori    && _isChanged(checks[4], 'lavori');
  var _fetchMagazzino  = _chkLoadMagazzino && _isChanged(checks[5], 'magazzino');
  var _fetchPagamenti  = _chkLoadPagamenti && _isChanged(checks[6], 'pagamenti');

  // ── BATCH 1 (parallelo): config + members — solo se cambiati ─────────────
  // members deve essere disponibile prima del LOG (batch 2) che lo referenzia.
  // Per Lv1/Lv2 scarica solo le colonne necessarie alla UI pubblica:
  // name, initial, color, role, foto_url, sospeso — no password_hash, no can_create_profiles.
  // Staff e admin scaricano tutto (*) per gestire il pannello membri.
  var _membersSelect = _isLv12Early
    ? 'name,initial,color,role,foto_url,sospeso'
    : '*';

  var _emptyOne = Promise.resolve({ data: null, error: null });
  var batch1 = await Promise.all([
    _fetchAppconfig ? sb.from('appconfig').select('data,updated_at').eq('id', 1).single() : _emptyOne,
    _fetchMembers   ? sb.from('members').select(_membersSelect.includes('*') ? '*' : (_membersSelect + ',updated_at')) : _emptyOne,
  ]);

  // 1. CONFIG
  try {
    var cfgRes = batch1[0];
    if (cfgRes.data && cfgRes.data.data) {
      _applyConfig(cfgRes.data.data);
      if (cfgRes.data.updated_at) _lastFetch['appconfig'] = cfgRes.data.updated_at;
    }
  } catch(e) { console.warn('[load config]', e.message); }

  // 2. MEMBERS
  try {
    var mRes = batch1[1];
    if (mRes.data && mRes.data.length) {
      var _mUpdatedAt = null;
      MEMBERS = mRes.data.map(function(dm) {
        if (dm.updated_at && (!_mUpdatedAt || dm.updated_at > _mUpdatedAt)) _mUpdatedAt = dm.updated_at;
        return {
          name: dm.name, initial: dm.initial, color: dm.color,
          password: dm.password_hash, role: dm.role,
          photo: dm.foto_url || null, sospeso: dm.sospeso || false,
          canCreateProfiles: dm.can_create_profiles || false,
          canPromote: dm.can_promote || false,
          created_at: dm.created_at || null,
        };
      });
      if (_mUpdatedAt) _lastFetch['members'] = _mUpdatedAt;
    }
  } catch(e) { console.warn('[load members]', e.message); }

  // ── BATCH 2 (parallelo): tabelle in base al ruolo — solo se cambiate ─────
  // Lv1 (utente) e Lv2 (premium): nessuna tabella staff
  // Lv3 (aiutante): solo le sezioni abilitate in AIUTANTE_CONFIG
  // Lv4+ (staff/admin): tutto
  var _role2 = currentUser ? currentUser.role : '';
  var _isLv12 = (_role2 === 'utente' || _role2 === 'premium' || _role2 === '');
  var _isAiut = (_role2 === 'aiutante');
  var _isStaff = (_role2 === 'staff' || _role2 === 'admin');

  var _loadSpesa      = _fetchSpesa;
  var _loadLavori     = _fetchLavori;
  var _loadMagazzino  = _fetchMagazzino;
  var _loadPagamenti  = _fetchPagamenti;
  var _pagamentiSolo  = (_isLv12 || _isAiut) && !_isStaff; // true = filtro su member_name
  // Log: solo staff e admin, sempre scaricato (non ha updated_at check — è append-only)
  var _loadLog        = _isStaff;

  // Colonne calendario: utenti normali non hanno bisogno dei campi notifica (sono gestiti solo dallo staff)
  var _calSelect = _isLv12
    ? 'id,titolo,data,data_fine,ora,ora_fine,terminato,luogo,note,descrizione,tipo,locandina,updated_at'
    : '*';

  var _empty = Promise.resolve({ data: [], error: null });
  var batch2 = await Promise.all([
    _fetchCalendario ? sb.from('calendario').select(_calSelect).order('data', { ascending: true }) : _empty,  // 0 — se cambiato
    _loadSpesa     ? sb.from('spesa').select('*')                                       : _empty,              // 1
    _loadLavori    ? sb.from('lavori').select('*')                                      : _empty,              // 2
    _loadMagazzino ? sb.from('magazzino').select('*')                                   : _empty,              // 3
    _loadPagamenti
      ? (_pagamentiSolo && currentUser
          ? sb.from('pagamenti').select('*').eq('member_name', currentUser.name)
          : sb.from('pagamenti').select('*'))
      : _empty,          // 4
    _loadLog       ? sb.from('log').select('*').order('ts', { ascending: false }).limit(100) : _empty,    // 5 — solo staff (ridotto da 500 a 100)
    sb.from('suggerimenti').select('*').order('ts', { ascending: false }),                                 // 6 — sempre
    sb.from('valutazioni').select('*').order('ts', { ascending: false }),                                  // 7 — sempre
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
          ora_fine: e.ora_fine || null,
          terminato: e.terminato || false,
          notifica_nuovo: e.notifica_nuovo || false,
          notifica_reminder: e.notifica_reminder || false,
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
      // Aggiorna timestamp ultimo fetch
      var _calMaxTs = calRes.data.reduce(function(mx,e){ return (!mx||e.updated_at>mx)?e.updated_at:mx; }, null);
      if (_calMaxTs) _lastFetch['calendario'] = _calMaxTs;
    }
  } catch(e) { console.warn('[load calendario]', e.message); }

  // 4. MAGAZZINO — carica tutti i campi (metadati + quantità) da Supabase
  // Processato PRIMA di SPESA così le voci fromMagazzino trovano i metadati corretti
  try {
    var mzRes = batch2[3];
    if (mzRes.data && mzRes.data.length) {
      MAGAZZINO = mzRes.data.map(function(row) {
        return {
          id:            row.item_id,
          nome:          row.nome          || '',
          attuale:       row.attuale       || 0,
          minimo:        row.minimo        || 0,
          unita:         row.unita         || '',
          categoria:     row.categoria     || 'altro',
          costoUnitario: row.costo_unitario || 0,
        };
      });
      _magazzinoLoadedFromDb = true;
      var _mzMaxTs = mzRes.data.reduce(function(mx,r){ return (!mx||r.updated_at>mx)?r.updated_at:mx; }, null);
      if (_mzMaxTs) _lastFetch['magazzino'] = _mzMaxTs;
    }
  } catch(e) { console.warn('[load magazzino]', e.message); }

  // 5. SPESA
  try {
    var spRes = batch2[1];
    if (spRes.data && spRes.data.length) {
      SPESA = spRes.data.map(function(s) {
        var obj = {
          id: s.id, nome: s.item, done: s.done || false,
          qty: s.qty || '', costoUnitario: s.costo_unitario || 0,
          unita: s.unita || '', fromMagazzino: s.from_magazzino || false,
          magazzinoId: s.magazzino_id || null,
          qtyNum: 0, _categoria: null,
        };
        if (obj.qty) {
          var parsed = parseFloat(obj.qty);
          if (!isNaN(parsed)) obj.qtyNum = parsed;
        }
        // Ricostruisci _categoria e unita da MAGAZZINO (ora già caricato)
        if (obj.fromMagazzino && obj.magazzinoId) {
          var mz = MAGAZZINO.find(function(m){ return m.id === obj.magazzinoId; });
          if (mz) {
            obj._categoria    = mz.categoria;
            obj.costoUnitario = mz.costoUnitario;
            obj.unita         = mz.unita;
          }
        }
        return obj;
      });
      var maxId = SPESA.reduce(function(m,s){ return Math.max(m,s.id); }, 0);
      if (maxId >= _nextIds.spesa) _nextIds.spesa = maxId + 1;
      var _spMaxTs = spRes.data.reduce(function(mx,r){ return (!mx||r.updated_at>mx)?r.updated_at:mx; }, null);
      if (_spMaxTs) _lastFetch['spesa'] = _spMaxTs;
    }
  } catch(e) { console.warn('[load spesa]', e.message); }

  // 6. LAVORI
  try {
    var lavRes = batch2[2];
    if (lavRes.data && lavRes.data.length) {
      LAVORI = lavRes.data.map(function(l) {
        return { id: l.id, lavoro: l.lavoro, who: l.who || '-', done: l.done || false };
      });
      var maxId = LAVORI.reduce(function(m,l){ return Math.max(m,l.id); }, 0);
      if (maxId >= _nextIds.lavori) _nextIds.lavori = maxId + 1;
      var _lavMaxTs = lavRes.data.reduce(function(mx,r){ return (!mx||r.updated_at>mx)?r.updated_at:mx; }, null);
      if (_lavMaxTs) _lastFetch['lavori'] = _lavMaxTs;
    }
  } catch(e) { console.warn('[load lavori]', e.message); }

  // 7. (MAGAZZINO già processato al passo 4)

  // 8. PAGAMENTI
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
      var _pagMaxTs = pagRes.data.reduce(function(mx,r){ return (!mx||r.updated_at>mx)?r.updated_at:mx; }, null);
      if (_pagMaxTs) _lastFetch['pagamenti'] = _pagMaxTs;
    }
  } catch(e) { console.warn('[load pagamenti]', e.message); }

  // 8. LOG (ultimi 100)
  try {
    var logRes = batch2[5];
    if (logRes.data && logRes.data.length) {
      LOG = logRes.data.map(function(l) {
        var d = new Date(l.ts);
        var tempo = 'OGGI · ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
        var member = MEMBERS.find(function(m){ return m.name === l.author; }) || { name: l.author, initial: l.author.charAt(0), color: '#444', role: 'utente' };
        return { member: member, azione: l.action, tempo: tempo, _id: l.id };
      });
    }
  } catch(e) { console.warn('[load log]', e.message); }

  // 9. SUGGERIMENTI
  try {
    var sugRes = batch2[6];
    if (sugRes.data && sugRes.data.length) {
      SUGGERIMENTI = sugRes.data.map(function(s) {
        return { id: s.id, testo: s.testo, author: s.author, ts: s.ts, tempo: new Date(s.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch(e) { console.warn('[load suggerimenti]', e.message); }

  // 10. VALUTAZIONI
  try {
    var valRes = batch2[7];
    if (valRes.data && valRes.data.length) {
      VALUTAZIONI = valRes.data.map(function(v) {
        return { id: v.id, nome: v.author, stelle: v.stelle || 0, testo: v.testo || '', ts: v.ts, tempo: new Date(v.ts).toLocaleDateString('it-IT') };
      });
    }
  } catch(e) { console.warn('[load valutazioni]', e.message); }


    // ── CACHE: salva dati freschi da Supabase ────────
    var _skipped = ['appconfig','members','calendario','spesa','lavori','magazzino','pagamenti'].filter(function(t){
      return !{ appconfig: _fetchAppconfig, members: _fetchMembers, calendario: _fetchCalendario,
                spesa: _fetchSpesa, lavori: _fetchLavori, magazzino: _fetchMagazzino, pagamenti: _fetchPagamenti }[t];
    });
    if (_skipped.length) console.log('[egress] tabelle skippate (invariate):', _skipped.join(', '));
    _savePublicCache();
  } catch(e) {
    console.warn('[loadAllData] errore:', e.message);
  } finally {
    _cacheLoadingInProgress = false; // sblocca salvataggio cache
    _realtimeReady = true; // garantito anche in caso di errore
    if (typeof _hideSyncBanner === 'function') _hideSyncBanner();
    if (typeof showToast === 'function' && currentUser) showToast('// DATI AGGIORNATI ✓', 'success', 2000);
    console.log('[loadAllData] FINE · _realtimeReady=' + _realtimeReady);
  }

  // Migrazione da appstate: non più necessaria, gestita via SQL fix_primary_keys.sql
}

// ── REALTIME ─────────────────────────────
// Il realtime è attivato per utenti con ruolo admin, staff e aiutante.
// Per tutti gli altri ruoli si usa il polling (vedi initPolling).

var _logChannel       = null;
var _magazzinoChannel = null;
var _calendarioChannel= null;
var _spesaChannel     = null;
var _pagamentiChannel = null;
var _lavoriChannel    = null;
var _membersChannel   = null;
var _realtimeActive   = false;
// Guard per evitare doppio incremento magazzino: quando il client mittente
// ha già aggiornato localmente in confermaAcquisto, blocca il realtime DELETE su spesa
var _pendingMagazzinoIds = {};

// ── STOP REALTIME — chiude tutti i canali aperti ─────────────────────────────
function stopRealtime() {
  if (!_realtimeActive) return;
  var sb = getSupabase();
  var channels = [_logChannel, _magazzinoChannel, _calendarioChannel, _spesaChannel, _pagamentiChannel, _lavoriChannel, _membersChannel];
  channels.forEach(function(ch) {
    if (ch) {
      try { sb.removeChannel(ch); } catch(e) {}
    }
  });
  _logChannel = null;
  _magazzinoChannel = null;
  _calendarioChannel = null;
  _spesaChannel = null;
  _pagamentiChannel = null;
  _lavoriChannel = null;
  _membersChannel   = null;
  _realtimeActive = false;
  console.log('[realtime] tutti i canali chiusi');
}

function initRealtime() {
  // Controllo ruolo: admin, staff e aiutante usano il realtime
  var role = currentUser && currentUser.role ? currentUser.role : '';
  if (role !== 'admin' && role !== 'staff' && role !== 'aiutante') {
    console.log('[realtime] disabilitato per ruolo: ' + (role || 'guest') + ' — avvio polling');
    initPolling();
    return;
  }

  // Evita doppia inizializzazione — chiudi prima i canali eventualmente già aperti
  if (_realtimeActive) {
    console.log('[realtime] già attivo — reinizializzazione canali');
    stopRealtime();
  }
  _realtimeActive = true;

  console.log('[realtime] inizializzazione per ' + currentUser.name + ' (' + role + ') · ' + new Date().toLocaleTimeString('it-IT'));

  var sb = getSupabase();

  // ── LOG realtime — INSERT / DELETE ───────────────────────────────────────
  _logChannel = sb.channel('log-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'log' }, function(payload) {
      if (!_realtimeReady) return;
      var l = payload.new;
      if (!l) return;
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
      if (!_realtimeReady) return;
      LOG = []; buildLog(); updateDash();
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Log realtime OK'); });

  // ── MAGAZZINO realtime — INSERT / UPDATE / DELETE ─────────────────────────
  // Ricarica quantita' dalla tabella magazzino e, se ci sono item_id sconosciuti,

  function _reloadMagazzino() {
    getSupabase().from('magazzino').select('*').then(function(res) {
      if (res.error) { console.warn('[sb.magazzino reload]', res.error.message); return; }
      if (res.data) {
        MAGAZZINO = res.data.map(function(row) {
          return {
            id:            row.item_id,
            nome:          row.nome           || '',
            attuale:       row.attuale        || 0,
            minimo:        row.minimo         || 0,
            unita:         row.unita          || '',
            categoria:     row.categoria      || 'altro',
            costoUnitario: row.costo_unitario || 0,
          };
        });
      }
      buildMagazzino(); updateDash();
    });
  }
  _magazzinoChannel = sb.channel('magazzino-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'magazzino' }, function(payload) {
      if (!_realtimeReady) return;
      var row = payload.new; if (!row) return;
      var mapped = {
        id: row.item_id, nome: row.nome || '', attuale: row.attuale || 0,
        minimo: row.minimo || 0, unita: row.unita || '',
        categoria: row.categoria || 'altro', costoUnitario: row.costo_unitario || 0,
      };
      var idx = MAGAZZINO.findIndex(function(m){ return m.id === mapped.id; });
      if (idx >= 0) Object.assign(MAGAZZINO[idx], mapped);
      else MAGAZZINO.push(mapped);
      buildMagazzino(); updateDash();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'magazzino' }, function(payload) {
      if (!_realtimeReady) return;
      var row = payload.new; if (!row) return;
      var mapped = {
        id: row.item_id, nome: row.nome || '', attuale: row.attuale || 0,
        minimo: row.minimo || 0, unita: row.unita || '',
        categoria: row.categoria || 'altro', costoUnitario: row.costo_unitario || 0,
      };
      var idx = MAGAZZINO.findIndex(function(m){ return m.id === mapped.id; });
      if (idx >= 0) Object.assign(MAGAZZINO[idx], mapped);
      else MAGAZZINO.push(mapped);
      buildMagazzino(); updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'magazzino' }, function(payload) {
      if (!_realtimeReady) return;
      var old = payload.old;
      if (old && old.item_id) {
        // REPLICA IDENTITY FULL: old contiene item_id
        var idx = MAGAZZINO.findIndex(function(m){ return m.id === old.item_id; });
        if (idx >= 0) {
          var item = MAGAZZINO[idx];
          if (item.id >= 23) {
            // Articolo custom: rimuovilo dall'array (era aggiunto dall'utente)
            MAGAZZINO.splice(idx, 1);
          } else {
            item.attuale = 0;
          }
        }
        buildMagazzino(); updateDash();
      } else {
        // Fallback: REPLICA IDENTITY non FULL — ricarica l'intera tabella + config
        console.warn('[magazzino] DELETE senza old.item_id — eseguire ALTER TABLE magazzino REPLICA IDENTITY FULL');
        _reloadMagazzino(true);
      }
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Magazzino realtime OK'); });

  // ── CALENDARIO realtime — INSERT / UPDATE / DELETE ────────────────────────
  function _mapEventoRow(e) {
    var d = new Date(e.data);
    var obj = {
      id: e.id, nome: e.titolo,
      anno: d.getUTCFullYear(), mese: d.getUTCMonth()+1, giorno: d.getUTCDate(),
      ora: e.ora || '21:00', tipo: e.tipo || 'invito',
      desc: e.descrizione || '', luogo: e.luogo || '', note: e.note || '',
      locandina: e.locandina || null,
      ora_fine: e.ora_fine || null,
      terminato: e.terminato || false,
      notifica_nuovo: e.notifica_nuovo || false,
      notifica_reminder: e.notifica_reminder || false,
      giornoFine: null, meseFine: null, annoFine: null,
    };
    if (e.data_fine) { var df=new Date(e.data_fine); obj.giornoFine=df.getUTCDate(); obj.meseFine=df.getUTCMonth()+1; obj.annoFine=df.getUTCFullYear(); }
    return obj;
  }
  function _reloadCalendario() {
    console.warn('[calendario] DELETE senza old.id — eseguire ALTER TABLE calendario REPLICA IDENTITY FULL');
    getSupabase().from('calendario').select('*').order('data', { ascending: true }).then(function(res) {
      if (res.error) { console.warn('[sb.calendario reload]', res.error.message); return; }
      if (res.data) EVENTI = res.data.map(_mapEventoRow);
      buildCal(); buildSCal(); buildHomeNextEvent(); buildEventoInCorsoBanner(); buildConsigliati(); updateDash();
    });
  }
  _calendarioChannel = sb.channel('calendario-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendario' }, function(payload) {
      if (!_realtimeReady) return;
      var e = payload.new; if (!e) return;
      if (EVENTI.some(function(ev){ return ev.id === e.id; })) return;
      EVENTI.push(_mapEventoRow(e));
      buildCal(); buildSCal(); buildHomeNextEvent(); buildEventoInCorsoBanner(); buildConsigliati(); updateDash();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendario' }, function(payload) {
      if (!_realtimeReady) return;
      var e = payload.new; if (!e) return;
      var idx = EVENTI.findIndex(function(ev){ return ev.id === e.id; });
      if (idx >= 0) EVENTI[idx] = _mapEventoRow(e); else EVENTI.push(_mapEventoRow(e));
      buildCal(); buildSCal(); buildHomeNextEvent(); buildEventoInCorsoBanner(); buildConsigliati(); updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'calendario' }, function(payload) {
      if (!_realtimeReady) return;
      var old = payload.old;
      if (old && old.id) {
        var idx = EVENTI.findIndex(function(ev){ return ev.id === old.id; });
        if (idx >= 0) EVENTI.splice(idx, 1);
        buildCal(); buildSCal(); buildHomeNextEvent(); buildEventoInCorsoBanner(); buildConsigliati(); updateDash();
      } else {
        // Fallback: REPLICA IDENTITY non FULL
        _reloadCalendario();
      }
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Calendario realtime OK'); });

  // ── SPESA realtime — INSERT / UPDATE / DELETE ─────────────────────────────
  function _mapSpesaRow(s) {
    return { id: s.id, nome: s.item, done: s.done||false, qty: s.qty||'', costoUnitario: s.costo_unitario||0, unita: s.unita||'', fromMagazzino: s.from_magazzino||false, magazzinoId: s.magazzino_id||null };
  }
  function _reloadSpesa() {
    console.warn('[spesa] DELETE senza old.id — eseguire ALTER TABLE spesa REPLICA IDENTITY FULL');
    getSupabase().from('spesa').select('*').then(function(res) {
      if (res.error) { console.warn('[sb.spesa reload]', res.error.message); return; }
      if (res.data) {
        SPESA = res.data.map(_mapSpesaRow);
        // Reset del guard eliminazione manuale: i dati sono stati ricaricati da remoto
        _manuallyDeletedSpesaIds = {};
      }
      buildSpesa(); updateDash();
    });
  }
  _spesaChannel = sb.channel('spesa-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spesa' }, function(payload) {
      if (!_realtimeReady) return;
      var s = payload.new; if (!s) return;
      if (SPESA.some(function(x){ return x.id === s.id; })) return;
      SPESA.push(_mapSpesaRow(s));
      buildSpesa(); updateDash();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spesa' }, function(payload) {
      if (!_realtimeReady) return;
      var s = payload.new; if (!s) return;
      var idx = SPESA.findIndex(function(x){ return x.id === s.id; });
      if (idx >= 0) SPESA[idx] = _mapSpesaRow(s); else SPESA.push(_mapSpesaRow(s));
      buildSpesa(); updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'spesa' }, function(payload) {
      if (!_realtimeReady) return;
      var old = payload.old;
      if (old && old.id) {
        var idx = SPESA.findIndex(function(x){ return x.id === old.id; });
        // Se la voce era collegata al magazzino e marcata come acquistata,
        // aggiorna la quantità del magazzino sul client che riceve il realtime.
        // (Il client che ha confermato l'acquisto lo ha già fatto localmente.)
        if (old.from_magazzino && old.magazzino_id && old.done) {
          var qtyAcquistata = old.qty ? parseFloat(old.qty) : 0;
          if (qtyAcquistata > 0) {
            var gIdx = MAGAZZINO.findIndex(function(m){ return m.id === old.magazzino_id; });
            if (gIdx !== -1 && _magazzinoChannel) {
              // Aggiorna solo se questo client NON è il mittente (il mittente ha già aggiornato in confermaAcquisto)
              // Usiamo _pendingMagazzinoIds come guard per evitare doppio incremento
              var guardKey = 'mz-' + old.magazzino_id;
              if (!_pendingMagazzinoIds[guardKey]) {
                MAGAZZINO[gIdx].attuale = MAGAZZINO[gIdx].attuale + qtyAcquistata;
                buildMagazzino();
              }
            }
          }
        }
        if (idx >= 0) SPESA.splice(idx, 1);
        buildSpesa(); updateDash();
      } else {
        // Fallback: REPLICA IDENTITY non FULL
        _reloadSpesa();
      }
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Spesa realtime OK'); });

  // ── PAGAMENTI realtime — INSERT / UPDATE / DELETE ────────────────────────
  function _mapPagamentiRow(row) {
    var movimenti = [];
    try { movimenti = typeof row.movimenti === 'string' ? JSON.parse(row.movimenti) : (row.movimenti||[]); } catch(e) {}
    return { name: row.member_name, saldo: row.saldo||0, movimenti: movimenti };
  }
  function _reloadPagamenti() {
    console.warn('[pagamenti] DELETE senza old.member_name — eseguire ALTER TABLE pagamenti REPLICA IDENTITY FULL');
    getSupabase().from('pagamenti').select('*').then(function(res) {
      if (res.error) { console.warn('[sb.pagamenti reload]', res.error.message); return; }
      if (res.data) {
        res.data.forEach(function(row) {
          var mapped = _mapPagamentiRow(row);
          var existing = PAGAMENTI.find(function(p){ return p.name === mapped.name; });
          if (existing) { existing.saldo = mapped.saldo; existing.movimenti = mapped.movimenti; }
          else PAGAMENTI.push(mapped);
        });
      }
      buildPagamenti(); updateDash();
    });
  }
  _pagamentiChannel = sb.channel('pagamenti-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagamenti' }, function(payload) {
      if (!_realtimeReady) return;
      var row = payload.new; if (!row) return;
      var mapped = _mapPagamentiRow(row);
      var existing = PAGAMENTI.find(function(p){ return p.name === mapped.name; });
      if (existing) { existing.saldo = mapped.saldo; existing.movimenti = mapped.movimenti; }
      else PAGAMENTI.push(mapped);
      buildPagamenti(); updateDash();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pagamenti' }, function(payload) {
      if (!_realtimeReady) return;
      var row = payload.new; if (!row) return;
      var mapped = _mapPagamentiRow(row);
      var existing = PAGAMENTI.find(function(p){ return p.name === mapped.name; });
      if (existing) { existing.saldo = mapped.saldo; existing.movimenti = mapped.movimenti; }
      else PAGAMENTI.push(mapped);
      buildPagamenti(); updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pagamenti' }, function(payload) {
      if (!_realtimeReady) return;
      var old = payload.old;
      if (old && old.member_name) {
        var idx = PAGAMENTI.findIndex(function(p){ return p.name === old.member_name; });
        if (idx >= 0) PAGAMENTI.splice(idx, 1);
        buildPagamenti(); updateDash();
      } else {
        // Fallback: REPLICA IDENTITY non FULL
        _reloadPagamenti();
      }
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Pagamenti realtime OK'); });

  // ── LAVORI realtime — INSERT / UPDATE / DELETE ────────────────────────────
  function _mapLavoroRow(l) {
    return { id: l.id, lavoro: l.lavoro, who: l.who||'-', done: l.done||false };
  }
  function _reloadLavori() {
    console.warn('[lavori] DELETE senza old.id — eseguire ALTER TABLE lavori REPLICA IDENTITY FULL');
    getSupabase().from('lavori').select('*').then(function(res) {
      if (res.error) { console.warn('[sb.lavori reload]', res.error.message); return; }
      if (res.data) LAVORI = res.data.map(_mapLavoroRow);
      buildLavori(); updateDash();
    });
  }
  _lavoriChannel = sb.channel('lavori-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lavori' }, function(payload) {
      if (!_realtimeReady) return;
      var l = payload.new; if (!l) return;
      if (LAVORI.some(function(x){ return x.id === l.id; })) return;
      LAVORI.push(_mapLavoroRow(l));
      buildLavori(); updateDash();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lavori' }, function(payload) {
      if (!_realtimeReady) return;
      var l = payload.new; if (!l) return;
      var idx = LAVORI.findIndex(function(x){ return x.id === l.id; });
      if (idx >= 0) LAVORI[idx] = _mapLavoroRow(l); else LAVORI.push(_mapLavoroRow(l));
      buildLavori(); updateDash();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lavori' }, function(payload) {
      if (!_realtimeReady) return;
      var old = payload.old;
      if (old && old.id) {
        var idx = LAVORI.findIndex(function(x){ return x.id === old.id; });
        if (idx >= 0) LAVORI.splice(idx, 1);
        buildLavori(); updateDash();
      } else {
        // Fallback: REPLICA IDENTITY non FULL
        _reloadLavori();
      }
    })
    .subscribe(function(status) { if (status === 'SUBSCRIBED') console.log('Lavori realtime OK'); });

  // ── MEMBERS realtime — INSERT (nuovo utente tramite invito) ──────────────
  _membersChannel = sb.channel('members-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, function(payload) {
      if (!_realtimeReady) return;
      var dm = payload.new; if (!dm) return;
      if (MEMBERS.some(function(m){ return m.name === dm.name; })) return;
      MEMBERS.push({
        name: dm.name, initial: dm.initial, color: dm.color,
        password: dm.password_hash, role: dm.role,
        photo: dm.foto_url || null, sospeso: dm.sospeso || false,
        canCreateProfiles: dm.can_create_profiles || false,
      });
      buildMembriList();
      updateDash();
      console.log('[realtime] nuovo membro registrato: ' + dm.name);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, function(payload) {
      if (!_realtimeReady) return;
      var dm = payload.new; if (!dm) return;
      var existing = MEMBERS.find(function(m){ return m.name === dm.name; });
      if (existing) {
        existing.role = dm.role;
        existing.color = dm.color;
        existing.sospeso = dm.sospeso || false;
        existing.canCreateProfiles = dm.can_create_profiles || false;
        existing.password = dm.password_hash;
        existing.photo = dm.foto_url || null;
      }
      // Se il cambio riguarda l'utente corrente → aggiorna currentUser e riavvia connessione
      if (currentUser && currentUser.name === dm.name) {
        var oldRole = currentUser.role;
        currentUser.role = dm.role;
        currentUser.color = dm.color;
        currentUser.sospeso = dm.sospeso || false;
        // Se il ruolo è cambiato → switch realtime ↔ polling + ricarica dati
        if (oldRole !== dm.role) {
          var wasStaff = (oldRole === 'admin' || oldRole === 'staff' || oldRole === 'aiutante');
          var isNowStaff = (dm.role === 'admin' || dm.role === 'staff' || dm.role === 'aiutante');
          if (wasStaff !== isNowStaff) {
            console.log('[realtime] cambio ruolo rilevato (' + oldRole + ' → ' + dm.role + ') · riavvio connessione');
            if (isNowStaff) {
              stopPolling();
              initRealtime();
            } else {
              stopRealtime();
              initPolling();
            }
          }
          // Ricarica le tabelle in base al nuovo ruolo (senza reload pagina)
          reloadStaffData().then(function() {
            if (typeof buildAll === 'function') buildAll();
            showToast('// RUOLO AGGIORNATO: ' + dm.role.toUpperCase(), 'success');
          });
        }
        // Aggiorna UI ruolo ovunque visibile
        var rlEl = document.getElementById('staffRole');
        if (rlEl && typeof roleLabel === 'function') rlEl.textContent = roleLabel(dm.role).label;
        if (typeof buildProfilo === 'function' && document.getElementById('tab-profilo') &&
            document.getElementById('tab-profilo').style.display !== 'none') buildProfilo();
      }
      buildMembriList();
    })
    .subscribe(function(status) { console.log('[realtime] members status:', status); });
}

// ── HOOKS LOGIN/LOGOUT ───────────────────────────────────────────────────────
// onUserLogin() va chiamato DOPO aver impostato currentUser E dopo loadAllData().
// In questo modo il ruolo è già aggiornato dal DB e i canali vengono aperti
// con le credenziali corrette. Gestisce: staff/admin → realtime, altri → polling.
function onUserLogin() {
  var role = currentUser && currentUser.role ? currentUser.role : '';
  console.log('[auth] onUserLogin · ruolo: ' + (role || 'guest'));
  if (role === 'admin' || role === 'staff' || role === 'aiutante') {
    stopPolling();
    initRealtime();
    _startCacheTimer();
    // Garantisce che _realtimeReady sia true anche quando onUserLogin
    // viene chiamato da doLogin (che non passa per loadAllData)
    _realtimeReady = true;
  } else {
    stopRealtime();
    _stopCacheTimer();
    initPolling();
  }
}

// Chiamare onUserLogout() al logout per chiudere canali e fermare polling.
function onUserLogout() {
  _realtimeReady = false;
  _savePublicCache();
  _stopCacheTimer();
  stopRealtime();
  stopPolling();
}

// ── POLLING (utenti normali livelli 1-3 e guest) ──────────────────────────
// Ricarica silenziosamente i dati di home, bacheca e info ogni 3 minuti.
// Non mostra toast, non interrompe l'utente, non ricarica l'intera app.

var _pollingTimer  = null;
var _pollingActive = false;
var POLLING_INTERVAL = 5 * 60 * 1000; // 5 minuti

var _cacheTimer = null;
var CACHE_SAVE_INTERVAL = 2 * 60 * 1000; // 2 minuti

function _startCacheTimer() {
  if (_cacheTimer) return;
  _cacheTimer = setInterval(function() { _savePublicCache(); }, CACHE_SAVE_INTERVAL);
}

function _stopCacheTimer() {
  if (_cacheTimer) { clearInterval(_cacheTimer); _cacheTimer = null; }
}

// Logout forzato con messaggio dedicato (es. account eliminato o sospeso)
function _forceLogout(motivo) {
  stopPolling();
  showToast(motivo, 'error');
  setTimeout(function() {
    if (typeof onUserLogout === 'function') onUserLogout();
    var ss = document.getElementById('screenStaff');
    if (ss) ss.classList.remove('is-admin');
    currentUser = null;
    guestMode = false;
    try { localStorage.removeItem('bunker23_session'); } catch(e) {}
    if (typeof buildAll === 'function') buildAll();
    if (typeof updateHomeAccessLevel === 'function') updateHomeAccessLevel();
    if (typeof updatePageCfgBtns === 'function') updatePageCfgBtns();
    if (typeof navigate === 'function') navigate('screenSplash');
  }, 3000);
}

function initPolling() {
  if (_pollingActive) return; // già attivo
  var role = currentUser && currentUser.role ? currentUser.role : '';
  // Polling solo per utenti Lv1/Lv2 e guest; aiutante usa realtime come staff
  var isStaffRole = (role === 'admin' || role === 'staff' || role === 'aiutante');
  if (!isStaffRole) {
    _pollingActive = true;
    console.log('Polling background attivo ogni 3 min (ruolo: ' + (role || 'guest') + ')');
    _pollingTimer = setInterval(function() { _pollPublicData(); }, POLLING_INTERVAL);
  } else {
    // Staff/admin/aiutante usano realtime ma il controllo account va fatto comunque
    _pollingActive = true;
    _pollingTimer = setInterval(function() { _checkAccountStatus(); }, POLLING_INTERVAL);
    console.log('Account-check attivo ogni 3 min (ruolo: ' + role + ')');
  }
}

function stopPolling() {
  if (_pollingTimer) { clearInterval(_pollingTimer); _pollingTimer = null; }
  _pollingActive = false;
}

// Controllo stato account per staff/admin (non fanno il polling pubblico ma devono
// essere disconnessi se eliminati o sospesi, e aggiornati se il ruolo cambia)
async function _checkAccountStatus() {
  if (!_sbReady || !currentUser) return;
  try {
    var res = await getSupabase().from('members').select('name,sospeso,role').eq('name', currentUser.name).single();
    if (res.error || !res.data) {
      _forceLogout('// ACCOUNT ELIMINATO · CONTATTARE UN AMMINISTRATORE');
    } else if (res.data.sospeso) {
      _forceLogout('// ACCOUNT SOSPESO · CONTATTARE UN AMMINISTRATORE');
    } else if (res.data.role && res.data.role !== currentUser.role) {
      // Ruolo cambiato → aggiorna e switch connessione
      var oldRole = currentUser.role;
      currentUser.role = res.data.role;
      var wasStaff = (oldRole === 'admin' || oldRole === 'staff' || oldRole === 'aiutante');
      var isNowStaff = (res.data.role === 'admin' || res.data.role === 'staff' || res.data.role === 'aiutante');
      console.log('[account-check] cambio ruolo: ' + oldRole + ' → ' + res.data.role);
      if (wasStaff !== isNowStaff) {
        if (isNowStaff) { stopPolling(); initRealtime(); }
        else            { stopRealtime(); initPolling(); }
      }
      // Ricarica le tabelle in base al nuovo ruolo (senza reload pagina)
      await reloadStaffData();
      showToast('// RUOLO AGGIORNATO: ' + res.data.role.toUpperCase(), 'success');
      if (typeof buildAll === 'function') buildAll();
    }
  } catch(e) { console.warn('[account-check]', e.message); }
}

async function _pollPublicData() {
  if (!_sbReady) return;
  try {
    var sb = getSupabase();

    // ── Controllo stato account utente corrente ──────────────────────────
    if (currentUser) {
      try {
        var accountCheck = await sb.from('members').select('name,sospeso,role').eq('name', currentUser.name).single();
        if (accountCheck.error || !accountCheck.data) {
          _forceLogout('// ACCOUNT ELIMINATO · CONTATTARE UN AMMINISTRATORE');
          return;
        }
        if (accountCheck.data.sospeso) {
          _forceLogout('// ACCOUNT SOSPESO · CONTATTARE UN AMMINISTRATORE');
          return;
        }
        if (accountCheck.data.role && accountCheck.data.role !== currentUser.role) {
          var oldRole = currentUser.role;
          currentUser.role = accountCheck.data.role;
          var wasStaff = (oldRole === 'admin' || oldRole === 'staff' || oldRole === 'aiutante');
          var isNowStaff = (accountCheck.data.role === 'admin' || accountCheck.data.role === 'staff' || accountCheck.data.role === 'aiutante');
          console.log('[poll] cambio ruolo: ' + oldRole + ' → ' + accountCheck.data.role);
          if (wasStaff !== isNowStaff) {
            if (isNowStaff) { stopPolling(); initRealtime(); }
            else            { stopRealtime(); initPolling(); }
          }
          // Ricarica le tabelle in base al nuovo ruolo (senza reload pagina)
          await reloadStaffData();
          showToast('// RUOLO AGGIORNATO: ' + accountCheck.data.role.toUpperCase(), 'success');
          if (typeof buildAll === 'function') buildAll();
          return; // il buildAll si occupa già di aggiornare tutto
        }
      } catch(e) { console.warn('[poll account-check]', e.message); }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Fetch parallelo: check updated_at per appconfig e calendario prima di scaricarli.
    // suggerimenti e valutazioni sempre scaricati (piccoli, frequenti).
    var _pollCalSelect = currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin')
      ? '*'
      : 'id,titolo,data,data_fine,ora,ora_fine,terminato,luogo,note,descrizione,tipo,locandina,updated_at';

    // Check updated_at in parallelo (query leggere)
    var pollChecks = await Promise.all([
      sb.from('appconfig').select('updated_at').eq('id', 1).single(),
      sb.from('calendario').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    ]);

    var _pollFetchCfg = (function() {
      try {
        var row = pollChecks[0].data;
        if (!row || !row.updated_at) return true;
        var cached = _lastFetch['appconfig'];
        if (!cached) return true;
        return new Date(row.updated_at).getTime() > new Date(cached).getTime();
      } catch(e) { return true; }
    })();

    var _pollFetchCal = (function() {
      try {
        var rows = pollChecks[1].data;
        if (!rows || !rows[0] || !rows[0].updated_at) return true;
        var cached = _lastFetch['calendario'];
        if (!cached) return true;
        return new Date(rows[0].updated_at).getTime() > new Date(cached).getTime();
      } catch(e) { return true; }
    })();

    console.log('[poll] appconfig ' + (_pollFetchCfg ? 'CAMBIATA' : 'invariata') + ' · calendario ' + (_pollFetchCal ? 'CAMBIATO' : 'invariato'));

    var _emptyPoll = Promise.resolve({ data: null, error: null });
    var results = await Promise.all([
      _pollFetchCfg ? sb.from('appconfig').select('data,updated_at').eq('id', 1).single()                          : _emptyPoll,  // 0
      _pollFetchCal ? sb.from('calendario').select(_pollCalSelect).order('data', { ascending: true })               : _emptyPoll,  // 1
      sb.from('suggerimenti').select('*').order('ts', { ascending: false }),                                                        // 2
      sb.from('valutazioni').select('*').order('ts', { ascending: false }),                                                         // 3
    ]);

    // 0. CONFIG → aggiorna BACHECA, INFO, CONSIGLIATI, EVENTI_VALUTAZIONI
    try {
      var cfgRes = results[0];
      if (_pollFetchCfg && cfgRes.data && cfgRes.data.data) {
        var cfg = cfgRes.data.data;
        if (cfg.BACHECA)            BACHECA = cfg.BACHECA;
        if (cfg.INFO)               INFO = cfg.INFO;
        if (cfg.CONSIGLIATI)        CONSIGLIATI = cfg.CONSIGLIATI;
        if (cfg.EVENTI_VALUTAZIONI) EVENTI_VALUTAZIONI = cfg.EVENTI_VALUTAZIONI;
        if (cfgRes.data.updated_at) _lastFetch['appconfig'] = cfgRes.data.updated_at;
      }
    } catch(e) { console.warn('[poll config]', e.message); }

    // 1. CALENDARIO → aggiorna EVENTI
    try {
      var calRes = results[1];
      if (_pollFetchCal && calRes.data) {
        EVENTI = calRes.data.map(function(e) {
          var d = new Date(e.data);
          var obj = {
            id: e.id, nome: e.titolo,
            anno: d.getUTCFullYear(), mese: d.getUTCMonth()+1, giorno: d.getUTCDate(),
            ora: e.ora || '21:00', tipo: e.tipo || 'invito',
            desc: e.descrizione || '', luogo: e.luogo || '', note: e.note || '',
            locandina: e.locandina || null,
            ora_fine: e.ora_fine || null,
            terminato: e.terminato || false,
            giornoFine: null, meseFine: null, annoFine: null,
          };
          if (e.data_fine) {
            var df = new Date(e.data_fine);
            obj.giornoFine = df.getUTCDate(); obj.meseFine = df.getUTCMonth()+1; obj.annoFine = df.getUTCFullYear();
          }
          return obj;
        });
        var _pollCalMaxTs = calRes.data.reduce(function(mx,e){ return (!mx||e.updated_at>mx)?e.updated_at:mx; }, null);
        if (_pollCalMaxTs) _lastFetch['calendario'] = _pollCalMaxTs;
      }
    } catch(e) { console.warn('[poll calendario]', e.message); }

    // 2. SUGGERIMENTI
    try {
      var sugRes = results[2];
      if (sugRes.data) {
        SUGGERIMENTI = sugRes.data.map(function(s) {
          return { id: s.id, testo: s.testo, author: s.author, ts: s.ts, tempo: new Date(s.ts).toLocaleDateString('it-IT') };
        });
      }
    } catch(e) { console.warn('[poll suggerimenti]', e.message); }

    // 3. VALUTAZIONI
    try {
      var valRes = results[3];
      if (valRes.data) {
        VALUTAZIONI = valRes.data.map(function(v) {
          return { id: v.id, nome: v.author, stelle: v.stelle||0, testo: v.testo||'', ts: v.ts, tempo: new Date(v.ts).toLocaleDateString('it-IT') };
        });
      }
    } catch(e) { console.warn('[poll valutazioni]', e.message); }

    // Aggiorna il rendering delle tre pagine pubbliche silenziosamente
    _refreshPublicPages();
    // Aggiorna cache con i nuovi dati freschi da Supabase
    _savePublicCache();
    console.log('[poll] dati pubblici aggiornati · ' + new Date().toLocaleTimeString('it-IT'));
  } catch(e) {
    console.warn('[poll] errore:', e.message);
  }
}

// Aggiorna home, bacheca e info senza toccare le pagine staff
function _refreshPublicPages() {
  // HOME
  buildCal();
  buildHomeNextEvent();
  buildEventoInCorsoBanner();
  buildConsigliati();
  // BACHECA
  buildBacheca();
  buildSuggerimenti();
  buildValutazioni();
  // INFO
  buildInfo();
}

// ── COMPATIBILITÀ: saveToStorage() ora smista ai save specifici ──
function saveToStorage() {
  saveConfig();
  saveMembers();
  saveEventi();
  saveSpesa();
  saveLavori();
  saveMagazzino();
  savePagamenti(); // no-op per ruoli non-staff (guard interna)
  saveSuggerimenti();
  saveValutazioni();
}

// ════════════════════════════════════════════════════════
// MEMBERS_HISTORY — cronologia utenti
// ════════════════════════════════════════════════════════

// Crea la riga iniziale in members_history al momento della registrazione
// creationMethod: 'qr' | 'manual'
// invitedBy: nome di chi ha generato il token (solo per QR), altrimenti null
async function historyCreateMember(memberName, creationMethod, invitedBy) {
  if (!_sbReady) return;
  try {
    var res = await getSupabase().from('members_history').insert({
      member_name:     memberName,
      created_at:      new Date().toISOString(),
      creation_method: creationMethod || 'manual',
      invited_by:      invitedBy || null,
      initial_name:    memberName,
      name_changes:    [],
    });
    if (res.error) console.warn('[sb.members_history create]', res.error.message);
  } catch(e) { console.warn('[sb.members_history create]', e.message); }
}

// Aggiunge un cambio nome in members_history
// changedBy: nome di chi ha effettuato la modifica
async function historyAddNameChange(oldName, newName, changedBy) {
  if (!_sbReady) return;
  try {
    var sb = getSupabase();
    var res = await sb.from('members_history')
      .select('id, name_changes')
      .eq('member_name', oldName)
      .single();

    if (res.error || !res.data) {
      // Riga non trovata (utente pre-esistente): crea entry retroattiva
      await sb.from('members_history').insert({
        member_name:     newName,
        created_at:      new Date().toISOString(),
        creation_method: 'manual',
        invited_by:      null,
        initial_name:    oldName,
        name_changes:    [{
          old_name:   oldName,
          new_name:   newName,
          changed_at: new Date().toISOString(),
          changed_by: changedBy || newName,
        }],
      });
      return;
    }

    var entry = res.data;
    var changes = Array.isArray(entry.name_changes) ? entry.name_changes : [];
    changes.push({
      old_name:   oldName,
      new_name:   newName,
      changed_at: new Date().toISOString(),
      changed_by: changedBy || newName,
    });
    var upd = await sb.from('members_history')
      .update({ member_name: newName, name_changes: changes })
      .eq('id', entry.id);
    if (upd.error) console.warn('[sb.members_history name_change]', upd.error.message);
  } catch(e) { console.warn('[sb.members_history name_change]', e.message); }
}

// Legge la cronologia di un utente (per il modale)
async function historyLoadMember(memberName) {
  if (!_sbReady) return null;
  try {
    var res = await getSupabase()
      .from('members_history')
      .select('*')
      .eq('member_name', memberName)
      .single();
    if (res.error) { console.warn('[sb.members_history load]', res.error.message); return null; }
    return res.data;
  } catch(e) { console.warn('[sb.members_history load]', e.message); return null; }
}

// Legge TUTTA la tabella members_history in bulk (usata per ricerca/filtri avanzati)
async function historyLoadAll() {
  if (!_sbReady) return [];
  try {
    var res = await getSupabase()
      .from('members_history')
      .select('member_name, initial_name, creation_method, invited_by, name_changes, created_at')
      .order('created_at', { ascending: false });
    if (res.error) { console.warn('[sb.members_history loadAll]', res.error.message); return []; }
    return res.data || [];
  } catch(e) { console.warn('[sb.members_history loadAll]', e.message); return []; }
}

// ── PATCH addLog per salvare su tabella log ──
migratePasswords();

var _origAddLog = addLog;
addLog = async function(azione) {
  _origAddLog(azione);
  // Il log viene salvato direttamente su Supabase (realtime lo riceverà)
  if (currentUser) {
    await saveLogEntry({ member: currentUser, azione: azione });
  }
};

// ══════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — registrazione service worker e subscription
// ══════════════════════════════════════════════════════

var VAPID_PUBLIC_KEY = 'BBwt_tnMhG6c5nIwIVBVdSOPWmYc4AA0nYVj3SdQNXc64cvxCctHIl_y0zAhgt34-OhW5cJ55AYjJflXnCXxBoQ';

function _urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[push] non supportato da questo browser');
    return;
  }
  if (!currentUser) {
    console.log('[push] nessun utente loggato, skip registrazione push');
    return;
  }
  try {
    var reg = await navigator.serviceWorker.ready;
    var existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Già registrato: aggiorna solo ruolo nel DB, nessuna notifica
      await _savePushSubscription(existing);
      return;
    }
    // Nuova subscription
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await _savePushSubscription(sub);
    console.log('[push] subscription registrata con successo');
  } catch(e) {
    console.warn('[push] errore registrazione:', e.message);
  }
}

async function _savePushSubscription(sub) {
  if (!_sbReady || !currentUser) return;
  try {
    var keys = sub.toJSON().keys || {};
    var row = {
      user_name: currentUser.name,
      user_role: currentUser.role || 'utente',
      endpoint: sub.endpoint,
      p256dh: keys.p256dh || '',
      auth: keys.auth || '',
    };
    var res = await getSupabase()
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });
    if (res.error) console.warn('[push] errore salvataggio subscription:', res.error.message);
  } catch(e) {
    console.warn('[push] errore _savePushSubscription:', e.message);
  }
}

async function requestPushPermissionAndRegister() {
  if (!('Notification' in window)) return;
  var perm = Notification.permission;
  if (perm === 'granted') {
    await registerPushSubscription();
  } else if (perm === 'default') {
    var result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerPushSubscription();
    }
  }
}
