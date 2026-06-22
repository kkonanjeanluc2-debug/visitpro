'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input, { Textarea } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { Utilisateur, Visiteur, RendezVous } from '@/types'
import { nomComplet } from '@/lib/utils'

interface VisiteFormProps {
  entrepriseId: string
  enregistrePar: string
  siteId?: string
  onSuccess: (visiteId: string) => void
}

const TYPE_VISITE_OPTIONS = [
  { value: 'spontanee', label: 'Visite spontanée' },
  { value: 'rdv', label: 'Rendez-vous programmé' },
  { value: 'livraison', label: 'Livraison' },
  { value: 'autre', label: 'Autre' },
]

const URGENCE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'vip', label: 'VIP' },
]

export default function VisiteForm({ entrepriseId, enregistrePar, siteId, onSuccess }: VisiteFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [rdvDuJour, setRdvDuJour] = useState<RendezVous[]>([])
  const [suggestions, setSuggestions] = useState<Visiteur[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggRef = useRef<HTMLDivElement>(null)

  // Champs
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [telephone, setTelephone] = useState('')
  const [destinataireId, setDestinataireId] = useState('')
  const [motif, setMotif] = useState('')
  const [typeVisite, setTypeVisite] = useState('spontanee')
  const [urgence, setUrgence] = useState('normal')
  const [rdvId, setRdvId] = useState('')
  const [loadingCollab, setLoadingCollab] = useState(true)

  useEffect(() => {
    chargerCollaborateurs()
    chargerRdvDuJour()
  }, [entrepriseId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const chargerCollaborateurs = async () => {
    setLoadingCollab(true)
    let q = supabase
      .from('utilisateurs')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .eq('actif', true)
      .in('role', ['collaborateur', 'patron', 'admin'])
      .order('nom')
    if (siteId) q = q.eq('site_id', siteId)

    const { data, error } = await q
    if (error) console.error('Chargement collaborateurs:', error.message)
    setCollaborateurs(data ?? [])
    setLoadingCollab(false)
  }

  const chargerRdvDuJour = async () => {
    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('rendez_vous')
      .select('*, destinataire:utilisateurs!destinataire_id(id, nom, prenom)')
      .eq('entreprise_id', entrepriseId)
      .eq('date_rdv', today)
      .eq('statut', 'confirme')
      .order('heure_debut')
    if (siteId) q = q.eq('site_id', siteId)

    const { data } = await q
    setRdvDuJour(data ?? [])
  }

  const rechercherVisiteurs = async (recherche: string) => {
    if (recherche.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const { data } = await supabase
      .from('visiteurs')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .or(`nom.ilike.%${recherche}%,prenom.ilike.%${recherche}%,organisation.ilike.%${recherche}%`)
      .limit(5)

    setSuggestions(data ?? [])
    setShowSuggestions((data ?? []).length > 0)
  }

  const selectionnerVisiteur = (v: Visiteur) => {
    setNom(v.nom)
    setPrenom(v.prenom ?? '')
    setOrganisation(v.organisation ?? '')
    setTelephone(v.telephone ?? '')
    setShowSuggestions(false)
  }

  const lierRdv = (rdvIdSelectionne: string) => {
    setRdvId(rdvIdSelectionne)
    if (rdvIdSelectionne) {
      const rdv = rdvDuJour.find((r) => r.id === rdvIdSelectionne)
      if (rdv) {
        setDestinataireId(rdv.destinataire_id)
        setNom(rdv.nom_visiteur_externe ?? nom)
        setTelephone(rdv.telephone_visiteur_externe ?? telephone)
        setOrganisation(rdv.organisation_externe ?? organisation)
        setTypeVisite('rdv')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || !destinataireId || !motif.trim()) {
      setErreur('Nom du visiteur, destinataire et motif sont obligatoires')
      return
    }

    setLoading(true)
    setErreur(null)

    try {
      // Chercher ou créer le visiteur dans le répertoire
      let visiteurId: string | null = null

      const { data: visiteurExistant } = await supabase
        .from('visiteurs')
        .select('id')
        .eq('entreprise_id', entrepriseId)
        .eq('nom', nom.trim())
        .eq('prenom', prenom.trim() || '')
        .maybeSingle()

      if (visiteurExistant) {
        visiteurId = visiteurExistant.id
        await supabase.rpc('incrementer_visites', { visiteur_id: visiteurId })
        await supabase
          .from('visiteurs')
          .update({ derniere_visite: new Date().toISOString() })
          .eq('id', visiteurId)
      } else {
        const { data: nouveauVisiteur, error: errVisiteur } = await supabase
          .from('visiteurs')
          .insert({
            entreprise_id: entrepriseId,
            nom: nom.trim(),
            prenom: prenom.trim() || null,
            organisation: organisation.trim() || null,
            telephone: telephone.trim() || null,
            nombre_visites: 1,
            derniere_visite: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (errVisiteur) throw new Error('Visiteur : ' + errVisiteur.message)
        visiteurId = nouveauVisiteur?.id ?? null
      }

      // Créer la visite
      const { data: visite, error: errVisite } = await supabase
        .from('visites')
        .insert({
          entreprise_id: entrepriseId,
          visiteur_id: visiteurId,
          nom_visiteur: nom.trim(),
          prenom_visiteur: prenom.trim() || null,
          organisation_visiteur: organisation.trim() || null,
          telephone_visiteur: telephone.trim() || null,
          destinataire_id: destinataireId,
          enregistre_par: enregistrePar,
          motif: motif.trim(),
          type_visite: typeVisite,
          rendez_vous_id: rdvId || null,
          niveau_urgence: urgence,
          statut: 'en_attente',
          site_id: siteId ?? null,
        })
        .select()
        .single()

      if (errVisite) throw new Error('Visite : ' + errVisite.message)

      // Créer une notification pour le destinataire
      await supabase.from('notifications').insert({
        entreprise_id: entrepriseId,
        destinataire_id: destinataireId,
        type: 'nouvelle_visite',
        visite_id: visite.id,
        titre: `Nouveau visiteur : ${nomComplet(nom, prenom || undefined)}`,
        corps: `Motif : ${motif}${organisation ? ` — ${organisation}` : ''}`,
      })

      // Reset formulaire
      setNom('')
      setPrenom('')
      setOrganisation('')
      setTelephone('')
      setDestinataireId('')
      setMotif('')
      setTypeVisite('spontanee')
      setUrgence('normal')
      setRdvId('')

      onSuccess(visite.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setErreur(msg)
      console.error('VisiteForm error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erreur && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{erreur}</p>
        </div>
      )}

      {/* Visiteur */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Visiteur</h3>

        <div ref={suggRef} className="relative">
          <Input
            label="Nom *"
            value={nom}
            onChange={(e) => { setNom(e.target.value); rechercherVisiteurs(e.target.value) }}
            onFocus={() => nom.length >= 2 && setShowSuggestions(suggestions.length > 0)}
            placeholder="Kouamé"
            required
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectionnerVisiteur(v)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">{nomComplet(v.nom, v.prenom ?? undefined)}</p>
                  {v.organisation && <p className="text-xs text-gray-500">{v.organisation}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          placeholder="Jean-Pierre"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Organisation"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Société ABC"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+225 07..."
          />
        </div>
      </div>

      {/* Visite */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Visite</h3>

        {loadingCollab ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ) : collaborateurs.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 font-medium">Aucun collaborateur disponible</p>
            <p className="text-xs text-amber-600 mt-0.5">Demandez à l&apos;administrateur de créer des comptes collaborateurs.</p>
          </div>
        ) : (
          <Select
            label="Personne à voir *"
            value={destinataireId}
            onChange={(e) => setDestinataireId(e.target.value)}
            options={collaborateurs.map((c) => ({
              value: c.id,
              label: `${nomComplet(c.nom, c.prenom)}${c.poste ? ` — ${c.poste}` : ''}`,
            }))}
            placeholder="Sélectionner un collaborateur"
            required
          />
        )}

        <Textarea
          label="Motif de la visite *"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Réunion de travail, dépôt de dossier..."
          rows={2}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type de visite"
            value={typeVisite}
            onChange={(e) => setTypeVisite(e.target.value)}
            options={TYPE_VISITE_OPTIONS}
          />
          <Select
            label="Urgence"
            value={urgence}
            onChange={(e) => setUrgence(e.target.value)}
            options={URGENCE_OPTIONS}
          />
        </div>

        {typeVisite === 'rdv' && rdvDuJour.length > 0 && (
          <Select
            label="Lier à un RDV du jour"
            value={rdvId}
            onChange={(e) => lierRdv(e.target.value)}
            options={rdvDuJour.map((r) => ({
              value: r.id,
              label: `${r.heure_debut} — ${r.titre} (${r.destinataire ? nomComplet(r.destinataire.nom, r.destinataire.prenom) : ''})`,
            }))}
            placeholder="Sélectionner un RDV (optionnel)"
          />
        )}
      </div>

      <Button type="submit" fullWidth size="lg" loading={loading} variant="accent">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Enregistrer la visite
      </Button>
    </form>
  )
}
