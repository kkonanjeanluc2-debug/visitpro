'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Reunion } from '@/types'
import ReunionBadge from '@/components/reunions/ReunionBadge'

const TYPE_LABEL: Record<string, string> = {
  interne: 'Interne', externe: 'Externe', comite: 'Comité', autre: 'Autre',
}
const TYPE_CLS: Record<string, string> = {
  interne: 'bg-indigo-50 text-indigo-600',
  externe: 'bg-orange-50 text-orange-600',
  comite:  'bg-purple-50 text-purple-600',
  autre:   'bg-gray-100 text-gray-500',
}

export default function ReunionsSecretairePage() {
  const { utilisateur } = useAuth()
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    if (!utilisateur) return
    const sb = createClient()
    const { data } = await sb
      .from('reunions')
      .select(`
        *,
        organisateur:utilisateurs!reunions_organisateur_id_fkey(id, nom, prenom),
        participants:reunion_participants(id, utilisateur_id, nom_externe, statut_presence),
        points:reunion_points(id),
        compte_rendu:comptes_rendus(id, statut)
      `)
      .eq('entreprise_id', utilisateur.entreprise_id)
      .order('date_reunion', { ascending: false })
      .order('heure_debut', { ascending: true })

    setReunions((data ?? []) as Reunion[])
    setLoading(false)
  }, [utilisateur])

  useEffect(() => { charger() }, [charger])

  const today = new Date().toISOString().split('T')[0]

  const aVenir  = reunions.filter((r) => r.date_reunion >= today && r.statut === 'planifiee')
  const enCours = reunions.filter((r) => r.statut === 'en_cours')
  const passees = reunions.filter((r) => r.date_reunion < today || ['terminee', 'annulee'].includes(r.statut))

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-3">
        <div className="h-8 bg-gray-100 rounded-xl w-40" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Réunions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Toutes les réunions de l'entreprise</p>
      </div>

      {enCours.length > 0 && (
        <Section titre="En cours" reunions={enCours} />
      )}

      {aVenir.length > 0 && (
        <Section titre="À venir" reunions={aVenir} />
      )}

      {passees.length > 0 && (
        <Section titre="Passées" reunions={passees} />
      )}

      {reunions.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">Aucune réunion planifiée</p>
        </div>
      )}
    </div>
  )
}

function Section({ titre, reunions }: { titre: string; reunions: Reunion[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{titre}</h2>
      <div className="space-y-2">
        {reunions.map((r) => {
          const dateStr = new Date(r.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
          const isParticipant = (r.participants ?? []).length > 0
          return (
            <Link key={r.id} href={`/secretaire/reunions/${r.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{r.titre}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {dateStr} · {r.heure_debut.slice(0, 5)}{r.heure_fin ? ` – ${r.heure_fin.slice(0, 5)}` : ''}
                    {r.lieu ? ` · ${r.lieu}` : ''}
                  </p>
                </div>
                <ReunionBadge statut={r.statut} />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CLS[r.type]}`}>
                  {TYPE_LABEL[r.type]}
                </span>
                {r.organisateur && (
                  <span className="text-xs text-gray-400">
                    Org. : {r.organisateur.prenom} {r.organisateur.nom}
                  </span>
                )}
                {isParticipant && (
                  <span className="text-xs text-gray-400">
                    {r.participants!.length} participant{r.participants!.length > 1 ? 's' : ''}
                  </span>
                )}
                {r.compte_rendu?.statut === 'finalise' && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    CR disponible
                  </span>
                )}
              </div>

              {r.points && r.points.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{r.points.length} point{r.points.length > 1 ? 's' : ''} à l'ordre du jour</p>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
