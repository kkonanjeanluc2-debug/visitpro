'use client'

import { useEffect } from 'react'

// Appelé une seule fois par onglet navigateur à l'ouverture de session.
// Enregistre aussi la déconnexion si l'utilisateur clique sur "Déconnexion"
// via l'API route /api/auth/track.
export default function AuthTracker({ userId }: { userId: string }) {
  useEffect(() => {
    const key = `auth_tracked_${userId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch('/api/auth/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connexion' }),
    }).catch(() => {})
  }, [userId])

  return null
}
