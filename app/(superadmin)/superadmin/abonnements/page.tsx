'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Abonnement, Plan, StatutAbonnement } from '@/types'

const PLAN_COLORS: Record<Plan, string> = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
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

function joursRestants(date?: string): number | null {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export default function AbonnementsPage() {
  const [abonnements, setAbonnements] = useState<Abonnement[]>([])
  const [filtered, setFiltered] = useState<Abonnement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlan, setFilterPlan] = useState<Plan | ''>('')
  const [filterStatut, setFilterStatut] = useState<StatutAbonnement | ''>('')
  const [filterExpire, setFilterExpire] = useState(false)
  const supabase = createClient()

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('abonnements')
        .select('*, entreprise:entreprises(*)')
        .order('created_at', { ascending: false })
      setAbonnements(data ?? [])
      setFiltered(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    let result = abonnements
    if (filterPlan) result = result.filter(a => a.plan === filterPlan)
    if (filterStatut) result = result.filter(a => a.statut === filterStatut)
    if (filterExpire) {
      const dans30j = Date.now() + 30 * 86400000
      result = result.filter(a => {
        const fin = a.date_fin ?? a.date_fin_essai
        return fin ? new Date(fin).getTime() <= dans30j && new Date(fin).getTime() >= Date.now() : false
      })
    }
    setFiltered(result)
  }, [filterPlan, filterStatut, filterExpire, abonnements])

  const expirantBientot = abonnements.filter(a => {
    const fin = a.date_fin ?? a.date_fin_essai
    if (!fin) return false
    const diff = new Date(fin).getTime() - Date.now()
    return diff > 0 && diff <= 30 * 86400000
  }).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
          <p className="text-gray-500 text-sm mt-1">{abonnements.length} abonnement{abonnements.length > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Alerte expiration */}
      {expirantBientot > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">{expirantBientot} abonnement{expirantBientot > 1 ? 's' : ''} expire{expirantBientot > 1 ? 'nt' : ''} dans les 30 prochains jours</p>
            <button onClick={() => setFilterExpire(true)} className="text-xs text-amber-700 hover:underline font-medium mt-0.5">
              Afficher uniquement ces abonnements →
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value as Plan | '')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
        >
          <option value="">Tous les plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value as StatutAbonnement | '')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="essai">En essai</option>
          <option value="expire">Expiré</option>
          <option value="suspendu">Suspendu</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterExpire}
            onChange={e => setFilterExpire(e.target.checked)}
            className="rounded accent-accent"
          />
          Expire dans 30 jours
        </label>
        {(filterPlan || filterStatut || filterExpire) && (
          <button
            onClick={() => { setFilterPlan(''); setFilterStatut(''); setFilterExpire(false) }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Réinitialiser
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Aucun abonnement trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Entreprise</th>
                  <th className="px-6 py-3 text-left">Plan</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                  <th className="px-6 py-3 text-left">Durée</th>
                  <th className="px-6 py-3 text-left">Début</th>
                  <th className="px-6 py-3 text-left">Expiration</th>
                  <th className="px-6 py-3 text-left">Montant</th>
                  <th className="px-6 py-3 text-left">Notes</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const fin = a.date_fin ?? a.date_fin_essai
                  const jours = fin ? joursRestants(fin) : null
                  const expireBientot = jours !== null && jours > 0 && jours <= 30
                  const expire = jours !== null && jours <= 0

                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/superadmin/entreprises/${a.entreprise_id}`}
                          className="font-semibold text-gray-900 hover:text-accent">
                          {(a.entreprise as { nom?: string })?.nom ?? '—'}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[a.plan]}`}>
                          {a.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[a.statut]}`}>
                          {STATUT_LABELS[a.statut]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {a.essai_jours ? `${a.essai_jours}j essai` : a.duree_mois ? `${a.duree_mois} mois` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(a.date_debut).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {fin ? (
                          <span className={expireBientot ? 'text-amber-600 font-semibold' : expire ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                            {new Date(fin).toLocaleDateString('fr-FR')}
                            {expireBientot && <span className="ml-1 text-amber-500">({jours}j)</span>}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {a.montant ? `${a.montant.toLocaleString('fr-FR')} FCFA` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 max-w-[150px] truncate">
                        {a.notes ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/superadmin/entreprises/${a.entreprise_id}`}
                          className="text-accent text-xs font-medium hover:underline whitespace-nowrap">
                          Gérer →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
