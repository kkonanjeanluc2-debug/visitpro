'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { obtenirReunion } from '@/lib/reunions'
import type { Reunion, CompteRendu, Entreprise } from '@/types'
import CompteRenduForm from '@/components/reunions/CompteRenduForm'
import ReunionBadge from '@/components/reunions/ReunionBadge'

export default function CompteRenduPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { utilisateur } = useAuth()
  const router = useRouter()
  const [reunion, setReunion] = useState<Reunion | null>(null)
  const [compteRendu, setCompteRendu] = useState<CompteRendu | null>(null)
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    try {
      const data = await obtenirReunion(id)
      // Autoriser : patron/admin OU secrétaire de séance désignée
      const isSecretaireSeance = (data.participants ?? []).some(
        (p) => p.utilisateur_id === utilisateur?.id && p.role_seance === 'secretaire'
      )
      const canAccess = ['patron', 'admin'].includes(utilisateur?.role ?? '') || isSecretaireSeance
      if (!canAccess) { router.replace(`/dashboard/reunions/${id}`); return }
      setReunion(data)
      setCompteRendu(data.compte_rendu as CompteRendu | null ?? null)
    } catch {
      router.push('/dashboard/reunions')
    }
  }, [id, router, utilisateur])

  const chargerEntreprise = useCallback(async () => {
    if (!utilisateur) return
    const sb = createClient()
    const { data } = await sb
      .from('entreprises')
      .select('*')
      .eq('id', utilisateur.entreprise_id)
      .single()
    if (data) setEntreprise(data)
  }, [utilisateur])

  useEffect(() => {
    Promise.all([charger(), chargerEntreprise()]).finally(() => setLoading(false))
  }, [charger, chargerEntreprise])

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!reunion || !utilisateur) return null

  const dateStr = new Date(reunion.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/dashboard/reunions" className="hover:text-gray-600">Réunions</Link>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/dashboard/reunions/${id}`} className="hover:text-gray-600 truncate max-w-[180px]">
          {reunion.titre}
        </Link>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Compte-rendu</span>
      </div>

      {/* Info réunion */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <ReunionBadge statut={reunion.statut} />
            <h1 className="text-lg font-bold text-gray-900 mt-2">{reunion.titre}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {dateStr} · {reunion.heure_debut.slice(0, 5)}{reunion.heure_fin ? ` – ${reunion.heure_fin.slice(0, 5)}` : ''}
              {reunion.lieu ? ` · ${reunion.lieu}` : ''}
            </p>
            {reunion.participants && reunion.participants.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {reunion.participants.length} participant{reunion.participants.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formulaire CR */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-base font-bold text-gray-900">Rédaction du compte-rendu</h2>
          <p className="text-xs text-gray-400 mt-1">
            Résumé des discussions · Décisions · Plan d'actions · Observations
          </p>
        </div>

        {/* I — Informations générales */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-bold">I</span>
            Informations générales
          </h3>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
            <p><span className="font-medium">Réunion :</span> {reunion.titre}</p>
            <p><span className="font-medium">Date :</span> {dateStr}</p>
            <p><span className="font-medium">Heure :</span> {reunion.heure_debut.slice(0, 5)}{reunion.heure_fin ? ` – ${reunion.heure_fin.slice(0, 5)}` : ''}</p>
            {reunion.lieu && <p><span className="font-medium">Lieu :</span> {reunion.lieu}</p>}
          </div>
        </div>

        {/* II — Liste des participants */}
        {(() => {
          const participants = reunion.participants ?? []
          const president = participants.find((p) => p.role_seance === 'president')
          const secretaire = participants.find((p) => p.role_seance === 'secretaire')
          const rolesIds = new Set([president?.id, secretaire?.id].filter(Boolean))
          const presents = participants.filter((p) => p.statut_presence === 'confirme' && !rolesIds.has(p.id))
          const excuses = participants.filter((p) => p.statut_presence === 'excuse')

          const nomParticipant = (p: typeof participants[0]) => {
            if (p.utilisateur) {
              const base = `${p.utilisateur.nom}, ${p.utilisateur.prenom}`
              return p.utilisateur.poste ? `${base} – ${p.utilisateur.poste}` : base
            }
            return p.nom_externe ?? '—'
          }

          return (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">II</span>
                Liste des participants
              </h3>
              <div className="text-sm space-y-2.5 bg-gray-50 rounded-xl p-4">
                <p>
                  <span className="font-semibold text-gray-800">Président(e) de séance :</span>{' '}
                  <span className="text-gray-600">{president ? nomParticipant(president) : <span className="text-gray-400 italic">Non désigné</span>}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Secrétaire de séance :</span>{' '}
                  <span className="text-gray-600">{secretaire ? nomParticipant(secretaire) : <span className="text-gray-400 italic">Non désigné</span>}</span>
                </p>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Présents :</p>
                  {presents.length === 0 ? (
                    <p className="text-gray-400 italic text-xs ml-3">Aucun participant confirmé</p>
                  ) : (
                    <ul className="space-y-0.5 ml-3">
                      {presents.map((p) => (
                        <li key={p.id} className="flex items-start gap-1.5 text-gray-600">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          {nomParticipant(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {excuses.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">Excusés :</p>
                    <p className="text-gray-600 ml-3">{excuses.map(nomParticipant).join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* III — Faits / Points traités */}
        {reunion.points && reunion.points.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center font-bold">III</span>
              Faits — Points traités
            </h3>
            <div className="space-y-1">
              {[...reunion.points].sort((a, b) => a.ordre - b.ordre).map((pt, i) => {
                const stCls: Record<string, string> = {
                  a_traiter: 'text-gray-400', en_cours: 'text-blue-500', traite: 'text-emerald-600', reporte: 'text-amber-500',
                }
                return (
                  <div key={pt.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-xs text-gray-400 w-5 font-medium">{i + 1}.</span>
                    <span className="flex-1">{pt.titre}</span>
                    <span className={`text-xs font-medium ${stCls[pt.statut]}`}>
                      {{ a_traiter: '○', en_cours: '◑', traite: '●', reporte: '⊘' }[pt.statut]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* III — Le formulaire CR (sections IV à VII) */}
        {entreprise && (
          <CompteRenduForm
            reunion={reunion}
            compteRendu={compteRendu}
            utilisateurId={utilisateur.id}
            entreprise={entreprise}
            onFinalise={() => {
              charger()
            }}
          />
        )}
      </div>
    </div>
  )
}
