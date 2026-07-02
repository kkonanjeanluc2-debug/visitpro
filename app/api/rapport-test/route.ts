export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envoyerEmail as mailerooEnvoyer } from '@/lib/email'
import { genererPdfRapport, type RapportPdfData } from '@/lib/pdf-rapport'

// ─── HTML corps d'email (simple, le détail est dans le PDF) ──────────────────

function htmlCorpsEmail(opts: {
  nomEntreprise: string
  periodeDebut: string
  periodeFin: string
  nbVisites: number
  tauxAcceptation: number
  tempsMoyen: number
  nbDeclinee: number
  deltaVisites: number | null
}): string {
  const signe = opts.deltaVisites == null ? '' : opts.deltaVisites >= 0 ? `+${opts.deltaVisites}` : `${opts.deltaVisites}`
  const couleurDelta = opts.deltaVisites == null ? '#64748b' : opts.deltaVisites >= 0 ? '#16a34a' : '#dc2626'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport hebdomadaire — VisitPro</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f6fa;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:#1E3A5F;padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:22px">Rapport hebdomadaire</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px">${opts.nomEntreprise}</p>
      <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px">${opts.periodeDebut} — ${opts.periodeFin}</p>
    </div>
    <div style="padding:28px 32px 16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center;border:1px solid #e2e8f0">
          <p style="font-size:34px;font-weight:bold;color:#1E3A5F;margin:0">${opts.nbVisites}</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Visites totales</p>
          ${opts.deltaVisites != null ? `<p style="font-size:12px;font-weight:bold;color:${couleurDelta};margin:4px 0 0">${signe} vs semaine préc.</p>` : ''}
        </div>
        <div style="background:#f0fdf4;border-radius:12px;padding:18px;text-align:center;border:1px solid #bbf7d0">
          <p style="font-size:34px;font-weight:bold;color:#16a34a;margin:0">${opts.tauxAcceptation}%</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Taux d'acceptation</p>
        </div>
        <div style="background:#fefce8;border-radius:12px;padding:18px;text-align:center;border:1px solid #fde68a">
          <p style="font-size:34px;font-weight:bold;color:#d97706;margin:0">${opts.tempsMoyen} min</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Attente moyenne</p>
        </div>
        <div style="background:#fef2f2;border-radius:12px;padding:18px;text-align:center;border:1px solid #fecaca">
          <p style="font-size:34px;font-weight:bold;color:#dc2626;margin:0">${opts.nbDeclinee}</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Déclinées</p>
        </div>
      </div>
    </div>
    <div style="padding:12px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="color:#64748b;font-size:13px;margin:0">
        Le rapport complet avec tous les tableaux est disponible en pièce jointe PDF.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">Rapport généré automatiquement par <strong>VisitPro</strong></p>
    </div>
  </div>
</body>
</html>`
}

// ─── Calcul des statistiques détaillées ───────────────────────────────────────

function calculerStats(visites: any[]) {
  const v = visites ?? []
  const nbVisites      = v.length
  const nbAcceptees    = v.filter(x => ['acceptee', 'en_cours', 'terminee'].includes(x.statut)).length
  const nbDeclinee     = v.filter(x => x.statut === 'declinee').length
  const nbRedirigees   = v.filter(x => x.statut === 'redirigee').length
  const tauxAcceptation = nbVisites > 0 ? Math.round((nbAcceptees / nbVisites) * 100) : 0
  const durees         = v.filter(x => x.duree_attente != null).map(x => x.duree_attente as number)
  const tempsMoyen     = durees.length > 0 ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length) : 0

  // Stats par collaborateur
  const collabMap: Record<string, { nom: string; total: number; acceptees: number; declinees: number; redirigees: number }> = {}
  for (const x of v) {
    if (!x.destinataire_id) continue
    const d = x.destinataire
    const nom = d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : '—'
    if (!collabMap[x.destinataire_id]) collabMap[x.destinataire_id] = { nom, total: 0, acceptees: 0, declinees: 0, redirigees: 0 }
    collabMap[x.destinataire_id].total++
    if (['acceptee', 'en_cours', 'terminee'].includes(x.statut)) collabMap[x.destinataire_id].acceptees++
    if (x.statut === 'declinee')   collabMap[x.destinataire_id].declinees++
    if (x.statut === 'redirigee')  collabMap[x.destinataire_id].redirigees++
  }
  const collabStats = Object.values(collabMap).sort((a, b) => b.total - a.total)

  // Top visiteurs
  const visiteurMap: Record<string, { nom: string; total: number }> = {}
  for (const x of v) {
    if (!x.visiteur_id) continue
    const vi = x.visiteur
    const nom = vi ? `${vi.prenom ?? ''} ${vi.nom ?? ''}`.trim() : '—'
    if (!visiteurMap[x.visiteur_id]) visiteurMap[x.visiteur_id] = { nom, total: 0 }
    visiteurMap[x.visiteur_id].total++
  }
  const topVisiteurs = Object.values(visiteurMap).sort((a, b) => b.total - a.total)

  // Motifs
  const motifMap: Record<string, number> = {}
  for (const x of v) {
    const m = x.motif ?? ''
    motifMap[m] = (motifMap[m] ?? 0) + 1
  }
  const motifStats = Object.entries(motifMap)
    .sort((a, b) => b[1] - a[1])
    .map(([motif, total]) => ({ motif, total }))

  return { nbVisites, nbAcceptees, nbDeclinee, nbRedirigees, tauxAcceptation, tempsMoyen, collabStats, topVisiteurs, motifStats }
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let entrepriseId: string
  try {
    const body = await req.json()
    entrepriseId = body.entreprise_id
  } catch {
    return NextResponse.json({ error: 'entreprise_id requis' }, { status: 400 })
  }

  if (!entrepriseId) {
    return NextResponse.json({ error: 'entreprise_id requis' }, { status: 400 })
  }

  // Config rapports
  const { data: config } = await supabase
    .from('config_rapports')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .maybeSingle()

  const emails: string[] = config?.emails_destinataires ?? []
  if (!emails.length) {
    return NextResponse.json({ error: 'Aucun email destinataire configuré' }, { status: 400 })
  }

  // Nom entreprise
  const { data: entreprise } = await supabase.from('entreprises').select('nom').eq('id', entrepriseId).single()
  const nomEntreprise = entreprise?.nom ?? 'Votre entreprise'

  // Période : 7 derniers jours
  const now = new Date()
  const finDate = new Date(now); finDate.setDate(finDate.getDate() - 1)
  const debutDate = new Date(finDate); debutDate.setDate(debutDate.getDate() - 6)
  const prevFinDate = new Date(debutDate); prevFinDate.setDate(prevFinDate.getDate() - 1)
  const prevDebutDate = new Date(prevFinDate); prevDebutDate.setDate(prevDebutDate.getDate() - 6)

  const periodeFin    = finDate.toISOString().split('T')[0]
  const periodeDebut  = debutDate.toISOString().split('T')[0]
  const prevFin       = prevFinDate.toISOString().split('T')[0]
  const prevDebut     = prevDebutDate.toISOString().split('T')[0]

  // Visites avec motif
  const { data: visites } = await supabase
    .from('visites')
    .select('statut, duree_attente, motif, destinataire_id, visiteur_id, destinataire:utilisateurs!destinataire_id(nom, prenom), visiteur:visiteurs!visiteur_id(nom, prenom)')
    .eq('entreprise_id', entrepriseId)
    .gte('heure_arrivee', periodeDebut + 'T00:00:00')
    .lte('heure_arrivee', periodeFin + 'T23:59:59')

  const stats = calculerStats(visites ?? [])

  // RDV
  const { data: rdvs } = await supabase
    .from('rendez_vous').select('statut')
    .eq('entreprise_id', entrepriseId)
    .gte('date_rdv', periodeDebut).lte('date_rdv', periodeFin)
  const rdvConfirmes = (rdvs ?? []).filter(r => r.statut === 'confirme').length
  const rdvAnnules   = (rdvs ?? []).filter(r => r.statut === 'annule').length

  // Comparaison S-1
  const { count: nbPrev } = await supabase
    .from('visites').select('id', { count: 'exact', head: true })
    .eq('entreprise_id', entrepriseId)
    .gte('heure_arrivee', prevDebut + 'T00:00:00')
    .lte('heure_arrivee', prevFin + 'T23:59:59')
  const deltaVisites = nbPrev != null ? stats.nbVisites - nbPrev : null

  const periodeDebutLabel = new Date(periodeDebut).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long' })
  const periodeFinLabel   = new Date(periodeFin).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })

  const pdfData: RapportPdfData = {
    nomEntreprise,
    periodeDebut: periodeDebutLabel,
    periodeFin:   periodeFinLabel,
    ...stats,
    deltaVisites,
    rdvConfirmes,
    rdvAnnules,
  }

  const html = htmlCorpsEmail({
    nomEntreprise,
    periodeDebut: periodeDebutLabel,
    periodeFin:   periodeFinLabel,
    nbVisites:       stats.nbVisites,
    tauxAcceptation: stats.tauxAcceptation,
    tempsMoyen:      stats.tempsMoyen,
    nbDeclinee:      stats.nbDeclinee,
    deltaVisites,
  })

  const sujet = `[TEST] Rapport hebdomadaire VisitPro — ${nomEntreprise}`

  if (!process.env.MAILEROO_API_KEY) {
    return NextResponse.json({
      succes: true, html, emails,
      mode: 'preview_only',
      message: 'MAILEROO_API_KEY non configurée — email non envoyé',
    })
  }

  // Générer le PDF
  let pdfBuffer: Buffer | undefined
  try {
    pdfBuffer = await genererPdfRapport(pdfData)
  } catch (e) {
    console.error('Erreur génération PDF:', e)
  }

  const nomFichier = `rapport-${nomEntreprise.toLowerCase().replace(/\s+/g, '-')}-${periodeFin}.pdf`

  // Envoyer à chaque destinataire
  for (const email of emails) {
    const result = await mailerooEnvoyer({
      to: email,
      sujet,
      html,
      texte: `Rapport hebdomadaire ${nomEntreprise} — ${periodeDebutLabel} au ${periodeFinLabel}.\nVoir le PDF en pièce jointe pour les détails complets.`,
      ...(pdfBuffer ? { pieceJointe: { contenu: pdfBuffer, nomFichier } } : {}),
    })
    if (!result.success) {
      return NextResponse.json({ error: `Échec Maileroo : ${result.erreur ?? 'erreur inconnue'}` }, { status: 500 })
    }
  }

  // Log
  await supabase.from('rapports_envoyes').insert({
    entreprise_id:       entrepriseId,
    periode_debut:       periodeDebut,
    periode_fin:         periodeFin,
    nb_visites:          stats.nbVisites,
    nb_acceptees:        stats.nbAcceptees,
    nb_declinee:         stats.nbDeclinee,
    temps_attente_moyen: stats.tempsMoyen,
    envoye_a:            emails,
  })

  return NextResponse.json({ succes: true, emails, html })
}
