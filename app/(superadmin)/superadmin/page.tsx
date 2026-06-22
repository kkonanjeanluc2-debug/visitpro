'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Entreprise, Abonnement, Plan } from '@/types'

interface Stats {
  total_entreprises: number
  abonnements_actifs: number
  abonnements_essai: number
  abonnements_expires: number
  revenus_mois: number
  nouvelles_ce_mois: number
}

interface EntrepriseRecente extends Entreprise {
  abonnement?: Abonnement
  nb_utilisateurs?: number
}

const PLAN_COLORS: Record<Plan, string> = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const STATUT_COLORS: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  essai: 'bg-amber-100 text-amber-700',
  expire: 'bg-red-100 text-red-700',
  suspendu: 'bg-gray-100 text-gray-600',
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [entreprises, setEntreprises] = useState<EntrepriseRecente[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ents }, { data: abons }] = await Promise.all([
        supabase.from('entreprises').select('*').order('created_at', { ascending: false }),
        supabase.from('abonnements').select('*, entreprise:entreprises(*)'),
      ])

      const allEnts = ents ?? []
      const allAbons = abons ?? []

      const maintenant = new Date()
      const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)

      const actifs = allAbons.filter((a: Abonnement) => a.statut === 'actif').length
      const essais = allAbons.filter((a: Abonnement) => a.statut === 'essai').length
      const expires = allAbons.filter((a: Abonnement) => a.statut === 'expire').length
      const revenus = allAbons
        .filter((a: Abonnement) => a.statut === 'actif')
        .reduce((sum: number, a: Abonnement) => sum + (a.montant ?? 0), 0)
      const nouveaux = allEnts.filter((e: Entreprise) => new Date(e.created_at) >= debutMois).length

      setStats({
        total_entreprises: allEnts.length,
        abonnements_actifs: actifs,
        abonnements_essai: essais,
        abonnements_expires: expires,
        revenus_mois: revenus,
        nouvelles_ce_mois: nouveaux,
      })

      // Les 6 dernières entreprises avec leur abonnement
      const recentes = allEnts.slice(0, 6).map((e: Entreprise) => ({
        ...e,
        abonnement: allAbons.find((a: Abonnement) => a.entreprise_id === e.id),
      }))
      setEntreprises(recentes)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { charger() }, [charger])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme VisitPro</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <StatCard
          label="Entreprises totales"
          value={stats?.total_entreprises ?? 0}
          sub={`+${stats?.nouvelles_ce_mois ?? 0} ce mois`}
          color="bg-blue-50"
          icon={<svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          label="Abonnements actifs"
          value={stats?.abonnements_actifs ?? 0}
          sub={`${stats?.abonnements_essai ?? 0} en essai`}
          color="bg-green-50"
          icon={<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Abonnements expirés"
          value={stats?.abonnements_expires ?? 0}
          color="bg-red-50"
          icon={<svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Revenus mensuels"
          value={`${(stats?.revenus_mois ?? 0).toLocaleString('fr-FR')} FCFA`}
          color="bg-purple-50"
          icon={<svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="En période d'essai"
          value={stats?.abonnements_essai ?? 0}
          color="bg-amber-50"
          icon={<svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Nouvelles ce mois"
          value={stats?.nouvelles_ce_mois ?? 0}
          color="bg-indigo-50"
          icon={<svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
        />
      </div>

      {/* Dernières entreprises */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Dernières inscriptions</h2>
          <a href="/superadmin/entreprises" className="text-sm text-accent font-medium hover:underline">
            Voir tout →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Entreprise</th>
                <th className="px-6 py-3 text-left">Secteur</th>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-left">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entreprises.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Aucune entreprise</td></tr>
              ) : entreprises.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <a href={`/superadmin/entreprises/${e.id}`} className="font-semibold text-gray-900 hover:text-accent">
                      {e.nom}
                    </a>
                    {e.email && <p className="text-xs text-gray-400">{e.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{e.secteur ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[e.plan]}`}>
                      {e.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {e.abonnement ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[e.abonnement.statut]}`}>
                        {e.abonnement.statut.charAt(0).toUpperCase() + e.abonnement.statut.slice(1)}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(e.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution des plans */}
      {stats && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Distribution des plans</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['starter', 'pro', 'enterprise'] as Plan[]).map((plan) => {
              const count = entreprises.filter(e => e.plan === plan).length
              const total = stats.total_entreprises || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={plan} className={`rounded-xl p-4 ${plan === 'starter' ? 'bg-gray-50' : plan === 'pro' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${plan === 'starter' ? 'text-gray-500' : plan === 'pro' ? 'text-blue-600' : 'text-purple-600'}`}>{plan}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400">{pct}% du total</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
