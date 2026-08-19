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

export default function CompteRenduSecretairePage({ params }: { params: { id: string } }) {
  const { id } = params
  const { utilisateur } = useAuth()
  const router = useRouter()
  const [reunion, setReunion] = useState<Reunion | null>(null)
  const [compteRendu, setCompteRendu] = useState<CompteRendu | null>(null)
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [loading, setLoading] = useState(true)
  const [accesRefuse, setAccesRefuse] = useState(false)

  const charger = useCallback(async () => {
    try {
      const data = await obtenirReunion(id)
      // Secrétaire de séance = participant avec role_seance = 'secretaire'
      const isSecretaireSeance = (data.participants ?? []).some(
        (p) => p.utilisateur_id === utilisateur?.id && p.role_seance === 'secretaire'
      )
      if (!isSecretaireSeance) {
        setAccesRefuse(true)
        return
      }
      setReunion(data)
      setCompteRendu(data.compte_rendu as CompteRendu | null ?? null)
    } catch {
      router.push('/secretaire/reunions')
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
    if (utilisateur) {
      Promise.all([charger(), chargerEntreprise()]).finally(() => setLoading(false))
    }
  }, [charger, chargerEntreprise, utilisateur])

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (accesRefuse) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-500 text-sm">Vous devez être participant à cette réunion pour rédiger le compte-rendu.</p>
        <Link href={`/secretaire/reunions/${id}`} className="mt-4 inline-block text-sm text-[rgb(var(--color-primary-rgb))] hover:underline">
          Retour à la réunion
        </Link>
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
        <Link href="/secretaire/reunions" className="hover:text-gray-600">Réunions</Link>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/secretaire/reunions/${id}`} className="hover:text-gray-600 truncate max-w-[180px]">
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
          <p className="text-xs text-gray-400 mt-1">Secrétaire de séance</p>
        </div>

        {/* Participants */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-bold">I</span>
            Informations générales
          </h3>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
            <p><span className="font-medium">Réunion :</span> {reunion.titre}</p>
            <p><span className="font-medium">Date :</span> {dateStr}</p>
            <p><span className="font-medium">Participants :</span> {(reunion.participants ?? []).map((p) => p.utilisateur ? `${p.utilisateur.prenom} ${p.utilisateur.nom}` : p.nom_externe ?? '').join(', ') || '—'}</p>
          </div>
        </div>

        {/* Ordre du jour */}
        {reunion.points && reunion.points.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">II</span>
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

        {entreprise && (
          <CompteRenduForm
            reunion={reunion}
            compteRendu={compteRendu}
            utilisateurId={utilisateur.id}
            entreprise={entreprise}
            onFinalise={() => charger()}
          />
        )}
      </div>
    </div>
  )
}
