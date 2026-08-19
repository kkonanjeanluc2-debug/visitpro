'use client'

import { useState } from 'react'
import type { Utilisateur, ReunionParticipant, StatutParticipant } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const PRESENCE_LABEL: Record<StatutParticipant, string> = {
  invite: 'Invité', confirme: 'Présent', absent: 'Absent', excuse: 'Excusé',
}
const PRESENCE_CLS: Record<StatutParticipant, string> = {
  invite: 'bg-blue-50 text-blue-600',
  confirme: 'bg-emerald-50 text-emerald-600',
  absent: 'bg-red-50 text-red-600',
  excuse: 'bg-amber-50 text-amber-600',
}

interface Props {
  collaborateurs: Utilisateur[]
  participants: ReunionParticipant[]
  onAjouterInterne: (userId: string) => Promise<void>
  onAjouterExterne: (nom: string, email?: string) => Promise<void>
  onSupprimer: (id: string) => Promise<void>
  onChangerPresence?: (id: string, statut: StatutParticipant) => Promise<void>
  readOnly?: boolean
}

export default function ParticipantsSelector({
  collaborateurs, participants, onAjouterInterne, onAjouterExterne, onSupprimer, onChangerPresence, readOnly,
}: Props) {
  const [nomExterne, setNomExterne] = useState('')
  const [emailExterne, setEmailExterne] = useState('')
  const [ajoutExterne, setAjoutExterne] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const idsDejaPresents = new Set(participants.map((p) => p.utilisateur_id).filter(Boolean))

  const handleAjouterInterne = async (userId: string) => {
    setLoading(userId)
    try { await onAjouterInterne(userId) } finally { setLoading(null) }
  }

  const handleAjouterExterne = async () => {
    if (!nomExterne.trim()) return
    setLoading('externe')
    try {
      await onAjouterExterne(nomExterne.trim(), emailExterne.trim() || undefined)
      setNomExterne(''); setEmailExterne(''); setAjoutExterne(false)
    } finally { setLoading(null) }
  }

  const handleSupprimer = async (id: string) => {
    setLoading(id)
    try { await onSupprimer(id) } finally { setLoading(null) }
  }

  return (
    <div className="space-y-4">
      {/* Liste des participants actuels */}
      {participants.length > 0 && (
        <div className="space-y-1.5">
          {participants.map((p) => {
            const nom = p.utilisateur
              ? `${p.utilisateur.prenom} ${p.utilisateur.nom}`
              : (p.nom_externe ?? '')
            return (
              <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group">
                {p.utilisateur ? (
                  <Avatar nom={p.utilisateur.nom} prenom={p.utilisateur.prenom} photoUrl={p.utilisateur.photo_url ?? undefined} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
                    {nom.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{nom}</p>
                  {p.utilisateur?.poste && (
                    <p className="text-xs text-gray-400 truncate">{p.utilisateur.poste}</p>
                  )}
                  {p.email_externe && (
                    <p className="text-xs text-gray-400 truncate">{p.email_externe}</p>
                  )}
                </div>

                {onChangerPresence && !readOnly ? (
                  <select
                    value={p.statut_presence}
                    onChange={(e) => onChangerPresence(p.id, e.target.value as StatutParticipant)}
                    className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${PRESENCE_CLS[p.statut_presence]}`}
                  >
                    {(Object.keys(PRESENCE_LABEL) as StatutParticipant[]).map((s) => (
                      <option key={s} value={s}>{PRESENCE_LABEL[s]}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRESENCE_CLS[p.statut_presence]}`}>
                    {PRESENCE_LABEL[p.statut_presence]}
                  </span>
                )}

                {!readOnly && (
                  <button
                    onClick={() => handleSupprimer(p.id)}
                    disabled={loading === p.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <div className="space-y-3">
          {/* Ajouter des collaborateurs internes */}
          {collaborateurs.filter((c) => !idsDejaPresents.has(c.id)).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Ajouter un collaborateur</p>
              <div className="flex flex-wrap gap-2">
                {collaborateurs
                  .filter((c) => !idsDejaPresents.has(c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAjouterInterne(c.id)}
                      disabled={loading === c.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-[rgb(var(--color-primary-rgb))] hover:text-[rgb(var(--color-primary-rgb))] transition-colors disabled:opacity-50"
                    >
                      <Avatar nom={c.nom} prenom={c.prenom} photoUrl={c.photo_url ?? undefined} size="sm" />
                      {c.prenom} {c.nom}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Ajouter un externe */}
          {!ajoutExterne ? (
            <button
              onClick={() => setAjoutExterne(true)}
              className="flex items-center gap-2 text-sm text-[rgb(var(--color-primary-rgb))] hover:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Ajouter un participant externe
            </button>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Participant externe</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Nom complet"
                  value={nomExterne}
                  onChange={(e) => setNomExterne(e.target.value)}
                  placeholder="Jean Dupont"
                />
                <Input
                  label="Email (optionnel)"
                  type="email"
                  value={emailExterne}
                  onChange={(e) => setEmailExterne(e.target.value)}
                  placeholder="jean@exemple.com"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAjouterExterne} loading={loading === 'externe'}>
                  Ajouter
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAjoutExterne(false); setNomExterne(''); setEmailExterne('') }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
