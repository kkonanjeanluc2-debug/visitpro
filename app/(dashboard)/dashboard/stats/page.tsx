'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import StatsChart from '@/components/dashboard/StatsChart'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDuree } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisiteRaw {
  statut: string
  duree_attente: number | null
  heure_arrivee: string
  nom_visiteur: string
  organisation_visiteur: string | null
  motif: string
  note_decision: string | null
  visiteur_id: string | null
  destinataire_id: string | null
  destinataire: { id: string; nom: string; prenom: string } | null
}

interface CollabStat {
  id: string
  nom: string
  nbVisites: number
  acceptees: number
  declinees: number
  enAttente: number
  redirigees: number
  tauxAcceptation: number
  tempsAttenteMoyen: number
  score: 'excellent' | 'bien' | 'moyen' | 'faible'
}

interface VisiteurStat {
  nom: string
  organisation: string
  nbVisites: number
  acceptees: number
  declinees: number
  derniere: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreCollab(taux: number, nb: number): CollabStat['score'] {
  if (nb === 0) return 'faible'
  if (taux >= 75) return 'excellent'
  if (taux >= 50) return 'bien'
  if (taux >= 25) return 'moyen'
  return 'faible'
}

const SCORE_CONFIG: Record<CollabStat['score'], { label: string; bg: string; text: string; dot: string }> = {
  excellent: { label: 'Très disponible',  bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  bien:      { label: 'Performance correcte', bg: 'bg-blue-50', text: 'text-blue-700',  dot: 'bg-blue-500'   },
  moyen:     { label: 'Trop de refus',    bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500'  },
  faible:    { label: 'Inaccessible',     bg: 'bg-red-50',   text: 'text-red-700',   dot: 'bg-red-500'    },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [visites, setVisites] = useState<VisiteRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('30')

  // Filtres
  const [filtreDestinataire, setFiltreDestinataire] = useState('')
  const [filtreMotif, setFiltreMotif] = useState('')

  // Tri tableau visiteurs
  const [triVisiteur, setTriVisiteur] = useState<'visites' | 'acceptees' | 'declinees'>('visites')

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    charger()
  }, [utilisateur?.entreprise_id, periode])

  const charger = async () => {
    if (!utilisateur?.entreprise_id) return
    setLoading(true)
    const debut = new Date()
    debut.setDate(debut.getDate() - parseInt(periode))

    const isResponsableSite = utilisateur.permissions?.responsable_site === true && utilisateur.role === 'collaborateur'

    let q = supabase
      .from('visites')
      .select('statut, duree_attente, heure_arrivee, nom_visiteur, organisation_visiteur, motif, note_decision, visiteur_id, destinataire_id, destinataire:utilisateurs!destinataire_id(id, nom, prenom)')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .gte('heure_arrivee', debut.toISOString())
      .order('heure_arrivee', { ascending: false })
      .limit(2000)

    if (isResponsableSite && utilisateur.site_id) q = q.eq('site_id', utilisateur.site_id)

    const { data } = await q
    setVisites((data ?? []) as unknown as VisiteRaw[])
    setLoading(false)
  }

  // ── Données filtrées ────────────────────────────────────────────────────────

  const visitesFiltrees = useMemo(() => {
    let v = visites
    if (filtreDestinataire) v = v.filter(x => x.destinataire_id === filtreDestinataire)
    if (filtreMotif) v = v.filter(x => x.motif?.toLowerCase().includes(filtreMotif.toLowerCase()))
    return v
  }, [visites, filtreDestinataire, filtreMotif])

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const total       = visitesFiltrees.length
    const satisfaits  = visitesFiltrees.filter(v => ['acceptee', 'en_cours', 'terminee'].includes(v.statut)).length
    const nonSatisfaits = visitesFiltrees.filter(v => v.statut === 'declinee').length
    const nonTraites  = visitesFiltrees.filter(v => v.statut === 'en_attente').length
    const redirigees  = visitesFiltrees.filter(v => v.statut === 'redirigee').length
    const durees      = visitesFiltrees.filter(v => v.duree_attente).map(v => v.duree_attente as number)
    const tempsMoyen  = durees.length > 0 ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length) : 0
    return { total, satisfaits, nonSatisfaits, nonTraites, redirigees, tempsMoyen }
  }, [visitesFiltrees])

  // ── Raisons d'échec (visites déclinées) ─────────────────────────────────────

  const raisonsEchec = useMemo(() => {
    const declinees = visitesFiltrees.filter(v => v.statut === 'declinee')
    const map: Record<string, number> = {}
    for (const v of declinees) {
      const raison = v.note_decision?.trim() || 'Aucune raison précisée'
      map[raison] = (map[raison] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([raison, count]) => ({ raison, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [visitesFiltrees])

  // ── Visites par visiteur ─────────────────────────────────────────────────────

  const visitesParVisiteur = useMemo((): VisiteurStat[] => {
    const map: Record<string, VisiteurStat> = {}
    for (const v of visitesFiltrees) {
      const key = v.visiteur_id ?? v.nom_visiteur
      if (!map[key]) {
        map[key] = { nom: v.nom_visiteur, organisation: v.organisation_visiteur ?? '', nbVisites: 0, acceptees: 0, declinees: 0, derniere: v.heure_arrivee }
      }
      map[key].nbVisites++
      if (['acceptee', 'en_cours', 'terminee'].includes(v.statut)) map[key].acceptees++
      if (v.statut === 'declinee') map[key].declinees++
      if (v.heure_arrivee > map[key].derniere) map[key].derniere = v.heure_arrivee
    }
    const arr = Object.values(map)
    if (triVisiteur === 'acceptees') arr.sort((a, b) => b.acceptees - a.acceptees)
    else if (triVisiteur === 'declinees') arr.sort((a, b) => b.declinees - a.declinees)
    else arr.sort((a, b) => b.nbVisites - a.nbVisites)
    return arr.slice(0, 20)
  }, [visitesFiltrees, triVisiteur])

  // ── Stats par collaborateur ─────────────────────────────────────────────────

  const collabStats = useMemo((): CollabStat[] => {
    const map: Record<string, CollabStat> = {}
    for (const v of visitesFiltrees) {
      const d = v.destinataire
      if (!d || Array.isArray(d)) continue
      const id  = d.id
      const nom = `${d.prenom} ${d.nom}`.trim()
      if (!map[id]) {
        map[id] = { id, nom, nbVisites: 0, acceptees: 0, declinees: 0, enAttente: 0, redirigees: 0, tauxAcceptation: 0, tempsAttenteMoyen: 0, score: 'faible' }
      }
      map[id].nbVisites++
      if (['acceptee', 'en_cours', 'terminee'].includes(v.statut)) map[id].acceptees++
      if (v.statut === 'declinee') map[id].declinees++
      if (v.statut === 'en_attente') map[id].enAttente++
      if (v.statut === 'redirigee') map[id].redirigees++
      if (v.duree_attente) map[id].tempsAttenteMoyen += v.duree_attente
    }
    return Object.values(map).map(c => {
      const taux = c.nbVisites > 0 ? Math.round((c.acceptees / c.nbVisites) * 100) : 0
      const tempsMoy = c.nbVisites > 0 ? Math.round(c.tempsAttenteMoyen / c.nbVisites) : 0
      return { ...c, tauxAcceptation: taux, tempsAttenteMoyen: tempsMoy, score: scoreCollab(taux, c.nbVisites) }
    }).sort((a, b) => b.nbVisites - a.nbVisites)
  }, [visitesFiltrees])

  // ── Visites par motif ────────────────────────────────────────────────────────

  const visitesParMotif = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of visitesFiltrees) {
      const m = v.motif?.trim() || 'Non précisé'
      map[m] = (map[m] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([motif, count]) => ({ motif, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [visitesFiltrees])

  // ── Liste des destinations + motifs pour les filtres ────────────────────────

  const destinatairesList = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; nom: string }[] = []
    for (const v of visites) {
      const d = v.destinataire
      if (!d || Array.isArray(d) || seen.has(d.id)) continue
      seen.add(d.id)
      list.push({ id: d.id, nom: `${d.prenom} ${d.nom}`.trim() })
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom))
  }, [visites])

  const motifsList = useMemo(() => {
    const set = new Set<string>()
    for (const v of visites) if (v.motif?.trim()) set.add(v.motif.trim())
    return Array.from(set).sort()
  }, [visites])

  // ── Charts data ──────────────────────────────────────────────────────────────

  const visitesParJour = useMemo(() => {
    const parJourMap: Record<string, number> = {}
    for (let i = parseInt(periode) - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      parJourMap[d.toLocaleDateString('fr-CI', { day: '2-digit', month: '2-digit' })] = 0
    }
    visitesFiltrees.forEach(v => {
      const key = new Date(v.heure_arrivee).toLocaleDateString('fr-CI', { day: '2-digit', month: '2-digit' })
      parJourMap[key] = (parJourMap[key] ?? 0) + 1
    })
    return Object.entries(parJourMap).map(([date, visites]) => ({ date, visites }))
  }, [visitesFiltrees, periode])

  const heuresPointe = useMemo(() => {
    const map: Record<string, number> = {}
    for (let h = 7; h <= 18; h++) map[`${h}h`] = 0
    visitesFiltrees.forEach(v => {
      const key = `${new Date(v.heure_arrivee).getHours()}h`
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map).map(([heure, visites]) => ({ heure, visites }))
  }, [visitesFiltrees])

  const tauxAcceptation = useMemo(() => [
    { name: 'Satisfaits',   value: kpi.satisfaits },
    { name: 'Déclinées',    value: kpi.nonSatisfaits },
    { name: 'Non traités',  value: kpi.nonTraites },
    { name: 'Redirigées',   value: kpi.redirigees },
  ].filter(t => t.value > 0), [kpi])

  const visitesParCollabChart = useMemo(() =>
    collabStats.slice(0, 8).map(c => ({ nom: c.nom.split(' ')[0], visites: c.nbVisites })),
    [collabStats])

  if (!utilisateur) return null

  const filtersActifs = filtreDestinataire || filtreMotif

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">

      {/* ── En-tête + période ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          {filtersActifs && (
            <p className="text-xs text-amber-600 mt-0.5">
              Filtres actifs — les chiffres ne concernent que la sélection
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {[{ key: '7', label: '7 jours' }, { key: '30', label: '30 jours' }, { key: '90', label: '3 mois' }].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${periode === p.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filtres ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Personne visitée</label>
          <select
            value={filtreDestinataire}
            onChange={e => setFiltreDestinataire(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Tous les collaborateurs</option>
            {destinatairesList.map(d => (
              <option key={d.id} value={d.id}>{d.nom}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Motif de visite</label>
          <select
            value={filtreMotif}
            onChange={e => setFiltreMotif(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Tous les motifs</option>
            {motifsList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        {filtersActifs && (
          <button
            onClick={() => { setFiltreDestinataire(''); setFiltreMotif('') }}
            className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            ✕ Effacer filtres
          </button>
        )}
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 col-span-1">
            <p className="text-2xl font-bold text-blue-700">{kpi.total}</p>
            <p className="text-xs text-blue-600 mt-1">Total visites</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-green-700">{kpi.satisfaits}</p>
            <p className="text-xs text-green-600 mt-1">Satisfaits ✓</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-red-700">{kpi.nonSatisfaits}</p>
            <p className="text-xs text-red-600 mt-1">Non satisfaits</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-amber-700">{kpi.nonTraites}</p>
            <p className="text-xs text-amber-600 mt-1">Non traités</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-purple-700">{formatDuree(kpi.tempsMoyen)}</p>
            <p className="text-xs text-purple-600 mt-1">Attente moy.</p>
          </div>
        </div>
      )}

      {/* ── Raisons d'échec ────────────────────────────────────────────────── */}
      {!loading && kpi.nonSatisfaits > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raisons des visites déclinées ({kpi.nonSatisfaits})</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-2">
            {raisonsEchec.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune raison renseignée</p>
            ) : (
              raisonsEchec.map((r, i) => {
                const pct = kpi.nonSatisfaits > 0 ? Math.round((r.count / kpi.nonSatisfaits) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm text-gray-700 truncate">{r.raison}</p>
                        <span className="text-xs font-semibold text-gray-500 ml-2 flex-shrink-0">{r.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      )}

      {/* ── Visites par motif ──────────────────────────────────────────────── */}
      {!loading && visitesParMotif.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Motifs de visite</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-2">
            {visitesParMotif.map((m, i) => {
              const pct = kpi.total > 0 ? Math.round((m.count / kpi.total) * 100) : 0
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm text-gray-700 truncate capitalize">{m.motif}</p>
                      <span className="text-xs font-semibold text-gray-500 ml-2 flex-shrink-0">{m.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Visites par visiteur ───────────────────────────────────────────── */}
      {!loading && visitesParVisiteur.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Visites par visiteur ({visitesParVisiteur.length})</CardTitle>
              <div className="flex gap-1">
                {([
                  { key: 'visites', label: 'Total' },
                  { key: 'acceptees', label: 'Satisfaits' },
                  { key: 'declinees', label: 'Refusées' },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTriVisiteur(t.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                      ${triVisiteur === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Visiteur</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Visites</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Reçu</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Refusé</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Dernière</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visitesParVisiteur.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{v.nom}</p>
                      {v.organisation && <p className="text-xs text-gray-400">{v.organisation}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{v.nbVisites}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{v.acceptees}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">{v.declinees}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {new Date(v.derniere).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Rentabilité par collaborateur ──────────────────────────────────── */}
      {!loading && collabStats.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance & rentabilité par collaborateur</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Basé sur le taux d&apos;acceptation des visites — un fort taux de refus peut signaler un collaborateur surchargé ou peu disponible
              </p>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Collaborateur</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Acceptées</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Refusées</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wide">En attente</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Taux acc.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Att. moy.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Évaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {collabStats.map((c, i) => {
                  const cfg = SCORE_CONFIG[c.score]
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                            {c.nom.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-semibold text-gray-900">{c.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{c.nbVisites}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{c.acceptees}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-medium">{c.declinees}</td>
                      <td className="px-4 py-3 text-right text-amber-600 font-medium">{c.enAttente}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${c.tauxAcceptation >= 75 ? 'text-green-600' : c.tauxAcceptation >= 50 ? 'text-blue-600' : c.tauxAcceptation >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                          {c.tauxAcceptation}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {c.tempsAttenteMoyen > 0 ? formatDuree(c.tempsAttenteMoyen) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Légende */}
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
            {(Object.entries(SCORE_CONFIG) as [CollabStat['score'], typeof SCORE_CONFIG[CollabStat['score']]][]).map(([, cfg]) => (
              <span key={cfg.label} className={`inline-flex items-center gap-1.5 text-xs ${cfg.text}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* ── Graphiques ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Tendances</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-48" />)}
          </div>
        ) : kpi.total > 0 ? (
          <StatsChart
            visitesParJour={visitesParJour}
            visitesParCollab={visitesParCollabChart}
            tauxAcceptation={tauxAcceptation}
            heuresPointe={heuresPointe}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">Aucune donnée sur la période</p>
        )}
      </Card>

    </div>
  )
}
