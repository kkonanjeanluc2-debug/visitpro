// Service Worker custom — push notifications VisitPro

// Permet la mise à jour immédiate du SW quand un nouveau est en attente
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
// Compilé par next-pwa et fusionné dans le SW principal

// ── Réception d'une notification push ────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { return }

  const nomVisiteur = data.nomVisiteur || ''
  const motif       = data.motif       || ''
  const title       = data.title       || ('Visiteur : ' + nomVisiteur)
  const body        = data.body        || ('Motif : ' + (motif || 'non précisé'))
  const tag         = 'visite-' + (data.visiteId || Date.now())

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ── Cas 1 : un onglet est déjà ouvert ────────────────────────────────
      // Envoyer le message TTS → la page parle immédiatement sans que l'utilisateur
      // ait besoin de cliquer. Le son + TTS s'activent même si l'onglet est en arrière-plan.
      let dashboardOuvert = false
      for (const client of clientList) {
        if (client.url.includes('/dashboard')) {
          client.postMessage({ type: 'SPEAK_VISITOR', nomVisiteur, motif })
          dashboardOuvert = true
          break
        }
      }

      // ── Cas 2 : app complètement fermée ──────────────────────────────────
      // Afficher la notification persistante. Quand l'utilisateur appuie dessus
      // l'app s'ouvre et la lecture vocale démarre automatiquement.
      // On l'affiche aussi quand l'app est ouverte pour que l'utilisateur voie
      // le nom + motif même s'il est sur un autre écran.
      return self.registration.showNotification(title, {
        body,
        icon:             '/icons/icon-192x192.png',
        badge:            '/icons/icon-72x72.png',
        tag,
        requireInteraction: !dashboardOuvert,  // persistant seulement si app fermée
        vibrate:          [300, 150, 300, 150, 600],
        data: { nomVisiteur, motif, visiteId: data.visiteId || '', url: '/dashboard' },
      })
    })
  )
})

// ── Clic sur la notification ──────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notifData   = event.notification.data || {}
  const nomVisiteur = notifData.nomVisiteur || ''
  const motif       = notifData.motif       || ''

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet dashboard est déjà ouvert → focus + TTS
      for (const client of clientList) {
        if (client.url.includes('/dashboard')) {
          client.postMessage({ type: 'SPEAK_VISITOR', nomVisiteur, motif })
          return client.focus()
        }
      }
      // App fermée → ouvrir le dashboard avec les params de lecture vocale
      // La page lit vocalement dès son chargement (via useEffect dans PushSubscriber)
      const qs = new URLSearchParams({ speak: '1', nom: nomVisiteur, motif }).toString()
      return clients.openWindow('/dashboard?' + qs)
    })
  )
})
