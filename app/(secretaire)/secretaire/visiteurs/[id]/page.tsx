'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Visiteur, Visite } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { nomComplet, formatHeure, formatDate, formatDuree } from '@/lib/utils'
import Link from 'next/link'

export default function FicheVisiteurPage() {
  const params = useParams()
  const router = useRouter()
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const visiteurId = params.id as string

  const [visiteur, setVisiteur] = useState<Visiteur | null>(null)
  const [visites, setVisites] = useState<Visite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visiteurId || !utilisateur) return
    charger()
  }, [visiteurId, utilisateur])

  const charger = async () => {
    setLoading(true)
    const [{ data: v }, { data: hist }] = await Promise.all([
      supabase
        .from('visiteurs')
        .select('*')
        .eq('id', visiteurId)
        .eq('entreprise_id', utilisateur!.entreprise_id)
        .single(),
      supabase
        .from('visites')
        .select('*, destinataire:utilisateurs!destinataire_id(id, nom, prenom, poste)')
        .eq('visiteur_id', visiteurId)
        .order('heure_arrivee', { ascending: false })
        .limit(5),
    ])

    if (!v) { router.push('/secretaire'); return }
    setVisiteur(v)
    setVisites(hist ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!visiteur) return null

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <Link href="/secretaire" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour à l&apos;accueil
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche — identité */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <Avatar nom={visiteur.nom} prenom={visiteur.prenom} size="xl" />
                {visiteur.est_vip && (
                  <span className="absolute -top-1 -right-1 text-xl" title="Visiteur VIP">⭐</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    {nomComplet(visiteur.nom, visiteur.prenom)}
                  </h1>
                  {visiteur.est_vip && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-300">
                      VIP
                    </span>
                  )}
                </div>
                {visiteur.organisation && (
                  <p className="text-sm text-gray-500 mt-1">{visiteur.organisation}</p>
                )}
              </div>

              <div className="w-full space-y-2 text-sm text-left pt-2 border-t border-gray-100">
                {visiteur.telephone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {visiteur.telephone}
                  </div>
                )}
                {visiteur.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {visiteur.email}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500">Visites totales</span>
                  <span className="font-bold text-primary">{visiteur.nombre_visites}</span>
                </div>
                {visiteur.derniere_visite && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Dernière visite</span>
                    <span className="text-gray-700 text-xs">{formatDate(visiteur.derniere_visite)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Préférences — lecture seule, encadré vert */}
          {visiteur.preferences && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">💛</span>
                <div>
                  <p className="text-xs font-semibold text-green-800 mb-1">Préférences</p>
                  <p className="text-sm text-green-700">{visiteur.preferences}</p>
                </div>
              </div>
            </div>
          )}

          {/* Historique des sujets abordés */}
          {visiteur.sujets_historique && visiteur.sujets_historique.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📋</span>
                <p className="text-xs font-semibold text-blue-800">Sujets abordés lors des visites</p>
              </div>
              <ul className="space-y-1">
                {[...visiteur.sujets_historique].reverse().map((sujet, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-blue-700">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                    <span>{sujet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Colonne droite — 5 dernières visites */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                5 dernières visites
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {visites.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-sm">Aucune visite enregistrée</p>
                </div>
              ) : (
                visites.map((v) => (
                  <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{v.motif}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${v.statut === 'acceptee' || v.statut === 'en_cours' ? 'bg-green-100 text-green-700' :
                              v.statut === 'terminee' ? 'bg-gray-100 text-gray-600' :
                              v.statut === 'declinee' ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-700'}`}>
                            {v.statut}
                          </span>
                        </div>
                        {v.destinataire && (
                          <p className="text-xs text-gray-500 mt-1">
                            → {nomComplet(v.destinataire.nom, v.destinataire.prenom)}
                            {v.destinataire.poste && ` (${v.destinataire.poste})`}
                          </p>
                        )}
                        {v.sujet_traite && (
                          <p className="text-xs text-primary/80 mt-1 italic">Sujet : {v.sujet_traite}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-gray-700">{formatDate(v.heure_arrivee)}</p>
                        <p className="text-xs text-gray-400">{formatHeure(v.heure_arrivee)}</p>
                        {v.duree_visite && (
                          <p className="text-xs text-gray-400">{formatDuree(v.duree_visite)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
