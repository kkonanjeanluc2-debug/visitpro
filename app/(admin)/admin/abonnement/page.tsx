'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Plan, Abonnement } from '@/types'
import { PLANS } from '@/types'
import { formatFcfa, formatDate } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joursRestants(dateFin: string | null | undefined): number | null {
  if (!dateFin) return null
  const fin = new Date(dateFin)
  fin.setHours(23, 59, 59, 999)
  const diff = fin.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function joursEcoules(dateDebut: string | null | undefined, dateFin: string | null | undefined): number {
  if (!dateDebut || !dateFin) return 0
  const debut = new Date(dateDebut)
  const fin = new Date(dateFin)
  const total = Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24))
  const ecoule = Math.ceil((Date.now() - debut.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(Math.max(ecoule, 0), total)
}

function dureeTotale(dateDebut: string | null | undefined, dateFin: string | null | undefined): number {
  if (!dateDebut || !dateFin) return 0
  const debut = new Date(dateDebut)
  const fin = new Date(dateFin)
  return Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24))
}

function couleurUrgence(jours: number | null) {
  if (jours === null) return { bar: 'bg-primary', text: 'text-primary', badge: 'bg-green-100 text-green-700', ring: 'ring-primary/20 border-primary/30' }
  if (jours <= 0)   return { bar: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-700', ring: 'ring-red-200 border-red-300' }
  if (jours <= 7)   return { bar: 'bg-red-400', text: 'text-red-600', badge: 'bg-red-100 text-red-700', ring: 'ring-red-200 border-red-200' }
  if (jours <= 30)  return { bar: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200 border-amber-200' }
  return { bar: 'bg-green-400', text: 'text-green-600', badge: 'bg-green-100 text-green-700', ring: 'ring-green-200 border-green-200' }
}

function libelleStatut(statut: string | undefined, jours: number | null) {
  if (jours !== null && jours <= 0) return 'Expiré'
  if (statut === 'essai') return 'Période d\'essai'
  if (statut === 'suspendu') return 'Suspendu'
  if (statut === 'expire') return 'Expiré'
  return 'Actif'
}

function iconeStatut(statut: string | undefined, jours: number | null) {
  if (jours !== null && jours <= 0 || statut === 'expire' || statut === 'suspendu') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AbonnementPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [loading, setLoading] = useState(true)
  const [paiementLoading, setPaiementLoading] = useState<Plan | null>(null)

  useEffect(() => {
    if (utilisateur?.entreprise_id) charger()
  }, [utilisateur?.entreprise_id])

  const charger = async () => {
    const { data } = await supabase
      .from('abonnements')
      .select('*')
      .eq('entreprise_id', utilisateur!.entreprise_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setAbonnement(data)
    setLoading(false)
  }

  const initialiserPaiement = async (plan: Plan) => {
    if (plan === 'starter') return
    setPaiementLoading(plan)
    try {
      const response = await fetch('/api/cinetpay-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initier_paiement', plan, entreprise_id: utilisateur!.entreprise_id }),
      })
      const data = await response.json()
      if (data.payment_url) window.open(data.payment_url, '_blank')
    } catch {
      alert('Erreur lors de l\'initialisation du paiement')
    } finally {
      setPaiementLoading(null)
    }
  }

  if (!utilisateur) return null

  const planActuelKey = (abonnement?.plan ?? utilisateur.entreprise?.plan ?? 'starter') as Plan
  const planActuel = PLANS[planActuelKey]

  // Date de fin : subscription ou essai
  const dateFin = abonnement?.date_fin ?? abonnement?.date_fin_essai ?? null
  const jours = joursRestants(dateFin)
  const couleur = couleurUrgence(jours)
  const statut = libelleStatut(abonnement?.statut, jours)
  const estStarter = planActuelKey === 'starter'

  const totalJours = dureeTotale(abonnement?.date_debut, dateFin)
  const joursUses = joursEcoules(abonnement?.date_debut, dateFin)
  const pourcentage = totalJours > 0 ? Math.min(100, Math.round((joursUses / totalJours) * 100)) : 0

  const plans = Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        {!loading && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${couleur.badge}`}>
            {iconeStatut(abonnement?.statut, jours)}
            {statut}
          </span>
        )}
      </div>

      {/* ── Carte plan actuel ── */}
      {!loading && (
        <div className={`rounded-2xl border ring-2 p-5 ${couleur.ring} bg-white`}>
          {/* Alerte expiration imminente */}
          {jours !== null && jours <= 7 && jours > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Renouvellement urgent</strong> — Votre abonnement expire dans {jours} jour{jours > 1 ? 's' : ''}.
              </span>
            </div>
          )}
          {jours !== null && jours <= 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span><strong>Abonnement expiré</strong> — Renouvelez pour continuer à utiliser toutes les fonctionnalités.</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            {/* Infos plan */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Plan actuel</p>
              <div className="flex items-center gap-3 mb-3">
                <h2 className={`text-2xl font-bold ${couleur.text}`}>{planActuel.nom}</h2>
                {!estStarter && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${couleur.badge}`}>
                    {statut}
                  </span>
                )}
              </div>

              {/* Prix */}
              <p className="text-sm text-gray-600">
                {planActuel.prix === 0
                  ? 'Gratuit — sans engagement'
                  : `${formatFcfa(planActuel.prix)} / mois`}
              </p>

              {/* Date d'expiration */}
              {dateFin && (
                <div className="mt-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-700">
                    {abonnement?.statut === 'essai' ? 'Essai jusqu\'au' : 'Expire le'}{' '}
                    <strong>{formatDate(dateFin)}</strong>
                  </span>
                </div>
              )}

              {/* Jours restants */}
              {jours !== null && jours > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-sm font-semibold ${couleur.text}`}>
                    {jours} jour{jours > 1 ? 's' : ''} restant{jours > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {estStarter && (
                <p className="mt-2 text-xs text-gray-400">
                  Plan gratuit — Passez au plan Pro ou Enterprise pour accéder à toutes les fonctionnalités.
                </p>
              )}
            </div>

            {/* Icône plan */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              planActuelKey === 'enterprise' ? 'bg-primary text-white' :
              planActuelKey === 'pro' ? 'bg-accent text-white' :
              'bg-gray-100 text-gray-500'
            }`}>
              {planActuelKey === 'enterprise' ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ) : planActuelKey === 'pro' ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </div>

          {/* Barre de progression (si dates connues) */}
          {totalJours > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{abonnement?.date_debut ? formatDate(abonnement.date_debut) : ''}</span>
                <span>{jours !== null && jours > 0 ? `${jours}j restants` : 'Expiré'}</span>
                <span>{dateFin ? formatDate(dateFin) : ''}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${couleur.bar}`}
                  style={{ width: `${pourcentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">{pourcentage}% de la période écoulée</p>
            </div>
          )}

          {/* Fonctionnalités incluses */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inclus dans ce plan</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { ok: true, label: `${planActuel.max_utilisateurs ?? '∞'} utilisateur(s)` },
                { ok: !planActuel.max_visites_mois, label: planActuel.max_visites_mois ? `${planActuel.max_visites_mois} visites/mois` : 'Visites illimitées' },
                { ok: planActuel.sms, label: 'Confirmations email' },
                { ok: planActuel.export_pdf, label: 'Export PDF' },
                { ok: planActuel.multi_sites, label: 'Multi-sites' },
              ].map(({ ok, label }) => (
                <div key={label} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                  <span className="font-bold">{ok ? '✓' : '✕'}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 p-8 animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-32 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-24 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </div>
      )}

      {/* ── Changer de plan ── */}
      <Card>
        <CardHeader>
          <CardTitle>Changer de plan</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(([planKey, plan]) => {
            const estActuel = planKey === planActuelKey
            const estPlusCher = plan.prix > planActuel.prix

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all
                  ${estActuel ? 'border-primary bg-primary/5 ring-2 ring-primary/20' :
                    planKey === 'pro' ? 'border-accent hover:border-accent/70' :
                    'border-gray-200 hover:border-gray-300'}`}
              >
                {planKey === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Recommandé
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900">{plan.nom}</h3>
                  <p className={`text-2xl font-bold mt-1 ${planKey === 'pro' ? 'text-accent' : 'text-primary'}`}>
                    {plan.prix === 0 ? 'Gratuit' : formatFcfa(plan.prix)}
                  </p>
                  {plan.prix > 0 && <p className="text-xs text-gray-400">/mois</p>}
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {[
                    { ok: true, label: `${plan.max_utilisateurs ?? '∞'} utilisateur(s)` },
                    { ok: !plan.max_visites_mois, label: plan.max_visites_mois ? `${plan.max_visites_mois} visites/mois` : 'Visites illimitées' },
                    { ok: plan.sms, label: 'Confirmations email' },
                    { ok: plan.export_pdf, label: 'Export PDF' },
                    { ok: plan.multi_sites, label: 'Multi-sites' },
                  ].map(({ ok, label }) => (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      <span className={ok ? 'text-accent font-bold' : 'text-gray-300'}>
                        {ok ? '✓' : '✕'}
                      </span>
                      <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                    </li>
                  ))}
                </ul>

                {estActuel ? (
                  <div className="w-full py-2 text-center text-xs font-bold text-primary bg-primary/10 rounded-xl">
                    Plan actuel
                  </div>
                ) : plan.prix === 0 ? (
                  <div className="w-full py-2 text-center text-xs text-gray-400">Plan de base</div>
                ) : (
                  <Button
                    fullWidth
                    variant={planKey === 'pro' ? 'accent' : 'primary'}
                    size="sm"
                    onClick={() => initialiserPaiement(planKey)}
                    loading={paiementLoading === planKey}
                  >
                    {estPlusCher ? 'Passer à ce plan' : 'Choisir ce plan'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Modes de paiement ── */}
      <Card>
        <CardHeader>
          <CardTitle>Modes de paiement acceptés</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-bold text-orange-600">Orange Money</span>
          <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-600">Wave CI</span>
          <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-600">MTN MoMo</span>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Paiements sécurisés via CinetPay ·{' '}
          <a href="mailto:support@visitpro.ci" className="underline hover:text-gray-600">support@visitpro.ci</a>
        </p>
      </Card>
    </div>
  )
}
