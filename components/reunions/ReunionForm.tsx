'use client'

import { useState } from 'react'
import type { TypeReunion } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export interface ReunionFormData {
  titre: string
  type: TypeReunion
  date_reunion: string
  heure_debut: string
  heure_fin: string
  lieu: string
  description: string
}

interface Props {
  defaultValues?: Partial<ReunionFormData>
  onSubmit: (data: ReunionFormData) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const TYPE_OPTIONS: { value: TypeReunion; label: string }[] = [
  { value: 'interne',  label: 'Réunion interne' },
  { value: 'externe',  label: 'Réunion externe' },
  { value: 'comite',   label: 'Comité' },
  { value: 'autre',    label: 'Autre' },
]

export default function ReunionForm({ defaultValues = {}, onSubmit, onCancel, submitLabel = 'Créer la réunion' }: Props) {
  const [titre, setTitre] = useState(defaultValues.titre ?? '')
  const [type, setType] = useState<TypeReunion>(defaultValues.type ?? 'interne')
  const [date, setDate] = useState(defaultValues.date_reunion ?? '')
  const [heureDebut, setHeureDebut] = useState(defaultValues.heure_debut ?? '')
  const [heureFin, setHeureFin] = useState(defaultValues.heure_fin ?? '')
  const [lieu, setLieu] = useState(defaultValues.lieu ?? '')
  const [description, setDescription] = useState(defaultValues.description ?? '')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur(null)
    if (!titre.trim()) { setErreur('Le titre est obligatoire'); return }
    if (!date) { setErreur('La date est obligatoire'); return }
    if (!heureDebut) { setErreur('L\'heure de début est obligatoire'); return }

    setLoading(true)
    try {
      await onSubmit({ titre: titre.trim(), type, date_reunion: date, heure_debut: heureDebut, heure_fin: heureFin, lieu: lieu.trim(), description: description.trim() })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {erreur && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {erreur}
        </div>
      )}

      <Input
        label="Titre de la réunion"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Ex : Réunion de direction — Août 2026"
        required
      />

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type de réunion</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                type === value
                  ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/5 text-[rgb(var(--color-primary-rgb))]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Heure de début"
          type="time"
          value={heureDebut}
          onChange={(e) => setHeureDebut(e.target.value)}
          required
        />
        <Input
          label="Heure de fin"
          type="time"
          value={heureFin}
          onChange={(e) => setHeureFin(e.target.value)}
        />
      </div>

      <Input
        label="Lieu"
        value={lieu}
        onChange={(e) => setLieu(e.target.value)}
        placeholder="Salle de conférence, Zoom, …"
      />

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Objectifs, contexte, informations importantes…"
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] outline-none resize-none transition"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        )}
      </div>
    </form>
  )
}
