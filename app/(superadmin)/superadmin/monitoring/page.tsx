'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface ConnexionRow {
  id: string
  action: 'connexion' | 'deconnexion'
  ip_address: string | null
  user_agent: string | null
  created_at: string
  utilisateur: { prenom: string; nom: string; email: string | null; role: string } | null
  entreprise: { nom: string } | null
}

interface UtilisateurRow {
  id: string
  prenom: string
  nom: string
  role: string
  email: string | null
  actif: boolean
  derniere_connexion: string | null
  entreprise: { nom: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function tempsEcoule(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)  return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function estEnLigne(derniere_connexion: string | null): boolean {
  if (!derniere_connexion) return false
  return Date.now() - new Date(derniere_connexion).getTime() < 30 * 60 * 1000
}

type Onglet = 'utilisateurs' | 'connexions'

// ── Composant principal ───────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [onglet, setOnglet] = useState<Onglet>('utilisateurs')
  const [connexions, setConnexions] = useState<ConnexionRow[]>([])
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [filtre, setFiltre]         = useState('')
  const [derniereMaj, setDerniereMaj] = useState(new Date())

  const charger = useCallback(async () => {
    const sb = createClient()

    const [{ data: c }, { data: u }] = await Promise.all([
      // Connexions log — 200 dernières
      sb.from('connexions_log')
        .select(`
          id, action, ip_address, user_agent, created_at,
          utilisateur:utilisateurs(prenom, nom, email, role),
          entreprise:entreprises(nom)
        `)
        .order('created_at', { ascending: false })
        .limit(200),

      // Utilisateurs actifs — tous
      sb.from('utilisateurs')
        .select('id, prenom, nom, role, email, actif, derniere_connexion, entreprise:entreprises(nom)')
        .eq('actif', true)
        .order('derniere_connexion', { ascending: false, nullsFirst: false }),
    ])

    setConnexions((c ?? []) as unknown as ConnexionRow[])
    setUtilisateurs((u ?? []) as unknown as UtilisateurRow[])
    setDerniereMaj(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  // Realtime connexions
  useEffect(() => {
    const sb = createClient()
    const channel = sb.channel('monitoring-connexions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connexions_log' }, () => charger())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [charger])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const usersEnLigne         = utilisateurs.filter((u) => estEnLigne(u.derniere_connexion))
  const connexionsAujourdhui = connexions.filter((c) => c.created_at.startsWith(today) && c.action === 'connexion')

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const q = filtre.toLowerCase()

  const connexionsFiltrees = connexions.filter((c) =>
    !q ||
    (c.utilisateur?.nom ?? '').toLowerCase().includes(q) ||
    (c.utilisateur?.prenom ?? '').toLowerCase().includes(q) ||
    (c.entreprise?.nom ?? '').toLowerCase().includes(q) ||
    (c.ip_address ?? '').includes(q)
  )

  const utilisateursFiltres = utilisateurs.filter((u) =>
    !q ||
    u.nom.toLowerCase().includes(q) ||
    u.prenom.toLowerCase().includes(q) ||
    (u.email ?? '').toLowerCase().includes(q) ||
    (u.entreprise?.nom ?? '').toLowerCase().includes(q)
  )

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Mis à jour à {derniereMaj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); charger() }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Utilisateurs en ligne"
          value={usersEnLigne.length}
          sub="actifs < 30 min"
          color="emerald"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
        />
        <KpiCard
          label="Connexions aujourd'hui"
          value={connexionsAujourdhui.length}
          sub="sessions ouvertes"
          color="violet"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
        />
        <KpiCard
          label="Utilisateurs actifs"
          value={utilisateurs.length}
          sub="comptes activés"
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      {/* Onglets + Recherche */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <nav className="flex gap-0">
            {([
              { key: 'utilisateurs', label: 'Utilisateurs', count: utilisateursFiltres.length },
              { key: 'connexions',   label: 'Connexions',   count: connexionsFiltrees.length },
            ] as { key: Onglet; label: string; count: number }[]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setOnglet(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  onglet === key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 rounded-full ${onglet === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </nav>

          <div className="ml-auto relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher…"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 w-64"
            />
          </div>
        </div>

        {/* ── Onglet Utilisateurs ── */}
        {onglet === 'utilisateurs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateursFiltres.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Aucun utilisateur</td></tr>
                )}
                {utilisateursFiltres.map((u) => {
                  const enLigne = estEnLigne(u.derniere_connexion)
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${enLigne ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                            {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{u.entreprise?.nom ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {enLigne ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En ligne
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Hors ligne</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.derniere_connexion ? (
                          <span title={formatDt(u.derniere_connexion)}>{tempsEcoule(u.derniere_connexion)}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Onglet Connexions ── */}
        {onglet === 'connexions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {connexionsFiltrees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      Aucune connexion enregistrée — les événements apparaissent dès la prochaine session.
                    </td>
                  </tr>
                )}
                {connexionsFiltrees.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {c.utilisateur ? (
                        <div>
                          <p className="font-medium text-gray-900">{c.utilisateur.prenom} {c.utilisateur.nom}</p>
                          <p className="text-xs text-gray-400 capitalize">{c.utilisateur.role}</p>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{c.entreprise?.nom ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.action === 'connexion'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {c.action === 'connexion' ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                          </svg>
                        )}
                        {c.action === 'connexion' ? 'Connexion' : 'Déconnexion'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <p>{formatDt(c.created_at)}</p>
                      <p className="text-gray-400">{tempsEcoule(c.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{c.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate" title={c.user_agent ?? ''}>
                      {c.user_agent ? parseUserAgent(c.user_agent) : '—'}
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

// ── Sous-composants ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: number; sub: string; color: string; icon: React.ReactNode
}) {
  const palette: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    emerald:'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome'))  return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  if (ua.includes('Edge'))    return 'Edge'
  if (ua.includes('Mobile'))  return 'Mobile'
  return ua.slice(0, 40)
}
