'use client'

import { useState, useRef, useEffect } from 'react'
import { useMessages } from '@/hooks/useMessages'
import type { Utilisateur } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { nomComplet, formatHeure } from '@/lib/utils'

const MAX_CHARS = 200

interface MessageVisiteProps {
  visiteId: string
  utilisateur: Utilisateur
  destinataireId?: string
  compact?: boolean
}

export default function MessageVisite({ visiteId, utilisateur, destinataireId, compact = false }: MessageVisiteProps) {
  const { messages, loading, envoyerMessage, marquerLusVisite, nonLus } = useMessages(visiteId, utilisateur.id)
  const [texte, setTexte] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
      marquerLusVisite()
    }
  }, [messages, open])

  const envoyer = async () => {
    if (!texte.trim() || sending || texte.length > MAX_CHARS) return
    setSending(true)
    await envoyerMessage(texte, utilisateur.id, utilisateur.entreprise_id, destinataireId)
    setTexte('')
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyer()
    }
  }

  const handleTexteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) setTexte(e.target.value)
  }

  if (compact) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Messages
          {nonLus > 0 ? (
            <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {nonLus > 9 ? '9+' : nonLus}
            </span>
          ) : messages.length > 0 ? (
            <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          ) : null}
        </button>

        {open && (
          <div className="mt-2 border border-blue-200 rounded-xl overflow-hidden bg-blue-50/50">
            <div className="max-h-48 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {loading ? (
                <p className="text-xs text-gray-400">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Aucun message</p>
              ) : (
                messages.map((m) => {
                  const estMoi = m.auteur_id === utilisateur.id
                  return (
                    <div key={m.id} className={`flex gap-2 ${estMoi ? 'flex-row-reverse' : ''}`}>
                      <Avatar
                        nom={m.auteur?.nom ?? '?'}
                        prenom={m.auteur?.prenom}
                        photoUrl={(m.auteur as any)?.photo_url}
                        size="sm"
                        className="flex-shrink-0 mt-0.5"
                      />
                      <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-xs
                        ${estMoi ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                        {!estMoi && (
                          <p className="font-semibold text-blue-700 text-[10px] mb-0.5">
                            {nomComplet(m.auteur?.nom ?? '', m.auteur?.prenom)}
                          </p>
                        )}
                        <p>{m.corps}</p>
                        <p className={`text-[10px] mt-0.5 ${estMoi ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatHeure(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="p-2 bg-white border-t border-blue-200 space-y-1">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={texte}
                  onChange={handleTexteChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Écrire un message… (Entrée pour envoyer)"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={envoyer}
                  disabled={!texte.trim() || sending || texte.length > MAX_CHARS}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-end">
                <span className={`text-[10px] ${texte.length > MAX_CHARS * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                  {texte.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mode plein écran
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm">Chargement…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">Aucun message</p>
            <p className="text-xs mt-1">Envoyez un message à la secrétaire ou au collaborateur</p>
          </div>
        ) : (
          messages.map((m) => {
            const estMoi = m.auteur_id === utilisateur.id
            return (
              <div key={m.id} className={`flex gap-3 ${estMoi ? 'flex-row-reverse' : ''}`}>
                <Avatar
                  nom={m.auteur?.nom ?? '?'}
                  prenom={m.auteur?.prenom}
                  photoUrl={(m.auteur as any)?.photo_url}
                  size="sm"
                  className="flex-shrink-0 mt-0.5"
                />
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm
                  ${estMoi ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {!estMoi && (
                    <p className="font-semibold text-primary text-xs mb-1">
                      {nomComplet(m.auteur?.nom ?? '', m.auteur?.prenom)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.corps}</p>
                  <p className={`text-xs mt-1 ${estMoi ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                    {formatHeure(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-gray-200 space-y-1">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={texte}
            onChange={handleTexteChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={envoyer}
            disabled={!texte.trim() || sending || texte.length > MAX_CHARS}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0 self-end"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="flex justify-end">
          <span className={`text-xs ${texte.length > MAX_CHARS * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
            {texte.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  )
}
