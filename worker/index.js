// Service Worker custom — push notifications VisitPro
// Compilé par next-pwa et fusionné dans le SW principal

// ── Réception d'une notification push ────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { return }

  const title   = data.title  || 'Nouveau visiteur'
  const body    = data.body   || ''
  const icon    = '/icons/icon-192x192.png'
  const badge   = '/icons/icon-72x72.png'
  const tag     = 'visite-' + (data.visiteId || Date.now())

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction: true,   // reste jusqu'au clic sur bureau
      vibrate: [200, 100, 200],   // vibre sur mobile
      data: {
        nomVisiteur: data.nomVisiteur || '',
        motif:       data.motif       || '',
        visiteId:    data.visiteId    || '',
        url:         data.url         || '/dashboard',
      },
    })
  )
})

// ── Clic sur la notification ──────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notifData = event.notification.data || {}
  const nomVisiteur = notifData.nomVisiteur || ''
  const motif       = notifData.motif       || ''

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet du dashboard est déjà ouvert → lui envoyer un message TTS et le focuser
      for (const client of clientList) {
        if (client.url.includes('/dashboard')) {
          client.postMessage({ type: 'SPEAK_VISITOR', nomVisiteur, motif })
          return client.focus()
        }
      }
      // Sinon ouvrir une nouvelle fenêtre avec les params de lecture vocale
      const qs = new URLSearchParams({ speak: '1', nom: nomVisiteur, motif }).toString()
      return clients.openWindow('/dashboard?' + qs)
    })
  )
})
