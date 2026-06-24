'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

// ─── Audio : WAV généré en JS (évite les blocages AudioContext) ─────────────

let _audioUrl: string | null = null

function getBeepUrl(): string | null {
  if (typeof window === 'undefined') return null
  if (_audioUrl) return _audioUrl
  try {
    const sr = 8000
    const dur = 0.35
    const freq = 880
    const n = Math.floor(sr * dur)
    const buf = new ArrayBuffer(44 + n * 2)
    const v = new DataView(buf)
    const s = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)) }
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE')
    s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
    v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true)
    v.setUint16(32, 2, true); v.setUint16(34, 16, true)
    s(36, 'data'); v.setUint32(40, n * 2, true)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const env = Math.exp(-9 * t)
      const sample = (Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.3) * env * 0.45
      v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.floor(sample * 32767))), true)
    }
    _audioUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
    return _audioUrl
  } catch { return null }
}

function jouerSon(): void {
  const url = getBeepUrl()
  if (!url) return
  try {
    const a = new Audio(url)
    a.volume = 0.7
    a.play().catch(() => {})
  } catch {}
}

// ─── Notification OS ────────────────────────────────────────────────────────

function notifierOS(titre: string, corps: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(titre, {
      body: corps,
      icon: '/favicon.ico',
      requireInteraction: true,
      tag: 'visitpro',
    })
    n.onclick = () => { window.focus(); n.close() }
    setTimeout(() => n.close(), 20000)
  } catch {}
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    getBeepUrl()
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
      setNotifications(data ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [utilisateurId])

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

    // Canal notifications
    const channelNotifs = supabase
      .channel(`notifs-${utilisateurId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `destinataire_id=eq.${utilisateurId}`,
      }, (payload) => {
        const n = payload.new as Notification
        setNotifications((prev) => [n, ...prev])
        jouerSon()
        notifierOS(n.titre, n.corps ?? '')
      })
      .subscribe()

    // Canal messages non lus (badge uniquement)
    const channelMessages = supabase
      .channel(`msg-nonlus-${utilisateurId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages_visite',
        filter: `destinataire_id=eq.${utilisateurId}`,
      }, () => {
        setMessagesNonLus(prev => prev + 1)
        jouerSon()
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
      supabase.removeChannel(channelNotifs)
      supabase.removeChannel(channelMessages)
    }
  }, [utilisateurId])

  const nonLues = notifications.filter((n) => !n.lue).length
  return { notifications, nonLues, messagesNonLus, loading }
}
