'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Utilisateur } from '@/types'
import MessageVisite from '@/components/shared/MessageVisite'
import { formatHeure } from '@/lib/utils'

interface Thread {
  visite_id: string
  visiteurNom: string
  dernierCorps: string
  dernierAuteurNom: string
  estDernierMoi: boolean
  created_at: string
  nonLus: number
  statut: string
  destinataireVisiteId: string | null
  enregistreParId: string | null
}

interface MessagesInboxProps {
  utilisateur: Utilisateur
  defaultVisiteId?: string | null
}

export default function MessagesInbox({ utilisateur, defaultVisiteId }: MessagesInboxProps) {
  const supabase = createClient()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(defaultVisiteId ?? null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(defaultVisiteId ? 'chat' : 'list')

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('messages_visite')
        .select(`
          visite_id, corps, created_at, lu, auteur_id, destinataire_id,
          auteur:utilisateurs!auteur_id(nom, prenom),
          visite:visites!visite_id(nom_visiteur, prenom_visiteur, statut, destinataire_id, enregistre_par)
        `)
        .or(`auteur_id.eq.${utilisateur.id},destinataire_id.eq.${utilisateur.id}`)
        .eq('entreprise_id', utilisateur.entreprise_id)
        .order('created_at', { ascending: false })
        .limit(300)

      const map: Record<string, Thread> = {}
      for (const m of (data ?? [])) {
        const vid = m.visite_id as string
        const auteur = m.auteur as unknown as { nom: string; prenom: string } | null
        const visite = m.visite as unknown as { nom_visiteur: string; prenom_visiteur?: string; statut: string; destinataire_id: string | null; enregistre_par: string | null } | null
        if (!map[vid]) {
          map[vid] = {
            visite_id: vid,
            visiteurNom: visite
              ? `${visite.prenom_visiteur ?? ''} ${visite.nom_visiteur}`.trim()
              : 'Visiteur',
            dernierCorps: m.corps,
            dernierAuteurNom: auteur ? `${auteur.prenom} ${auteur.nom}`.trim() : '',
            estDernierMoi: m.auteur_id === utilisateur.id,
            created_at: m.created_at,
            nonLus: 0,
            statut: visite?.statut ?? '',
            destinataireVisiteId: visite?.destinataire_id ?? null,
            enregistreParId: visite?.enregistre_par ?? null,
          }
        }
        if (!m.lu && m.destinataire_id === utilisateur.id) {
          map[vid].nonLus++
        }
      }

      const liste = Object.values(map)
      setThreads(liste)
      if (!selectedId && liste.length > 0) {
        setSelectedId(liste[0].visite_id)
      }
    } finally {
      setLoading(false)
    }
  }, [utilisateur.id, utilisateur.entreprise_id])

  useEffect(() => {
    charger()

    const channel = supabase
      .channel(`inbox-${utilisateur.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages_visite',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, () => charger())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages_visite',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [charger, utilisateur.id, utilisateur.entreprise_id])

  const totalNonLus = threads.reduce((acc, t) => acc + t.nonLus, 0)
  const selected = threads.find((t) => t.visite_id === selectedId)

  // Destinataire pour l'envoi de messages : l'interlocuteur de l'utilisateur courant
  const destinataireId = selected
    ? selected.destinataireVisiteId === utilisateur.id
      ? (selected.enregistreParId ?? undefined)
      : (selected.destinataireVisiteId ?? undefined)
    : undefined

  const statutLabel = (s: string) => {
    if (s === 'en_cours') return { label: 'En cours', cls: 'text-emerald-600' }
    if (s === 'acceptee') return { label: 'Acceptée', cls: 'text-blue-600' }
    if (s === 'terminee') return { label: 'Terminée', cls: 'text-gray-400' }
    if (s === 'declinee') return { label: 'Déclinée', cls: 'text-red-500' }
    return { label: 'En attente', cls: 'text-amber-600' }
  }

  return (
    <div className="flex h-full min-h-0 bg-gray-50">

      {/* ── Liste des conversations ─────────────────────────────────────── */}
      <aside className={`
        ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
        flex-col w-full lg:w-80 bg-white border-r border-gray-200 flex-shrink-0
      `}>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Conversations</h2>
            {totalNonLus > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {totalNonLus} non lu{totalNonLus > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Aucune conversation</p>
              <p className="text-xs text-gray-400 mt-1">
                Les messages échangés lors des visites apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {threads.map((thread) => {
                const isActive = selectedId === thread.visite_id
                return (
                  <button
                    key={thread.visite_id}
                    onClick={() => { setSelectedId(thread.visite_id); setMobileView('chat') }}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors border-l-2
                      ${isActive ? 'bg-emerald-50 border-emerald-500' : 'border-transparent'}
                      ${!isActive && thread.nonLus > 0 ? 'bg-emerald-50/20' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">
                          {thread.visiteurNom.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm truncate ${thread.nonLus > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {thread.visiteurNom}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatHeure(thread.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {thread.estDernierMoi ? 'Vous' : thread.dernierAuteurNom} : {thread.dernierCorps}
                        </p>
                      </div>
                      {thread.nonLus > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                          {thread.nonLus > 9 ? '9+' : thread.nonLus}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Zone conversation ───────────────────────────────────────────── */}
      <section className={`
        ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}
        flex-col flex-1 min-w-0
      `}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
              <button
                className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileView('list')}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {selected.visiteurNom.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{selected.visiteurNom}</p>
                <p className="text-xs text-gray-500">
                  Visite ·
                  <span className={`ml-1 font-medium ${statutLabel(selected.statut).cls}`}>
                    {statutLabel(selected.statut).label}
                  </span>
                </p>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 min-h-0 bg-gray-50">
              <MessageVisite
                visiteId={selected.visite_id}
                utilisateur={utilisateur}
                destinataireId={destinataireId}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-gray-50">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-600">Sélectionnez une conversation</p>
            <p className="text-sm text-gray-400 mt-1">Cliquez sur une conversation pour afficher les messages</p>
          </div>
        )}
      </section>
    </div>
  )
}
