self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data = event.data.json();
  var title = data.title || 'BUNKER23';
  var options = {
    body: data.body || '',
    vibrate: [200, 100, 200],
    data: { url: data.url || 'https://bunker23app.github.io/bunkerapp/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = event.notification.data.url || 'https://bunker23app.github.io/bunkerapp/';

  // Estrae l'eventoId dal parametro ?evento= dell'URL
  var eventoId = null;
  try {
    var urlObj = new URL(targetUrl);
    eventoId = urlObj.searchParams.get('evento');
  } catch(e) {}

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      var appClient = null;
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf('bunker23app.github.io') !== -1) {
          appClient = clientList[i];
          break;
        }
      }

      if (appClient) {
        // App già aperta: usa BroadcastChannel per comunicare l'eventoId
        // senza ricaricare la pagina, poi porta la finestra in primo piano.
        if (eventoId) {
          try {
            var bc = new BroadcastChannel('bunker23_push');
            bc.postMessage({ type: 'APRI_EVENTO', eventoId: eventoId });
            bc.close();
          } catch(e) {}
        }
        return appClient.focus();
      }

      // App non aperta: aprila con ?evento=ID nell'URL.
      // _pendingEventoId lo leggerà all'avvio.
      return clients.openWindow(targetUrl);
    })
  );
});
