'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Visiteur } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { nomComplet, formatDate } from '@/lib/utils'

export default function VisiteursPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [visiteurs, setVisiteurs] = useState<Visiteur[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreVip, setFiltreVip] = useState(false)

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    supabase
      .from('visiteurs')
      .select('*')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .order('derniere_visite', { ascending: false, nullsFirst: false })
      .then(({ data }) => { setVisiteurs(data ?? []); setLoading(false) })
  }, [utilisateur?.entreprise_id])

  const filtres = visiteurs.filter(v => {
    if (filtreVip && !v.est_vip) return false
    if (recherche) {
      const q = recherche.toLowerCase()
      return (
        v.nom.toLowerCase().includes(q) ||
        (v.prenom ?? '').toLowerCase().includes(q) ||
        (v.organisation ?? '').toLowerCase().includes(q) ||
        (v.telephone ?? '').includes(q)
      )
    }
    return true
  })

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visiteurs</h1>
        <span className="text-sm text-gray-500">{visiteurs.length} visiteur{visiteurs.length !== 1 ? 's' : ''} enregistré{visiteurs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Barre de recherche + filtre VIP */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, organisation, téléphone..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        <button
          onClick={() => setFiltreVip(!filtreVip)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
            ${filtreVip ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
        >
          <span>👑</span> VIP
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-20" />)}
        </div>
      ) : filtres.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="font-medium">{recherche || filtreVip ? 'Aucun visiteur trouvé' : 'Aucun visiteur enregistré'}</p>
          {!recherche && !filtreVip && (
            <p className="text-sm mt-1">Les visiteurs apparaîtront ici après leur première visite.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtres.map(v => (
            <Link
              key={v.id}
              href={`/secretaire/visiteurs/${v.id}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar nom={v.nom} prenom={v.prenom} size="md" />
                {v.est_vip && (
                  <span className="absolute -top-1 -right-1 text-base">⭐</span>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                    {nomComplet(v.nom, v.prenom)}
                  </p>
                  {v.est_vip && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-300">VIP</span>
                  )}
                </div>
                {v.organisation && (
                  <p className="text-sm text-gray-500 truncate">{v.organisation}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {v.telephone && <span>{v.telephone}</span>}
                  {v.derniere_visite && (
                    <span>Dernière visite : {formatDate(v.derniere_visite)}</span>
                  )}
                </div>
              </div>

              {/* Badges droite */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {v.nombre_visites} visite{v.nombre_visites !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  {v.preferences && (
                    <span title="Préférences enregistrées" className="text-base leading-none">💛</span>
                  )}
                  {v.sujets_historique && v.sujets_historique.length > 0 && (
                    <span title={`${v.sujets_historique.length} sujet(s) abordé(s)`}
                      className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                      📋 {v.sujets_historique.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Flèche */}
              <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
