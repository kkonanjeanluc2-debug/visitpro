'use client'

import { useEffect, useState, useCallback } from 'react'
import { lireVisite, initialiserSpeech } from '@/lib/speech'

interface Props {
  utilisateurId: string
}

type PushEtat = 'checking' | 'active' | 'denied' | 'unsupported' | 'idle'

export default function PushSubscriber({ utilisateurId }: Props) {
  const [etat, setEtat] = useState<PushEtat>('checking')

  // Initialiser les voix TTS
  useEffect(() => { initialiserSpeech() }, [])

  const sauvegarder = useCallback(async (sub: PushSubscription) => {
    const json = sub.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
    })
    if (res.ok) setEtat('active')
  }, [])

  const abonner = useCallback(async () => {
    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!VAPID_PUBLIC) { setEtat('unsupported'); return }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setEtat('unsupported'); return }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setEtat('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        const keyBytes = existing.options.applicationServerKey
        if (keyBytes) {
          const arr = new Uint8Array(keyBytes)
          let binary = ''
          for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
          const existingKey = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
          if (existingKey === VAPID_PUBLIC.replace(/=/g, '')) {
            await sauvegarder(existing)
            return
          }
        }
        await existing.unsubscribe()
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      })
      await sauvegarder(sub)
    } catch (e) {
      console.warn('[push] Abonnement échoué :', e)
      setEtat('idle')
    }
  }, [sauvegarder])

  // Vérifier l'état au montage et s'abonner automatiquement
  useEffect(() => {
    if (!utilisateurId) return
    if (!('Notification' in window)) { setEtat('unsupported'); return }

    const perm = Notification.permission
    if (perm === 'denied') { setEtat('denied'); return }
    if (perm === 'granted') {
      // Déjà accordé → s'abonner silencieusement
      abonner()
    } else {
      // 'default' → pas encore demandé, montrer le bouton
      setEtat('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateurId])

  // Écouter les messages du service worker → TTS
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

  // TTS si app ouverte depuis une notification (query params)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('speak') === '1') {
      const nom   = params.get('nom')   ?? ''
      const motif = params.get('motif') ?? ''
      if (nom) setTimeout(() => lireVisite(nom, motif), 1200)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ── Bandeau visible ───────────────────────────────────────────────────────
  if (etat === 'active' || etat === 'checking' || etat === 'unsupported') return null

  if (etat === 'denied') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>Notifications bloquées — autorisez-les dans les paramètres du navigateur pour recevoir les alertes visiteurs.</span>
      </div>
    )
  }

  // etat === 'idle' → permission pas encore demandée
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>Activez les notifications pour être alerté même quand l&apos;app est fermée.</span>
      </div>
      <button
        onClick={abonner}
        className="flex-shrink-0 px-3 py-1 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
      >
        Activer
      </button>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  const arr     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
