'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Entreprise, Abonnement, Utilisateur, Plan, StatutAbonnement } from '@/types'

async function expireTrials(): Promise<{ count: number }> {
  const res = await fetch('/api/cron/expire-trials?superadmin=1')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const PLANS_INFO = {
  starter: { label: 'Starter', prix: 0, color: 'bg-gray-100 text-gray-700 border border-gray-200' },
  pro: { label: 'Pro', prix: 20000, color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  enterprise: { label: 'Enterprise', prix: 45000, color: 'bg-purple-100 text-purple-700 border border-purple-200' },
}

const STATUT_COLORS: Record<StatutAbonnement, string> = {
  actif: 'bg-green-100 text-green-700',
  essai: 'bg-amber-100 text-amber-700',
  expire: 'bg-red-100 text-red-700',
  suspendu: 'bg-gray-100 text-gray-500',
}

const STATUT_LABELS: Record<StatutAbonnement, string> = {
  actif: 'Actif',
  essai: 'Essai',
  expire: 'Expiré',
  suspendu: 'Suspendu',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )
}

export default function EntrepriseDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)

  // Modal abonnement
  const [modalOuvert, setModalOuvert] = useState(false)
  const [modalPlan, setModalPlan] = useState<Plan>('starter')
  const [modalStatut, setModalStatut] = useState<StatutAbonnement>('actif')
  const [modalDuree, setModalDuree] = useState<number>(1)
  const [modalEssaiJours, setModalEssaiJours] = useState<number>(0)
  const [modalMontant, setModalMontant] = useState<number>(0)
  const [modalNotes, setModalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Réinitialisation données
  const [resetOuvert, setResetOuvert] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Expiration manuelle essais
  const [expirationLoading, setExpirationLoading] = useState(false)
  const [expirationMsg, setExpirationMsg] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ent }, { data: abon }, { data: users }] = await Promise.all([
        supabase.from('entreprises').select('*').eq('id', id).single(),
        supabase.from('abonnements').select('*, attribue_par_user:attribue_par(prenom,nom)').eq('entreprise_id', id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('utilisateurs').select('*').eq('entreprise_id', id).order('created_at', { ascending: false }),
      ])
      setEntreprise(ent)
      setAbonnement(abon)
      setUtilisateurs(users ?? [])
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => { charger() }, [charger])

  const ouvrirModal = () => {
    if (abonnement) {
      setModalPlan(abonnement.plan)
      setModalStatut(abonnement.statut)
      setModalDuree(abonnement.duree_mois ?? 1)
      setModalEssaiJours(abonnement.essai_jours ?? 0)
      setModalMontant(abonnement.montant ?? 0)
      setModalNotes(abonnement.notes ?? '')
    } else {
      setModalPlan('starter')
      setModalStatut('actif')
      setModalDuree(1)
      setModalEssaiJours(0)
      setModalMontant(0)
      setModalNotes('')
    }
    setSaveError(null)
    setModalOuvert(true)
  }

  const calculerDateFin = (statut: StatutAbonnement, duree: number, essaiJours: number): string => {
    const d = new Date()
    if (statut === 'essai') {
      d.setDate(d.getDate() + essaiJours)
    } else {
      d.setMonth(d.getMonth() + duree)
    }
    return d.toISOString()
  }

  const lancerExpiration = async () => {
    setExpirationLoading(true)
    setExpirationMsg(null)
    try {
      const res = await expireTrials()
      setExpirationMsg(res.count === 0
        ? 'Aucun essai expiré à traiter.'
        : `${res.count} abonnement(s) expiré(s) — comptes désactivés.`)
    } catch {
      setExpirationMsg('Erreur lors de la vérification.')
    } finally {
      setExpirationLoading(false)
      charger()
    }
  }

  const resetDonnees = async () => {
    setResetError(null)
    setResetting(true)
    try {
      // Supprimer dans l'ordre pour respecter les FK (messages → visites → visiteurs/rdv)
      await Promise.all([
        supabase.from('messages_visite').delete().eq('entreprise_id', id),
        supabase.from('notifications').delete().eq('entreprise_id', id),
      ])
      await supabase.from('visites').delete().eq('entreprise_id', id)
      await Promise.all([
        supabase.from('visiteurs').delete().eq('entreprise_id', id),
        supabase.from('rendez_vous').delete().eq('entreprise_id', id),
        supabase.from('liste_noire').delete().eq('entreprise_id', id),
      ])
      setResetOuvert(false)
      setResetConfirm('')
      charger()
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setResetting(false)
    }
  }

  const sauvegarder = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dateFin = calculerDateFin(modalStatut, modalDuree, modalEssaiJours)

      const payload = {
        entreprise_id: id,
        plan: modalPlan,
        statut: modalStatut,
        duree_mois: modalStatut !== 'essai' ? modalDuree : null,
        essai_jours: modalStatut === 'essai' ? modalEssaiJours : null,
        date_fin: modalStatut !== 'essai' ? dateFin : null,
        date_fin_essai: modalStatut === 'essai' ? dateFin : null,
        montant: modalMontant,
        notes: modalNotes || null,
        attribue_par: user?.id,
        date_debut: abonnement?.date_debut ?? new Date().toISOString(),
      }

      let error
      if (abonnement) {
        const res = await supabase.from('abonnements').update(payload).eq('id', abonnement.id)
        error = res.error
      } else {
        const res = await supabase.from('abonnements').insert(payload)
        error = res.error
      }

      if (error) { setSaveError(error.message); return }

      // Sync plan on entreprise
      await supabase.from('entreprises').update({ plan: modalPlan }).eq('id', id)

      setModalOuvert(false)
      charger()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!entreprise) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Entreprise introuvable.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-accent hover:underline">← Retour</button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Retour */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux entreprises
      </button>

      {/* Header entreprise */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500 flex-shrink-0">
            {entreprise.nom[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entreprise.nom}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Inscrite le {new Date(entreprise.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={ouvrirModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {abonnement ? "Modifier l'abonnement" : "Attribuer un abonnement"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche: infos entreprise */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide text-gray-400">Informations</h2>
            <InfoRow label="Nom" value={entreprise.nom} />
            <InfoRow label="Secteur" value={entreprise.secteur} />
            <InfoRow label="Email" value={entreprise.email} />
            <InfoRow label="Téléphone" value={entreprise.telephone} />
            <InfoRow label="Adresse" value={entreprise.adresse} />
            <div className="flex items-start gap-4 py-3">
              <span className="text-xs text-gray-400 font-medium w-36 flex-shrink-0 pt-0.5">Plan actuel</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLANS_INFO[entreprise.plan].color}`}>
                {entreprise.plan}
              </span>
            </div>
          </div>

          {/* Abonnement actuel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-3">Abonnement</h2>
            {abonnement ? (
              <div className="space-y-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLANS_INFO[abonnement.plan].color}`}>
                    {abonnement.plan}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[abonnement.statut]}`}>
                    {STATUT_LABELS[abonnement.statut]}
                  </span>
                </div>
                <InfoRow label="Début" value={new Date(abonnement.date_debut).toLocaleDateString('fr-FR')} />
                {abonnement.date_fin && <InfoRow label="Expiration" value={new Date(abonnement.date_fin).toLocaleDateString('fr-FR')} />}
                {abonnement.date_fin_essai && <InfoRow label="Fin essai" value={new Date(abonnement.date_fin_essai).toLocaleDateString('fr-FR')} />}
                {abonnement.duree_mois && <InfoRow label="Durée" value={`${abonnement.duree_mois} mois`} />}
                {abonnement.essai_jours && <InfoRow label="Essai" value={`${abonnement.essai_jours} jours`} />}
                {abonnement.montant != null && abonnement.montant > 0 && (
                  <InfoRow label="Montant" value={`${abonnement.montant.toLocaleString('fr-FR')} FCFA`} />
                )}
                {abonnement.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{abonnement.notes}</p>
                  </div>
                )}
                {abonnement.attribue_par_user && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                      Attribué par{' '}
                      <span className="font-medium text-gray-600">
                        {(abonnement.attribue_par_user as unknown as { prenom: string; nom: string }).prenom}{' '}
                        {(abonnement.attribue_par_user as unknown as { prenom: string; nom: string }).nom}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <p className="text-sm">Aucun abonnement</p>
                <button onClick={ouvrirModal} className="mt-2 text-xs text-accent hover:underline">Attribuer →</button>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite: utilisateurs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Utilisateurs</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{utilisateurs.length}</span>
            </div>
            {utilisateurs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Aucun utilisateur
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {utilisateurs.map((u) => (
                  <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-400">{u.poste ?? u.role}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${u.role === 'patron' ? 'bg-purple-50 text-purple-600' :
                          u.role === 'admin' ? 'bg-red-50 text-red-600' :
                          u.role === 'secretaire' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-500'}`}>
                        {u.role === 'patron' ? 'Administrateur' : u.role === 'secretaire' ? 'Secrétaire' : u.role}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${u.actif ? 'bg-green-400' : 'bg-gray-300'}`} title={u.actif ? 'Actif' : 'Inactif'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="mt-8 border border-red-200 rounded-2xl p-5 bg-red-50/40">
        <h2 className="font-semibold text-red-700 text-sm uppercase tracking-wide mb-1">Zone dangereuse</h2>
        <p className="text-xs text-red-500 mb-4">Ces actions sont irréversibles. Procéder avec précaution.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setResetOuvert(true); setResetConfirm(''); setResetError(null) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Réinitialiser les données
          </button>
          <button
            onClick={lancerExpiration}
            disabled={expirationLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            {expirationLoading
              ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            }
            Vérifier essais expirés
          </button>
        </div>
        {expirationMsg && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{expirationMsg}</p>
        )}
      </div>

      {/* Modal réinitialisation */}
      {resetOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !resetting && setResetOuvert(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-900">Réinitialiser les données</h3>
                <p className="text-xs text-red-500">Action irréversible</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Ceci supprimera définitivement <strong>toutes les visites, visiteurs, rendez-vous, notifications et messages</strong> de <strong>{entreprise.nom}</strong>.
              </p>
              <p className="text-sm text-gray-600">Les comptes utilisateurs et l'abonnement resteront intacts.</p>
              {resetError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{resetError}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Tapez <span className="font-bold text-gray-700">{entreprise.nom}</span> pour confirmer
                </label>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  placeholder={entreprise.nom}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setResetOuvert(false)}
                disabled={resetting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={resetDonnees}
                disabled={resetting || resetConfirm !== entreprise.nom}
                className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {resetting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {resetting ? 'Suppression...' : 'Supprimer les données'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal abonnement */}
      {modalOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOuvert(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">
                {abonnement ? "Modifier l'abonnement" : "Attribuer un abonnement"}
              </h3>
              <button onClick={() => setModalOuvert(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{saveError}</div>
              )}

              {/* Sélection du plan */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['starter', 'pro', 'enterprise'] as Plan[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setModalPlan(p)
                        setModalMontant(PLANS_INFO[p].prix)
                      }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize
                        ${modalPlan === p
                          ? p === 'starter' ? 'border-gray-500 bg-gray-50 text-gray-700'
                            : p === 'pro' ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                    >
                      {p}
                      <span className="block text-[10px] font-normal mt-0.5 opacity-70">
                        {PLANS_INFO[p].prix === 0 ? 'Gratuit' : `${PLANS_INFO[p].prix.toLocaleString('fr-FR')} F`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Statut</label>
                <select
                  value={modalStatut}
                  onChange={e => setModalStatut(e.target.value as StatutAbonnement)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
                >
                  <option value="actif">Actif</option>
                  <option value="essai">Essai</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="expire">Expiré</option>
                </select>
              </div>

              {/* Durée ou Jours d'essai */}
              {modalStatut === 'essai' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Durée de l'essai (jours)</label>
                  <div className="flex gap-2">
                    {[7, 14, 30].map(j => (
                      <button key={j} type="button" onClick={() => setModalEssaiJours(j)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${modalEssaiJours === j ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        {j} jours
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={modalEssaiJours}
                    onChange={e => setModalEssaiJours(Number(e.target.value))}
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Nombre de jours personnalisé"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Durée (mois)</label>
                  <div className="flex gap-2 mb-2">
                    {[1, 3, 6, 12].map(m => (
                      <button key={m} type="button" onClick={() => setModalDuree(m)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${modalDuree === m ? 'border-accent bg-accent/5 text-accent' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        {m}M
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={modalDuree}
                    onChange={e => setModalDuree(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Durée personnalisée"
                  />
                </div>
              )}

              {/* Montant */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Montant (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={modalMontant}
                  onChange={e => setModalMontant(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes internes</label>
                <textarea
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  placeholder="Remarques, conditions particulières..."
                />
              </div>

              {/* Date de fin calculée */}
              {(modalStatut === 'actif' || modalStatut === 'essai') && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Expiration calculée : </span>
                  {new Date(calculerDateFin(modalStatut, modalDuree, modalEssaiJours)).toLocaleDateString('fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setModalOuvert(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={sauvegarder}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}
