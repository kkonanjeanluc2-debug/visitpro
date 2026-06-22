'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import StatsChart from '@/components/dashboard/StatsChart'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDuree } from '@/lib/utils'

interface StatData {
  visitesParJour: { date: string; visites: number }[]
  visitesParCollab: { nom: string; visites: number }[]
  tauxAcceptation: { name: string; value: number }[]
  heuresPointe: { heure: string; visites: number }[]
  topVisiteurs: { nom: string; organisation: string; nombre_visites: number }[]
  tempsAttenteMoyen: number
  totalVisites: number
}

export default function StatsPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const [data, setData] = useState<StatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('7')

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    chargerStats()
  }, [utilisateur?.entreprise_id, periode])

  const chargerStats = async () => {
    if (!utilisateur?.entreprise_id) return
    setLoading(true)

    const isResponsableSite = utilisateur.permissions?.responsable_site === true && utilisateur.role === 'collaborateur'
    const siteIdFiltre = isResponsableSite ? utilisateur.site_id : undefined

    const dateDebut = new Date()
    dateDebut.setDate(dateDebut.getDate() - parseInt(periode))
    const dateDebutStr = dateDebut.toISOString()

    try {
      let visitesQuery = supabase
        .from('visites')
        .select('statut, duree_attente, heure_arrivee, nom_visiteur, organisation_visiteur, destinataire:utilisateurs!destinataire_id(nom, prenom)')
        .eq('entreprise_id', utilisateur.entreprise_id)
        .gte('heure_arrivee', dateDebutStr)
      if (siteIdFiltre) visitesQuery = visitesQuery.eq('site_id', siteIdFiltre)

      const { data: visites } = await visitesQuery

      // Top visiteurs : calculé depuis les visites filtrées (précis par site)
      const visiteurCounts: Record<string, { nom: string; organisation: string; count: number }> = {}
      visites?.forEach((v) => {
        const key = v.nom_visiteur
        if (!visiteurCounts[key]) visiteurCounts[key] = { nom: v.nom_visiteur, organisation: v.organisation_visiteur ?? '', count: 0 }
        visiteurCounts[key].count++
      })
      const topVisiteurs = Object.values(visiteurCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(v => ({ nom: v.nom, organisation: v.organisation, nombre_visites: v.count }))

      if (!visites) { setLoading(false); return }

      // Visites par jour
      const parJourMap: Record<string, number> = {}
      for (let i = parseInt(periode) - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('fr-CI', { day: '2-digit', month: '2-digit' })
        parJourMap[key] = 0
      }
      visites.forEach((v) => {
        const key = new Date(v.heure_arrivee).toLocaleDateString('fr-CI', { day: '2-digit', month: '2-digit' })
        parJourMap[key] = (parJourMap[key] ?? 0) + 1
      })
      const visitesParJour = Object.entries(parJourMap).map(([date, count]) => ({ date, visites: count }))

      // Par collaborateur
      const parCollabMap: Record<string, number> = {}
      visites.forEach((v) => {
        const dest = (v.destinataire as unknown) as { nom: string; prenom: string } | null
        if (dest && !Array.isArray(dest)) {
          const key = `${dest.prenom} ${dest.nom}`
          parCollabMap[key] = (parCollabMap[key] ?? 0) + 1
        }
      })
      const visitesParCollab = Object.entries(parCollabMap)
        .map(([nom, count]) => ({ nom, visites: count }))
        .sort((a, b) => b.visites - a.visites)
        .slice(0, 8)

      // Taux acceptation
      const acceptees = visites.filter((v) => ['acceptee', 'en_cours', 'terminee'].includes(v.statut)).length
      const declinees = visites.filter((v) => v.statut === 'declinee').length
      const autres = visites.length - acceptees - declinees
      const tauxAcceptation = [
        { name: 'Acceptées', value: acceptees },
        { name: 'Déclinées', value: declinees },
        { name: 'En attente/autres', value: autres },
      ].filter((t) => t.value > 0)

      // Heures de pointe
      const parHeureMap: Record<string, number> = {}
      for (let h = 7; h <= 18; h++) {
        parHeureMap[`${h}h`] = 0
      }
      visites.forEach((v) => {
        const heure = new Date(v.heure_arrivee).getHours()
        const key = `${heure}h`
        parHeureMap[key] = (parHeureMap[key] ?? 0) + 1
      })
      const heuresPointe = Object.entries(parHeureMap).map(([heure, count]) => ({ heure, visites: count }))

      // Temps moyen
      const durees = visites.filter((v) => v.duree_attente).map((v) => v.duree_attente as number)
      const tempsAttenteMoyen = durees.length > 0
        ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length)
        : 0

      setData({
        visitesParJour,
        visitesParCollab,
        tauxAcceptation,
        heuresPointe,
        topVisiteurs,
        tempsAttenteMoyen,
        totalVisites: visites.length,
      })
    } catch (err) {
      console.error('Erreur stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <div className="flex gap-2">
          {[
            { key: '7', label: '7 jours' },
            { key: '30', label: '30 jours' },
            { key: '90', label: '3 mois' },
          ].map((p) => (
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

      {/* Résumé */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-blue-700">{data.totalVisites}</p>
            <p className="text-xs text-blue-600 mt-1">Total visites</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-green-700">
              {data.tauxAcceptation.find((t) => t.name === 'Acceptées')?.value ?? 0}
            </p>
            <p className="text-xs text-green-600 mt-1">Acceptées</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-red-700">
              {data.tauxAcceptation.find((t) => t.name === 'Déclinées')?.value ?? 0}
            </p>
            <p className="text-xs text-red-600 mt-1">Déclinées</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-purple-700">{formatDuree(data.tempsAttenteMoyen)}</p>
            <p className="text-xs text-purple-600 mt-1">Attente moyenne</p>
          </div>
        </div>
      )}

      {/* Graphiques */}
      <Card>
        <CardHeader>
          <CardTitle>Tendances</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-48" />)}
          </div>
        ) : data ? (
          <StatsChart
            visitesParJour={data.visitesParJour}
            visitesParCollab={data.visitesParCollab}
            tauxAcceptation={data.tauxAcceptation}
            heuresPointe={data.heuresPointe}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
        )}
      </Card>

      {/* Top visiteurs */}
      {data && data.topVisiteurs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top visiteurs récurrents</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {data.topVisiteurs.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.nom}</p>
                    {v.organisation && <p className="text-xs text-gray-500">{v.organisation}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">{v.nombre_visites} visite(s)</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
