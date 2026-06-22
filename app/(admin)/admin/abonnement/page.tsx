'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Plan, Abonnement } from '@/types'
import { PLANS } from '@/types'
import { formatFcfa, formatDate } from '@/lib/utils'

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
      .eq('statut', 'actif')
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
        body: JSON.stringify({
          action: 'initier_paiement',
          plan,
          entreprise_id: utilisateur!.entreprise_id,
        }),
      })

      const data = await response.json()
      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
      }
    } catch {
      alert('Erreur lors de l\'initialisation du paiement')
    } finally {
      setPaiementLoading(null)
    }
  }

  if (!utilisateur) return null

  const planActuel = (abonnement?.plan ?? utilisateur.entreprise?.plan ?? 'starter') as Plan
  const plans = Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Abonnement</h1>

      {/* Abonnement actuel */}
      {abonnement && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Plan actuel</p>
              <p className="text-xl font-bold text-primary">{PLANS[planActuel].nom}</p>
              {abonnement.date_fin && (
                <p className="text-sm text-gray-500 mt-1">
                  Expire le {formatDate(abonnement.date_fin)}
                </p>
              )}
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
              Actif
            </span>
          </div>
        </Card>
      )}

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(([planKey, plan]) => {
          const estActuel = planKey === planActuel
          const estPlusCher = plan.prix > PLANS[planActuel].prix

          return (
            <Card
              key={planKey}
              className={`relative ${estActuel ? 'border-primary ring-2 ring-primary/20' : planKey === 'pro' ? 'border-accent' : ''}`}
            >
              {planKey === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommandé
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.nom}</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  {plan.prix === 0 ? 'Gratuit' : formatFcfa(plan.prix)}
                </p>
                {plan.prix > 0 && <p className="text-sm text-gray-500">/mois</p>}
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-accent">✓</span>
                  <span>{plan.max_utilisateurs ?? 'Illimité'} utilisateur(s)</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={plan.max_visites_mois ? 'text-gray-400' : 'text-accent'}>
                    {plan.max_visites_mois ? '—' : '✓'}
                  </span>
                  <span>{plan.max_visites_mois ? `${plan.max_visites_mois} visites/mois` : 'Visites illimitées'}</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={plan.sms ? 'text-accent' : 'text-gray-300'}>
                    {plan.sms ? '✓' : '✕'}
                  </span>
                  <span className={plan.sms ? '' : 'text-gray-400'}>Confirmations SMS</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={plan.export_pdf ? 'text-accent' : 'text-gray-300'}>
                    {plan.export_pdf ? '✓' : '✕'}
                  </span>
                  <span className={plan.export_pdf ? '' : 'text-gray-400'}>Export PDF</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={plan.multi_sites ? 'text-accent' : 'text-gray-300'}>
                    {plan.multi_sites ? '✓' : '✕'}
                  </span>
                  <span className={plan.multi_sites ? '' : 'text-gray-400'}>Multi-sites</span>
                </li>
              </ul>

              {estActuel ? (
                <div className="w-full py-2.5 text-center text-sm font-semibold text-primary bg-primary/10 rounded-xl">
                  Plan actuel
                </div>
              ) : plan.prix === 0 ? (
                <div className="w-full py-2.5 text-center text-sm text-gray-400">
                  Plan de base
                </div>
              ) : (
                <Button
                  fullWidth
                  variant={planKey === 'pro' ? 'accent' : 'primary'}
                  onClick={() => initialiserPaiement(planKey)}
                  loading={paiementLoading === planKey}
                >
                  {estPlusCher ? 'Passer à ce plan' : 'Choisir ce plan'}
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Méthodes paiement */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Modes de paiement acceptés</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-orange-600 font-bold">Orange</span>
            <span className="text-orange-500 text-sm">Money</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-600 font-bold">Wave</span>
            <span className="text-blue-500 text-sm">CI</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-purple-600 font-bold">MTN</span>
            <span className="text-purple-500 text-sm">MoMo</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Paiements sécurisés via CinetPay. Support: support@visitpro.ci
        </p>
      </Card>
    </div>
  )
}
