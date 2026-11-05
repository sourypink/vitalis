// Minimal service worker. Android Chrome only shows page notifications through a service worker.
// No fetch handler: nothing is cached and nothing is sent anywhere.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => (clients[0] ? clients[0].focus() : self.clients.openWindow('./'))),
  )
})
