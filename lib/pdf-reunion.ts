import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Reunion, CompteRendu, Entreprise, PointAction } from '@/types'

const BLEU_PRIMAIRE = [30, 58, 95] as [number, number, number]
const BLEU_CLAIR    = [147, 197, 253] as [number, number, number]
const GRIS_CLAIR    = [243, 244, 246] as [number, number, number]
const VERT          = [8, 80, 65] as [number, number, number]

function formatDateFr(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function nomParticipant(p: { utilisateur?: { nom: string; prenom: string } | null; nom_externe?: string | null }) {
  if (p.utilisateur) return `${p.utilisateur.prenom} ${p.utilisateur.nom}`
  return p.nom_externe ?? ''
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
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(255, 255, 255)
  // Bandeau accent
  doc.setFillColor(147, 197, 253)
  doc.rect(0, 32, pageW, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('COMPTE-RENDU DE RÉUNION', marginL, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLEU_CLAIR)
  doc.text(entreprise.nom.toUpperCase(), marginL, 21)
  doc.text('Document généré par VisitPro', pageW - marginR, 21, { align: 'right' })

  // Réf + date génération
  const refDoc = `Réf: CR-${reunion.id.slice(0, 8).toUpperCase()}`
  const dateGen = new Date().toLocaleDateString('fr-FR')
  doc.setFontSize(7)
  doc.setTextColor(200, 215, 240)
  doc.text(`${refDoc}  ·  Généré le ${dateGen}`, marginL, 28)

  y = 42

  // ── I — INFORMATIONS GÉNÉRALES ─────────────────────────────────────────────
  doc.setFillColor(...BLEU_PRIMAIRE)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
  doc.text('I  —  INFORMATIONS GÉNÉRALES', marginL + 3, y + 5)
  y += 10

  const infoRows: [string, string][] = [
    ['Titre de la réunion', reunion.titre],
    ['Type', { interne: 'Réunion interne', externe: 'Réunion externe', comite: 'Comité', autre: 'Autre' }[reunion.type] ?? reunion.type],
    ['Date', formatDateFr(reunion.date_reunion)],
    ['Horaires', `${reunion.heure_debut.slice(0, 5)}${reunion.heure_fin ? ` → ${reunion.heure_fin.slice(0, 5)}` : ''}`],
    ['Lieu', reunion.lieu ?? '—'],
    ['Organisateur', reunion.organisateur ? `${reunion.organisateur.prenom} ${reunion.organisateur.nom}` : '—'],
  ]

  infoRows.forEach(([label, val], i) => {
    const bg = i % 2 === 0 ? GRIS_CLAIR : ([255, 255, 255] as [number, number, number])
    doc.setFillColor(...bg)
    doc.rect(marginL, y, contentW, 7, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(label, marginL + 3, y + 4.5)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(val, marginL + 55, y + 4.5)
    y += 7
  })

  y += 6

  // ── II — PARTICIPANTS ──────────────────────────────────────────────────────
  if (reunion.participants && reunion.participants.length > 0) {
    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('II  —  PARTICIPANTS', marginL + 3, y + 5)
    y += 10

    const presenceLabel: Record<string, string> = {
      confirme: 'Présent(e)', absent: 'Absent(e)', excuse: 'Excusé(e)', invite: 'Invité(e)',
    }
    const presenceColor: Record<string, [number, number, number]> = {
      confirme: [8, 80, 65], absent: [153, 27, 27], excuse: [146, 64, 14], invite: [30, 58, 95],
    }

    reunion.participants.forEach((p, i) => {
      const bg = i % 2 === 0 ? GRIS_CLAIR : ([255, 255, 255] as [number, number, number])
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, 7, 'F')

      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(nomParticipant(p), marginL + 3, y + 4.5)

      if (p.utilisateur?.poste) {
        doc.setTextColor(100, 116, 139)
        doc.setFontSize(7)
        doc.text(p.utilisateur.poste, marginL + 70, y + 4.5)
      }

      const statLabel = presenceLabel[p.statut_presence] ?? p.statut_presence
      const statColor = presenceColor[p.statut_presence] ?? [100, 116, 139]
      doc.setTextColor(...statColor)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text(statLabel, pageW - marginR - 3, y + 4.5, { align: 'right' })

      y += 7
    })
    y += 6
  }

  // ── III — ORDRE DU JOUR ────────────────────────────────────────────────────
  if (reunion.points && reunion.points.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 18 }

    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('III  —  ORDRE DU JOUR', marginL + 3, y + 5)
    y += 10

    reunion.points.sort((a, b) => a.ordre - b.ordre).forEach((pt, i) => {
      if (y > pageH - 25) { doc.addPage(); y = 18 }
      const bg = i % 2 === 0 ? GRIS_CLAIR : ([255, 255, 255] as [number, number, number])
      const statutIco = { a_traiter: '○', en_cours: '◑', traite: '●', reporte: '⊘' }[pt.statut] ?? '○'
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, pt.description ? 12 : 7, 'F')

      doc.setTextColor(30, 58, 95)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(`${i + 1}. ${pt.titre}  ${statutIco}`, marginL + 3, y + 5)

      if (pt.description) {
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        const lines = doc.splitTextToSize(pt.description, contentW - 8) as string[]
        doc.text(lines.slice(0, 1), marginL + 5, y + 9.5)
        y += 12
      } else {
        y += 7
      }
    })
    y += 6
  }

  // ── IV — RÉSUMÉ / FAITS ────────────────────────────────────────────────────
  if (cr.resume) {
    if (y > pageH - 40) { doc.addPage(); y = 18 }

    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('IV  —  RÉSUMÉ DES DISCUSSIONS', marginL + 3, y + 5)
    y += 10

    doc.setFillColor(...GRIS_CLAIR)
    const resumeLines = doc.splitTextToSize(cr.resume, contentW - 6) as string[]
    const resumeH = resumeLines.length * 5 + 4
    doc.rect(marginL, y, contentW, resumeH, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(resumeLines, marginL + 3, y + 5)
    y += resumeH + 6
  }

  // ── V — DÉCISIONS ─────────────────────────────────────────────────────────
  if (cr.decisions && cr.decisions.length > 0) {
    if (y > pageH - 40) { doc.addPage(); y = 18 }

    doc.setFillColor(...VERT)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('V  —  DÉCISIONS PRISES', marginL + 3, y + 5)
    y += 10

    cr.decisions.forEach((d, i) => {
      if (y > pageH - 20) { doc.addPage(); y = 18 }
      const bg = i % 2 === 0 ? [232, 245, 232] as [number, number, number] : ([255, 255, 255] as [number, number, number])
      const lines = doc.splitTextToSize(d, contentW - 10) as string[]
      const h = lines.length * 5 + 4
      doc.setFillColor(...bg)
      doc.rect(marginL, y, contentW, h, 'F')

      doc.setFillColor(...VERT)
      doc.circle(marginL + 5, y + h / 2, 1.5, 'F')

      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(lines, marginL + 10, y + 5)
      y += h
    })
    y += 6
  }

  // ── VI — PLAN D'ACTIONS ────────────────────────────────────────────────────
  if (cr.plan_actions && cr.plan_actions.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = 18 }

    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('VI  —  PLAN D\'ACTIONS', marginL + 3, y + 5)
    y += 10

    const statutLabel: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' }

    autoTable(doc, {
      startY: y,
      head: [['#', 'Action', 'Responsable', 'Échéance', 'Statut']],
      body: cr.plan_actions.map((a: PointAction, i: number) => [
        i + 1,
        a.description,
        a.responsable,
        a.echeance ? new Date(a.echeance).toLocaleDateString('fr-FR') : '—',
        statutLabel[a.statut] ?? a.statut,
      ]),
      margin: { left: marginL, right: marginR },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── VII — OBSERVATIONS ────────────────────────────────────────────────────
  if (cr.observations) {
    if (y > pageH - 30) { doc.addPage(); y = 18 }

    doc.setFillColor(146, 64, 14)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.text('VII  —  OBSERVATIONS', marginL + 3, y + 5)
    y += 10

    const obsLines = doc.splitTextToSize(cr.observations, contentW - 6) as string[]
    const obsH = obsLines.length * 5 + 4
    doc.setFillColor(254, 243, 199)
    doc.rect(marginL, y, contentW, obsH, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(obsLines, marginL + 3, y + 5)
    y += obsH + 6
  }

  // ── SIGNATURES ────────────────────────────────────────────────────────────
  if (y > pageH - 35) { doc.addPage(); y = 18 }
  y = Math.max(y, pageH - 45)

  doc.setDrawColor(200, 210, 220)
  doc.line(marginL, y, pageW - marginR, y)
  y += 6

  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Rédacteur du compte-rendu', marginL, y)
  doc.text('Approbation', pageW / 2, y, { align: 'center' })
  y += 12
  doc.line(marginL, y, marginL + 60, y)
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y)

  // ── PIED DE PAGE (toutes les pages) ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...BLEU_PRIMAIRE)
    doc.rect(0, pageH - 10, pageW, 10, 'F')
    doc.setTextColor(...BLEU_CLAIR)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`${entreprise.nom}  —  Compte-rendu de réunion  —  ${formatDateFr(reunion.date_reunion)}`, marginL, pageH - 4)
    doc.text(`Page ${p} / ${totalPages}`, pageW - marginR, pageH - 4, { align: 'right' })
  }

  doc.save(`CR-${reunion.titre.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${reunion.date_reunion}.pdf`)
}
