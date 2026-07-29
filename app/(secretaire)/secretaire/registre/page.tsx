'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVisites } from '@/hooks/useVisites'
import { createClient } from '@/lib/supabase/client'
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
  const [terminantId, setTerminantId] = useState<string | null>(null)

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

  const terminerVisite = async (visite: Visite) => {
    if (terminantId) return
    if (!confirm(`Terminer la visite de ${nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)} ?`)) return
    setTerminantId(visite.id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('visites')
        .update({ statut: 'terminee', heure_sortie: new Date().toISOString() })
        .eq('id', visite.id)
      if (error) { console.error('terminerVisite error:', error); return }

      if (utilisateur?.entreprise_id) {
        const ch = supabase.channel(`display-${utilisateur.entreprise_id}`, { config: { broadcast: { ack: false } } })
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event: 'nouveau_visiteur', payload: {} })
              .finally(() => supabase.removeChannel(ch))
          }
        })
      }
    } finally {
      setTerminantId(null)
    }
  }

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
    const donnees = visitesFiltrees.map((v) => {
      return {
        'Heure arrivée': formatDateHeure(v.heure_arrivee),
        'Heure départ': v.heure_sortie ? formatHeure(v.heure_sortie) : '',
        'Visiteur': nomComplet(v.nom_visiteur, v.prenom_visiteur ?? undefined),
        'Organisation': v.organisation_visiteur ?? '',
        'Téléphone': v.telephone_visiteur ?? '',
        'Type pièce': v.visiteur?.type_piece_identite ?? '',
        'N° pièce': v.visiteur?.numero_piece_identite ?? '',
        'Destinataire': v.destinataire ? nomComplet(v.destinataire.nom, v.destinataire.prenom) : '',
        'Motif': v.motif,
        'Type visite': v.type_visite,
        'Urgence': v.niveau_urgence,
        'Statut': libelleStatut(v.statut),
        'Attente (min)': v.duree_attente ?? '',
        'Durée (min)': v.duree_visite ?? '',
      }
    })

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
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">H. arrivée</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap hidden sm:table-cell">H. départ</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Visiteur</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell whitespace-nowrap">Type pièce</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell whitespace-nowrap">N° pièce</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Destinataire</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Motif</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse bg-gray-100 h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visitesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Aucune visite trouvée
                  </td>
                </tr>
              ) : (
                visitesFiltrees.map((visite) => (
                  <tr key={visite.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                      <p className="text-xs text-gray-400">{new Date(visite.heure_arrivee).toLocaleDateString('fr-FR')}</p>
                      <p className="font-medium">{formatHeure(visite.heure_arrivee)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                      {visite.heure_sortie ? formatHeure(visite.heure_sortie) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
                      </p>
                      {visite.telephone_visiteur && (
                        <p className="text-xs text-gray-500">{visite.telephone_visiteur}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {visite.visiteur?.type_piece_identite ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell font-mono text-xs">
                      {visite.visiteur?.numero_piece_identite ?? <span className="text-gray-300 font-sans">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">
                      {visite.destinataire
                        ? nomComplet(visite.destinataire.nom, visite.destinataire.prenom)
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell max-w-[180px] truncate">
                      {visite.motif}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statutBadge(visite.statut)}>
                          {libelleStatut(visite.statut)}
                        </Badge>
                        {visite.statut === 'en_attente' && (
                          <button
                            onClick={() => terminerVisite(visite)}
                            disabled={terminantId === visite.id}
                            className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            {terminantId === visite.id ? '…' : 'Terminer'}
                          </button>
                        )}
                      </div>
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
