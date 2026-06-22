'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input, { Textarea } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import type { Utilisateur } from '@/types'
import { nomComplet } from '@/lib/utils'

export default function NouveauRdvPage() {
  const { utilisateur } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [smsSent, setSmsSent] = useState(false)

  const [titre, setTitre] = useState('')
  const [destinataireId, setDestinataireId] = useState('')
  const [nomVisiteur, setNomVisiteur] = useState('')
  const [telephoneVisiteur, setTelephoneVisiteur] = useState('')
  const [emailVisiteur, setEmailVisiteur] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [dateRdv, setDateRdv] = useState('')
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (utilisateur?.entreprise_id) {
      let q = supabase
        .from('utilisateurs')
        .select('*')
        .eq('entreprise_id', utilisateur.entreprise_id)
        .eq('actif', true)
        .in('role', ['collaborateur', 'patron', 'admin'])
        .order('nom')
      if (utilisateur.site_id) q = q.eq('site_id', utilisateur.site_id)
      q.then(({ data }) => setCollaborateurs(data ?? []))
    }
  }, [utilisateur?.entreprise_id, utilisateur?.site_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre || !destinataireId || !nomVisiteur || !dateRdv || !heureDebut) {
      setErreur('Titre, destinataire, visiteur, date et heure sont obligatoires')
      return
    }

    setLoading(true)
    setErreur(null)

    try {
      const { data: rdv, error } = await supabase
        .from('rendez_vous')
        .insert({
          entreprise_id: utilisateur!.entreprise_id,
          site_id: utilisateur!.site_id ?? null,
          titre,
          destinataire_id: destinataireId,
          cree_par: utilisateur!.id,
          nom_visiteur_externe: nomVisiteur,
          telephone_visiteur_externe: telephoneVisiteur || null,
          email_visiteur_externe: emailVisiteur || null,
          organisation_externe: organisation || null,
          date_rdv: dateRdv,
          heure_debut: heureDebut,
          heure_fin: heureFin || null,
          notes: notes || null,
          statut: 'confirme',
        })
        .select()
        .single()

      if (error) throw error

      // Notification au destinataire
      await supabase.from('notifications').insert({
        entreprise_id: utilisateur!.entreprise_id,
        destinataire_id: destinataireId,
        type: 'nouvelle_visite',
        rdv_id: rdv.id,
        titre: `Nouveau RDV : ${titre}`,
        corps: `Le ${dateRdv} à ${heureDebut} avec ${nomVisiteur}`,
      })

      // Envoyer SMS si téléphone fourni
      if (telephoneVisiteur) {
        try {
          await fetch('/api/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telephone: telephoneVisiteur,
              type: 'confirmation_rdv',
              rdvId: rdv.id,
            }),
          })
          setSmsSent(true)
        } catch {
          // SMS non bloquant
        }
      }

      router.push('/secretaire/rendez-vous')
    } catch (err) {
      setErreur('Erreur lors de la création du rendez-vous')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!utilisateur) return null

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau rendez-vous</h1>
      </div>

      <Card>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{erreur}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Titre du rendez-vous *"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Réunion de partenariat, Entretien candidat..."
            required
          />

          <Select
            label="Destinataire (collaborateur concerné) *"
            value={destinataireId}
            onChange={(e) => setDestinataireId(e.target.value)}
            options={collaborateurs.map((c) => ({
              value: c.id,
              label: `${nomComplet(c.nom, c.prenom)}${c.poste ? ` — ${c.poste}` : ''}`,
            }))}
            placeholder="Choisir un collaborateur"
            required
          />

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Visiteur externe</h3>
            <div className="space-y-3">
              <Input
                label="Nom du visiteur *"
                value={nomVisiteur}
                onChange={(e) => setNomVisiteur(e.target.value)}
                placeholder="Kouamé Yves"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Téléphone"
                  type="tel"
                  value={telephoneVisiteur}
                  onChange={(e) => setTelephoneVisiteur(e.target.value)}
                  placeholder="+225 07..."
                  hint="SMS de confirmation envoyé"
                />
                <Input
                  label="Email"
                  type="email"
                  value={emailVisiteur}
                  onChange={(e) => setEmailVisiteur(e.target.value)}
                  placeholder="yves@societe.ci"
                />
              </div>
              <Input
                label="Organisation / Société"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="Société ABC"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Date et heure</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1">
                <Input
                  label="Date *"
                  type="date"
                  value={dateRdv}
                  onChange={(e) => setDateRdv(e.target.value)}
                  min={todayStr}
                  required
                />
              </div>
              <Input
                label="Heure début *"
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                required
              />
              <Input
                label="Heure fin"
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instructions particulières, documents à apporter..."
            rows={3}
          />

          <Button type="submit" fullWidth size="lg" loading={loading}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Créer le rendez-vous
          </Button>
        </form>
      </Card>
    </div>
  )
}
