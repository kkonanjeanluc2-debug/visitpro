'use client'

import { useEffect, useState, useCallback } from 'react'

type Fonctionnalite = {
  slug: string
  label: string
  description: string
  ordre: number
}

type PlanFonct = {
  plan: string
  fonctionnalite_slug: string
  actif: boolean
}

type EntrepriseFonct = {
  entreprise_id: string
  fonctionnalite_slug: string
  actif: boolean
}

type Entreprise = {
  id: string
  nom: string
  plan: string
}

const PLANS = ['starter', 'pro', 'essai', 'enterprise']
const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  essai: 'Essai',
  enterprise: 'Enterprise',
}

export default function FontionnalitesPage() {
  const [tab, setTab] = useState<'plan' | 'entreprise'>('plan')
  const [fonctionnalites, setFonctionnalites] = useState<Fonctionnalite[]>([])
  const [planFoncts, setPlanFoncts] = useState<PlanFonct[]>([])
  const [entFoncts, setEntFoncts] = useState<EntrepriseFonct[]>([])
  const [entreprises, setEntreprises] = useState<Entreprise[]>([])
  const [selectedEnt, setSelectedEnt] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string>('')

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/fonctionnalites')
      const data = await res.json()
      setFonctionnalites(data.fonctionnalites ?? [])
      setPlanFoncts(data.plan_fonctionnalites ?? [])
      setEntFoncts(data.entreprise_fonctionnalites ?? [])
      setEntreprises(data.entreprises ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  // ── Par plan ──────────────────────────────────────────────────────────────

  const getPlanActif = (plan: string, slug: string) =>
    planFoncts.find(p => p.plan === plan && p.fonctionnalite_slug === slug)?.actif ?? false

  const togglePlan = async (plan: string, slug: string, actif: boolean) => {
    const key = `${plan}-${slug}`
    setSaving(key)
    await fetch('/api/superadmin/fonctionnalites/plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, fonctionnalite_slug: slug, actif }),
    })
    setPlanFoncts(prev => {
      const exists = prev.find(p => p.plan === plan && p.fonctionnalite_slug === slug)
      if (exists) return prev.map(p => p.plan === plan && p.fonctionnalite_slug === slug ? { ...p, actif } : p)
      return [...prev, { plan, fonctionnalite_slug: slug, actif }]
    })
    setSaving('')
  }

  // ── Par entreprise ────────────────────────────────────────────────────────

  const getOverride = (entId: string, slug: string): boolean | null => {
    const ov = entFoncts.find(e => e.entreprise_id === entId && e.fonctionnalite_slug === slug)
    return ov ? ov.actif : null
  }

  const getEffectif = (entId: string, slug: string): boolean => {
    const ov = getOverride(entId, slug)
    if (ov !== null) return ov
    const plan = entreprises.find(e => e.id === entId)?.plan ?? 'starter'
    return getPlanActif(plan, slug)
  }

  const toggleEntreprise = async (entId: string, slug: string) => {
    const currentEffectif = getEffectif(entId, slug)
    const key = `ent-${entId}-${slug}`
    setSaving(key)
    const newActif = !currentEffectif
    await fetch('/api/superadmin/fonctionnalites/entreprise', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entreprise_id: entId, fonctionnalite_slug: slug, actif: newActif }),
    })
    setEntFoncts(prev => {
      const exists = prev.find(e => e.entreprise_id === entId && e.fonctionnalite_slug === slug)
      if (exists) return prev.map(e => e.entreprise_id === entId && e.fonctionnalite_slug === slug ? { ...e, actif: newActif } : e)
      return [...prev, { entreprise_id: entId, fonctionnalite_slug: slug, actif: newActif }]
    })
    setSaving('')
  }

  const resetEntreprise = async (entId: string, slug: string) => {
    const key = `reset-${entId}-${slug}`
    setSaving(key)
    await fetch('/api/superadmin/fonctionnalites/entreprise', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entreprise_id: entId, fonctionnalite_slug: slug }),
    })
    setEntFoncts(prev => prev.filter(e => !(e.entreprise_id === entId && e.fonctionnalite_slug === slug)))
    setSaving('')
  }

  const entreprisesFiltrees = entreprises.filter(e =>
    e.nom.toLowerCase().includes(search.toLowerCase())
  )
  const entSelectionnee = entreprises.find(e => e.id === selectedEnt)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fonctionnalités</h1>
        <p className="text-sm text-gray-500 mt-1">Activez ou désactivez les modules par plan ou pour une entreprise spécifique</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {(['plan', 'entreprise'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'plan' ? 'Par plan' : 'Par entreprise'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'plan' ? (
        /* ── Vue Par plan ─────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-gray-500 font-medium w-64">Fonctionnalité</th>
                {PLANS.map(plan => (
                  <th key={plan} className="px-6 py-4 text-center text-gray-700 font-semibold">
                    {PLAN_LABELS[plan]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fonctionnalites.map(f => (
                <tr key={f.slug} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{f.label}</p>
                    {f.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                    )}
                  </td>
                  {PLANS.map(plan => {
                    const actif = getPlanActif(plan, f.slug)
                    const key = `${plan}-${f.slug}`
                    const isSaving = saving === key
                    return (
                      <td key={plan} className="px-6 py-4 text-center">
                        <button
                          onClick={() => togglePlan(plan, f.slug, !actif)}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            actif ? 'bg-blue-600' : 'bg-gray-200'
                          } ${isSaving ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              actif ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Vue Par entreprise ───────────────────────────────────────────── */
        <div className="flex gap-6">
          {/* Liste entreprises */}
          <div className="w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Rechercher une entreprise…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto max-h-[60vh]">
              {entreprisesFiltrees.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Aucune entreprise trouvée</p>
              )}
              {entreprisesFiltrees.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEnt(e.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    selectedEnt === e.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${selectedEnt === e.id ? 'text-blue-700' : 'text-gray-900'}`}>{e.nom}</p>
                  <span className="text-[11px] text-gray-400 capitalize">{e.plan}</span>
                  {/* Indicateur nb overrides */}
                  {(() => {
                    const nb = entFoncts.filter(ef => ef.entreprise_id === e.id).length
                    return nb > 0 ? (
                      <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {nb} override{nb > 1 ? 's' : ''}
                      </span>
                    ) : null
                  })()}
                </button>
              ))}
            </div>
          </div>

          {/* Détail entreprise */}
          <div className="flex-1">
            {!selectedEnt ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-64">
                <p className="text-sm text-gray-400">Sélectionnez une entreprise</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{entSelectionnee?.nom}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Plan : <span className="capitalize font-medium text-gray-600">{entSelectionnee?.plan}</span>
                    </p>
                  </div>
                  {entFoncts.filter(e => e.entreprise_id === selectedEnt).length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                      {entFoncts.filter(e => e.entreprise_id === selectedEnt).length} override(s) actif(s)
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-50">
                  {fonctionnalites.map(f => {
                    const override = getOverride(selectedEnt, f.slug)
                    const effectif = getEffectif(selectedEnt, f.slug)
                    const planDefault = getPlanActif(entSelectionnee?.plan ?? 'starter', f.slug)
                    const hasOverride = override !== null
                    const keyToggle = `ent-${selectedEnt}-${f.slug}`
                    const keyReset = `reset-${selectedEnt}-${f.slug}`

                    return (
                      <div key={f.slug} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">{f.label}</p>
                            {hasOverride ? (
                              <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">Override</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Défaut plan</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                          {hasOverride && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Défaut plan : <span className={planDefault ? 'text-green-600' : 'text-red-500'}>{planDefault ? 'Activé' : 'Désactivé'}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {hasOverride && (
                            <button
                              onClick={() => resetEntreprise(selectedEnt, f.slug)}
                              disabled={saving === keyReset}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
                            >
                              Réinitialiser
                            </button>
                          )}
                          <button
                            onClick={() => toggleEntreprise(selectedEnt, f.slug)}
                            disabled={saving === keyToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              effectif ? 'bg-blue-600' : 'bg-gray-200'
                            } ${saving === keyToggle ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                effectif ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
