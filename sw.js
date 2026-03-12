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
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('bunker23app.github.io') !== -1) {
          // App già aperta: manda un messaggio senza ricaricare la pagina
          client.postMessage({ type: 'APRI_EVENTO', eventoId: eventoId });
          return client.focus();
        }
      }
      // App non aperta: aprila con il parametro nell'URL (verrà letto da _pendingEventoId)
      return clients.openWindow(targetUrl);
    })
  );
});
