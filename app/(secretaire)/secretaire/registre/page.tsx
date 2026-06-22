'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVisites } from '@/hooks/useVisites'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Visite } from '@/types'
import { formatDateHeure, formatHeure, formatDuree, nomComplet, libelleStatut } from '@/lib/utils'

export default function RegistrePage() {
  const { utilisateur } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dateDebut, setDateDebut] = useState(thirtyDaysAgo)
  const [dateFin, setDateFin] = useState(today)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [recherche, setRecherche] = useState('')

  const { visites, loading } = useVisites(utilisateur?.entreprise_id ?? null, {
    dateDebut,
    dateFin,
    statut: filtreStatut !== 'tous' ? filtreStatut : undefined,
    siteId: utilisateur?.site_id ?? undefined,
  })

  const visitesFiltrees = recherche
    ? visites.filter((v) =>
        v.nom_visiteur.toLowerCase().includes(recherche.toLowerCase()) ||
        (v.prenom_visiteur ?? '').toLowerCase().includes(recherche.toLowerCase()) ||
        (v.organisation_visiteur ?? '').toLowerCase().includes(recherche.toLowerCase())
      )
    : visites

  const exporterPdf = async () => {
    if (!utilisateur?.entreprise) return
    const { genererRegistrePdf } = await import('@/lib/pdf')
    const { formatDateCourt } = await import('@/lib/utils')
    genererRegistrePdf(
      visitesFiltrees,
      utilisateur.entreprise,
      { debut: formatDateCourt(dateDebut), fin: formatDateCourt(dateFin) }
    )
  }

  const exporterExcel = async () => {
    const XLSX = await import('xlsx')
    const donnees = visitesFiltrees.map((v) => ({
      'Date/Heure': formatDateHeure(v.heure_arrivee),
      'Visiteur': nomComplet(v.nom_visiteur, v.prenom_visiteur ?? undefined),
      'Organisation': v.organisation_visiteur ?? '',
      'Téléphone': v.telephone_visiteur ?? '',
      'Destinataire': v.destinataire ? nomComplet(v.destinataire.nom, v.destinataire.prenom) : '',
      'Motif': v.motif,
      'Type': v.type_visite,
      'Urgence': v.niveau_urgence,
      'Statut': libelleStatut(v.statut),
      'Heure entrée': v.heure_entree ? formatHeure(v.heure_entree) : '',
      'Heure sortie': v.heure_sortie ? formatHeure(v.heure_sortie) : '',
      'Attente (min)': v.duree_attente ?? '',
      'Durée (min)': v.duree_visite ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(donnees)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registre')
    XLSX.writeFile(wb, `registre-visites-${dateDebut}.xlsx`)
  }

  if (!utilisateur) return null

  const statutBadge = (statut: string) => {
    const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default' | 'purple'> = {
      en_attente: 'warning',
      acceptee: 'success',
      en_cours: 'info',
      terminee: 'default',
      declinee: 'danger',
      redirigee: 'purple',
    }
    return map[statut] ?? 'default'
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registre des visites</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exporterPdf}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={exporterExcel}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Excel
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="tous">Tous</option>
              <option value="en_attente">En attente</option>
              <option value="acceptee">Acceptées</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminées</option>
              <option value="declinee">Déclinées</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rechercher</label>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, organisation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {visitesFiltrees.length} visite(s) trouvée(s)
        </p>
      </Card>

      {/* Tableau */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date/Heure</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Visiteur</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Organisation</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Destinataire</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Motif</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Attente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse bg-gray-100 h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visitesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Aucune visite trouvée
                  </td>
                </tr>
              ) : (
                visitesFiltrees.map((visite) => (
                  <tr key={visite.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                      {formatDateHeure(visite.heure_arrivee)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
                      </p>
                      {visite.telephone_visiteur && (
                        <p className="text-xs text-gray-500">{visite.telephone_visiteur}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {visite.organisation_visiteur ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {visite.destinataire
                        ? nomComplet(visite.destinataire.nom, visite.destinataire.prenom)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell max-w-[200px] truncate">
                      {visite.motif}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell whitespace-nowrap">
                      {visite.duree_attente !== null && visite.duree_attente !== undefined
                        ? formatDuree(visite.duree_attente)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statutBadge(visite.statut)}>
                        {libelleStatut(visite.statut)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
