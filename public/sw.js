self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'URL 변경 감지', {
      body: data.body ?? '',
      icon: '/favicon.ico',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url))
  }
})
