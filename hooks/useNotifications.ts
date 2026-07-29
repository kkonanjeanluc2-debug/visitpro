'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { jouerSon, initialiserAudio } from '@/lib/sound'
import type { Notification } from '@/types'

// ─── Notification OS ────────────────────────────────────────────────────────

function notifierOS(titre: string, corps: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(titre, {
      body: corps,
      icon: '/favicon.ico',
      requireInteraction: true,
      tag: 'visitpro-' + Date.now(),
    })
    n.onclick = () => { window.focus(); n.close() }
    setTimeout(() => n.close(), 20000)
  } catch {}
}

// Signal visuel via le titre de l'onglet (visible dans la barre des tâches)
function signalerTitre(titre: string): void {
  if (typeof document === 'undefined') return
  const original = document.title
  let count = 0
  const id = setInterval(() => {
    document.title = count % 2 === 0 ? `🔔 ${titre}` : original
    count++
    if (count >= 12) { clearInterval(id); document.title = original }
  }, 700)
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface NotificationsState {
  notifications: Notification[]
  nonLues: number
  messagesNonLus: number
  loading: boolean
}

export function useNotifications(utilisateurId: string | null): NotificationsState {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messagesNonLus, setMessagesNonLus] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const lastIdRef = useRef<string | null>(null)
  const premierChargementRef = useRef(true)

  // Initialiser AudioContext + résoudre la politique autoplay desktop
  useEffect(() => initialiserAudio(), [])

  // Demander permission notifications OS au premier clic (respect Chrome 94+)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'default') return
    const demander = () => {
      Notification.requestPermission().catch(() => {})
      document.removeEventListener('click', demander)
    }
    document.addEventListener('click', demander)
    return () => document.removeEventListener('click', demander)
  }, [])

  const alerter = useCallback((n: Notification) => {
    const type = n.type === 'nouvelle_visite' ? 'nouvelle_visite' : 'changement_statut'
    jouerSon(type)
    notifierOS(n.titre, n.corps ?? '')
    signalerTitre(n.titre)
  }, [])

  const charger = useCallback(async () => {
    if (!utilisateurId) return
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('destinataire_id', utilisateurId)
        .order('created_at', { ascending: false })
        .limit(30)
      const list = data ?? []

      // Détection de nouvelles notifications via polling (secours si Realtime échoue)
      if (!premierChargementRef.current && list.length > 0 && lastIdRef.current !== null && list[0].id !== lastIdRef.current) {
        alerter(list[0] as Notification)
      }
      if (list.length > 0) lastIdRef.current = list[0].id
      premierChargementRef.current = false

      setNotifications(list)
    } catch {}
    finally { setLoading(false) }
  }, [utilisateurId, alerter])

  const chargerMessagesNonLus = useCallback(async () => {
    if (!utilisateurId) return
    const { count } = await supabase
      .from('messages_visite')
      .select('id', { count: 'exact', head: true })
      .eq('destinataire_id', utilisateurId)
      .eq('lu', false)
    setMessagesNonLus(count ?? 0)
  }, [utilisateurId])

  const chargerRef = useRef(charger)
  useEffect(() => { chargerRef.current = charger }, [charger])

  useEffect(() => {
    if (!utilisateurId) return
    charger()
    chargerMessagesNonLus()

    // ── Polling de secours toutes les 5s (si Realtime échoue sur desktop) ────
    const pollInterval = setInterval(() => chargerRef.current(), 5000)

    // ── Canal Realtime notifications ────────────────────────────────────────
    const channelNotifs = supabase
      .channel(`notifs-${utilisateurId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `destinataire_id=eq.${utilisateurId}`,
      }, (payload) => {
        const n = payload.new as Notification
        lastIdRef.current = n.id  // Évite le doublon polling+Realtime
        setNotifications((prev) => [n, ...prev])
        alerter(n)
      })
      .subscribe()

    // ── Canal messages non lus ──────────────────────────────────────────────
    const channelMessages = supabase
      .channel(`msg-nonlus-${utilisateurId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages_visite',
        filter: `destinataire_id=eq.${utilisateurId}`,
      }, () => {
        setMessagesNonLus(prev => prev + 1)
        jouerSon('changement_statut')
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages_visite',
        filter: `destinataire_id=eq.${utilisateurId}`,
      }, () => {
        chargerMessagesNonLus()
      })
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channelNotifs)
      supabase.removeChannel(channelMessages)
    }
  }, [utilisateurId])

  const nonLues = notifications.filter((n) => !n.lue).length
  return { notifications, nonLues, messagesNonLus, loading }
}
