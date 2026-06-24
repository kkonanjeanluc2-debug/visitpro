'use client'

// Le traitement des notifications (son, titre, badge) est maintenant géré
// directement dans TopBar via useNotifications. Ce composant est conservé
// pour ne pas modifier les layouts mais ne fait plus rien.
export default function NotificationHandler({ utilisateurId }: { utilisateurId: string }) {
  return null
}
