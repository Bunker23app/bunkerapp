// ════════════════════════════════════════════════════════
// PATCH supabase.js — CRONOLOGIA UTENTE (members_history)
// ════════════════════════════════════════════════════════
//
// ISTRUZIONI:
//   1. Incolla il blocco "NUOVE FUNZIONI" in fondo a supabase.js,
//      prima della riga finale `migratePasswords();`
//
//   2. Applica i 3 "PATCH" nei punti indicati nei file esistenti.
//
// ─────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════
// ── NUOVE FUNZIONI — incolla in fondo a supabase.js ─────
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
// changedBy: nome di chi ha effettuato la modifica (può essere il membro stesso o uno staff/admin)
async function historyAddNameChange(memberName, oldName, newName, changedBy) {
  if (!_sbReady) return;
  try {
    var sb = getSupabase();
    // Leggi la riga esistente
    var res = await sb.from('members_history')
      .select('id, name_changes')
      .eq('member_name', oldName)  // cerca per vecchio nome
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

    // Aggiorna: nuovo member_name + name_changes aggiornato
    var upd = await sb.from('members_history')
      .update({ member_name: newName, name_changes: changes })
      .eq('id', entry.id);
    if (upd.error) console.warn('[sb.members_history name_change]', upd.error.message);
  } catch(e) { console.warn('[sb.members_history name_change]', e.message); }
}

// Legge l'intera cronologia di un utente (per il modale)
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


// ════════════════════════════════════════════════════════
// ── PATCH 1 — in doRegistrazione() (ui.js ~riga 4801) ───
// ════════════════════════════════════════════════════════
//
// TROVARE la riga:
//   addLog('si è registrato tramite invito');
//
// SOSTITUIRE CON:
//   addLog('si è registrato tramite invito');
//   // Cronologia: registrazione via QR
//   var _invBy = (_inviteTokenAttivo && _inviteTokenAttivo.created_by) ? _inviteTokenAttivo.created_by : null;
//   historyCreateMember(nome, 'qr', _invBy);
//
// NOTA: la colonna created_by nella tabella invite_tokens deve esistere.
// Se non esiste, aggiungi questa colonna con:
//   ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS created_by TEXT;
// Poi in generateInviteQR() (ui.js ~riga 4582) aggiungi created_by: currentUser.name
// all'insert su invite_tokens.


// ════════════════════════════════════════════════════════
// ── PATCH 2 — in openNuovoMembroModal() (ui.js ~riga 3471)
// ════════════════════════════════════════════════════════
//
// TROVARE (dentro window._modalCb):
//   saveMembers();
//   addLog('ha creato account: ' + nome);
//   buildMembriList();
//
// SOSTITUIRE CON:
//   saveMembers();
//   addLog('ha creato account: ' + nome);
//   // Cronologia: creazione manuale da staff/admin
//   historyCreateMember(nome, 'manual', null);
//   buildMembriList();


// ════════════════════════════════════════════════════════
// ── PATCH 3a — in salvaProfiloNome() (ui.js ~riga 3381) ─
// (cambio nome autonomo dall'utente)
// ════════════════════════════════════════════════════════
//
// TROVARE:
//   currentUser._oldName = currentUser.name;
//   currentUser.name = nome;
//   currentUser.initial = nome.charAt(0).toUpperCase();
//   addLog('ha cambiato il nome in: ' + nome);
//   saveMembers();
//
// SOSTITUIRE CON:
//   var _prevName = currentUser.name;
//   currentUser._oldName = currentUser.name;
//   currentUser.name = nome;
//   currentUser.initial = nome.charAt(0).toUpperCase();
//   addLog('ha cambiato il nome in: ' + nome);
//   // Cronologia: cambio nome autonomo
//   historyAddNameChange(nome, _prevName, nome, nome);
//   saveMembers();


// ════════════════════════════════════════════════════════
// ── PATCH 3b — in openEditMembroModal() _modalCb (~riga 3580)
// (cambio nome da admin)
// ════════════════════════════════════════════════════════
//
// TROVARE:
//   if (nome !== m.name) MEMBERS[i]._oldName = m.name;
//   MEMBERS[i].name             = nome;
//   MEMBERS[i].initial          = nome.charAt(0).toUpperCase();
//   ...
//   addLog('ha modificato account: ' + nome + ...);
//   saveMembers();
//
// AGGIUNGERE DOPO saveMembers():
//   // Cronologia: cambio nome da admin
//   if (nome !== m.name) {
//     historyAddNameChange(nome, m.name, nome, currentUser ? currentUser.name : 'admin');
//   }
