'use client'

import { useState, useCallback } from 'react'
import type { CompteRendu, PointAction, Reunion } from '@/types'
import { sauvegarderCompteRendu, finaliserCompteRendu } from '@/lib/reunions'
import { genererCompteRenduPDF } from '@/lib/pdf-reunion'
import PlanActionTable from './PlanActionTable'
import Button from '@/components/ui/Button'

interface Props {
  reunion: Reunion
  compteRendu: CompteRendu | null
  utilisateurId: string
  entreprise: { id: string; nom: string; plan: string; secteur?: string; couleur_primaire?: string; couleur_accent?: string; adresse?: string; telephone?: string; email?: string; logo_url?: string; created_at: string }
  onFinalise?: () => void
}

export default function CompteRenduForm({ reunion, compteRendu, utilisateurId, entreprise, onFinalise }: Props) {
  const [resume, setResume] = useState(compteRendu?.resume ?? '')
  const [decisions, setDecisions] = useState<string[]>(compteRendu?.decisions ?? [])
  const [planActions, setPlanActions] = useState<PointAction[]>(compteRendu?.plan_actions ?? [])
  const [observations, setObservations] = useState(compteRendu?.observations ?? '')
  const [saving, setSaving] = useState(false)
  const [finalising, setFinalising] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const isFinished = compteRendu?.statut === 'finalise'

  const handleSauvegarder = useCallback(async () => {
    setSaving(true); setErreur(null)
    try {
      await sauvegarderCompteRendu(reunion.id, utilisateurId, {
        resume: resume.trim() || undefined,
        decisions: decisions.filter((d) => d.trim()),
        plan_actions: planActions,
        observations: observations.trim() || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [reunion.id, utilisateurId, resume, decisions, planActions, observations])

  const handleFinaliser = async () => {
    if (!window.confirm('Finaliser le compte-rendu et notifier les participants ?')) return
    setFinalising(true)
    try {
      await sauvegarderCompteRendu(reunion.id, utilisateurId, {
        resume: resume.trim() || undefined,
        decisions: decisions.filter((d) => d.trim()),
        plan_actions: planActions,
        observations: observations.trim() || undefined,
      })
      await finaliserCompteRendu(reunion.id)

      // Notifier par email via l'API
      const participants = (reunion.participants ?? []).filter((p) => p.email_externe || p.utilisateur?.email)
      if (participants.length > 0) {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'compte_rendu_finalise',
            reunionId: reunion.id,
          }),
        })
      }

      onFinalise?.()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la finalisation')
    } finally {
      setFinalising(false)
    }
  }

  const handleExportPDF = () => {
    if (!compteRendu) return
    const crData = {
      ...compteRendu,
      resume: resume || compteRendu.resume,
      decisions: decisions.filter((d) => d.trim()),
      plan_actions: planActions,
      observations: observations || compteRendu.observations,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genererCompteRenduPDF(reunion, crData, entreprise as any)
  }

  const addDecision = () => setDecisions([...decisions, ''])
  const updateDecision = (i: number, val: string) => setDecisions(decisions.map((d, j) => j === i ? val : d))
  const removeDecision = (i: number) => setDecisions(decisions.filter((_, j) => j !== i))

  return (
    <div className="space-y-8">
      {isFinished && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Compte-rendu finalisé</p>
            {compteRendu?.envoye_le && (
              <p className="text-xs text-emerald-600">
                Envoyé le {new Date(compteRendu.envoye_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="ml-auto flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter PDF
          </Button>
        </div>
      )}

      {erreur && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erreur}</div>
      )}

      {/* IV — Résumé */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[rgb(var(--color-primary-rgb))] text-white text-xs flex items-center justify-center font-bold">IV</span>
          Résumé des discussions
        </h3>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={5}
          placeholder="Résumez les points principaux discutés durant la réunion…"
          disabled={isFinished}
          className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none transition disabled:bg-gray-50 disabled:text-gray-500"
        />
      </section>

      {/* V — Décisions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">V</span>
          Décisions prises
          <span className="ml-auto text-xs text-gray-400">{decisions.filter((d) => d.trim()).length} décision{decisions.filter((d) => d.trim()).length > 1 ? 's' : ''}</span>
        </h3>
        <div className="space-y-2">
          {decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0 mt-2">
                {i + 1}
              </div>
              <input
                value={d}
                onChange={(e) => updateDecision(i, e.target.value)}
                disabled={isFinished}
                placeholder="Décision prise…"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[rgb(var(--color-primary-rgb))] disabled:bg-gray-50"
              />
              {!isFinished && (
                <button onClick={() => removeDecision(i)} className="p-2 text-gray-300 hover:text-red-500 mt-0.5 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {!isFinished && (
            <button
              onClick={addDecision}
              className="flex items-center gap-2 text-sm text-[rgb(var(--color-primary-rgb))] hover:opacity-80 mt-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une décision
            </button>
          )}
        </div>
      </section>

      {/* VI — Plan d'actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">VI</span>
          Plan d'actions
          <span className="ml-auto text-xs text-gray-400">{planActions.length} action{planActions.length > 1 ? 's' : ''}</span>
        </h3>
        <PlanActionTable
          actions={planActions}
          onChange={setPlanActions}
          readOnly={isFinished}
        />
      </section>

      {/* VII — Observations */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">VII</span>
          Observations
        </h3>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={3}
          placeholder="Remarques, points à surveiller, prochaines étapes générales…"
          disabled={isFinished}
          className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] resize-none transition disabled:bg-gray-50 disabled:text-gray-500"
        />
      </section>

      {/* Actions */}
      {!isFinished && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <Button onClick={handleSauvegarder} loading={saving} variant="outline" size="sm" className="flex items-center gap-2">
            {saved ? (
              <>
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sauvegardé
              </>
            ) : 'Sauvegarder le brouillon'}
          </Button>

          <Button onClick={handleFinaliser} loading={finalising} className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finaliser et envoyer
          </Button>

          {compteRendu && (
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="ml-auto flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
