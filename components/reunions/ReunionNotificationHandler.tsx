'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  entrepriseId: string
  utilisateurId: string
}

export default function ReunionNotificationHandler({ entrepriseId, utilisateurId }: Props) {
  useEffect(() => {
    const sb = createClient()

    const channel = sb
      .channel(`reunion-notif-${utilisateurId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reunions',
        filter: `entreprise_id=eq.${entrepriseId}`,
      }, (payload) => {
        const reunion = payload.new as { statut: string; titre: string }
        if (reunion.statut === 'en_cours') {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Réunion en cours', {
              body: `La réunion "${reunion.titre}" vient de démarrer`,
              icon: '/icon-192.png',
            })
          }
        }
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [entrepriseId, utilisateurId])

  return null
}
