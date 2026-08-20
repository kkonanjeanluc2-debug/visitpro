'use client'

import { useState, useCallback } from 'react'
import type { CompteRendu, PointAction, Reunion } from '@/types'
import { sauvegarderCompteRendu, finaliserCompteRendu, approuverCompteRendu } from '@/lib/reunions'
import { genererCompteRenduPDF } from '@/lib/pdf-reunion'
import PlanActionTable from './PlanActionTable'
import SignaturePad from './SignaturePad'
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
  const [signatureSecretaire, setSignatureSecretaire] = useState<string | null>(compteRendu?.signature_secretaire ?? null)
  const [signaturePresident, setSignaturePresident] = useState<string | null>(compteRendu?.signature_president ?? null)
  const [saving, setSaving] = useState(false)
  const [finalising, setFinalising] = useState(false)
  const [approving, setApproving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const isFinished = compteRendu?.statut === 'finalise'

  // Rôles de séance
  const participants = reunion.participants ?? []
  const secretaireSeance = participants.find((p) => p.role_seance === 'secretaire')
  const presidentSeance  = participants.find((p) => p.role_seance === 'president')
  const estSecretaireSeance = secretaireSeance?.utilisateur_id === utilisateurId
  const estPresidentSeance  = presidentSeance?.utilisateur_id === utilisateurId
  const approuve = !!compteRendu?.approuve_par_president_le

  const nomParticipant = (p: typeof participants[0] | undefined) => {
    if (!p) return null
    if (p.utilisateur) return `${p.utilisateur.prenom} ${p.utilisateur.nom}`
    return p.nom_externe ?? null
  }

  const handleSauvegarder = useCallback(async () => {
    setSaving(true); setErreur(null)
    try {
      await sauvegarderCompteRendu(reunion.id, utilisateurId, {
        resume: resume.trim() || undefined,
        decisions: decisions.filter((d) => d.trim()),
        plan_actions: planActions,
        observations: observations.trim() || undefined,
        signature_secretaire: signatureSecretaire ?? undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [reunion.id, utilisateurId, resume, decisions, planActions, observations, signatureSecretaire])

  const handleFinaliser = async () => {
    if (estSecretaireSeance && !signatureSecretaire) {
      setErreur('Vous devez apposer votre signature avant de finaliser le compte-rendu.')
      return
    }
    if (!window.confirm('Finaliser le compte-rendu et notifier les participants ?')) return
    setFinalising(true); setErreur(null)
    try {
      await sauvegarderCompteRendu(reunion.id, utilisateurId, {
        resume: resume.trim() || undefined,
        decisions: decisions.filter((d) => d.trim()),
        plan_actions: planActions,
        observations: observations.trim() || undefined,
        signature_secretaire: signatureSecretaire ?? undefined,
      })
      await finaliserCompteRendu(reunion.id)

      const participantsEmail = (reunion.participants ?? []).filter((p) => p.email_externe || p.utilisateur?.email)
      if (participantsEmail.length > 0) {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'compte_rendu_finalise', reunionId: reunion.id }),
        })
      }

      onFinalise?.()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la finalisation')
    } finally {
      setFinalising(false)
    }
  }

  const handleApprouver = async () => {
    if (!signaturePresident) {
      setErreur('Vous devez apposer votre signature pour approuver le compte-rendu.')
      return
    }
    if (!window.confirm('Approuver et signer le compte-rendu ? Le PDF sera alors disponible.')) return
    setApproving(true); setErreur(null)
    try {
      await approuverCompteRendu(reunion.id, signaturePresident)
      onFinalise?.()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'approbation")
    } finally {
      setApproving(false)
    }
  }

  const handleExportPDF = () => {
    if (!compteRendu) return
    const crData: CompteRendu = {
      ...compteRendu,
      resume: resume || compteRendu.resume,
      decisions: decisions.filter((d) => d.trim()),
      plan_actions: planActions,
      observations: observations || compteRendu.observations,
      signature_secretaire: signatureSecretaire,
      signature_president: signaturePresident,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genererCompteRenduPDF(reunion, crData, entreprise as any)
  }

  const addDecision = () => setDecisions([...decisions, ''])
  const updateDecision = (i: number, val: string) => setDecisions(decisions.map((d, j) => j === i ? val : d))
  const removeDecision = (i: number) => setDecisions(decisions.filter((_, j) => j !== i))

  // PDF bloqué si le président de séance existe mais n'a pas encore approuvé
  const pdfBloque = !!presidentSeance && !approuve && isFinished

  return (
    <div className="space-y-8">
      {/* Bannière : CR finalisé */}
      {isFinished && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${approuve ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
          <svg className={`w-5 h-5 flex-shrink-0 ${approuve ? 'text-emerald-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${approuve ? 'text-emerald-800' : 'text-blue-800'}`}>
              {approuve ? 'Compte-rendu finalisé et approuvé' : 'Compte-rendu finalisé — en attente de signature du président'}
            </p>
            {compteRendu?.envoye_le && (
              <p className={`text-xs ${approuve ? 'text-emerald-600' : 'text-blue-600'}`}>
                Envoyé le {new Date(compteRendu.envoye_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          {!pdfBloque && (
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="flex-shrink-0 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter PDF
            </Button>
          )}
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
            <button onClick={addDecision} className="flex items-center gap-2 text-sm text-[rgb(var(--color-primary-rgb))] hover:opacity-80 mt-1">
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
        <PlanActionTable actions={planActions} onChange={setPlanActions} readOnly={isFinished} />
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

      {/* VIII — Signatures */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-bold">VIII</span>
          Signatures
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Secrétaire de séance */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Secrétaire de séance</p>
            {nomParticipant(secretaireSeance) && (
              <p className="text-xs text-gray-500">{nomParticipant(secretaireSeance)}</p>
            )}
            {estSecretaireSeance && !isFinished ? (
              <>
                <SignaturePad
                  onSign={(url) => setSignatureSecretaire(url)}
                  onClear={() => setSignatureSecretaire(null)}
                  existingSignature={signatureSecretaire}
                />
                {!signatureSecretaire && (
                  <p className="text-xs text-amber-600">Signature requise pour finaliser</p>
                )}
              </>
            ) : signatureSecretaire ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50" style={{ height: 90 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureSecretaire} alt="Signature secrétaire" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400 italic" style={{ height: 90 }}>
                En attente de signature
              </div>
            )}
          </div>

          {/* Président de séance */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Président de séance</p>
            {nomParticipant(presidentSeance) && (
              <p className="text-xs text-gray-500">{nomParticipant(presidentSeance)}</p>
            )}
            {estPresidentSeance && isFinished && !approuve ? (
              <>
                <SignaturePad
                  onSign={(url) => setSignaturePresident(url)}
                  onClear={() => setSignaturePresident(null)}
                  existingSignature={signaturePresident}
                />
                {!signaturePresident && (
                  <p className="text-xs text-amber-600">Votre signature valide et publie le PDF</p>
                )}
              </>
            ) : signaturePresident ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50" style={{ height: 90 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signaturePresident} alt="Signature président" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400 italic" style={{ height: 90 }}>
                {presidentSeance ? 'En attente de signature' : 'Non désigné'}
              </div>
            )}
            {approuve && compteRendu?.approuve_par_president_le && (
              <p className="text-xs text-emerald-600 font-medium">
                Approuvé le {new Date(compteRendu.approuve_par_president_le).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Bouton approuver (président uniquement, CR finalisé non encore approuvé) */}
        {estPresidentSeance && isFinished && !approuve && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button onClick={handleApprouver} loading={approving} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approuver et signer
            </Button>
            <p className="text-xs text-gray-400 mt-2">En signant, vous validez le compte-rendu et autorisez l'export PDF.</p>
          </div>
        )}
      </section>

      {/* Actions bas de page */}
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

          {compteRendu && !pdfBloque && (
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
