'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useVisitesAujourdhui } from '@/hooks/useVisites'
import VisiteForm from '@/components/secretaire/VisiteForm'
import VisiteCard from '@/components/secretaire/VisiteCard'
import BadgeVisiteur from '@/components/secretaire/BadgeVisiteur'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import type { Visite, Entreprise } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { nomComplet } from '@/lib/utils'

export default function AccueilSecretairePage() {
  const { utilisateur } = useAuth()
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [nouvelleVisite, setNouvelleVisite] = useState<Visite | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const supabase = createClient()

  const { visites, loading } = useVisitesAujourdhui(utilisateur?.entreprise_id ?? null)

  useEffect(() => {
    if (utilisateur?.entreprise_id) {
      supabase
        .from('entreprises')
        .select('*')
        .eq('id', utilisateur.entreprise_id)
        .single()
        .then(({ data }) => setEntreprise(data))
    }
  }, [utilisateur?.entreprise_id])

  const handleVisiteCreee = async (visiteId: string) => {
    const { data } = await supabase
      .from('visites')
      .select('*, destinataire:utilisateurs!destinataire_id(id, nom, prenom, poste)')
      .eq('id', visiteId)
      .single()

    if (data) {
      setNouvelleVisite(data)
      setShowSuccessModal(true)
    }
  }

  const handleFaireEntrer = async (visiteId: string) => {
    await supabase
      .from('visites')
      .update({
        statut: 'en_cours',
        heure_entree: new Date().toISOString(),
      })
      .eq('id', visiteId)
  }

  const visitesFiltrees = filtreStatut === 'tous'
    ? visites
    : visites.filter((v) => v.statut === filtreStatut)

  const stats = {
    total: visites.length,
    enAttente: visites.filter((v) => v.statut === 'en_attente').length,
    acceptees: visites.filter((v) => v.statut === 'acceptee' || v.statut === 'en_cours').length,
    terminees: visites.filter((v) => v.statut === 'terminee' || v.statut === 'declinee').length,
  }

  const FILTRES = [
    { key: 'tous', label: `Toutes (${stats.total})` },
    { key: 'en_attente', label: `En attente (${stats.enAttente})` },
    { key: 'acceptee', label: 'Acceptées' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'terminee', label: 'Terminées' },
    { key: 'declinee', label: 'Déclinées' },
  ]

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {utilisateur.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">Enregistrez les visiteurs et gérez l&apos;accueil</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Formulaire */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Enregistrer une visite</CardTitle>
            </CardHeader>
            <VisiteForm
              entrepriseId={utilisateur.entreprise_id}
              enregistrePar={utilisateur.id}
              siteId={utilisateur.site_id ?? undefined}
              onSuccess={handleVisiteCreee}
            />
          </Card>
        </div>

        {/* Liste visites du jour */}
        <div className="xl:col-span-3">
          <Card noPadding>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Visites du jour</h2>
                <span className="text-sm text-gray-500">{visites.length} visite(s)</span>
              </div>
              {/* Filtres */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {FILTRES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFiltreStatut(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                      ${filtreStatut === f.key
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
                ))
              ) : visitesFiltrees.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm">Aucune visite pour ce filtre</p>
                </div>
              ) : (
                visitesFiltrees.map((visite) => (
                  <VisiteCard
                    key={visite.id}
                    visite={visite}
                    afficherActions
                    onFaireEntrer={handleFaireEntrer}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal succès */}
      {nouvelleVisite && entreprise && (
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Visite enregistrée ✓"
          size="sm"
          footer={
            <>
              {entreprise && (
                <BadgeVisiteur
                  visite={nouvelleVisite}
                  entreprise={entreprise}
                  numeroIndex={visites.length}
                  nomSite={utilisateur?.site?.nom}
                />
              )}
              <Button onClick={() => setShowSuccessModal(false)}>
                Fermer
              </Button>
            </>
          }
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">
              {nomComplet(nouvelleVisite.nom_visiteur, nouvelleVisite.prenom_visiteur ?? undefined)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Notification envoyée à{' '}
              <strong>{nouvelleVisite.destinataire ? nomComplet(nouvelleVisite.destinataire.nom, nouvelleVisite.destinataire.prenom) : '...'}</strong>
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
