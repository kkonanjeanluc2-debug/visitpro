'use client'

import { useEffect } from 'react'
import { lireVisite, initialiserSpeech } from '@/lib/speech'

interface Props {
  utilisateurId: string
}

export default function PushSubscriber({ utilisateurId }: Props) {
  // Initialiser les voix TTS
  useEffect(() => { initialiserSpeech() }, [])

  // S'abonner aux push notifications
  useEffect(() => {
    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!VAPID_PUBLIC || !utilisateurId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const abonner = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[push] Permission refusée')
          return
        }

        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()

        // Vérifier si la clé VAPID correspond — si elle a changé, se désabonner et ré-abonner
        if (existing) {
          const keyBytes = existing.options.applicationServerKey
          if (keyBytes) {
            const existingKey = btoa(String.fromCharCode(...new Uint8Array(keyBytes)))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
            const targetKey = VAPID_PUBLIC.replace(/=/g, '')
            if (existingKey === targetKey) {
              await sauvegarder(existing)
              return
            }
          }
          // Clé différente → se désabonner et ré-abonner
          await existing.unsubscribe()
          console.log('[push] Ré-abonnement (clé VAPID changée)')
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
        })
        await sauvegarder(sub)
        console.log('[push] Abonnement enregistré')
      } catch (e) {
        console.warn('[push] Abonnement échoué :', e)
      }
    }

    const sauvegarder = async (sub: PushSubscription) => {
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      })
    }

    abonner()
  }, [utilisateurId])

  // Écouter les messages du service worker (TTS après clic sur notification)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SPEAK_VISITOR') {
        lireVisite(event.data.nomVisiteur, event.data.motif)
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  // Lecture vocale si l'app a été ouverte depuis une notification (query params)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('speak') === '1') {
      const nom   = params.get('nom')   ?? ''
      const motif = params.get('motif') ?? ''
      if (nom) {
        // Petit délai pour laisser le temps à l'interface de charger
        setTimeout(() => lireVisite(nom, motif), 1200)
      }
      // Nettoyer l'URL sans rechargement
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [])

  return null
}

// Convertit la clé VAPID base64 en Uint8Array pour l'API PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  const arr     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
