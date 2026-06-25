'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Visiteur, Visite } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { nomComplet, formatHeure, formatDate, formatDuree } from '@/lib/utils'
import Link from 'next/link'

export default function FicheVisiteurDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const visiteurId = params.id as string

  const [visiteur, setVisiteur] = useState<Visiteur | null>(null)
  const [visites, setVisites] = useState<Visite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Champs éditables
  const [editVip, setEditVip] = useState(false)
  const [editPreferences, setEditPreferences] = useState('')
  const [editNotes, setEditNotes] = useState('')
  // Sujet traité — pour la visite la plus récente
  const [sujetTraite, setSujetTraite] = useState('')
  const [sujetVisiteId, setSujetVisiteId] = useState<string | null>(null)
  const [savingSujet, setSavingSujet] = useState(false)

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
        .eq('destinataire_id', utilisateur!.id)
        .order('heure_arrivee', { ascending: false })
        .limit(15),
    ])

    if (!v) { router.push('/dashboard'); return }
    setVisiteur(v)
    setEditVip(v.est_vip ?? false)
    setEditPreferences(v.preferences ?? '')
    setEditNotes(v.notes_privees ?? '')

    const hist_ = hist ?? []
    setVisites(hist_)

    // Sujet traité = visite la plus récente (terminée ou acceptée)
    const derniereVisite = hist_.find(vi =>
      vi.statut === 'terminee' || vi.statut === 'acceptee' || vi.statut === 'en_cours'
    )
    if (derniereVisite) {
      setSujetVisiteId(derniereVisite.id)
      setSujetTraite(derniereVisite.sujet_traite ?? '')
    }

    setLoading(false)
  }

  const sauvegarderFiche = async () => {
    if (!visiteur) return
    setSaving(true)
    await supabase
      .from('visiteurs')
      .update({
        est_vip: editVip,
        preferences: editPreferences.trim() || null,
        notes_privees: editNotes.trim() || null,
      })
      .eq('id', visiteur.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  const sauvegarderSujet = async () => {
    if (!sujetVisiteId) return
    setSavingSujet(true)
    await supabase
      .from('visites')
      .update({ sujet_traite: sujetTraite.trim() || null })
      .eq('id', sujetVisiteId)
    setSavingSujet(false)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!visiteur) return null

  const peutVoirNotes = ['patron', 'admin'].includes(utilisateur?.role ?? '')

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tableau de bord
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colonne gauche — édition */}
        <div className="space-y-4">
          {/* Carte identité */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <Avatar nom={visiteur.nom} prenom={visiteur.prenom} size="xl" />
                {editVip && (
                  <span className="absolute -top-1 -right-1 text-xl">⭐</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {nomComplet(visiteur.nom, visiteur.prenom)}
                </h1>
                {visiteur.organisation && (
                  <p className="text-sm text-gray-500 mt-0.5">{visiteur.organisation}</p>
                )}
                {visiteur.telephone && (
                  <p className="text-xs text-gray-400 mt-1">{visiteur.telephone}</p>
                )}
                <div className="flex items-center gap-3 justify-center mt-2 text-xs text-gray-500">
                  <span><strong className="text-primary">{visiteur.nombre_visites}</strong> visite(s)</span>
                  {visiteur.derniere_visite && (
                    <span>Dernière : {formatDate(visiteur.derniere_visite)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fiche éditable */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Fiche visiteur</h2>

            {/* Toggle VIP */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setEditVip(!editVip)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editVip ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${editVip ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {editVip ? '⭐ Visiteur VIP' : 'Visiteur standard'}
              </span>
            </label>

            {/* Préférences */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Préférences / habitudes</label>
              <textarea
                value={editPreferences}
                onChange={(e) => setEditPreferences(e.target.value)}
                rows={3}
                placeholder="Ex : Préfère un café, toujours ponctuel..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Notes privées — patron/admin uniquement */}
            {peutVoirNotes && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes privées
                  <span className="ml-1 text-gray-400">(patron/admin uniquement)</span>
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes confidentielles..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            )}

            {saved && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ Fiche mise à jour
              </p>
            )}

            <button
              onClick={sauvegarderFiche}
              disabled={saving}
              className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Sauvegarder la fiche'}
            </button>
          </div>

          {/* Sujet traité — dernière visite */}
          {sujetVisiteId && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-900 text-sm">Sujet traité — dernière visite</h2>
              <textarea
                value={sujetTraite}
                onChange={(e) => setSujetTraite(e.target.value)}
                onBlur={sauvegarderSujet}
                rows={2}
                placeholder="Ex : Contrat de partenariat, renouvellement abonnement..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Sauvegarde auto au clic en dehors</span>
                {savingSujet && <span className="text-xs text-gray-400">Enregistrement...</span>}
              </div>
            </div>
          )}

          {/* Historique des sujets abordés */}
          {visiteur.sujets_historique && visiteur.sujets_historique.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📋</span>
                <p className="text-xs font-semibold text-blue-800">Sujets abordés — historique complet</p>
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

        {/* Colonne droite — historique */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Mes visites avec ce visiteur ({visites.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto scrollbar-thin">
              {visites.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-sm">Aucune visite commune enregistrée</p>
                </div>
              ) : (
                visites.map((v) => (
                  <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{v.motif}</p>
                        {v.sujet_traite && (
                          <p className="text-xs text-primary/80 mt-1 italic">Sujet : {v.sujet_traite}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-gray-700">{formatDate(v.heure_arrivee)}</p>
                        <p className="text-xs text-gray-400">{formatHeure(v.heure_arrivee)}</p>
                        {v.duree_visite != null && (
                          <p className="text-xs text-gray-400">{formatDuree(v.duree_visite)}</p>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block
                          ${v.statut === 'terminee' ? 'bg-gray-100 text-gray-600' :
                            v.statut === 'declinee' ? 'bg-red-100 text-red-600' :
                            'bg-green-100 text-green-700'}`}>
                          {v.statut}
                        </span>
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
