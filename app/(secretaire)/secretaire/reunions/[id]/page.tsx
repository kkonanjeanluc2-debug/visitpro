'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { obtenirReunion } from '@/lib/reunions'
import type { Reunion } from '@/types'
import ReunionBadge from '@/components/reunions/ReunionBadge'
import PreparationBoard from '@/components/reunions/PreparationBoard'

type Onglet = 'participants' | 'ordre_jour' | 'preparations'

const TYPE_LABEL: Record<string, string> = {
  interne: 'Interne', externe: 'Externe', comite: 'Comité', autre: 'Autre',
}
const TYPE_CLS: Record<string, string> = {
  interne: 'bg-indigo-50 text-indigo-600',
  externe: 'bg-orange-50 text-orange-600',
  comite:  'bg-purple-50 text-purple-600',
  autre:   'bg-gray-100 text-gray-500',
}
const STATUT_POINT_LABEL: Record<string, string> = {
  a_traiter: 'À traiter', en_cours: 'En cours', traite: 'Traité', reporte: 'Reporté',
}
const STATUT_POINT_CLS: Record<string, string> = {
  a_traiter: 'bg-gray-100 text-gray-500',
  en_cours:  'bg-blue-50 text-blue-600',
  traite:    'bg-emerald-50 text-emerald-600',
  reporte:   'bg-amber-50 text-amber-600',
}

export default function ReunionDetailSecretairePage({ params }: { params: { id: string } }) {
  const { id } = params
  const { utilisateur } = useAuth()
  const router = useRouter()
  const [reunion, setReunion] = useState<Reunion | null>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<Onglet>('participants')

  const charger = useCallback(async () => {
    try {
      const data = await obtenirReunion(id)
      setReunion(data)
    } catch {
      router.push('/secretaire/reunions')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { charger() }, [charger])

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!reunion || !utilisateur) return null

  const isParticipant = (reunion.participants ?? []).some((p) => p.utilisateur_id === utilisateur.id)

  const dateStr = new Date(reunion.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const ONGLETS: { key: Onglet; label: string; count?: number }[] = [
    { key: 'participants', label: 'Participants', count: reunion.participants?.length },
    { key: 'ordre_jour', label: 'Ordre du jour', count: reunion.points?.length },
    { key: 'preparations', label: 'Préparations' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/secretaire/reunions" className="hover:text-gray-600">Réunions</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium truncate">{reunion.titre}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* En-tête */}
        <div className="p-5 bg-gradient-to-br from-gray-800 to-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <ReunionBadge statut={reunion.statut} />
              <h1 className="text-xl font-bold text-white mt-2">{reunion.titre}</h1>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-white/70 text-sm">{dateStr}</span>
                <span className="text-white/70 text-sm">
                  {reunion.heure_debut.slice(0, 5)}{reunion.heure_fin ? ` – ${reunion.heure_fin.slice(0, 5)}` : ''}
                </span>
                {reunion.lieu && <span className="text-white/70 text-sm">{reunion.lieu}</span>}
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_CLS[reunion.type]}`}>
              {TYPE_LABEL[reunion.type]}
            </span>
          </div>
          {reunion.description && (
            <p className="mt-3 text-white/60 text-sm leading-relaxed">{reunion.description}</p>
          )}
        </div>

        {/* Lien CR si secrétaire de séance */}
        {isParticipant && reunion.statut !== 'annulee' && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <Link
              href={`/secretaire/reunions/${id}/compte-rendu`}
              className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-primary-rgb))] hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {reunion.compte_rendu?.statut === 'finalise' ? 'Voir le compte-rendu' : 'Rédiger le compte-rendu'}
            </Link>
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-gray-100">
          <nav className="flex px-5 gap-0">
            {ONGLETS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setOnglet(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  onglet === key
                    ? 'border-[rgb(var(--color-primary-rgb))] text-[rgb(var(--color-primary-rgb))]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-1.5 py-0 rounded-full ${onglet === key ? 'bg-[rgb(var(--color-primary-rgb))]/10 text-[rgb(var(--color-primary-rgb))]' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">
          {/* Participants */}
          {onglet === 'participants' && (
            <div className="space-y-2">
              {(reunion.participants ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Aucun participant</p>
              )}
              {(reunion.participants ?? []).map((p) => {
                const nom = p.utilisateur
                  ? `${p.utilisateur.prenom} ${p.utilisateur.nom}`
                  : p.nom_externe ?? '—'
                const STATUT_CLS: Record<string, string> = {
                  invite: 'bg-gray-100 text-gray-500',
                  confirme: 'bg-emerald-50 text-emerald-600',
                  absent: 'bg-red-50 text-red-500',
                  excuse: 'bg-amber-50 text-amber-600',
                }
                const STATUT_LABEL: Record<string, string> = {
                  invite: 'Invité', confirme: 'Confirmé', absent: 'Absent', excuse: 'Excusé',
                }
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{nom}</p>
                      {p.email_externe && (
                        <p className="text-xs text-gray-400">{p.email_externe}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_CLS[p.statut_presence]}`}>
                      {STATUT_LABEL[p.statut_presence]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ordre du jour */}
          {onglet === 'ordre_jour' && (
            <div className="space-y-2">
              {(reunion.points ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Aucun point à l'ordre du jour</p>
              )}
              {[...(reunion.points ?? [])].sort((a, b) => a.ordre - b.ordre).map((pt, i) => (
                <div key={pt.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{pt.titre}</p>
                    {pt.description && <p className="text-xs text-gray-500 mt-0.5">{pt.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {pt.responsable && (
                        <span className="text-xs text-gray-400">
                          {pt.responsable.prenom} {pt.responsable.nom}
                        </span>
                      )}
                      {pt.duree_estimee && (
                        <span className="text-xs text-gray-400">{pt.duree_estimee} min</span>
                      )}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_POINT_CLS[pt.statut]}`}>
                    {STATUT_POINT_LABEL[pt.statut]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Préparations — writable si participant */}
          {onglet === 'preparations' && (
            <PreparationBoard
              reunionId={id}
              utilisateurId={utilisateur.id}
              points={reunion.points ?? []}
              readOnly={!isParticipant || reunion.statut === 'annulee'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
