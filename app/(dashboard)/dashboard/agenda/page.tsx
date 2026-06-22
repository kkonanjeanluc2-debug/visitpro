'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRendezVous } from '@/hooks/useRendezVous'
import AgendaJour from '@/components/secretaire/AgendaJour'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

export default function AgendaPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const [dateSelectionnee, setDateSelectionnee] = useState(new Date().toISOString().split('T')[0])
  const [rdvAnnuler, setRdvAnnuler] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)

  const isResponsableSite = utilisateur?.permissions?.responsable_site === true && utilisateur?.role === 'collaborateur'
  const { rendezVous, loading, recharger } = useRendezVous(utilisateur?.entreprise_id ?? null, {
    date: dateSelectionnee,
    destinataireId: ['patron', 'admin'].includes(utilisateur?.role ?? '') || isResponsableSite ? undefined : utilisateur?.id,
    siteId: utilisateur?.site_id ?? undefined,
  })

  const dateLabel = new Date(dateSelectionnee + 'T00:00:00').toLocaleDateString('fr-CI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const aller = (jours: number) => {
    const d = new Date(dateSelectionnee + 'T00:00:00')
    d.setDate(d.getDate() + jours)
    setDateSelectionnee(d.toISOString().split('T')[0])
  }

  const handleTerminer = async (id: string) => {
    await supabase.from('rendez_vous').update({ statut: 'termine' }).eq('id', id)
    recharger()
  }

  const confirmerAnnulation = async () => {
    if (!rdvAnnuler) return
    setLoadingAction(true)
    await supabase.from('rendez_vous').update({ statut: 'annule' }).eq('id', rdvAnnuler)
    setLoadingAction(false)
    setRdvAnnuler(null)
    recharger()
  }

  const stats = {
    confirmes: rendezVous.filter((r) => r.statut === 'confirme').length,
    termines: rendezVous.filter((r) => r.statut === 'termine').length,
    annules: rendezVous.filter((r) => r.statut === 'annule').length,
  }

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon agenda</h1>

      {/* Navigation dates */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-gray-200 p-3">
        <button onClick={() => aller(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <p className="font-semibold text-gray-900 capitalize">{dateLabel}</p>
          <p className="text-xs text-gray-500">{rendezVous.length} RDV</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateSelectionnee}
            onChange={(e) => setDateSelectionnee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => aller(1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {dateSelectionnee !== new Date().toISOString().split('T')[0] && (
        <button
          onClick={() => setDateSelectionnee(new Date().toISOString().split('T')[0])}
          className="mb-4 text-xs text-primary font-medium hover:underline"
        >
          ← Revenir à aujourd&apos;hui
        </button>
      )}

      {/* Stats du jour */}
      {rendezVous.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{stats.confirmes}</p>
            <p className="text-xs text-green-600 mt-0.5">Confirmés</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{stats.termines}</p>
            <p className="text-xs text-gray-500 mt-0.5">Terminés</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{stats.annules}</p>
            <p className="text-xs text-red-600 mt-0.5">Annulés</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous</CardTitle>
        </CardHeader>
        <AgendaJour
          rendezVous={rendezVous}
          loading={loading}
          onTerminer={handleTerminer}
          onAnnuler={(id) => setRdvAnnuler(id)}
        />
      </Card>

      <ConfirmModal
        isOpen={!!rdvAnnuler}
        onClose={() => setRdvAnnuler(null)}
        onConfirm={confirmerAnnulation}
        title="Annuler ce rendez-vous"
        message="Êtes-vous sûr de vouloir annuler ce rendez-vous ?"
        confirmLabel="Oui, annuler"
        cancelLabel="Garder le RDV"
        variant="danger"
        loading={loadingAction}
      />
    </div>
  )
}
