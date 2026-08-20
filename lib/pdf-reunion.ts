import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Reunion, CompteRendu, Entreprise, PointAction } from '@/types'

const BLEU_PRIMAIRE = [30, 58, 95] as [number, number, number]
const BLEU_CLAIR    = [147, 197, 253] as [number, number, number]
const GRIS_CLAIR    = [243, 244, 246] as [number, number, number]
const VERT          = [8, 80, 65] as [number, number, number]

const STATUT_ODJ_LABEL: Record<string, string> = {
  a_traiter: 'A traiter',
  en_cours:  'En cours',
  traite:    'Traite',
  reporte:   'Reporte',
}

const ROW_H = 11   // hauteur ligne données (mm) — texte 11pt
const SEC_H = 10   // hauteur bandeau section — texte 12pt

function formatDateFr(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function nomCourt(p: { utilisateur?: { nom: string; prenom: string } | null; nom_externe?: string | null }) {
  if (p.utilisateur) return `${p.utilisateur.prenom} ${p.utilisateur.nom}`
  return p.nom_externe ?? ''
}

function nomAvecPoste(p: { utilisateur?: { nom: string; prenom: string; poste?: string | null } | null; nom_externe?: string | null }) {
  const base = nomCourt(p)
  const poste = p.utilisateur?.poste
  return poste ? `${base} - ${poste}` : base
}

function checkPage(doc: jsPDF, y: number, needed: number, pageH: number): number {
  if (y + needed > pageH - 18) { doc.addPage(); return 18 }
  return y
}

// Bandeau de section (12pt, 10mm de haut)
function section(doc: jsPDF, label: string, y: number, marginL: number, contentW: number, color = BLEU_PRIMAIRE) {
  doc.setFillColor(...color)
  doc.setTextColor(255, 255, 255)
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.roundedRect(marginL, y, contentW, SEC_H, 1, 1, 'F')
  doc.text(label, marginL + 3, y + 7)
  return y + SEC_H + 4
}

export function genererCompteRenduPDF(
  reunion: Reunion,
  cr: CompteRendu,
  entreprise: Entreprise,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 18
  const marginR = 18
  const contentW = pageW - marginL - marginR
  let y = 0

  // ── EN-TÊTE ────────────────────────────────────────────────────────────────
  doc.setFillColor(...BLEU_PRIMAIRE)
  doc.rect(0, 0, pageW, 36, 'F')
  doc.setFillColor(147, 197, 253)
  doc.rect(0, 36, pageW, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.text('COMPTE-RENDU DE REUNION', marginL, 16)

  doc.setFont('times', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...BLEU_CLAIR)
  doc.text(entreprise.nom.toUpperCase(), marginL, 25)
  doc.text('Document genere par VisitPro', pageW - marginR, 25, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(200, 215, 240)
  const refDoc = `Ref: CR-${reunion.id.slice(0, 8).toUpperCase()}`
  const dateGen = new Date().toLocaleDateString('fr-FR')
  doc.text(`${refDoc}  -  Genere le ${dateGen}`, marginL, 32)

  y = 46

  // ── I — INFORMATIONS GÉNÉRALES ─────────────────────────────────────────────
  y = section(doc, 'I  -  INFORMATIONS GENERALES', y, marginL, contentW)

  const heureStr = reunion.heure_debut.slice(0, 5) + (reunion.heure_fin ? ` - ${reunion.heure_fin.slice(0, 5)}` : '')

  const infoRows: [string, string][] = [
    ['Titre de la reunion', reunion.titre],
    ['Type', { interne: 'Reunion interne', externe: 'Reunion externe', comite: 'Comite', autre: 'Autre' }[reunion.type] ?? reunion.type],
    ['Date', formatDateFr(reunion.date_reunion)],
    ['Horaires', heureStr],
    ['Lieu', reunion.lieu ?? '-'],
    ['Organisateur', reunion.organisateur ? `${reunion.organisateur.prenom} ${reunion.organisateur.nom}` : '-'],
  ]

  infoRows.forEach(([label, val], i) => {
    const bg = i % 2 === 0 ? GRIS_CLAIR : ([255, 255, 255] as [number, number, number])
    doc.setFillColor(...bg)
    doc.rect(marginL, y, contentW, ROW_H, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.text(label, marginL + 3, y + 7.5)
    doc.setTextColor(30, 41, 59)
    doc.setFont('times', 'bold')
    doc.text(val, marginL + 58, y + 7.5)
    y += ROW_H
  })

  y += 8

  // ── II — PARTICIPANTS ──────────────────────────────────────────────────────
  if (reunion.participants && reunion.participants.length > 0) {
    y = checkPage(doc, y, 50, pageH)
    y = section(doc, 'II  -  LISTE DES PARTICIPANTS', y, marginL, contentW)

    const parts = reunion.participants
    const presidentPart  = parts.find((p) => p.role_seance === 'president')
    const secretairePart = parts.find((p) => p.role_seance === 'secretaire')
    const rolesIds = new Set([presidentPart?.id, secretairePart?.id].filter(Boolean))
    const presents = parts.filter((p) => p.statut_presence === 'confirme' && !rolesIds.has(p.id))
    const excuses  = parts.filter((p) => p.statut_presence === 'excuse')

    const renderRole = (label: string, p: typeof parts[0] | undefined, bg: [number, number, number]) => {
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, ROW_H, 'F')
      doc.setTextColor(100, 116, 139)
      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      doc.text(label, marginL + 3, y + 7.5)
      doc.setTextColor(30, 41, 59)
      doc.setFont('times', 'bold')
      doc.text(p ? nomAvecPoste(p) : 'Non designe', marginL + 58, y + 7.5)
      y += ROW_H
    }

    renderRole('President(e) de seance', presidentPart, GRIS_CLAIR)
    renderRole('Secretaire de seance', secretairePart, [255, 255, 255])

    if (presents.length > 0) {
      doc.setFillColor(232, 245, 240)
      doc.rect(marginL, y, contentW, 8, 'F')
      doc.setFont('times', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(8, 80, 65)
      doc.text('Presents', marginL + 3, y + 5.5)
      y += 8

      presents.forEach((p, i) => {
        const bg = i % 2 === 0 ? ([255, 255, 255] as [number, number, number]) : GRIS_CLAIR
        doc.setFillColor(...bg)
        doc.rect(marginL, y, contentW, ROW_H, 'F')
        doc.setTextColor(30, 41, 59)
        doc.setFont('times', 'normal')
        doc.setFontSize(11)
        doc.text(`- ${nomAvecPoste(p)}`, marginL + 6, y + 7.5)
        y += ROW_H
      })
    }

    if (excuses.length > 0) {
      doc.setFillColor(254, 243, 199)
      doc.rect(marginL, y, contentW, 8, 'F')
      doc.setFont('times', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(146, 64, 14)
      doc.text('Excuses', marginL + 3, y + 5.5)
      y += 8

      excuses.forEach((p, i) => {
        const bg = i % 2 === 0 ? ([255, 255, 255] as [number, number, number]) : GRIS_CLAIR
        doc.setFillColor(...bg)
        doc.rect(marginL, y, contentW, ROW_H, 'F')
        doc.setTextColor(30, 41, 59)
        doc.setFont('times', 'normal')
        doc.setFontSize(11)
        doc.text(`- ${nomCourt(p)}`, marginL + 6, y + 7.5)
        y += ROW_H
      })
    }

    y += 8
  }

  // ── III — ORDRE DU JOUR ────────────────────────────────────────────────────
  if (reunion.points && reunion.points.length > 0) {
    y = checkPage(doc, y, 40, pageH)
    y = section(doc, 'III  -  ORDRE DU JOUR', y, marginL, contentW)

    reunion.points.sort((a, b) => a.ordre - b.ordre).forEach((pt, i) => {
      const rowH = pt.description ? 17 : ROW_H
      y = checkPage(doc, y, rowH + 2, pageH)

      const bg = i % 2 === 0 ? GRIS_CLAIR : ([255, 255, 255] as [number, number, number])
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, rowH, 'F')

      const statutLabel = STATUT_ODJ_LABEL[pt.statut] ?? 'Inconnu'
      const statutColor: Record<string, [number, number, number]> = {
        a_traiter: [100, 116, 139],
        en_cours:  [37, 99, 235],
        traite:    [8, 80, 65],
        reporte:   [146, 64, 14],
      }
      doc.setFont('times', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...(statutColor[pt.statut] ?? ([100, 116, 139] as [number, number, number])))
      doc.text(statutLabel, pageW - marginR - 3, y + 7.5, { align: 'right' })

      doc.setTextColor(30, 58, 95)
      doc.setFont('times', 'bold')
      doc.setFontSize(11)
      const titreLines = doc.splitTextToSize(`${i + 1}. ${pt.titre}`, contentW - 38) as string[]
      doc.text(titreLines[0], marginL + 3, y + 7.5)

      if (pt.description) {
        doc.setTextColor(100, 116, 139)
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        const descLines = doc.splitTextToSize(pt.description, contentW - 8) as string[]
        doc.text(descLines.slice(0, 1), marginL + 5, y + 13)
      }

      y += rowH
    })
    y += 8
  }

  // ── IV — RÉSUMÉ ────────────────────────────────────────────────────────────
  if (cr.resume) {
    y = checkPage(doc, y, 35, pageH)
    y = section(doc, 'IV  -  RESUME DES DISCUSSIONS', y, marginL, contentW)

    doc.setFillColor(...GRIS_CLAIR)
    const resumeLines = doc.splitTextToSize(cr.resume, contentW - 8) as string[]
    const resumeH = resumeLines.length * 7 + 8
    doc.rect(marginL, y, contentW, resumeH, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.text(resumeLines, marginL + 4, y + 7)
    y += resumeH + 8
  }

  // ── V — DÉCISIONS ─────────────────────────────────────────────────────────
  if (cr.decisions && cr.decisions.length > 0) {
    y = checkPage(doc, y, 35, pageH)
    y = section(doc, 'V  -  DECISIONS PRISES', y, marginL, contentW, VERT)

    cr.decisions.forEach((d, i) => {
      y = checkPage(doc, y, 18, pageH)
      const bg = i % 2 === 0 ? ([232, 245, 232] as [number, number, number]) : ([255, 255, 255] as [number, number, number])
      const lines = doc.splitTextToSize(d, contentW - 14) as string[]
      const h = lines.length * 7 + 6
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, h, 'F')
      doc.setFillColor(...VERT)
      doc.circle(marginL + 5.5, y + h / 2, 2, 'F')
      doc.setTextColor(30, 41, 59)
      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      doc.text(lines, marginL + 12, y + 7)
      y += h
    })
    y += 8
  }

  // ── VI — PLAN D'ACTIONS ────────────────────────────────────────────────────
  if (cr.plan_actions && cr.plan_actions.length > 0) {
    y = checkPage(doc, y, 45, pageH)
    y = section(doc, 'VI  -  PLAN D\'ACTIONS', y, marginL, contentW)

    const statutLabel: Record<string, string> = { a_faire: 'A faire', en_cours: 'En cours', fait: 'Fait' }

    autoTable(doc, {
      startY: y,
      head: [['#', 'Action', 'Responsable', 'Echeance', 'Statut']],
      body: cr.plan_actions.map((a: PointAction, i: number) => [
        i + 1,
        a.description,
        a.responsable,
        a.echeance ? new Date(a.echeance).toLocaleDateString('fr-FR') : '-',
        statutLabel[a.statut] ?? a.statut,
      ]),
      margin: { left: marginL, right: marginR },
      styles: { fontSize: 11, cellPadding: 4, font: 'times' },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 36 },
        3: { cellWidth: 22 },
        4: { cellWidth: 26 },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── VII — OBSERVATIONS ────────────────────────────────────────────────────
  if (cr.observations) {
    y = checkPage(doc, y, 30, pageH)
    y = section(doc, 'VII  -  OBSERVATIONS', y, marginL, contentW, [146, 64, 14])

    const obsLines = doc.splitTextToSize(cr.observations, contentW - 8) as string[]
    const obsH = obsLines.length * 7 + 8
    doc.setFillColor(254, 243, 199)
    doc.rect(marginL, y, contentW, obsH, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.text(obsLines, marginL + 4, y + 7)
    y += obsH + 8
  }

  // ── VIII — SIGNATURES ────────────────────────────────────────────────────
  const participants = reunion.participants ?? []
  const presidentPart  = participants.find((p) => p.role_seance === 'president')
  const secretairePart = participants.find((p) => p.role_seance === 'secretaire')

  const sigBlockH = 65
  y = checkPage(doc, y, sigBlockH + SEC_H + 6, pageH)
  y = section(doc, 'VIII  -  SIGNATURES', y, marginL, contentW, [71, 85, 105])

  const halfW   = (contentW - 6) / 2
  const sigX1   = marginL
  const sigX2   = marginL + halfW + 6
  const sigImgW = halfW - 8
  const sigImgH = 32

  // Cadre Secrétaire (gauche)
  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(0.4)
  doc.roundedRect(sigX1, y, halfW, sigBlockH, 1, 1)

  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 58, 95)
  doc.text('Secretaire de seance', sigX1 + 4, y + 7.5)

  if (secretairePart) {
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(nomAvecPoste(secretairePart), sigX1 + 4, y + 14)
  }

  if (cr.signature_secretaire) {
    try { doc.addImage(cr.signature_secretaire, 'PNG', sigX1 + 4, y + 17, sigImgW, sigImgH) }
    catch { doc.setDrawColor(180, 190, 200); doc.line(sigX1 + 4, y + 48, sigX1 + halfW - 4, y + 48) }
  } else {
    doc.setDrawColor(180, 190, 200)
    doc.line(sigX1 + 4, y + 48, sigX1 + halfW - 4, y + 48)
    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(180, 190, 200)
    doc.text('Signature', sigX1 + 4, y + 54)
  }

  // Cadre Président (droite)
  doc.setDrawColor(200, 210, 220)
  doc.roundedRect(sigX2, y, halfW, sigBlockH, 1, 1)

  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 58, 95)
  doc.text('President(e) de seance', sigX2 + 4, y + 7.5)

  if (presidentPart) {
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(nomAvecPoste(presidentPart), sigX2 + 4, y + 14)
  }

  if (cr.signature_president) {
    try { doc.addImage(cr.signature_president, 'PNG', sigX2 + 4, y + 17, sigImgW, sigImgH) }
    catch { doc.setDrawColor(180, 190, 200); doc.line(sigX2 + 4, y + 48, sigX2 + halfW - 4, y + 48) }
    if (cr.approuve_par_president_le) {
      doc.setFont('times', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(8, 80, 65)
      doc.text(
        `Approuve le ${new Date(cr.approuve_par_president_le).toLocaleDateString('fr-FR')}`,
        sigX2 + 4,
        y + sigBlockH - 4,
      )
    }
  } else {
    doc.setDrawColor(180, 190, 200)
    doc.line(sigX2 + 4, y + 48, sigX2 + halfW - 4, y + 48)
    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(180, 190, 200)
    doc.text('Signature', sigX2 + 4, y + 54)
  }

  y += sigBlockH

  // ── PIED DE PAGE ─────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.rect(0, pageH - 11, pageW, 11, 'F')
    doc.setTextColor(...BLEU_CLAIR)
    doc.setFontSize(8)
    doc.setFont('times', 'normal')
    doc.text(`${entreprise.nom}  -  Compte-rendu de reunion  -  ${formatDateFr(reunion.date_reunion)}`, marginL, pageH - 4)
    doc.text(`Page ${p} / ${totalPages}`, pageW - marginR, pageH - 4, { align: 'right' })
  }

  doc.save(`CR-${reunion.titre.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${reunion.date_reunion}.pdf`)
}
