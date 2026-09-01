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
import type { RoleSeance, Reunion, ReunionParticipant, ReunionPoint, Utilisateur, StatutParticipant, StatutReunion } from '@/types'
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

  // Chargement initial — cancelled flag pour éviter la race condition React Strict Mode
  useEffect(() => {
    let cancelled = false
    obtenirReunion(id)
      .then((data) => { if (!cancelled) setReunion(data) })
      .catch(() => { if (!cancelled) router.push('/dashboard/reunions') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, router])

  useEffect(() => {
    if (!utilisateur) return
    let cancelled = false
    createClient()
      .from('utilisateurs').select('*')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .eq('actif', true).order('prenom')
      .then(({ data }) => { if (!cancelled) setCollaborateurs(data ?? []) })
    return () => { cancelled = true }
  }, [utilisateur])

  // Refetch ciblé participants (post-opération, garantit la cohérence DB)
  const refreshParticipants = useCallback(async () => {
    const { data } = await createClient()
      .from('reunion_participants')
      .select('*, utilisateur:utilisateurs(id, nom, prenom, photo_url, poste, email)')
      .eq('reunion_id', id)
    if (data) setReunion((r) => r ? { ...r, participants: data as ReunionParticipant[] } : r)
  }, [id])

  // Refetch ciblé points OdJ (post-opération)
  const refreshPoints = useCallback(async () => {
    const { data } = await createClient()
      .from('reunion_points')
      .select('*, responsable:utilisateurs(id, nom, prenom)')
      .eq('reunion_id', id)
      .order('ordre')
    if (data) setReunion((r) => r ? { ...r, points: data as ReunionPoint[] } : r)
  }, [id])

  // Realtime incrémental — mise à jour locale sans refetch complet
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`reunion-detail-${id}`)
      // Réunion (statut, titre…)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reunions', filter: `id=eq.${id}` },
        (payload) => setReunion((r) => r ? { ...r, ...payload.new } : r)
      )
      // Participants — INSERT (fetch avec join utilisateur)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reunion_participants', filter: `reunion_id=eq.${id}` },
        async (payload) => {
          const { data } = await createClient().from('reunion_participants')
            .select('*, utilisateur:utilisateurs(id, nom, prenom, photo_url, poste, email)')
            .eq('id', payload.new.id).single()
          if (data) setReunion((r) => r ? {
            ...r,
            participants: [...(r.participants ?? []).filter((p) => p.id !== data.id), data as ReunionParticipant],
          } : r)
        }
      )
      // Participants — UPDATE (statut_presence, role_seance, convocation_envoyee…)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reunion_participants', filter: `reunion_id=eq.${id}` },
        (payload) => setReunion((r) => r ? {
          ...r,
          participants: (r.participants ?? []).map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p),
        } : r)
      )
      // Participants — DELETE
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reunion_participants', filter: `reunion_id=eq.${id}` },
        (payload) => setReunion((r) => r ? {
          ...r,
          participants: (r.participants ?? []).filter((p) => p.id !== payload.old.id),
        } : r)
      )
      // Points — INSERT (fetch avec join responsable)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reunion_points', filter: `reunion_id=eq.${id}` },
        async (payload) => {
          const { data } = await createClient().from('reunion_points')
            .select('*, responsable:utilisateurs(id, nom, prenom)')
            .eq('id', payload.new.id).single()
          if (data) setReunion((r) => r ? {
            ...r,
            points: [...(r.points ?? []).filter((p) => p.id !== data.id), data as ReunionPoint],
          } : r)
        }
      )
      // Points — UPDATE
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reunion_points', filter: `reunion_id=eq.${id}` },
        (payload) => setReunion((r) => r ? {
          ...r,
          points: (r.points ?? []).map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p),
        } : r)
      )
      // Points — DELETE
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reunion_points', filter: `reunion_id=eq.${id}` },
        (payload) => setReunion((r) => r ? {
          ...r,
          points: (r.points ?? []).filter((p) => p.id !== payload.old.id),
        } : r)
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [id])

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
      const aEnvoyer = (reunion.participants ?? []).filter((p) => !p.convocation_envoyee)
      if (aEnvoyer.length === 0) { alert('Toutes les convocations ont déjà été envoyées'); return }

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'convocation_reunion', reunionId: id }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(`Erreur lors de l'envoi : ${data.erreur ?? 'Erreur inconnue'}`)
        return
      }

      const envoyes: number = data.envoyes ?? 0
      const erreurs: string[] = data.erreurs ?? []

      // Rafraîchir les participants depuis la DB (marqués au niveau du serveur)
      setReunion((r) => r ? {
        ...r,
        participants: (r.participants ?? []).map((p) => {
          const estEnvoye = aEnvoyer.some((a) => a.id === p.id)
          return estEnvoye ? { ...p, convocation_envoyee: true } : p
        }),
      } : r)

      if (erreurs.length > 0) {
        alert(`${envoyes} convocation(s) envoyée(s).\nÉchecs :\n${erreurs.join('\n')}`)
      } else {
        alert(`${envoyes} convocation(s) envoyée(s) avec succès.`)
      }
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
  const isLocked = reunion.statut === 'terminee' || reunion.statut === 'annulee'
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
              onAjouterInterne={async (uid) => {
                await ajouterParticipantInterne(id, uid)
                await refreshParticipants()
              }}
              onAjouterExterne={async (nom, email) => {
                await ajouterParticipantExterne(id, nom, email)
                await refreshParticipants()
              }}
              onSupprimer={async (pid) => {
                setReunion((r) => r ? { ...r, participants: (r.participants ?? []).filter((p) => p.id !== pid) } : r)
                await supprimerParticipant(pid)
                await refreshParticipants()
              }}
              onChangerPresence={async (pid, statut: StatutParticipant) => {
                setReunion((r) => r ? {
                  ...r,
                  participants: (r.participants ?? []).map((p) => p.id === pid ? { ...p, statut_presence: statut } : p),
                } : r)
                await mettreAJourPresence(pid, statut)
                await refreshParticipants()
              }}
              onDefinirRole={async (pid, role: RoleSeance | null) => {
                if (role) {
                  setReunion((r) => r ? {
                    ...r,
                    participants: (r.participants ?? []).map((p) =>
                      p.id === pid ? { ...p, role_seance: role }
                      : p.role_seance === role ? { ...p, role_seance: null }
                      : p
                    ),
                  } : r)
                  await assignerRoleSeance(id, pid, role)
                } else {
                  const p = (reunion.participants ?? []).find((x) => x.id === pid)
                  if (p?.role_seance) {
                    setReunion((r) => r ? {
                      ...r,
                      participants: (r.participants ?? []).map((x) => x.id === pid ? { ...x, role_seance: null } : x),
                    } : r)
                    await assignerRoleSeance(id, null, p.role_seance)
                  }
                }
                await refreshParticipants()
              }}
              readOnly={!canEdit || isLocked}
            />
          )}

          {onglet === 'ordre_jour' && (
            <OrdreJourForm
              points={reunion.points ?? []}
              collaborateurs={collaborateurs}
              onAjouter={async (titre, desc, resp, duree) => {
                await ajouterPoint(id, { titre, description: desc, responsable_id: resp, duree_estimee: duree }, (reunion.points?.length ?? 0))
                await refreshPoints()
              }}
              onModifier={async (pid, updates) => {
                setReunion((r) => r ? { ...r, points: (r.points ?? []).map((p) => p.id === pid ? { ...p, ...updates } as ReunionPoint : p) } : r)
                await modifierPoint(pid, updates)
                await refreshPoints()
              }}
              onSupprimer={async (pid) => {
                setReunion((r) => r ? { ...r, points: (r.points ?? []).filter((p) => p.id !== pid) } : r)
                await supprimerPoint(pid)
                await refreshPoints()
              }}
              readOnly={!canEdit || isLocked}
            />
          )}

          {onglet === 'preparations' && utilisateur && (
            <PreparationBoard
              reunionId={id}
              utilisateurId={utilisateur.id}
              points={reunion.points ?? []}
              collaborateurs={collaborateurs}
              readOnly={(!isParticipant && !canEdit) || isLocked}
            />
          )}
        </div>
      </div>
    </div>
  )
}
