'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRendezVous } from '@/hooks/useRendezVous'
import AgendaJour from '@/components/secretaire/AgendaJour'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { nomComplet } from '@/lib/utils'
import type { Utilisateur, VisiteResume } from '@/types'

type Periode = 'jour' | 'semaine' | 'mois' | 'custom'

const PERIODES: { id: Periode; label: string }[] = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'custom', label: 'Personnalisé' },
]

function getRange(p: Periode, customDebut: string, customFin: string): { dateDebut: string; dateFin: string } {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (p === 'jour') return { dateDebut: todayStr, dateFin: todayStr }

  if (p === 'semaine') {
    const day = now.getDay()
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const dimanche = new Date(lundi)
    dimanche.setDate(lundi.getDate() + 6)
    return { dateDebut: lundi.toISOString().split('T')[0], dateFin: dimanche.toISOString().split('T')[0] }
  }

  if (p === 'mois') {
    const debut = new Date(now.getFullYear(), now.getMonth(), 1)
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { dateDebut: debut.toISOString().split('T')[0], dateFin: fin.toISOString().split('T')[0] }
  }

  return { dateDebut: customDebut || todayStr, dateFin: customFin || todayStr }
}

export default function RendezVousPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const todayStr = new Date().toISOString().split('T')[0]
  const [periode, setPeriode] = useState<Periode>('jour')
  const [customDebut, setCustomDebut] = useState(todayStr)
  const [customFin, setCustomFin] = useState(todayStr)
  const [destinataireFiltreId, setDestinataireFiltreId] = useState<string | undefined>(undefined)

  const { dateDebut, dateFin } = useMemo(
    () => getRange(periode, customDebut, customFin),
    [periode, customDebut, customFin]
  )

  // Pour "Aujourd'hui" on utilise `date` (filtre exact), sinon la plage
  const filtres = useMemo(() => ({
    ...(periode === 'jour' ? { date: todayStr } : { dateDebut, dateFin }),
    destinataireId: destinataireFiltreId,
    siteId: utilisateur?.site_id ?? undefined,
  }), [periode, todayStr, dateDebut, dateFin, destinataireFiltreId, utilisateur?.site_id])

  const { rendezVous, loading, recharger } = useRendezVous(utilisateur?.entreprise_id ?? null, filtres)

  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [visitesParRdv, setVisitesParRdv] = useState<Record<string, VisiteResume>>({})
  const [rdvAnnuler, setRdvAnnuler] = useState<string | null>(null)
  const [loadingAnnulation, setLoadingAnnulation] = useState(false)

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    let q = supabase
      .from('utilisateurs')
      .select('id, nom, prenom, poste, role, actif, entreprise_id, created_at')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .eq('actif', true)
      .in('role', ['collaborateur', 'patron', 'admin'])
      .order('nom')
    if (utilisateur.site_id) q = q.eq('site_id', utilisateur.site_id)
    q.then(({ data }) => setCollaborateurs((data as Utilisateur[]) ?? []))
  }, [utilisateur?.entreprise_id, utilisateur?.site_id])

  useEffect(() => {
    if (rendezVous.length === 0) { setVisitesParRdv({}); return }
    const rdvIds = rendezVous.map((r) => r.id)
    supabase
      .from('visites')
      .select('id, rendez_vous_id, statut, heure_arrivee')
      .in('rendez_vous_id', rdvIds)
      .then(({ data }) => {
        const map: Record<string, VisiteResume> = {}
        for (const v of data ?? []) {
          if (v.rendez_vous_id) map[v.rendez_vous_id] = { statut: v.statut, heure_arrivee: v.heure_arrivee }
        }
        setVisitesParRdv(map)
      })
  }, [rendezVous])

  const handleTerminer = async (id: string) => {
    await supabase.from('rendez_vous').update({ statut: 'termine' }).eq('id', id)
    recharger()
  }

  const handleConfirmer = async (id: string) => {
    await supabase.from('rendez_vous').update({ statut: 'confirme' }).eq('id', id)
    recharger()
  }

  const handleReporter = async (id: string, nouvelleDate: string, nouvelleHeure: string, heureFin?: string) => {
    await supabase.from('rendez_vous').update({
      statut: 'reporte',
      date_rdv: nouvelleDate,
      heure_debut: nouvelleHeure,
      heure_fin: heureFin ?? null,
    }).eq('id', id)
    recharger()
  }

  const confirmerAnnulation = async () => {
    if (!rdvAnnuler) return
    setLoadingAnnulation(true)
    try {
      await supabase.from('rendez_vous').update({ statut: 'annule' }).eq('id', rdvAnnuler)
      recharger()
    } finally {
      setLoadingAnnulation(false)
      setRdvAnnuler(null)
    }
  }

  const stats = {
    total: rendezVous.length,
    confirmes: rendezVous.filter((r) => r.statut === 'confirme').length,
    annules: rendezVous.filter((r) => r.statut === 'annule').length,
  }

  // Titre de la période affichée
  const titreCard = useMemo(() => {
    if (periode === 'jour') {
      return 'Rendez-vous du ' + new Date().toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (periode === 'semaine') {
      return 'Cette semaine'
    }
    if (periode === 'mois') {
      return new Date().toLocaleDateString('fr-CI', { month: 'long', year: 'numeric' })
    }
    if (customDebut && customFin) {
      const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })
      return customDebut === customFin ? fmt(customDebut) : `${fmt(customDebut)} → ${fmt(customFin)}`
    }
    return 'Rendez-vous'
  }, [periode, customDebut, customFin])

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <Link href="/secretaire/rendez-vous/nouveau">
          <Button size="sm" variant="accent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau RDV
          </Button>
        </Link>
      </div>

      {/* Onglets période */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
        {PERIODES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
              periode === p.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sélecteurs de dates personnalisées */}
      {periode === 'custom' && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={customDebut}
              onChange={(e) => setCustomDebut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={customFin}
              min={customDebut}
              onChange={(e) => setCustomFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-xs text-blue-600 mt-0.5">Total</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.confirmes}</p>
          <p className="text-xs text-green-600 mt-0.5">Confirmés</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.annules}</p>
          <p className="text-xs text-red-600 mt-0.5">Annulés</p>
        </div>
      </div>

      {/* Filtre par destinataire */}
      {collaborateurs.length > 1 && (
        <div className="mb-4">
          <Select
            label=""
            value={destinataireFiltreId ?? ''}
            onChange={(e) => setDestinataireFiltreId(e.target.value || undefined)}
            options={[
              { value: '', label: 'Tous les collaborateurs' },
              ...collaborateurs.map((c) => ({
                value: c.id,
                label: nomComplet(c.nom, c.prenom) + (c.poste ? ` — ${c.poste}` : ''),
              })),
            ]}
          />
        </div>
      )}

      {/* Liste des RDVs */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{titreCard}</CardTitle>
        </CardHeader>
        <AgendaJour
          rendezVous={rendezVous}
          loading={loading}
          visitesParRdv={visitesParRdv}
          groupByDate={periode !== 'jour'}
          onTerminer={handleTerminer}
          onConfirmer={handleConfirmer}
          onAnnuler={(id) => setRdvAnnuler(id)}
          onReporter={handleReporter}
        />
      </Card>

      <ConfirmModal
        isOpen={!!rdvAnnuler}
        onClose={() => setRdvAnnuler(null)}
        onConfirm={confirmerAnnulation}
        title="Annuler ce rendez-vous"
        message="Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action ne peut pas être annulée."
        confirmLabel="Oui, annuler"
        cancelLabel="Garder le RDV"
        variant="danger"
        loading={loadingAnnulation}
      />
    </div>
  )
}
