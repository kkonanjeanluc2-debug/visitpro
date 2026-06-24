'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MessageVisite } from '@/types'

export function useMessages(visiteId: string | null, utilisateurCourantId?: string) {
  const supabase = createClient()
  const [messages, setMessages] = useState<MessageVisite[]>([])
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    if (!visiteId) { setLoading(false); return }
    const { data } = await supabase
      .from('messages_visite')
      .select('*, auteur:utilisateurs!auteur_id(id, nom, prenom, role, photo_url)')
      .eq('visite_id', visiteId)
      .order('created_at')
      .limit(100)

    setMessages((data ?? []) as MessageVisite[])
    setLoading(false)
  }, [visiteId])

  useEffect(() => {
    charger()
    if (!visiteId) return

    const channel = supabase
      .channel(`messages-${visiteId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages_visite',
        filter: `visite_id=eq.${visiteId}`,
      }, () => { charger() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages_visite',
        filter: `visite_id=eq.${visiteId}`,
      }, () => { charger() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [visiteId, charger])

  const envoyerMessage = async (
    corps: string,
    auteurId: string,
    entrepriseId: string,
    destinataireId?: string,
  ): Promise<boolean> => {
    if (!visiteId || !corps.trim()) return false
    const { error } = await supabase.from('messages_visite').insert({
      visite_id: visiteId,
      entreprise_id: entrepriseId,
      auteur_id: auteurId,
      corps: corps.trim(),
      destinataire_id: destinataireId ?? null,
      lu: false,
    })
    return !error
  }

  const markAsRead = async (messageId: string): Promise<void> => {
    await supabase.from('messages_visite')
      .update({ lu: true, lu_at: new Date().toISOString() })
      .eq('id', messageId)
  }

  const marquerLusVisite = useCallback(async (): Promise<void> => {
    if (!visiteId || !utilisateurCourantId) return
    await supabase.from('messages_visite')
      .update({ lu: true, lu_at: new Date().toISOString() })
      .eq('visite_id', visiteId)
      .eq('destinataire_id', utilisateurCourantId)
      .eq('lu', false)
    setMessages(prev => prev.map(m =>
      m.destinataire_id === utilisateurCourantId && !m.lu
        ? { ...m, lu: true, lu_at: new Date().toISOString() }
        : m
    ))
  }, [visiteId, utilisateurCourantId])

  const nonLus = utilisateurCourantId
    ? messages.filter(m => !m.lu && m.destinataire_id === utilisateurCourantId).length
    : 0

  return { messages, loading, envoyerMessage, markAsRead, marquerLusVisite, nonLus }
}
