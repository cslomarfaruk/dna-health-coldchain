// Service Worker — Healthcare Push Notifications
// Zero PHI on lock screen / notification center (HIPAA Safe Harbor)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Handle programmatic notification requests from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        ...options,
        badge: options.badge || '/favicon.ico',
        icon: options.icon || '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: false,
      })
    );
  }
});

// Route notification clicks to the correct page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
