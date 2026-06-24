'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import type { ListeNoire } from '@/types'
import { nomComplet, formatDate } from '@/lib/utils'

const MOTIF_MAX = 200

type VisiteurSuggestion = {
  id: string
  nom: string
  prenom?: string | null
  organisation?: string | null
  telephone?: string | null
}

export default function SecuritePage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [listeNoire, setListeNoire] = useState<ListeNoire[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Formulaire
  const [visiteurId, setVisiteurId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')

  // Recherche visiteur existant
  const [recherche, setRecherche] = useState('')
  const [suggestions, setSuggestions] = useState<VisiteurSuggestion[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const suggRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    charger()
  }, [utilisateur?.entreprise_id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setShowSugg(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const charger = async () => {
    const { data } = await supabase
      .from('liste_noire')
      .select('*, signale_par_user:utilisateurs!signale_par(nom, prenom)')
      .eq('entreprise_id', utilisateur!.entreprise_id)
      .order('created_at', { ascending: false })
      .limit(100)

    setListeNoire((data ?? []) as ListeNoire[])
    setLoading(false)
  }

  const rechercherVisiteurs = async (q: string) => {
    setRecherche(q)
    if (q.length < 2) { setSuggestions([]); setShowSugg(false); return }
    const { data } = await supabase
      .from('visiteurs')
      .select('id, nom, prenom, organisation, telephone')
      .eq('entreprise_id', utilisateur!.entreprise_id)
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
      .limit(5)
    setSuggestions(data ?? [])
    setShowSugg((data ?? []).length > 0)
  }

  const selectionnerVisiteur = (v: VisiteurSuggestion) => {
    setVisiteurId(v.id)
    setNom(v.nom)
    setPrenom(v.prenom ?? '')
    setOrganisation(v.organisation ?? '')
    setTelephone(v.telephone ?? '')
    setRecherche(`${v.nom}${v.prenom ? ' ' + v.prenom : ''}`)
    setShowSugg(false)
  }

  const ajouterEntree = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) { setErreur('Le nom est requis'); return }
    if (!motif.trim()) { setErreur('La raison est obligatoire'); return }
    if (motif.length > MOTIF_MAX) { setErreur(`La raison ne peut dépasser ${MOTIF_MAX} caractères`); return }

    setSaving(true)
    setErreur('')

    const { error } = await supabase.from('liste_noire').insert({
      entreprise_id: utilisateur!.entreprise_id,
      visiteur_id: visiteurId ?? null,
      nom: nom.trim(),
      prenom: prenom.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      organisation: organisation.trim() || null,
      motif: motif.trim(),
      signale_par: utilisateur!.id,
      actif: true,
    })

    if (error) {
      setErreur(error.message)
    } else {
      resetForm()
      charger()
    }
    setSaving(false)
  }

  const toggleActif = async (id: string, actifActuel: boolean) => {
    await supabase.from('liste_noire').update({ actif: !actifActuel }).eq('id', id)
    charger()
  }

  const resetForm = () => {
    setVisiteurId(null)
    setNom(''); setPrenom(''); setTelephone('')
    setEmail(''); setOrganisation(''); setMotif('')
    setRecherche(''); setSuggestions([])
    setErreur(''); setShowForm(false)
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sécurité — Liste noire</h1>
        <p className="text-gray-500 mt-1">
          Les visiteurs sur cette liste déclenchent une alerte discrète lors de leur enregistrement
        </p>
      </div>

      <div className="space-y-5">
        {/* Avertissement confidentialité */}
        <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <span className="text-lg flex-shrink-0">🔒</span>
          <p className="text-sm text-purple-800">
            <strong>Information confidentielle</strong> — Ces informations ne seront jamais visibles
            du visiteur ni de la secrétaire. Cette dernière reçoit uniquement une alerte de « restriction
            d&apos;accès » sans en connaître la raison.
          </p>
        </div>

        {/* Formulaire d'ajout */}
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Ajouter à la liste noire</CardTitle>
            </CardHeader>
            <form onSubmit={ajouterEntree} className="p-5 space-y-4">
              {erreur && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{erreur}</p>
                </div>
              )}

              {/* Recherche visiteur existant */}
              <div ref={suggRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechercher un visiteur existant
                  <span className="ml-1 text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  value={recherche}
                  onChange={(e) => rechercherVisiteurs(e.target.value)}
                  placeholder="Tapez un nom pour chercher…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                {showSugg && (
                  <div className="absolute z-10 w-full top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectionnerVisiteur(v)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{nomComplet(v.nom, v.prenom ?? undefined as string | undefined)}</p>
                        {v.organisation && <p className="text-xs text-gray-500">{v.organisation}</p>}
                        {v.telephone && <p className="text-xs text-gray-400">{v.telephone}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {visiteurId && (
                  <p className="text-xs text-green-700 mt-1">
                    ✓ Visiteur lié au répertoire — correspondance exacte garantie
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-3">Ou saisie manuelle :</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Kouamé"
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Jean"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      type="tel"
                      placeholder="+225 07..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                    <input
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      placeholder="Entreprise XYZ"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Raison (confidentielle) *</label>
                  <span className={`text-xs ${motif.length > MOTIF_MAX * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                    {motif.length}/{MOTIF_MAX}
                  </span>
                </div>
                <textarea
                  value={motif}
                  onChange={(e) => { if (e.target.value.length <= MOTIF_MAX) setMotif(e.target.value) }}
                  rows={2}
                  required
                  placeholder="Ex : Comportement agressif lors de la visite du 12/06/2025 — confidentiel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
                <p className="text-xs text-purple-600 mt-1">
                  🔒 Cette raison reste strictement confidentielle — jamais visible de la secrétaire
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !motif.trim() || !nom.trim()}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Ajout en cours...' : 'Ajouter à la liste noire'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une personne à la liste noire
          </button>
        )}

        {/* Liste */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste noire ({listeNoire.filter((e) => e.actif).length} actif(s) · {listeNoire.length} total)
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-2">
                  {[1,2,3].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : listeNoire.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-sm">Aucune entrée dans la liste noire</p>
              </div>
            ) : (
              listeNoire.map((entree) => (
                <div key={entree.id} className={`p-4 hover:bg-gray-50 transition-colors ${!entree.actif ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {nomComplet(entree.nom, entree.prenom)}
                        </p>
                        {!entree.actif && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            Inactif
                          </span>
                        )}
                        {entree.actif && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                            ⛔ Actif
                          </span>
                        )}
                      </div>
                      {entree.organisation && (
                        <p className="text-xs text-gray-500">{entree.organisation}</p>
                      )}
                      {entree.telephone && (
                        <p className="text-xs text-gray-500">{entree.telephone}</p>
                      )}
                      <p className="text-xs text-red-700 mt-1 italic bg-red-50 px-2 py-1 rounded inline-block">
                        🔒 {entree.motif}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Signalé le {formatDate(entree.created_at)}
                        {entree.signale_par_user && ` par ${nomComplet(entree.signale_par_user.nom, entree.signale_par_user.prenom)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActif(entree.id, entree.actif)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors
                        ${entree.actif
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                    >
                      {entree.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
