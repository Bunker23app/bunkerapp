// ════════════════════════════════════════════════════════
// PATCH ui.js — PULSANTE + PANNELLO CRONOLOGIA UTENTE
// ════════════════════════════════════════════════════════
//
// Ci sono 2 interventi:
//   A) In buildMembriList() — aggiunge pulsante 📋 per staff/admin
//   B) Nuova funzione openMemberHistoryModal() — da incollare in fondo a ui.js
//
// ════════════════════════════════════════════════════════


// ── PATCH A — buildMembriList() ──────────────────────────
//
// TROVARE (riga ~3314), la riga che inizia con:
//   (isAdmin()
//     // Admin: pulsante edit completo + elimina
//     ? '<button class="edit-btn-small visible" onclick="openEditMembroModal(' + i + ')" style="margin-right:4px">✏</button>' +
//       (!isSelf ? '<button ...rimuoviMembro...
//
// AGGIUNGERE, immediatamente DOPO il check (isAdmin() ? ... : ...) ma PRIMA
// della chiusura della chiamata a row.innerHTML:
// In pratica il bottone cronologia va iniettato come PRIMO pulsante nella riga,
// visibile solo per staff e admin.
//
// La modifica più semplice è sostituire il blocco che genera i pulsanti della riga con:

/*
  row.innerHTML =
    '<div style="' + avatarStyle + '">' + avatarContent + '</div>' +
    '<div style="flex:1">' +
      '<div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:' + (m.sospeso ? '#555' : 'var(--white)') + '">' + m.name.toUpperCase() +
        (m.sospeso ? '<span style="font-family:var(--mono);font-size:7px;color:#cc2200;letter-spacing:1px;margin-left:6px">⛔ SOSPESO</span>' : '') +
        (m.canPromote ? '<span style="font-family:var(--mono);font-size:7px;color:#22cc44;letter-spacing:1px;margin-left:6px">⬆ PROMUOVI</span>' : '') +
      '</div>' +
      '<div style="font-family:monospace;font-size:8px;color:' + rl.color + ';letter-spacing:1px">' + rl.label + '</div>' +
    '</div>' +
    // ── BOTTONE CRONOLOGIA (staff e admin) ──────────────
    (isStaff()
      ? '<button class="edit-btn-small visible" title="Cronologia" onclick="openMemberHistoryModal(\'' + m.name.replace(/'/g,"\'") + '\')" style="margin-right:4px;font-size:10px">📋</button>'
      : '') +
    // ── PULSANTI ESISTENTI (invariati) ───────────────────
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
              : '<span style="width:60px"></span>')));
*/


// ── PATCH B — nuova funzione — incolla in fondo a ui.js ──────────────────────

async function openMemberHistoryModal(memberName) {
  if (!isStaff()) { showToast('// PERMESSO NEGATO', 'error'); return; }

  // Placeholder di caricamento nel modal standard
  $id('modalTitle').textContent = 'CRONOLOGIA · ' + memberName.toUpperCase();
  $id('modalBody').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#666;text-align:center;padding:20px">// CARICAMENTO...</div>';
  window._modalCb = null; // nessun bottone "SALVA"
  openModal();

  // Carica dal DB
  var history = await historyLoadMember(memberName);

  var body = '';

  if (!history) {
    // Utente pre-esistente senza record
    body =
      '<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#555;padding:10px 0">' +
        '// NESSUNA CRONOLOGIA DISPONIBILE<br>' +
        '<span style="color:#444;font-size:8px">Questo account è stato creato prima dell\'attivazione della cronologia.</span>' +
      '</div>';
  } else {
    // ── Data e metodo creazione ──────────────────────────
    var dataCrea = '—';
    try {
      var d = new Date(history.created_at);
      dataCrea = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                 ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch(e) {}

    var metodo = history.creation_method === 'qr'
      ? '📲 QR' + (history.invited_by ? ' — invitato da <b>' + history.invited_by.toUpperCase() + '</b>' : '')
      : '✍ CREAZIONE MANUALE (staff/admin)';

    var nomeIniziale = history.initial_name || memberName;

    body +=
      '<div style="border:1px solid #2a2a2a;border-radius:3px;padding:10px;margin-bottom:10px">' +
        '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px">// REGISTRAZIONE</div>' +
        _historyRow('DATA',       dataCrea) +
        _historyRow('METODO',     metodo) +
        _historyRow('NOME INIZIALE', '<b>' + nomeIniziale.toUpperCase() + '</b>') +
      '</div>';

    // ── Storico cambi nome ───────────────────────────────
    var changes = Array.isArray(history.name_changes) ? history.name_changes : [];

    body +=
      '<div style="border:1px solid #2a2a2a;border-radius:3px;padding:10px">' +
        '<div style="font-family:var(--mono);font-size:8px;letter-spacing:3px;color:#555;margin-bottom:8px">' +
          '// STORICO NOMI (' + changes.length + ')' +
        '</div>';

    if (changes.length === 0) {
      body +=
        '<div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1px">Nessun cambio nome.</div>';
    } else {
      // Dal più recente al più vecchio
      var sorted = changes.slice().reverse();
      sorted.forEach(function(c, idx) {
        var dataChange = '—';
        try {
          var dc = new Date(c.changed_at);
          dataChange = dc.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }) +
                       ' · ' + dc.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
        } catch(e) {}
        var changedBy = c.changed_by || '—';
        var selfChange = c.changed_by === c.new_name;

        body +=
          '<div style="border-bottom:1px solid #1a1a1a;padding:6px 0' + (idx === sorted.length - 1 ? ';border-bottom:none' : '') + '">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">' +
              '<span style="font-family:monospace;font-size:10px;color:#888">' + c.old_name.toUpperCase() + '</span>' +
              '<span style="font-family:var(--mono);font-size:9px;color:#cc2200">→</span>' +
              '<span style="font-family:monospace;font-size:10px;color:var(--white)">' + c.new_name.toUpperCase() + '</span>' +
            '</div>' +
            '<div style="font-family:var(--mono);font-size:8px;color:#555;letter-spacing:1px">' +
              dataChange +
              ' · ' + (selfChange ? 'autonomamente' : 'modificato da ' + changedBy.toUpperCase()) +
            '</div>' +
          '</div>';
      });
    }

    body += '</div>';
  }

  // Aggiorna body modal
  var mb = $id('modalBody');
  if (mb) mb.innerHTML = body;
  // Nascondi pulsante salva (non serve in questo modal)
  var mBtn = document.querySelector('#modalOverlay .modal-btn');
  if (mBtn) mBtn.style.display = 'none';
}

// Helper: riga chiave/valore nella cronologia
function _historyRow(label, value) {
  return '<div style="display:flex;gap:8px;margin-bottom:5px;align-items:baseline">' +
    '<span style="font-family:var(--mono);font-size:8px;letter-spacing:2px;color:#555;min-width:90px;flex-shrink:0">' + label + '</span>' +
    '<span style="font-family:monospace;font-size:10px;color:var(--white)">' + value + '</span>' +
    '</div>';
}
