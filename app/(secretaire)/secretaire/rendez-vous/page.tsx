'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRendezVousAujourdhui } from '@/hooks/useRendezVous'
import AgendaJour from '@/components/secretaire/AgendaJour'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { nomComplet } from '@/lib/utils'
import type { Utilisateur, VisiteResume } from '@/types'

export default function RendezVousPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [destinataireFiltreId, setDestinataireFiltreId] = useState<string | undefined>(undefined)
  const { rendezVous, loading, recharger } = useRendezVousAujourdhui(
    utilisateur?.entreprise_id ?? null,
    destinataireFiltreId,
    utilisateur?.site_id ?? undefined
  )

  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [visitesParRdv, setVisitesParRdv] = useState<Record<string, VisiteResume>>({})
  const [rdvAnnuler, setRdvAnnuler] = useState<string | null>(null)
  const [loadingAnnulation, setLoadingAnnulation] = useState(false)

  // Charger les collaborateurs pour le filtre
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

  // Indicateur "visiteur arrivé" — charger les visites liées aux RDVs du jour
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

  const handleReporter = async (id: string, nouvelleDate: string, nouvelleHeure: string) => {
    await supabase.from('rendez_vous').update({
      statut: 'reporte',
      date_rdv: nouvelleDate,
      heure_debut: nouvelleHeure,
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

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda du jour</h1>
        <Link href="/secretaire/rendez-vous/nouveau">
          <Button size="sm" variant="accent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau RDV
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-xs text-blue-600 mt-1">Total</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.confirmes}</p>
          <p className="text-xs text-green-600 mt-1">Confirmés</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.annules}</p>
          <p className="text-xs text-red-600 mt-1">Annulés</p>
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

      <Card>
        <CardHeader>
          <CardTitle>
            Rendez-vous du{' '}
            {new Date().toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <AgendaJour
          rendezVous={rendezVous}
          loading={loading}
          visitesParRdv={visitesParRdv}
          onTerminer={handleTerminer}
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
