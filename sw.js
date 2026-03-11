self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  var data = event.data.json();
  var title = data.title || 'BUNKER23';
  var options = {
    body: data.body || '',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
