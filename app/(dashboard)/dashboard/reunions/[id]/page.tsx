'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  obtenirReunion, changerStatutReunion, supprimerReunion,
  ajouterParticipantInterne, ajouterParticipantExterne,
  supprimerParticipant, mettreAJourPresence, assignerRoleSeance,
  ajouterPoint, modifierPoint, supprimerPoint,
  marquerConvocationEnvoyee,
} from '@/lib/reunions'
import type { RoleSeance } from '@/types'
import type { Reunion, Utilisateur, StatutParticipant, StatutReunion } from '@/types'
import ReunionBadge from '@/components/reunions/ReunionBadge'
import ParticipantsSelector from '@/components/reunions/ParticipantsSelector'
import OrdreJourForm from '@/components/reunions/OrdreJourForm'
import PreparationBoard from '@/components/reunions/PreparationBoard'
import Button from '@/components/ui/Button'

type Onglet = 'participants' | 'ordre_jour' | 'preparations'

const STATUT_ACTIONS: Partial<Record<StatutReunion, { label: string; nextStatut: StatutReunion; cls: string }>> = {
  planifiee: { label: 'Démarrer la réunion', nextStatut: 'en_cours', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  en_cours:  { label: 'Terminer la réunion', nextStatut: 'terminee', cls: 'bg-gray-700 hover:bg-gray-800 text-white' },
}

export default function ReunionDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { utilisateur } = useAuth()
  const router = useRouter()
  const [reunion, setReunion] = useState<Reunion | null>(null)
  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<Onglet>('participants')
  const [actionLoading, setActionLoading] = useState(false)
  const [convocLoading, setConvocLoading] = useState(false)

  const charger = useCallback(async () => {
    try {
      const data = await obtenirReunion(id)
      setReunion(data)
    } catch {
      router.push('/dashboard/reunions')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const chargerCollabs = useCallback(async () => {
    if (!utilisateur) return
    const sb = createClient()
    const { data } = await sb
      .from('utilisateurs')
      .select('*')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .eq('actif', true)
      .order('prenom')
    setCollaborateurs(data ?? [])
  }, [utilisateur])

  useEffect(() => { charger() }, [charger])
  useEffect(() => { chargerCollabs() }, [chargerCollabs])

  // Realtime sur la réunion
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`reunion-detail-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'reunion_participants',
        filter: `reunion_id=eq.${id}`,
      }, () => charger())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'reunion_points',
        filter: `reunion_id=eq.${id}`,
      }, () => charger())
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [id, charger])

  const handleChangerStatut = async (statut: StatutReunion) => {
    setActionLoading(true)
    try {
      await changerStatutReunion(id, statut)
      setReunion((r) => r ? { ...r, statut } : r)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer cette réunion ?')) return
    setActionLoading(true)
    try {
      await supprimerReunion(id)
      router.push('/dashboard/reunions')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnvoyerConvocations = async () => {
    if (!reunion) return
    setConvocLoading(true)
    try {
      const participants = (reunion.participants ?? []).filter((p) => !p.convocation_envoyee)
      if (participants.length === 0) { alert('Toutes les convocations ont déjà été envoyées'); return }

      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'convocation_reunion', reunionId: id }),
      })
      await marquerConvocationEnvoyee(id)
      await charger()
    } finally {
      setConvocLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!reunion) return null

  const canEdit = ['patron', 'admin'].includes(utilisateur?.role ?? '')
  const currentParticipant = (reunion.participants ?? []).find((p) => p.utilisateur_id === utilisateur?.id)
  const isParticipant = !!currentParticipant
  const isSecretaireSeance = currentParticipant?.role_seance === 'secretaire'
  const nextAction = STATUT_ACTIONS[reunion.statut]

  const dateStr = new Date(reunion.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const ONGLETS: { key: Onglet; label: string; count?: number }[] = [
    { key: 'participants', label: 'Participants', count: reunion.participants?.length },
    { key: 'ordre_jour', label: 'Ordre du jour', count: reunion.points?.length },
    { key: 'preparations', label: 'Préparations' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard/reunions" className="hover:text-gray-600">Réunions</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium truncate">{reunion.titre}</span>
      </div>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header coloré */}
        <div className="p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-dark-rgb, var(--color-primary-rgb))) 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <ReunionBadge statut={reunion.statut} />
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">{reunion.titre}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-white/70 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateStr}
                </span>
                <span className="flex items-center gap-1.5 text-white/70 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {reunion.heure_debut.slice(0, 5)}{reunion.heure_fin ? ` – ${reunion.heure_fin.slice(0, 5)}` : ''}
                </span>
                {reunion.lieu && (
                  <span className="flex items-center gap-1.5 text-white/70 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {reunion.lieu}
                  </span>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2 flex-shrink-0">
                {nextAction && (
                  <button
                    onClick={() => handleChangerStatut(nextAction.nextStatut)}
                    disabled={actionLoading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${nextAction.cls} disabled:opacity-60`}
                  >
                    {actionLoading ? '…' : nextAction.label}
                  </button>
                )}
                {reunion.statut !== 'annulee' && reunion.statut !== 'terminee' && (
                  <button
                    onClick={() => handleChangerStatut('annulee')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-60"
                  >
                    Annuler
                  </button>
                )}
              </div>
            )}
          </div>

          {reunion.description && (
            <p className="mt-3 text-white/70 text-sm leading-relaxed">{reunion.description}</p>
          )}
        </div>

        {/* Actions rapides */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          {(canEdit || (isSecretaireSeance && reunion.statut !== 'annulee')) && (
            <Link href={`/dashboard/reunions/${id}/compte-rendu`}>
              <Button size="sm" variant={reunion.compte_rendu ? 'outline' : 'primary'} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {reunion.compte_rendu?.statut === 'finalise' ? 'Voir le CR' : reunion.compte_rendu ? 'Modifier le CR' : 'Rédiger le CR'}
              </Button>
            </Link>
          )}

          {canEdit && reunion.statut === 'planifiee' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnvoyerConvocations}
              loading={convocLoading}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Envoyer convocations
            </Button>
          )}

          {canEdit && (
            <button
              onClick={handleSupprimer}
              disabled={actionLoading}
              className="ml-auto text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Supprimer
            </button>
          )}
        </div>

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

        {/* Contenu onglet */}
        <div className="p-5">
          {onglet === 'participants' && (
            <ParticipantsSelector
              collaborateurs={collaborateurs}
              participants={reunion.participants ?? []}
              onAjouterInterne={async (uid) => { await ajouterParticipantInterne(id, uid); await charger() }}
              onAjouterExterne={async (nom, email) => { await ajouterParticipantExterne(id, nom, email); await charger() }}
              onSupprimer={async (pid) => { await supprimerParticipant(pid); await charger() }}
              onChangerPresence={async (pid, statut: StatutParticipant) => { await mettreAJourPresence(pid, statut); await charger() }}
              onDefinirRole={async (pid, role: RoleSeance | null) => {
                if (role) { await assignerRoleSeance(id, pid, role) }
                else {
                  const p = (reunion.participants ?? []).find((x) => x.id === pid)
                  if (p?.role_seance) await assignerRoleSeance(id, null, p.role_seance)
                }
                await charger()
              }}
              readOnly={!canEdit}
            />
          )}

          {onglet === 'ordre_jour' && (
            <OrdreJourForm
              points={reunion.points ?? []}
              collaborateurs={collaborateurs}
              onAjouter={async (titre, desc, resp, duree) => {
                await ajouterPoint(id, { titre, description: desc, responsable_id: resp, duree_estimee: duree }, (reunion.points?.length ?? 0))
                await charger()
              }}
              onModifier={async (pid, updates) => { await modifierPoint(pid, updates); await charger() }}
              onSupprimer={async (pid) => { await supprimerPoint(pid); await charger() }}
              readOnly={!canEdit}
            />
          )}

          {onglet === 'preparations' && utilisateur && (
            <PreparationBoard
              reunionId={id}
              utilisateurId={utilisateur.id}
              points={reunion.points ?? []}
              readOnly={(!isParticipant && !canEdit) || reunion.statut === 'annulee'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
