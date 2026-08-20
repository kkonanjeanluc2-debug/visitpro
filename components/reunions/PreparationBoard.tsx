'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReunionPreparation, ReunionPoint, StatutPreparation, TypePreparation, Utilisateur } from '@/types'
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

const INPUT_CLS = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))]'
const LABEL_CLS = 'text-sm font-medium text-gray-700 mb-1.5 block'

interface Props {
  reunionId: string
  utilisateurId: string
  points: ReunionPoint[]
  collaborateurs?: Utilisateur[]
  initialItems?: ReunionPreparation[]
  readOnly?: boolean
}

export default function PreparationBoard({
  reunionId, utilisateurId, points, collaborateurs = [], initialItems = [], readOnly,
}: Props) {
  const [items, setItems] = useState<ReunionPreparation[]>(initialItems)
  const [filtrType, setFiltrType] = useState<TypePreparation | 'tous'>('tous')
  const [filtrPoint, setFiltrPoint] = useState<string>('tous')
  const [showForm, setShowForm] = useState(false)

  // Champs communs
  const [formType, setFormType] = useState<TypePreparation>('note')
  const [formTitre, setFormTitre] = useState('')
  const [formContenu, setFormContenu] = useState('')
  const [formPoint, setFormPoint] = useState('')
  const [loading, setLoading] = useState(false)

  // Document : URL ou fichier
  const [docMode, setDocMode] = useState<'url' | 'file'>('url')
  const [formUrl, setFormUrl] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Action
  const [formResponsable, setFormResponsable] = useState('')
  const [formEcheance, setFormEcheance] = useState('')

  // Question
  const [formDestinataire, setFormDestinataire] = useState('')

  const resetForm = () => {
    setFormTitre(''); setFormContenu(''); setFormPoint('')
    setDocMode('url'); setFormUrl(''); setFormFile(null)
    setFormResponsable(''); setFormEcheance(''); setFormDestinataire('')
  }

  const handleChangeType = (type: TypePreparation) => {
    setFormType(type)
    resetForm()
  }

  // Chargement initial des préparations existantes
  useEffect(() => {
    let cancelled = false
    createClient()
      .from('reunion_preparations')
      .select('*, auteur:utilisateurs(id, nom, prenom, photo_url)')
      .eq('reunion_id', reunionId)
      .order('created_at')
      .then(({ data }) => { if (!cancelled && data) setItems(data as ReunionPreparation[]) })
    return () => { cancelled = true }
  }, [reunionId])

  // Realtime — mises à jour en temps réel depuis d'autres utilisateurs
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`prep-board-${reunionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'reunion_preparations',
        filter: `reunion_id=eq.${reunionId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') setItems((p) => [...p.filter((i) => i.id !== (payload.new as ReunionPreparation).id), payload.new as ReunionPreparation])
        else if (payload.eventType === 'UPDATE') setItems((p) => p.map((i) => i.id === payload.new.id ? { ...i, ...payload.new } : i))
        else if (payload.eventType === 'DELETE') setItems((p) => p.filter((i) => i.id !== payload.old.id))
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [reunionId])

  const handleAjouter = async () => {
    if (!formTitre.trim()) return
    setLoading(true)
    try {
      let contenu: string | undefined

      if (formType === 'note') {
        contenu = formContenu.trim() || undefined
      } else if (formType === 'document') {
        if (docMode === 'file' && formFile) {
          const sb = createClient()
          const ext = formFile.name.split('.').pop() ?? ''
          const path = `${reunionId}/${Date.now()}.${ext}`
          const { data: up, error } = await sb.storage.from('preparations').upload(path, formFile, { upsert: false })
          if (error) throw error
          const { data: { publicUrl } } = sb.storage.from('preparations').getPublicUrl(up.path)
          contenu = JSON.stringify({ url: publicUrl, filename: formFile.name, isFile: true, description: formContenu.trim() || undefined })
        } else {
          const url = formUrl.trim()
          contenu = url ? JSON.stringify({ url, description: formContenu.trim() || undefined }) : (formContenu.trim() || undefined)
        }
      } else if (formType === 'action') {
        const d: Record<string, string> = {}
        if (formResponsable.trim()) d.responsable = formResponsable.trim()
        if (formEcheance) d.echeance = formEcheance
        if (formContenu.trim()) d.note = formContenu.trim()
        contenu = Object.keys(d).length ? JSON.stringify(d) : undefined
      } else if (formType === 'question') {
        contenu = JSON.stringify({ question: formContenu.trim() || undefined, destinataire: formDestinataire.trim() || undefined })
      }

      const input: CreatePreparationInput = { type: formType, titre: formTitre.trim(), contenu, point_id: formPoint || undefined }
      const newItem = await ajouterPreparation(reunionId, utilisateurId, input)
      setItems((p) => [...p.filter((i) => i.id !== newItem.id), newItem])
      resetForm()
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleModifier = useCallback(async (id: string, statut: StatutPreparation) => {
    setItems((p) => p.map((i) => i.id === id ? { ...i, statut } : i))
    await modifierPreparation(id, { statut })
  }, [])

  const handleSupprimer = useCallback(async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id))
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
            {points.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
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
              canEdit={!readOnly && item.auteur_id === utilisateurId}
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
            {/* Type */}
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

            {/* Titre */}
            <Input
              label="Titre"
              value={formTitre}
              onChange={(e) => setFormTitre(e.target.value)}
              placeholder={
                formType === 'note' ? 'Titre de la note' :
                formType === 'document' ? 'Nom du document' :
                formType === 'action' ? "Description de l'action" :
                'Intitulé de la question'
              }
            />

            {/* ── Note ── */}
            {formType === 'note' && (
              <div>
                <label className={LABEL_CLS}>Contenu <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea value={formContenu} onChange={(e) => setFormContenu(e.target.value)} rows={3}
                  placeholder="Votre note, remarques, idées…" className={`${INPUT_CLS} resize-none`} />
              </div>
            )}

            {/* ── Document ── */}
            {formType === 'document' && (
              <>
                {/* Toggle URL / Fichier */}
                <div>
                  <label className={LABEL_CLS}>Source</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDocMode('url'); setFormFile(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${docMode === 'url' ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/5 text-[rgb(var(--color-primary-rgb))]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Lien URL
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDocMode('file'); setFormUrl('') }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${docMode === 'file' ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/5 text-[rgb(var(--color-primary-rgb))]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Importer un fichier
                    </button>
                  </div>
                </div>

                {docMode === 'url' ? (
                  <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://…" className={INPUT_CLS} />
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full px-3 py-3 border-2 border-dashed rounded-xl text-sm transition-colors ${formFile ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/5 text-[rgb(var(--color-primary-rgb))]' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                    >
                      {formFile ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formFile.name}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Cliquez pour sélectionner un fichier
                        </span>
                      )}
                    </button>
                  </div>
                )}

                <div>
                  <label className={LABEL_CLS}>Description <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <textarea value={formContenu} onChange={(e) => setFormContenu(e.target.value)} rows={2}
                    placeholder="Brève description du document…" className={`${INPUT_CLS} resize-none`} />
                </div>
              </>
            )}

            {/* ── Action ── */}
            {formType === 'action' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Responsable</label>
                    {collaborateurs.length > 0 ? (
                      <select
                        value={formResponsable}
                        onChange={(e) => setFormResponsable(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="">— Sélectionner —</option>
                        {collaborateurs.map((c) => (
                          <option key={c.id} value={`${c.prenom} ${c.nom}`}>
                            {c.prenom} {c.nom}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={formResponsable} onChange={(e) => setFormResponsable(e.target.value)}
                        placeholder="Nom du responsable" className={INPUT_CLS} />
                    )}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Échéance</label>
                    <input type="date" value={formEcheance} onChange={(e) => setFormEcheance(e.target.value)} className={INPUT_CLS} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Note <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <textarea value={formContenu} onChange={(e) => setFormContenu(e.target.value)} rows={2}
                    placeholder="Précisions sur l'action…" className={`${INPUT_CLS} resize-none`} />
                </div>
              </>
            )}

            {/* ── Question ── */}
            {formType === 'question' && (
              <>
                <div>
                  <label className={LABEL_CLS}>Question détaillée</label>
                  <textarea value={formContenu} onChange={(e) => setFormContenu(e.target.value)} rows={3}
                    placeholder="Développez votre question…" className={`${INPUT_CLS} resize-none`} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Adressée à <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  {collaborateurs.length > 0 ? (
                    <select value={formDestinataire} onChange={(e) => setFormDestinataire(e.target.value)} className={INPUT_CLS}>
                      <option value="">— Sélectionner —</option>
                      {collaborateurs.map((c) => (
                        <option key={c.id} value={`${c.prenom} ${c.nom}`}>{c.prenom} {c.nom}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={formDestinataire} onChange={(e) => setFormDestinataire(e.target.value)}
                      placeholder="Nom ou rôle de la personne concernée" className={INPUT_CLS} />
                  )}
                </div>
              </>
            )}

            {/* Point associé */}
            {points.length > 0 && (
              <div>
                <label className={LABEL_CLS}>Point de l'ordre du jour <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <select value={formPoint} onChange={(e) => setFormPoint(e.target.value)} className={INPUT_CLS}>
                  <option value="">Général (aucun point)</option>
                  {points.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAjouter} loading={loading}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(false) }}>Annuler</Button>
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
