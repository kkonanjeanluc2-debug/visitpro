'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { RapportEnvoye } from '@/types'

interface ConfigRapport {
  id?: string
  actif: boolean
  emails_destinataires: string[]
  jour_envoi: number
  heure_envoi: string
}

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RapportsPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  const [config, setConfig] = useState<ConfigRapport>({
    actif: true,
    emails_destinataires: [],
    jour_envoi: 1,
    heure_envoi: '08:00',
  })
  const [nouveauEmail, setNouveauEmail] = useState('')
  const [rapports, setRapports] = useState<RapportEnvoye[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; html?: string } | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!utilisateur?.entreprise_id) return
    charger()
  }, [utilisateur?.entreprise_id])

  // Pré-remplir email depuis le profil utilisateur
  useEffect(() => {
    if (!utilisateur?.email) return
    setConfig((c) => ({
      ...c,
      emails_destinataires: c.emails_destinataires.length === 0 && utilisateur.email
        ? [utilisateur.email]
        : c.emails_destinataires,
    }))
  }, [utilisateur?.email])

  const charger = async () => {
    const [{ data: cfg }, { data: hist }] = await Promise.all([
      supabase
        .from('config_rapports')
        .select('*')
        .eq('entreprise_id', utilisateur!.entreprise_id)
        .maybeSingle(),
      supabase
        .from('rapports_envoyes')
        .select('*')
        .eq('entreprise_id', utilisateur!.entreprise_id)
        .order('envoye_at', { ascending: false })
        .limit(10),
    ])

    if (cfg) {
      setConfig(cfg as ConfigRapport)
    } else if (utilisateur?.email) {
      // Premier chargement sans config : pré-remplir avec l'email du patron
      setConfig((c) => ({ ...c, emails_destinataires: [utilisateur.email!] }))
    }
    setRapports((hist ?? []) as RapportEnvoye[])
    setLoading(false)
  }

  const ajouterEmail = () => {
    const email = nouveauEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (config.emails_destinataires.includes(email)) return
    setConfig((c) => ({ ...c, emails_destinataires: [...c.emails_destinataires, email] }))
    setNouveauEmail('')
  }

  const supprimerEmail = (email: string) => {
    setConfig((c) => ({ ...c, emails_destinataires: c.emails_destinataires.filter((e) => e !== email) }))
  }

  const sauvegarder = async () => {
    if (!utilisateur?.entreprise_id) return
    setSaving(true)
    await supabase
      .from('config_rapports')
      .upsert({
        entreprise_id: utilisateur.entreprise_id,
        actif: config.actif,
        emails_destinataires: config.emails_destinataires,
        jour_envoi: config.jour_envoi,
        heure_envoi: config.heure_envoi,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'entreprise_id' })

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const envoyerTest = async () => {
    if (config.emails_destinataires.length === 0) {
      setTestResult({ ok: false, message: 'Ajoutez au moins un email destinataire' })
      return
    }
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/rapport-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entreprise_id: utilisateur!.entreprise_id }),
      })
      const data = await res.json()
      if (res.ok) {
        const message = data.mode === 'preview_only'
          ? `Prévisualisation générée (RESEND_API_KEY non configurée)`
          : `Rapport envoyé à ${config.emails_destinataires.join(', ')}`
        setTestResult({ ok: true, message, html: data.html })
        if (data.html) setPreviewHtml(data.html)
        // Rafraîchir l'historique
        charger()
      } else {
        setTestResult({ ok: false, message: data.error ?? 'Échec de l\'envoi' })
      }
    } catch {
      setTestResult({ ok: false, message: 'Erreur lors de l\'envoi' })
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapports hebdomadaires</h1>
        <p className="text-gray-500 mt-1">Recevez automatiquement les statistiques de visites par email chaque lundi</p>
      </div>

      <div className="space-y-5">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Configuration</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setConfig((c) => ({ ...c, actif: !c.actif }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.actif ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${config.actif ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{config.actif ? 'Activé' : 'Désactivé'}</span>
              </label>
            </div>
          </CardHeader>
          <div className="p-5 space-y-5">
            {/* Emails destinataires */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinataires ({config.emails_destinataires.length})
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={nouveauEmail}
                  onChange={(e) => setNouveauEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ajouterEmail()}
                  placeholder="email@exemple.com"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={ajouterEmail}
                  className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Ajouter
                </button>
              </div>
              {config.emails_destinataires.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun destinataire</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.emails_destinataires.map((email) => (
                    <span key={email} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                      {email}
                      <button
                        onClick={() => supprimerEmail(email)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Planification */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jour d&apos;envoi</label>
                <select
                  value={config.jour_envoi}
                  onChange={(e) => setConfig((c) => ({ ...c, jour_envoi: parseInt(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {JOURS.map((j, i) => (
                    <option key={i} value={i}>{j}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure d&apos;envoi</label>
                <input
                  type="time"
                  value={config.heure_envoi}
                  onChange={(e) => setConfig((c) => ({ ...c, heure_envoi: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-sm border ${testResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {testResult.ok ? '✓' : '❌'} {testResult.message}
              </div>
            )}

            {saved && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-700 font-medium">✓ Configuration sauvegardée</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={sauvegarder} loading={saving} className="flex-1">
                Sauvegarder
              </Button>
              <button
                onClick={envoyerTest}
                disabled={testLoading}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {testLoading ? 'Génération...' : '📬 Envoyer un rapport maintenant'}
              </button>
            </div>
          </div>
        </Card>

        {/* Aperçu du dernier rapport */}
        {(previewHtml || rapports.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Aperçu du dernier rapport</CardTitle>
                {!previewHtml && rapports.length > 0 && (
                  <button
                    onClick={() => {
                      const r = rapports[0]
                      // Générer un aperçu depuis les stats stockées
                      const html = `<div style="font-family:Arial,sans-serif;padding:20px;max-width:560px;margin:0 auto">
                        <div style="background:#1E3A5F;padding:20px;border-radius:12px;color:#fff;margin-bottom:16px">
                          <h2 style="margin:0;font-size:18px">📊 Rapport hebdomadaire</h2>
                          <p style="margin:4px 0 0;opacity:.7;font-size:13px">${formatDate(r.periode_debut)} — ${formatDate(r.periode_fin)}</p>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                          <div style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e2e8f0">
                            <p style="font-size:30px;font-weight:bold;color:#1E3A5F;margin:0">${r.nb_visites}</p>
                            <p style="color:#64748b;font-size:12px;margin:4px 0 0">Visites totales</p>
                          </div>
                          <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;border:1px solid #bbf7d0">
                            <p style="font-size:30px;font-weight:bold;color:#16a34a;margin:0">${r.nb_visites > 0 ? Math.round((r.nb_acceptees / r.nb_visites) * 100) : 0}%</p>
                            <p style="color:#64748b;font-size:12px;margin:4px 0 0">Taux d'acceptation</p>
                          </div>
                          <div style="background:#fefce8;border-radius:10px;padding:16px;text-align:center;border:1px solid #fde68a">
                            <p style="font-size:30px;font-weight:bold;color:#d97706;margin:0">${r.temps_attente_moyen ?? 0} min</p>
                            <p style="color:#64748b;font-size:12px;margin:4px 0 0">Attente moyenne</p>
                          </div>
                          <div style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center;border:1px solid #fecaca">
                            <p style="font-size:30px;font-weight:bold;color:#dc2626;margin:0">${r.nb_declinee}</p>
                            <p style="color:#64748b;font-size:12px;margin:4px 0 0">Déclinées</p>
                          </div>
                        </div>
                      </div>`
                      setPreviewHtml(html)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Générer l&apos;aperçu
                  </button>
                )}
              </div>
            </CardHeader>
            {previewHtml && (
              <div className="p-4 border-t border-gray-100">
                <div
                  className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                  style={{ maxHeight: 400, overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Masquer l&apos;aperçu
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Historique */}
        <Card>
          <CardHeader>
            <CardTitle>Historique ({rapports.length})</CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {rapports.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">Aucun rapport envoyé</p>
                <p className="text-xs mt-1">Les rapports apparaîtront ici après le premier envoi automatique ou un test</p>
              </div>
            ) : (
              rapports.map((r) => (
                <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(r.periode_debut)} — {formatDate(r.periode_fin)}
                      </p>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        <span className="text-xs text-gray-600"><strong>{r.nb_visites}</strong> visites</span>
                        <span className="text-xs text-green-600"><strong>{r.nb_acceptees}</strong> acceptées</span>
                        <span className="text-xs text-red-600"><strong>{r.nb_declinee}</strong> déclinées</span>
                        {r.temps_attente_moyen != null && (
                          <span className="text-xs text-amber-600"><strong>{r.temps_attente_moyen}</strong> min moy.</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Envoyé à : {r.envoye_a.join(', ')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(r.envoye_at)}
                    </p>
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
