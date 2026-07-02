import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerEmail as mailerooEnvoyer } from '@/lib/email'

export const runtime = 'nodejs'

// ─── HTML rapport ─────────────────────────────────────────────────────────────

function htmlRapport(opts: {
  nomEntreprise: string
  periodeDebut: string
  periodeFin: string
  nbVisites: number
  nbAcceptees: number
  nbDeclinee: number
  nbRedirigees: number
  tauxAcceptation: number
  tempsMoyen: number
  topCollaborateur: string | null
  topVisiteur: string | null
  rdvConfirmes: number
  rdvAnnules: number
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
      <h1 style="color:#fff;margin:0;font-size:22px">📊 Rapport hebdomadaire</h1>
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
          <p style="font-size:11px;color:#86efac;margin:4px 0 0">${opts.nbAcceptees} acceptées</p>
        </div>
        <div style="background:#fefce8;border-radius:12px;padding:18px;text-align:center;border:1px solid #fde68a">
          <p style="font-size:34px;font-weight:bold;color:#d97706;margin:0">${opts.tempsMoyen} min</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Attente moyenne</p>
        </div>
        <div style="background:#fef2f2;border-radius:12px;padding:18px;text-align:center;border:1px solid #fecaca">
          <p style="font-size:34px;font-weight:bold;color:#dc2626;margin:0">${opts.nbDeclinee}</p>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0">Visites déclinées</p>
          ${opts.nbRedirigees > 0 ? `<p style="font-size:11px;color:#fca5a5;margin:4px 0 0">${opts.nbRedirigees} redirigée(s)</p>` : ''}
        </div>
      </div>
    </div>
    <div style="padding:0 32px 28px">
      <div style="border-top:1px solid #f1f5f9;padding-top:20px">
        ${opts.topCollaborateur ? `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#eff6ff;border-radius:10px;margin-bottom:10px">
          <div style="font-size:24px">🏆</div>
          <div>
            <p style="font-size:12px;color:#3b82f6;font-weight:600;margin:0">Collaborateur le plus sollicité</p>
            <p style="font-size:15px;color:#1e40af;font-weight:bold;margin:2px 0 0">${opts.topCollaborateur}</p>
          </div>
        </div>` : ''}
        ${opts.topVisiteur ? `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f0fdf4;border-radius:10px;margin-bottom:10px">
          <div style="font-size:24px">⭐</div>
          <div>
            <p style="font-size:12px;color:#16a34a;font-weight:600;margin:0">Visiteur le plus fréquent</p>
            <p style="font-size:15px;color:#14532d;font-weight:bold;margin:2px 0 0">${opts.topVisiteur}</p>
          </div>
        </div>` : ''}
        ${(opts.rdvConfirmes > 0 || opts.rdvAnnules > 0) ? `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f5f3ff;border-radius:10px">
          <div style="font-size:24px">📅</div>
          <div>
            <p style="font-size:12px;color:#7c3aed;font-weight:600;margin:0">Rendez-vous de la semaine</p>
            <p style="font-size:14px;color:#4c1d95;margin:2px 0 0"><strong>${opts.rdvConfirmes}</strong> confirmé(s) · <strong>${opts.rdvAnnules}</strong> annulé(s)</p>
          </div>
        </div>` : ''}
      </div>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">Rapport généré automatiquement par <strong>VisitPro</strong></p>
    </div>
  </div>
</body>
</html>`
}

// ─── Génération + envoi pour une entreprise ───────────────────────────────────

async function traiterEntreprise(supabase: ReturnType<typeof createAdminClient>, entrepriseId: string, emails: string[]) {
  const { data: entreprise } = await supabase.from('entreprises').select('nom').eq('id', entrepriseId).single()
  const nomEntreprise = entreprise?.nom ?? 'Votre entreprise'

  const now = new Date()
  const finDate = new Date(now)
  finDate.setDate(finDate.getDate() - 1)
  const debutDate = new Date(finDate)
  debutDate.setDate(debutDate.getDate() - 6)
  const prevFinDate = new Date(debutDate)
  prevFinDate.setDate(prevFinDate.getDate() - 1)
  const prevDebutDate = new Date(prevFinDate)
  prevDebutDate.setDate(prevDebutDate.getDate() - 6)

  const periodeFin   = finDate.toISOString().split('T')[0]
  const periodeDebut = debutDate.toISOString().split('T')[0]
  const prevFin      = prevFinDate.toISOString().split('T')[0]
  const prevDebut    = prevDebutDate.toISOString().split('T')[0]

  const { data: visites } = await supabase
    .from('visites')
    .select('statut, duree_attente, destinataire_id, visiteur_id, destinataire:utilisateurs!destinataire_id(nom, prenom), visiteur:visiteurs!visiteur_id(nom, prenom)')
    .eq('entreprise_id', entrepriseId)
    .gte('heure_arrivee', periodeDebut + 'T00:00:00')
    .lte('heure_arrivee', periodeFin + 'T23:59:59')

  const v = visites ?? []
  const nbVisites      = v.length
  const nbAcceptees    = v.filter((x: any) => ['acceptee', 'en_cours', 'terminee'].includes(x.statut)).length
  const nbDeclinee     = v.filter((x: any) => x.statut === 'declinee').length
  const nbRedirigees   = v.filter((x: any) => x.statut === 'redirigee').length
  const tauxAcceptation = nbVisites > 0 ? Math.round((nbAcceptees / nbVisites) * 100) : 0
  const durees         = v.filter((x: any) => x.duree_attente != null).map((x: any) => x.duree_attente as number)
  const tempsMoyen     = durees.length > 0 ? Math.round(durees.reduce((a: number, b: number) => a + b, 0) / durees.length) : 0

  const collabCount: Record<string, { nom: string; count: number }> = {}
  for (const item of v) {
    const x = item as any
    if (!x.destinataire_id) continue
    const d = x.destinataire
    const nom = d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : x.destinataire_id
    collabCount[x.destinataire_id] = { nom, count: (collabCount[x.destinataire_id]?.count ?? 0) + 1 }
  }
  const topCollaborateur = Object.values(collabCount).sort((a, b) => b.count - a.count)[0]?.nom ?? null

  const visiteurCount: Record<string, { nom: string; count: number }> = {}
  for (const item of v) {
    const x = item as any
    if (!x.visiteur_id) continue
    const vi = x.visiteur
    const nom = vi ? `${vi.prenom ?? ''} ${vi.nom ?? ''}`.trim() : x.visiteur_id
    visiteurCount[x.visiteur_id] = { nom, count: (visiteurCount[x.visiteur_id]?.count ?? 0) + 1 }
  }
  const topVisiteur = Object.values(visiteurCount).sort((a, b) => b.count - a.count)[0]?.nom ?? null

  const { data: rdvs } = await supabase
    .from('rendez_vous')
    .select('statut')
    .eq('entreprise_id', entrepriseId)
    .gte('date_rdv', periodeDebut)
    .lte('date_rdv', periodeFin)
  const rdvConfirmes = (rdvs ?? []).filter((r: any) => r.statut === 'confirme').length
  const rdvAnnules   = (rdvs ?? []).filter((r: any) => r.statut === 'annule').length

  const { count: nbPrev } = await supabase
    .from('visites')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', entrepriseId)
    .gte('heure_arrivee', prevDebut + 'T00:00:00')
    .lte('heure_arrivee', prevFin + 'T23:59:59')
  const deltaVisites = nbPrev != null ? nbVisites - nbPrev : null

  const html = htmlRapport({
    nomEntreprise,
    periodeDebut: new Date(periodeDebut).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long' }),
    periodeFin:   new Date(periodeFin).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' }),
    nbVisites, nbAcceptees, nbDeclinee, nbRedirigees, tauxAcceptation,
    tempsMoyen, topCollaborateur, topVisiteur, rdvConfirmes, rdvAnnules, deltaVisites,
  })

  const sujet = `Rapport hebdomadaire VisitPro — ${nomEntreprise}`

  for (const email of emails) {
    await mailerooEnvoyer({ to: email, sujet, html, texte: '' })
  }

  await supabase.from('rapports_envoyes').insert({
    entreprise_id: entrepriseId,
    periode_debut: periodeDebut,
    periode_fin:   periodeFin,
    nb_visites:    nbVisites,
    nb_acceptees:  nbAcceptees,
    nb_declinee:   nbDeclinee,
    temps_attente_moyen: tempsMoyen,
    envoye_a:      emails,
    envoye_at:     new Date().toISOString(),
  })
}

// ─── Handler GET (appelé par le cron) ─────────────────────────────────────────

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = request.headers.get('authorization')
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
  }

  if (!process.env.MAILEROO_API_KEY) {
    return NextResponse.json({ message: 'MAILEROO_API_KEY non configurée — aucun envoi', compte: 0 })
  }

  const supabase    = createAdminClient()
  const now         = new Date()
  const jourActuel  = now.getUTCDay()                          // 0=Dim … 6=Sam
  const heureActuelle = String(now.getUTCHours()).padStart(2, '0') // "08", "11", etc.

  // Toutes les configs actives prévues pour cette heure
  const { data: configs } = await supabase
    .from('config_rapports')
    .select('entreprise_id, emails_destinataires, heure_envoi')
    .eq('actif', true)
    .eq('jour_envoi', jourActuel)
    .ilike('heure_envoi', `${heureActuelle}:%`)

  if (!configs?.length) {
    return NextResponse.json({ message: 'Aucun rapport à envoyer maintenant', compte: 0 })
  }

  // Anti-doublons : ignorer les entreprises ayant déjà reçu un rapport ces 6 derniers jours
  const sixJoursAvant = new Date(now)
  sixJoursAvant.setDate(sixJoursAvant.getDate() - 6)

  const { data: dejaEnvoyes } = await supabase
    .from('rapports_envoyes')
    .select('entreprise_id')
    .in('entreprise_id', configs.map(c => c.entreprise_id))
    .gte('envoye_at', sixJoursAvant.toISOString())

  const dejaIds = new Set((dejaEnvoyes ?? []).map(r => r.entreprise_id))
  const aTraiter = configs.filter(c => !dejaIds.has(c.entreprise_id))

  const resultats: { entreprise_id: string; ok: boolean; erreur?: string }[] = []

  for (const cfg of aTraiter) {
    try {
      await traiterEntreprise(supabase, cfg.entreprise_id, cfg.emails_destinataires)
      resultats.push({ entreprise_id: cfg.entreprise_id, ok: true })
    } catch (e) {
      resultats.push({ entreprise_id: cfg.entreprise_id, ok: false, erreur: String(e) })
    }
  }

  return NextResponse.json({
    message: `${resultats.filter(r => r.ok).length}/${aTraiter.length} rapport(s) envoyé(s)`,
    compte: resultats.filter(r => r.ok).length,
    resultats,
  })
}
