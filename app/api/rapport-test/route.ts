import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAILEROO_API_KEY = process.env.MAILEROO_API_KEY ?? ''
const FROM_EMAIL = process.env.MAILEROO_FROM_EMAIL ?? 'noreply@visiteurpro.com'
const FROM_NAME = process.env.MAILEROO_FROM_NAME ?? 'VisitPro'

async function envoyerEmail(to: string[], sujet: string, html: string): Promise<{ ok: boolean; erreur?: string }> {
  if (!MAILEROO_API_KEY) return { ok: false, erreur: 'MAILEROO_API_KEY non configurée' }
  for (const email of to) {
    const res = await fetch('https://api.maileroo.com/v1/send', {
      method: 'POST',
      headers: { 'X-API-Key': MAILEROO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: email, subject: sujet, html }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = data.message ?? data.error ?? data.detail ?? `HTTP ${res.status}`
      console.error('Maileroo error:', res.status, msg, data)
      return { ok: false, erreur: msg }
    }
  }
  return { ok: true }
}

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

  // Nom de l'entreprise
  const { data: entreprise } = await supabase
    .from('entreprises')
    .select('nom')
    .eq('id', entrepriseId)
    .single()
  const nomEntreprise = entreprise?.nom ?? 'Votre entreprise'

  // Période : 7 derniers jours complets
  const now = new Date()
  const finDate = new Date(now)
  finDate.setDate(finDate.getDate() - 1)
  const debutDate = new Date(finDate)
  debutDate.setDate(debutDate.getDate() - 6)
  const prevFinDate = new Date(debutDate)
  prevFinDate.setDate(prevFinDate.getDate() - 1)
  const prevDebutDate = new Date(prevFinDate)
  prevDebutDate.setDate(prevDebutDate.getDate() - 6)

  const periodeFin = finDate.toISOString().split('T')[0]
  const periodeDebut = debutDate.toISOString().split('T')[0]
  const prevFin = prevFinDate.toISOString().split('T')[0]
  const prevDebut = prevDebutDate.toISOString().split('T')[0]

  // Visites semaine courante
  const { data: visites } = await supabase
    .from('visites')
    .select('statut, duree_attente, destinataire_id, visiteur_id, destinataire:utilisateurs!destinataire_id(nom, prenom), visiteur:visiteurs!visiteur_id(nom, prenom)')
    .eq('entreprise_id', entrepriseId)
    .gte('heure_arrivee', periodeDebut + 'T00:00:00')
    .lte('heure_arrivee', periodeFin + 'T23:59:59')

  const nbVisites = (visites ?? []).length
  const nbAcceptees = (visites ?? []).filter((v: any) => ['acceptee', 'en_cours', 'terminee'].includes(v.statut)).length
  const nbDeclinee = (visites ?? []).filter((v: any) => v.statut === 'declinee').length
  const nbRedirigees = (visites ?? []).filter((v: any) => v.statut === 'redirigee').length
  const tauxAcceptation = nbVisites > 0 ? Math.round((nbAcceptees / nbVisites) * 100) : 0
  const durees = (visites ?? []).filter((v: any) => v.duree_attente != null).map((v: any) => v.duree_attente as number)
  const tempsMoyen = durees.length > 0 ? Math.round(durees.reduce((a: number, b: number) => a + b, 0) / durees.length) : 0

  // Top collaborateur
  const collabCount: Record<string, { nom: string; count: number }> = {}
  for (const v of visites ?? []) {
    if (!(v as any).destinataire_id) continue
    const d = (v as any).destinataire
    const nom = d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : (v as any).destinataire_id
    const id = (v as any).destinataire_id
    collabCount[id] = { nom, count: (collabCount[id]?.count ?? 0) + 1 }
  }
  const topCollaborateur = Object.values(collabCount).sort((a, b) => b.count - a.count)[0]?.nom ?? null

  // Top visiteur
  const visiteurCount: Record<string, { nom: string; count: number }> = {}
  for (const v of visites ?? []) {
    if (!(v as any).visiteur_id) continue
    const vi = (v as any).visiteur
    const nom = vi ? `${vi.prenom ?? ''} ${vi.nom ?? ''}`.trim() : (v as any).visiteur_id
    const id = (v as any).visiteur_id
    visiteurCount[id] = { nom, count: (visiteurCount[id]?.count ?? 0) + 1 }
  }
  const topVisiteur = Object.values(visiteurCount).sort((a, b) => b.count - a.count)[0]?.nom ?? null

  // RDV
  const { data: rdvs } = await supabase
    .from('rendez_vous')
    .select('statut')
    .eq('entreprise_id', entrepriseId)
    .gte('date_rdv', periodeDebut)
    .lte('date_rdv', periodeFin)

  const rdvConfirmes = (rdvs ?? []).filter((r: any) => r.statut === 'confirme').length
  const rdvAnnules = (rdvs ?? []).filter((r: any) => r.statut === 'annule').length

  // Comparaison S-1
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
    periodeFin: new Date(periodeFin).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' }),
    nbVisites, nbAcceptees, nbDeclinee, nbRedirigees, tauxAcceptation,
    tempsMoyen, topCollaborateur, topVisiteur,
    rdvConfirmes, rdvAnnules, deltaVisites,
  })

  const sujet = `[TEST] Rapport hebdomadaire VisitPro — ${nomEntreprise}`

  if (!MAILEROO_API_KEY) {
    // Pas de clé Maileroo : retourner le HTML pour prévisualisation uniquement
    return NextResponse.json({ succes: true, html, emails, mode: 'preview_only', message: 'MAILEROO_API_KEY non configurée — email non envoyé' })
  }

  const { ok, erreur } = await envoyerEmail(emails, sujet, html)
  if (!ok) {
    return NextResponse.json({ error: `Échec Maileroo : ${erreur ?? 'erreur inconnue'}` }, { status: 500 })
  }

  // Loguer dans rapports_envoyes
  await supabase.from('rapports_envoyes').insert({
    entreprise_id: entrepriseId,
    periode_debut: periodeDebut,
    periode_fin: periodeFin,
    nb_visites: nbVisites,
    nb_acceptees: nbAcceptees,
    nb_declinee: nbDeclinee,
    temps_attente_moyen: tempsMoyen,
    envoye_a: emails,
  })

  return NextResponse.json({ succes: true, emails, html })
}
