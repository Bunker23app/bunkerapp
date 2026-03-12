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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se c'è già una finestra aperta sull'app, naviga lì aggiornando l'URL
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('bunker23app.github.io') !== -1 && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Altrimenti apri una nuova finestra
      return clients.openWindow(targetUrl);
    })
  );
});
