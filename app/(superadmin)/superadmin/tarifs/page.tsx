'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TarifPlan {
  plan: string
  prix_mensuel: number
  prix_annuel: number
}

const PLAN_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pro: {
    label: 'Pro',
    color: 'text-accent',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-primary',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
}

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(n).replace('XOF', 'F CFA').trim()
}

export default function TarifsPage() {
  const supabase = createClient()
  const [tarifs, setTarifs] = useState<TarifPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    charger()
  }, [])

  const charger = async () => {
    const { data } = await supabase
      .from('tarifs_plans')
      .select('*')
      .order('plan')
    setTarifs(data ?? [])
    setLoading(false)
  }

  const handleChange = (plan: string, champ: 'prix_mensuel' | 'prix_annuel', valeur: string) => {
    const n = parseInt(valeur.replace(/\D/g, ''), 10)
    setTarifs(prev => prev.map(t =>
      t.plan === plan ? { ...t, [champ]: isNaN(n) ? 0 : n } : t
    ))
  }

  const sauvegarder = async (plan: string) => {
    setError(null)
    setSuccess(null)
    setSaving(plan)
    const tarif = tarifs.find(t => t.plan === plan)
    if (!tarif) return

    const { error: err } = await supabase
      .from('tarifs_plans')
      .upsert({ plan: tarif.plan, prix_mensuel: tarif.prix_mensuel, prix_annuel: tarif.prix_annuel, updated_at: new Date().toISOString() })

    setSaving(null)
    if (err) {
      setError(`Erreur : ${err.message}`)
    } else {
      setSuccess(`Tarif ${PLAN_META[plan]?.label ?? plan} mis à jour`)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tarifs des plans</h1>
        <p className="text-gray-500 text-sm mt-1">
          Modifiez les montants mensuels et annuels de chaque plan. Les changements s&apos;affichent immédiatement sur la page d&apos;abonnement.
        </p>
      </div>

      {/* Toast */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {tarifs.map((tarif) => {
            const meta = PLAN_META[tarif.plan]
            if (!meta) return null
            const mensuelAnnuel = tarif.prix_annuel > 0 ? Math.round(tarif.prix_annuel / 12) : 0

            return (
              <div key={tarif.plan} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* En-tête plan */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tarif.plan === 'pro' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <h2 className={`font-bold text-gray-900`}>Plan {meta.label}</h2>
                    {mensuelAnnuel > 0 && (
                      <p className="text-xs text-gray-400">
                        Annuel équivaut à {formatFcfa(mensuelAnnuel)}/mois
                      </p>
                    )}
                  </div>
                </div>

                {/* Champs */}
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Mensuel */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Prix mensuel (F CFA)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={tarif.prix_mensuel}
                        onChange={(e) => handleChange(tarif.plan, 'prix_mensuel', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">F CFA</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatFcfa(tarif.prix_mensuel)} / mois</p>
                  </div>

                  {/* Annuel */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Prix annuel (F CFA)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={tarif.prix_annuel}
                        onChange={(e) => handleChange(tarif.plan, 'prix_annuel', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">F CFA</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatFcfa(tarif.prix_annuel)} / an</p>
                  </div>
                </div>

                {/* Bouton */}
                <div className="px-6 pb-5 flex justify-end">
                  <button
                    onClick={() => sauvegarder(tarif.plan)}
                    disabled={saving === tarif.plan}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                      ${tarif.plan === 'pro'
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-primary text-white hover:bg-primary/90'
                      } disabled:opacity-60`}
                  >
                    {saving === tarif.plan ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {saving === tarif.plan ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note */}
      <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700">
          Les modifications s&apos;appliquent immédiatement à la page d&apos;abonnement des entreprises. Les abonnements existants ne sont pas affectés.
        </p>
      </div>
    </div>
  )
}
