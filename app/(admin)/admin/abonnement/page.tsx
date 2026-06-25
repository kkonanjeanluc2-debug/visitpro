'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Plan, Abonnement } from '@/types'
import { PLANS } from '@/types'
import { formatFcfa, formatDate } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function joursRestants(dateFin: string | null | undefined): number | null {
  if (!dateFin) return null
  const fin = new Date(dateFin)
  fin.setHours(23, 59, 59, 999)
  return Math.ceil((fin.getTime() - Date.now()) / 86400000)
}
function joursEcoules(debut?: string | null, fin?: string | null) {
  if (!debut || !fin) return 0
  return Math.min(Math.max(Math.ceil((Date.now() - new Date(debut).getTime()) / 86400000), 0),
    Math.ceil((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000))
}
function dureeTotale(debut?: string | null, fin?: string | null) {
  if (!debut || !fin) return 0
  return Math.ceil((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000)
}

function couleurUrgence(jours: number | null) {
  if (jours === null) return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-100 text-green-700', border: 'border-green-200' }
  if (jours <= 0)    return { bar: 'bg-red-500',   text: 'text-red-600',   badge: 'bg-red-100 text-red-700',     border: 'border-red-300' }
  if (jours <= 7)    return { bar: 'bg-red-400',   text: 'text-red-600',   badge: 'bg-red-100 text-red-700',     border: 'border-red-200' }
  if (jours <= 30)   return { bar: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' }
  return { bar: 'bg-green-400', text: 'text-green-600', badge: 'bg-green-100 text-green-700', border: 'border-green-200' }
}

function libelleStatut(statut: string | undefined, jours: number | null) {
  if (jours !== null && jours <= 0) return 'Expiré'
  if (statut === 'essai')    return "Période d'essai"
  if (statut === 'suspendu') return 'Suspendu'
  if (statut === 'expire')   return 'Expiré'
  return 'Actif'
}

// ─── Features definies pour l'affichage ─────────────────────────────────────

type Feature = { label: string; key: keyof typeof PLANS.pro | 'utilisateurs' | 'visites' }

const FEATURES: { label: string; proVal: string | boolean; enterpriseVal: string | boolean }[] = [
  { label: 'Utilisateurs',             proVal: '5',            enterpriseVal: 'Illimités' },
  { label: 'Visites / mois',           proVal: 'Illimitées',   enterpriseVal: 'Illimitées' },
  { label: 'Badge visiteur numérique', proVal: true,           enterpriseVal: true },
  { label: 'Notifications temps réel', proVal: true,           enterpriseVal: true },
  { label: 'Agenda rendez-vous',        proVal: true,           enterpriseVal: true },
  { label: 'Rapports & Export PDF',     proVal: true,           enterpriseVal: true },
  { label: "Écran d'accueil",           proVal: true,           enterpriseVal: true },
  { label: 'Liste noire / Sécurité',    proVal: true,           enterpriseVal: true },
  { label: 'Messagerie interne',        proVal: false,          enterpriseVal: true },
  { label: 'Multi-sites',               proVal: false,          enterpriseVal: true },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AbonnementPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [loading, setLoading] = useState(true)
  const [paiementLoading, setPaiementLoading] = useState<Plan | null>(null)
  const [facturation, setFacturation] = useState<'mensuel' | 'annuel'>('mensuel')

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
      const response = await fetch('/api/geniuspay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initier_paiement', plan, entreprise_id: utilisateur!.entreprise_id, facturation }),
      })
      const data = await response.json()
      if (data.payment_url) window.open(data.payment_url, '_blank')
    } catch {
      alert("Erreur lors de l'initialisation du paiement")
    } finally {
      setPaiementLoading(null)
    }
  }

  if (!utilisateur) return null

  const planActuelKey = (abonnement?.plan ?? utilisateur.entreprise?.plan ?? 'starter') as Plan
  const planActuel = PLANS[planActuelKey]
  const dateFin = abonnement?.date_fin ?? abonnement?.date_fin_essai ?? null
  const jours = joursRestants(dateFin)
  const couleur = couleurUrgence(jours)
  const statut = libelleStatut(abonnement?.statut, jours)
  const totalJours = dureeTotale(abonnement?.date_debut, dateFin)
  const joursUses = joursEcoules(abonnement?.date_debut, dateFin)
  const pourcentage = totalJours > 0 ? Math.min(100, Math.round((joursUses / totalJours) * 100)) : 0

  const prixAffiche = (plan: typeof PLANS.pro) =>
    facturation === 'annuel' && plan.prix_annuel
      ? Math.round(plan.prix_annuel / 12)
      : plan.prix

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-500 mt-1">Gérez votre plan et vos options de facturation</p>
      </div>

      {/* ── Plan actuel ── */}
      {!loading && (
        <div className={`rounded-2xl border-2 p-6 bg-white ${couleur.border}`}>
          {jours !== null && jours <= 7 && jours > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><strong>Renouvellement urgent</strong> — Expire dans {jours} jour{jours > 1 ? 's' : ''}.</span>
            </div>
          )}
          {jours !== null && jours <= 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span><strong>Abonnement expiré</strong> — Renouvelez pour continuer.</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Plan actuel</p>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{planActuel.nom}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${couleur.badge}`}>{statut}</span>
              </div>
              <p className="text-sm text-gray-500">{planActuel.tagline}</p>

              {planActuel.prix > 0 && (
                <p className="mt-2 text-lg font-bold text-primary">
                  {formatFcfa(planActuel.prix)} <span className="text-sm font-normal text-gray-400">/ mois</span>
                </p>
              )}

              {dateFin && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {abonnement?.statut === 'essai' ? "Essai jusqu'au" : 'Expire le'}{' '}
                  <strong>{formatDate(dateFin)}</strong>
                  {jours !== null && jours > 0 && (
                    <span className={`ml-1 font-semibold ${couleur.text}`}>({jours}j restants)</span>
                  )}
                </div>
              )}
            </div>

            {/* Icône plan */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              planActuelKey === 'enterprise' ? 'bg-primary text-white' :
              planActuelKey === 'pro'        ? 'bg-accent text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {planActuelKey === 'enterprise' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ) : planActuelKey === 'pro' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          {totalJours > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{abonnement?.date_debut ? formatDate(abonnement.date_debut) : ''}</span>
                <span>{pourcentage}% écoulé</span>
                <span>{dateFin ? formatDate(dateFin) : ''}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${couleur.bar}`} style={{ width: `${pourcentage}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 p-8 animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-32 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-24 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </div>
      )}

      {/* ── Choisir un plan ── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choisir un plan</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tous les plans incluent 14 jours d'essai gratuit</p>
          </div>

          {/* Toggle mensuel / annuel */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setFacturation('mensuel')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${facturation === 'mensuel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setFacturation('annuel')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${facturation === 'annuel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annuel
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">-15%</span>
            </button>
          </div>
        </div>

        {/* Cartes Pro + Enterprise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['pro', 'enterprise'] as Plan[]).map((planKey) => {
            const plan = PLANS[planKey]
            const estActuel = planKey === planActuelKey
            const isPro = planKey === 'pro'
            const prix = prixAffiche(plan)

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border-2 flex flex-col overflow-hidden transition-all
                  ${estActuel
                    ? 'border-primary shadow-lg shadow-primary/10'
                    : isPro
                      ? 'border-accent shadow-lg shadow-accent/10 hover:shadow-accent/20'
                      : 'border-primary/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10'
                  }`}
              >
                {/* Badge recommandé */}
                {isPro && !estActuel && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-xl">
                    Recommandé
                  </div>
                )}
                {estActuel && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-xl">
                    Plan actuel
                  </div>
                )}

                {/* Header coloré */}
                <div className={`px-6 pt-6 pb-5 ${isPro ? 'bg-accent/5' : 'bg-primary/5'}`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${isPro ? 'bg-accent text-white' : 'bg-primary text-white'}`}>
                    {isPro ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.nom}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.tagline}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${isPro ? 'text-accent' : 'text-primary'}`}>
                      {formatFcfa(prix)}
                    </span>
                    <span className="text-gray-400 text-sm mb-1">/mois</span>
                  </div>
                  {facturation === 'annuel' && plan.prix_annuel && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      Facturé {formatFcfa(plan.prix_annuel)}/an — économisez {formatFcfa((plan.prix * 12) - plan.prix_annuel)}
                    </p>
                  )}
                  {facturation === 'mensuel' && (
                    <p className="text-xs text-gray-400 mt-1">ou {formatFcfa(plan.prix_annuel ? Math.round(plan.prix_annuel / 12) : 0)}/mois en annuel</p>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 px-6 py-5 space-y-2.5">
                  {FEATURES.map(({ label, proVal, enterpriseVal }) => {
                    const val = isPro ? proVal : enterpriseVal
                    const ok = val !== false
                    return (
                      <div key={label} className="flex items-center gap-3">
                        {ok ? (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-accent/10' : 'bg-primary/10'}`}>
                            <svg className={`w-3 h-3 ${isPro ? 'text-accent' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-sm ${ok ? 'text-gray-700' : 'text-gray-300'}`}>
                          {label}
                          {ok && typeof val === 'string' && val !== 'true' && (
                            <span className={`ml-1 font-semibold ${isPro ? 'text-accent' : 'text-primary'}`}>— {val}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  {estActuel ? (
                    <div className={`w-full py-3 text-center text-sm font-bold rounded-xl ${isPro ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                      ✓ Plan actuel
                    </div>
                  ) : (
                    <button
                      onClick={() => initialiserPaiement(planKey)}
                      disabled={paiementLoading === planKey}
                      className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-sm
                        ${isPro ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90'}`}
                    >
                      {paiementLoading === planKey ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Redirection…
                        </span>
                      ) : (
                        `Choisir ${plan.nom}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Paiement ── */}
      <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-3">Modes de paiement acceptés</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Orange Money', color: 'text-orange-600 bg-orange-50 border-orange-200' },
            { label: 'Wave CI',      color: 'text-blue-600 bg-blue-50 border-blue-200' },
            { label: 'MTN MoMo',    color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { label: 'Moov Money',  color: 'text-green-600 bg-green-50 border-green-200' },
          ].map(({ label, color }) => (
            <span key={label} className={`px-3 py-1.5 border rounded-lg text-xs font-bold ${color}`}>{label}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Paiements 100% sécurisés via GeniusPay ·{' '}
          <a href="mailto:support@visitpro.ci" className="underline hover:text-gray-600">support@visitpro.ci</a>
        </p>
      </div>
    </div>
  )
}
