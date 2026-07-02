// Génération du rapport hebdomadaire PDF côté serveur
// Utilise jsPDF + jspdf-autotable (déjà installés)

export interface CollabStat {
  nom: string
  total: number
  acceptees: number
  declinees: number
  redirigees: number
}

export interface VisiteurStat {
  nom: string
  total: number
}

export interface MotifStat {
  motif: string
  total: number
}

export interface RapportPdfData {
  nomEntreprise: string
  periodeDebut: string   // ex: "25 juin 2026"
  periodeFin: string     // ex: "1 juillet 2026"
  nbVisites: number
  nbAcceptees: number
  nbDeclinee: number
  nbRedirigees: number
  tauxAcceptation: number
  tempsMoyen: number
  deltaVisites: number | null
  rdvConfirmes: number
  rdvAnnules: number
  collabStats: CollabStat[]
  topVisiteurs: VisiteurStat[]
  motifStats: MotifStat[]
}

export async function genererPdfRapport(data: RapportPdfData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const PW = doc.internal.pageSize.getWidth()
  const M  = 14
  const TW = PW - M * 2

  const COLORS = {
    primary:  [30, 58, 95] as [number, number, number],
    green:    [22, 163, 74] as [number, number, number],
    red:      [220, 38, 38] as [number, number, number],
    amber:    [217, 119, 6] as [number, number, number],
    gray:     [100, 116, 139] as [number, number, number],
    lightBg:  [248, 250, 252] as [number, number, number],
    border:   [226, 232, 240] as [number, number, number],
    white:    [255, 255, 255] as [number, number, number],
  }

  const dateGen = new Date().toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── EN-TÊTE ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PW, 38, 'F')

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Rapport hebdomadaire', M, 13)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(data.nomEntreprise, M, 21)

  doc.setFontSize(8)
  doc.setTextColor(200, 220, 240)
  doc.text(`${data.periodeDebut} - ${data.periodeFin}`, M, 28)
  doc.text(`Genere le ${dateGen}`, PW - M, 28, { align: 'right' })

  let y = 46

  // ── KPIs (4 cartes en ligne) ──────────────────────────────────────────────────
  const kpiW  = (TW - 9) / 4
  const kpiH  = 22
  const delta = data.deltaVisites

  const kpis = [
    {
      val: String(data.nbVisites),
      label: 'Visites totales',
      sub: delta != null ? `${delta >= 0 ? '+' : ''}${delta} vs sem. prec.` : '',
      bg: [239, 246, 255] as [number, number, number],
      col: COLORS.primary,
    },
    {
      val: `${data.tauxAcceptation}%`,
      label: "Taux d'acceptation",
      sub: `${data.nbAcceptees} acceptees`,
      bg: [240, 253, 244] as [number, number, number],
      col: COLORS.green,
    },
    {
      val: `${data.tempsMoyen} mn`,
      label: 'Attente moyenne',
      sub: '',
      bg: [254, 252, 232] as [number, number, number],
      col: COLORS.amber,
    },
    {
      val: String(data.nbDeclinee),
      label: 'Declinees',
      sub: data.nbRedirigees > 0 ? `${data.nbRedirigees} redirigee(s)` : '',
      bg: [254, 242, 242] as [number, number, number],
      col: COLORS.red,
    },
  ]

  kpis.forEach((k, i) => {
    const kx = M + i * (kpiW + 3)
    doc.setFillColor(...k.bg)
    doc.roundedRect(kx, y, kpiW, kpiH, 2, 2, 'F')
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(kx, y, kpiW, kpiH, 2, 2, 'S')

    doc.setTextColor(...k.col)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(k.val, kx + kpiW / 2, y + 9, { align: 'center' })

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    doc.text(k.label, kx + kpiW / 2, y + 15, { align: 'center' })

    if (k.sub) {
      doc.setFontSize(6)
      doc.setTextColor(...k.col)
      doc.text(k.sub, kx + kpiW / 2, y + 19.5, { align: 'center' })
    }
  })

  y += kpiH + 10

  // ── TABLEAU COLLABORATEURS ─────────────────────────────────────────────────────
  doc.setTextColor(...COLORS.primary)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Visites par collaborateur', M, y)
  y += 4

  const collabRows = data.collabStats.slice(0, 25).map(c => {
    const taux = c.total > 0 ? Math.round((c.acceptees / c.total) * 100) : 0
    return [c.nom, String(c.total), String(c.acceptees), String(c.declinees), String(c.redirigees), `${taux}%`]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Collaborateur', 'Visites', 'Acceptees', 'Declinees', 'Redirigees', 'Taux']],
    body: collabRows.length ? collabRows : [['Aucune donnee pour cette periode', '', '', '', '', '']],
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: TW * 0.35 },
      1: { cellWidth: TW * 0.12, halign: 'center' },
      2: { cellWidth: TW * 0.14, halign: 'center', textColor: COLORS.green },
      3: { cellWidth: TW * 0.14, halign: 'center', textColor: COLORS.red },
      4: { cellWidth: TW * 0.13, halign: 'center', textColor: COLORS.amber },
      5: { cellWidth: TW * 0.12, halign: 'center', fontStyle: 'bold' },
    },
    tableLineWidth: 0.1,
    tableLineColor: COLORS.border,
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── TABLEAU TOP VISITEURS ──────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = M + 10 }

  doc.setTextColor(...COLORS.primary)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Top visiteurs', M, y)
  y += 4

  const visitRows = data.topVisiteurs.slice(0, 20).map(v => [v.nom, String(v.total)])

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Visiteur', 'Nombre de visites']],
    body: visitRows.length ? visitRows : [['Aucune donnee', '']],
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: TW * 0.76 },
      1: { cellWidth: TW * 0.24, halign: 'center', fontStyle: 'bold', textColor: COLORS.primary },
    },
    tableLineWidth: 0.1,
    tableLineColor: COLORS.border,
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── TABLEAU MOTIFS DE VISITE ───────────────────────────────────────────────────
  if (data.motifStats.length > 0) {
    if (y > 230) { doc.addPage(); y = M + 10 }

    doc.setTextColor(...COLORS.primary)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Motifs de visite', M, y)
    y += 4

    const motifRows = data.motifStats.slice(0, 15).map((m, i) => [
      String(i + 1),
      m.motif || '(non renseigne)',
      String(m.total),
      `${data.nbVisites > 0 ? Math.round((m.total / data.nbVisites) * 100) : 0}%`,
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['#', 'Motif', 'Occurrences', 'Part']],
      body: motifRows,
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: TW * 0.08, halign: 'center', textColor: COLORS.gray },
        1: { cellWidth: TW * 0.60 },
        2: { cellWidth: TW * 0.18, halign: 'center' },
        3: { cellWidth: TW * 0.14, halign: 'center', fontStyle: 'bold', textColor: COLORS.primary },
      },
      tableLineWidth: 0.1,
      tableLineColor: COLORS.border,
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── RENDEZ-VOUS ───────────────────────────────────────────────────────────────
  if (data.rdvConfirmes > 0 || data.rdvAnnules > 0) {
    if (y > 240) { doc.addPage(); y = M + 10 }

    doc.setTextColor(...COLORS.primary)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Rendez-vous de la semaine', M, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Statut', 'Nombre']],
      body: [
        ['RDV confirmes', String(data.rdvConfirmes)],
        ['RDV annules', String(data.rdvAnnules)],
      ],
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: TW * 0.76 },
        1: { cellWidth: TW * 0.24, halign: 'center', fontStyle: 'bold' },
      },
      tableLineWidth: 0.1,
      tableLineColor: COLORS.border,
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── PIED DE PAGE sur chaque page ──────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const PH = doc.internal.pageSize.getHeight()
    doc.setFillColor(...COLORS.lightBg)
    doc.rect(0, PH - 10, PW, 10, 'F')
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(0, PH - 10, PW, PH - 10)
    doc.setTextColor(...COLORS.gray)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`VisitPro - Rapport hebdomadaire - ${data.nomEntreprise}`, M, PH - 3.5)
    doc.text(`Page ${p} / ${totalPages}`, PW - M, PH - 3.5, { align: 'right' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}
