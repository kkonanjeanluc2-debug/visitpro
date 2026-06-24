'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface DisplayConfig {
  display_message: string
  display_couleur_fond: string
  display_couleur_texte: string
  display_token: string
}

const COULEURS_FOND = [
  { label: 'Bleu marine (défaut)', value: '#1E3A5F' },
  { label: 'Anthracite', value: '#1F2937' },
  { label: 'Vert foncé', value: '#064E3B' },
  { label: 'Violet', value: '#3B0764' },
  { label: 'Bordeaux', value: '#7F1D1D' },
  { label: 'Blanc', value: '#F9FAFB' },
]

export default function DisplayConfigPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [config, setConfig] = useState<DisplayConfig>({
    display_message: 'Bienvenue ! Veuillez patienter, nous vous recevons dans un instant.',
    display_couleur_fond: '#1E3A5F',
    display_couleur_texte: '#FFFFFF',
    display_token: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    supabase
      .from('entreprises')
      .select('display_message, display_couleur_fond, display_couleur_texte, display_token')
      .eq('id', utilisateur.entreprise_id)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as DisplayConfig)
      })
  }, [utilisateur?.entreprise_id])

  const sauvegarder = async () => {
    if (!utilisateur?.entreprise_id) return
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('entreprises')
      .update({
        display_message: config.display_message,
        display_couleur_fond: config.display_couleur_fond,
        display_couleur_texte: config.display_couleur_texte,
      })
      .eq('id', utilisateur.entreprise_id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const regenererToken = async () => {
    if (!utilisateur?.entreprise_id) return
    if (!confirm('Régénérer le lien ? L\'ancien lien ne fonctionnera plus.')) return

    const { data } = await supabase.rpc('regenerer_display_token', {
      entreprise_id_param: utilisateur.entreprise_id,
    })
    if (data) setConfig((c) => ({ ...c, display_token: data }))
  }

  const urlDisplay = config.display_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/display/${config.display_token}`
    : ''

  const copierLien = () => {
    if (!urlDisplay) return
    navigator.clipboard.writeText(urlDisplay)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fondEstClair = config.display_couleur_fond === '#F9FAFB' || config.display_couleur_fond === '#FFFFFF'

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Écran d&apos;accueil</h1>
        <p className="text-gray-500 mt-1">Configurez l&apos;affichage TV/tablette de votre salle d&apos;attente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres d&apos;affichage</CardTitle>
            </CardHeader>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message d&apos;accueil</label>
                <textarea
                  value={config.display_message}
                  onChange={(e) => setConfig((c) => ({ ...c, display_message: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Bienvenue ! Veuillez patienter..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de fond</label>
                <div className="grid grid-cols-3 gap-2">
                  {COULEURS_FOND.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          display_couleur_fond: c.value,
                          display_couleur_texte: c.value === '#F9FAFB' || c.value === '#FFFFFF' ? '#1F2937' : '#FFFFFF',
                        }))
                      }}
                      className={`p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        config.display_couleur_fond === c.value
                          ? 'border-primary scale-105'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: c.value, color: c.value === '#F9FAFB' || c.value === '#FFFFFF' ? '#1F2937' : '#FFFFFF' }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur du texte
                </label>
                <div className="flex gap-3">
                  {['#FFFFFF', '#1F2937', '#F3F4F6'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfig((prev) => ({ ...prev, display_couleur_texte: c }))}
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        config.display_couleur_texte === c ? 'border-primary scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {saved && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-700 font-medium">✓ Configuration sauvegardée</p>
                </div>
              )}

              <Button onClick={sauvegarder} loading={saving} fullWidth>
                Sauvegarder la configuration
              </Button>
            </div>
          </Card>

          {/* Lien de partage */}
          <Card>
            <CardHeader>
              <CardTitle>Lien de l&apos;écran</CardTitle>
            </CardHeader>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Ouvrez ce lien sur la TV ou la tablette de votre salle d&apos;attente.
                La page se met à jour en temps réel sans connexion requise.
              </p>
              {urlDisplay && (
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={urlDisplay}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={copierLien}
                    className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    {copied ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              )}
              <button
                onClick={() => urlDisplay && window.open(urlDisplay, '_blank')}
                disabled={!urlDisplay}
                className="text-sm text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                Ouvrir l&apos;écran dans un nouvel onglet →
              </button>
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={regenererToken}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  Régénérer le lien (invalide l&apos;ancien)
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Prévisualisation live en iframe */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Prévisualisation en direct</CardTitle>
            </CardHeader>
            <div className="p-4">
              {urlDisplay ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video relative bg-gray-900">
                  <iframe
                    key={urlDisplay}
                    src={urlDisplay}
                    className="w-full h-full"
                    title="Aperçu écran d'accueil"
                    style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Sauvegardez d&apos;abord pour voir l&apos;aperçu</p>
                </div>
              )}
              <p className="text-xs text-gray-400 text-center mt-3">
                Aperçu en direct — affichage réel en plein écran (F11)
              </p>
            </div>
          </Card>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-blue-900">Comment utiliser</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Ouvrez le lien sur une TV ou une tablette en mode kiosque</li>
              <li>La page se met à jour automatiquement en temps réel</li>
              <li>Aucune connexion utilisateur requise sur l&apos;écran d&apos;affichage</li>
              <li>Sur TV : activez le mode plein écran (F11 sur navigateur)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
