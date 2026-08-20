'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReunionPreparation, ReunionPoint, StatutPreparation, TypePreparation } from '@/types'
import {
  ajouterPreparation, modifierPreparation, supprimerPreparation,
  type CreatePreparationInput,
} from '@/lib/reunions'
import PreparationItem from './PreparationItem'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const TYPE_OPTIONS: { value: TypePreparation; label: string; icon: string }[] = [
  { value: 'note',     label: 'Note',     icon: '📝' },
  { value: 'document', label: 'Document', icon: '📄' },
  { value: 'action',   label: 'Action',   icon: '✅' },
  { value: 'question', label: 'Question', icon: '❓' },
]

interface Props {
  reunionId: string
  utilisateurId: string
  points: ReunionPoint[]
  initialItems?: ReunionPreparation[]
  readOnly?: boolean
}

export default function PreparationBoard({ reunionId, utilisateurId, points, initialItems = [], readOnly }: Props) {
  const [items, setItems] = useState<ReunionPreparation[]>(initialItems)
  const [filtrType, setFiltrType] = useState<TypePreparation | 'tous'>('tous')
  const [filtrPoint, setFiltrPoint] = useState<string>('tous')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<TypePreparation>('note')
  const [formTitre, setFormTitre] = useState('')
  const [formContenu, setFormContenu] = useState('')
  const [formPoint, setFormPoint] = useState('')
  const [loading, setLoading] = useState(false)
  // Champs spécifiques par type
  const [formUrl, setFormUrl] = useState('')
  const [formResponsable, setFormResponsable] = useState('')
  const [formEcheance, setFormEcheance] = useState('')
  const [formDestinataire, setFormDestinataire] = useState('')

  const handleChangeType = (type: TypePreparation) => {
    setFormType(type)
    setFormContenu('')
    setFormUrl('')
    setFormResponsable('')
    setFormEcheance('')
    setFormDestinataire('')
  }

  // Realtime sur la table preparations
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`prep-board-${reunionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'reunion_preparations',
        filter: `reunion_id=eq.${reunionId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => [...prev, payload.new as ReunionPreparation])
        } else if (payload.eventType === 'UPDATE') {
          setItems((prev) => prev.map((i) => i.id === payload.new.id ? { ...i, ...payload.new } : i))
        } else if (payload.eventType === 'DELETE') {
          setItems((prev) => prev.filter((i) => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [reunionId])

  const serializerContenu = (): string | undefined => {
    if (formType === 'note') return formContenu.trim() || undefined
    if (formType === 'document') {
      if (!formUrl.trim()) return formContenu.trim() || undefined
      return JSON.stringify({ url: formUrl.trim(), description: formContenu.trim() || undefined })
    }
    if (formType === 'action') {
      const data: Record<string, string> = {}
      if (formResponsable.trim()) data.responsable = formResponsable.trim()
      if (formEcheance) data.echeance = formEcheance
      if (formContenu.trim()) data.note = formContenu.trim()
      return Object.keys(data).length ? JSON.stringify(data) : undefined
    }
    if (formType === 'question') {
      return JSON.stringify({
        question: formContenu.trim() || undefined,
        destinataire: formDestinataire.trim() || undefined,
      })
    }
    return formContenu.trim() || undefined
  }

  const handleAjouter = async () => {
    if (!formTitre.trim()) return
    setLoading(true)
    try {
      const input: CreatePreparationInput = {
        type: formType,
        titre: formTitre.trim(),
        contenu: serializerContenu(),
        point_id: formPoint || undefined,
      }
      await ajouterPreparation(reunionId, utilisateurId, input)
      setFormTitre(''); setFormContenu(''); setFormPoint('')
      setFormUrl(''); setFormResponsable(''); setFormEcheance(''); setFormDestinataire('')
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleModifier = useCallback(async (id: string, statut: StatutPreparation) => {
    await modifierPreparation(id, { statut })
  }, [])

  const handleSupprimer = useCallback(async (id: string) => {
    await supprimerPreparation(id)
  }, [])

  const filtered = items.filter((i) => {
    if (filtrType !== 'tous' && i.type !== filtrType) return false
    if (filtrPoint !== 'tous' && i.point_id !== filtrPoint) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltrType('tous')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtrType === 'tous' ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tous
        </button>
        {TYPE_OPTIONS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setFiltrType(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtrType === value ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {icon} {label}
          </button>
        ))}

        {points.length > 0 && (
          <select
            value={filtrPoint}
            onChange={(e) => setFiltrPoint(e.target.value)}
            className="ml-auto px-3 py-1 text-xs border border-gray-200 rounded-full outline-none focus:border-[rgb(var(--color-primary-rgb))] bg-white"
          >
            <option value="tous">Tous les points</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>{p.titre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Aucune préparation{filtrType !== 'tous' ? ' pour ce filtre' : ''}</p>
        ) : (
          filtered.map((item) => (
            <PreparationItem
              key={item.id}
              item={item}
              canEdit={!readOnly && (item.auteur_id === utilisateurId)}
              onModifier={(statut) => handleModifier(item.id, statut)}
              onSupprimer={() => handleSupprimer(item.id)}
            />
          ))
        )}
      </div>

      {/* Formulaire d'ajout */}
      {!readOnly && (
        showForm ? (
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
            {/* Sélecteur de type */}
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChangeType(value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${formType === value ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/5 text-[rgb(var(--color-primary-rgb))]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Titre commun à tous les types */}
            <Input
              label="Titre"
              value={formTitre}
              onChange={(e) => setFormTitre(e.target.value)}
              placeholder={
                formType === 'note' ? 'Titre de la note' :
                formType === 'document' ? 'Nom du document' :
                formType === 'action' ? 'Description de l\'action' :
                'Intitulé de la question'
              }
            />

            {/* Champs dynamiques par type */}
            {formType === 'note' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contenu <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea
                  value={formContenu}
                  onChange={(e) => setFormContenu(e.target.value)}
                  rows={3}
                  placeholder="Votre note, remarques, idées…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none"
                />
              </div>
            )}

            {formType === 'document' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">URL / Lien</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <textarea
                    value={formContenu}
                    onChange={(e) => setFormContenu(e.target.value)}
                    rows={2}
                    placeholder="Brève description du document…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none"
                  />
                </div>
              </>
            )}

            {formType === 'action' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Responsable</label>
                    <input
                      type="text"
                      value={formResponsable}
                      onChange={(e) => setFormResponsable(e.target.value)}
                      placeholder="Nom du responsable"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Échéance</label>
                    <input
                      type="date"
                      value={formEcheance}
                      onChange={(e) => setFormEcheance(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Note <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <textarea
                    value={formContenu}
                    onChange={(e) => setFormContenu(e.target.value)}
                    rows={2}
                    placeholder="Précisions sur l'action…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none"
                  />
                </div>
              </>
            )}

            {formType === 'question' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Question détaillée</label>
                  <textarea
                    value={formContenu}
                    onChange={(e) => setFormContenu(e.target.value)}
                    rows={3}
                    placeholder="Développez votre question…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Adressée à <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input
                    type="text"
                    value={formDestinataire}
                    onChange={(e) => setFormDestinataire(e.target.value)}
                    placeholder="Nom ou rôle de la personne concernée"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))]"
                  />
                </div>
              </>
            )}

            {/* Point associé (tous les types) */}
            {points.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Point de l'ordre du jour <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <select
                  value={formPoint}
                  onChange={(e) => setFormPoint(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[rgb(var(--color-primary-rgb))]"
                >
                  <option value="">Général (aucun point)</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>{p.titre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAjouter} loading={loading}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => {
                setShowForm(false)
                setFormTitre(''); setFormContenu(''); setFormPoint('')
                setFormUrl(''); setFormResponsable(''); setFormEcheance(''); setFormDestinataire('')
              }}>Annuler</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[rgb(var(--color-primary-rgb))] border-2 border-dashed border-gray-200 rounded-xl hover:border-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-rgb))]/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une préparation
          </button>
        )
      )}
    </div>
  )
}
