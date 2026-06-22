'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Entreprise, Abonnement, Plan, StatutAbonnement } from '@/types'

interface EntrepriseAvecAbon extends Entreprise {
  abonnement?: Abonnement
  nb_utilisateurs?: number
}

const PLAN_COLORS: Record<Plan, string> = {
  starter: 'bg-gray-100 text-gray-700 border border-gray-200',
  pro: 'bg-blue-100 text-blue-700 border border-blue-200',
  enterprise: 'bg-purple-100 text-purple-700 border border-purple-200',
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

export default function EntreprisesPage() {
  const [entreprises, setEntreprises] = useState<EntrepriseAvecAbon[]>([])
  const [filtered, setFiltered] = useState<EntrepriseAvecAbon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<Plan | ''>('')
  const [filterStatut, setFilterStatut] = useState<StatutAbonnement | ''>('')
  const supabase = createClient()

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ents }, { data: abons }, { data: users }] = await Promise.all([
        supabase.from('entreprises').select('*').order('created_at', { ascending: false }),
        supabase.from('abonnements').select('*'),
        supabase.from('utilisateurs').select('entreprise_id'),
      ])

      const asList = (ents ?? []).map((e: Entreprise) => {
        const abon = (abons ?? []).find((a: Abonnement) => a.entreprise_id === e.id)
        const nb = (users ?? []).filter((u: { entreprise_id: string }) => u.entreprise_id === e.id).length
        return { ...e, abonnement: abon, nb_utilisateurs: nb }
      })

      setEntreprises(asList)
      setFiltered(asList)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    let result = entreprises
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e => e.nom.toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q) || (e.secteur ?? '').toLowerCase().includes(q))
    }
    if (filterPlan) result = result.filter(e => e.plan === filterPlan)
    if (filterStatut) result = result.filter(e => e.abonnement?.statut === filterStatut)
    setFiltered(result)
  }, [search, filterPlan, filterStatut, entreprises])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
          <p className="text-gray-500 text-sm mt-1">{entreprises.length} entreprise{entreprises.length > 1 ? 's' : ''} enregistrée{entreprises.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
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
        {(search || filterPlan || filterStatut) && (
          <button
            onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatut('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Aucune entreprise trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Entreprise</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-left">Plan</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                  <th className="px-6 py-3 text-left">Utilisateurs</th>
                  <th className="px-6 py-3 text-left">Expiration</th>
                  <th className="px-6 py-3 text-left">Inscription</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/superadmin/entreprises/${e.id}`} className="font-semibold text-gray-900 hover:text-accent">
                        {e.nom}
                      </Link>
                      {e.secteur && <p className="text-xs text-gray-400">{e.secteur}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {e.email && <p className="text-xs text-gray-600">{e.email}</p>}
                      {e.telephone && <p className="text-xs text-gray-400">{e.telephone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[e.plan]}`}>
                        {e.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {e.abonnement ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[e.abonnement.statut]}`}>
                          {STATUT_LABELS[e.abonnement.statut]}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{e.nb_utilisateurs ?? 0}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {e.abonnement?.date_fin
                        ? new Date(e.abonnement.date_fin) < new Date()
                          ? <span className="text-red-500 font-medium">{new Date(e.abonnement.date_fin).toLocaleDateString('fr-FR')}</span>
                          : new Date(e.abonnement.date_fin).toLocaleDateString('fr-FR')
                        : e.abonnement?.date_fin_essai
                          ? new Date(e.abonnement.date_fin_essai).toLocaleDateString('fr-FR')
                          : '—'
                      }
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/superadmin/entreprises/${e.id}`}
                        className="text-accent text-xs font-medium hover:underline whitespace-nowrap">
                        Gérer →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
