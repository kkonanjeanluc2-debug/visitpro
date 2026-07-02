import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'

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
  periodeDebut: string
  periodeFin: string
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

// ── Couleurs ──────────────────────────────────────────────────────────────────

const C = {
  primary:  rgb(0.118, 0.227, 0.373), // #1E3A5F
  green:    rgb(0.086, 0.639, 0.290), // #16A34A
  red:      rgb(0.863, 0.149, 0.149), // #DC2626
  amber:    rgb(0.851, 0.467, 0.024), // #D97706
  blue:     rgb(0.231, 0.510, 0.965), // #3B82F6
  gray:     rgb(0.392, 0.455, 0.545), // #64748B
  lightBg:  rgb(0.973, 0.980, 0.988), // #F8FAFC
  border:   rgb(0.886, 0.910, 0.941), // #E2E8F0
  white:    rgb(1, 1, 1),
  text:     rgb(0.118, 0.161, 0.235), // #1E293B
  blueLight:rgb(0.937, 0.965, 1),     // #EFF6FF
  greenLight:rgb(0.941, 0.996, 0.957),// #F0FDF4
  redLight: rgb(0.996, 0.949, 0.949), // #FEF2F2
  amberLight:rgb(0.999, 0.988, 0.894),// #FEFCE8
}

// ── Constantes page ───────────────────────────────────────────────────────────

const [PW, PH] = PageSizes.A4  // 595.28 x 841.89
const ML = 40
const TW = PW - ML * 2

// ── Types helpers ─────────────────────────────────────────────────────────────

type Fonts = {
  regular: Awaited<ReturnType<PDFDocument['embedFont']>>
  bold:    Awaited<ReturnType<PDFDocument['embedFont']>>
}

interface DrawCtx {
  doc: PDFDocument
  fonts: Fonts
  pages: ReturnType<PDFDocument['getPages']>
  currentPage: number
}

// Tronquer un texte pour qu'il tienne dans maxWidth pts
function truncate(str: string, font: Fonts['regular'], size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(str, size) <= maxWidth) return str
  let s = str
  while (s.length > 0 && font.widthOfTextAtSize(s + '…', size) > maxWidth) {
    s = s.slice(0, -1)
  }
  return s + '…'
}

function getPage(ctx: DrawCtx) {
  return ctx.pages[ctx.currentPage]
}

function addPage(ctx: DrawCtx) {
  ctx.doc.addPage(PageSizes.A4)
  ctx.pages = ctx.doc.getPages()
  ctx.currentPage = ctx.pages.length - 1
  return getPage(ctx)
}

// ── Dessin primitifs ──────────────────────────────────────────────────────────

function fillRect(
  page: ReturnType<PDFDocument['getPage']>,
  x: number, y: number, w: number, h: number,
  color: ReturnType<typeof rgb>
) {
  page.drawRectangle({ x, y, width: w, height: h, color, borderWidth: 0 })
}

function strokeRect(
  page: ReturnType<PDFDocument['getPage']>,
  x: number, y: number, w: number, h: number,
  borderColor: ReturnType<typeof rgb>,
  thickness = 0.5
) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth: thickness, color: undefined })
}

function drawText(
  page: ReturnType<PDFDocument['getPage']>,
  str: string,
  x: number,
  // y en coordonnées PDF (bas=0, haut=PH)
  y: number,
  font: Fonts['regular'],
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth?: number,
  align: 'left' | 'center' | 'right' = 'left'
) {
  if (!str) return
  let s = maxWidth ? truncate(str, font, size, maxWidth) : str
  const textW = font.widthOfTextAtSize(s, size)
  let dx = x
  if (align === 'center' && maxWidth) dx = x + (maxWidth - textW) / 2
  if (align === 'right'  && maxWidth) dx = x + maxWidth - textW
  page.drawText(s, { x: dx, y, font, size, color })
}

// ── Tableau ───────────────────────────────────────────────────────────────────

interface Col {
  label: string
  w: number
  align?: 'left' | 'center' | 'right'
  color?: ReturnType<typeof rgb>
  bold?: boolean
}

// Dans pdf-lib y=0 est en bas, donc on convertit: pdfY = PH - topY
function pdfY(topY: number) { return PH - topY }

function drawTable(
  ctx: DrawCtx,
  startTopY: number,
  cols: Col[],
  rows: (string | number)[][]
): number {
  const ROW_H  = 18
  const HEAD_H = 22
  let topY = startTopY

  const drawHeader = (y: number) => {
    const page = getPage(ctx)
    fillRect(page, ML, pdfY(y + HEAD_H), TW, HEAD_H, C.primary)
    let cx = ML
    for (const col of cols) {
      drawText(page, col.label, cx + 4, pdfY(y + HEAD_H - 7), ctx.fonts.bold, 8, C.white, col.w - 8, col.align ?? 'left')
      cx += col.w
    }
  }

  drawHeader(topY)
  topY += HEAD_H

  if (rows.length === 0) {
    const page = getPage(ctx)
    fillRect(page, ML, pdfY(topY + ROW_H), TW, ROW_H, C.lightBg)
    drawText(page, 'Aucune donnee pour cette periode', ML, pdfY(topY + ROW_H - 4), ctx.fonts.regular, 8, C.gray, TW, 'center')
    return topY + ROW_H
  }

  for (let i = 0; i < rows.length; i++) {
    if (topY + ROW_H > PH - 55) {
      addPage(ctx)
      topY = ML + 10
      drawHeader(topY)
      topY += HEAD_H
    }
    const page = getPage(ctx)
    const bg = i % 2 === 0 ? C.white : C.lightBg
    fillRect(page, ML, pdfY(topY + ROW_H), TW, ROW_H, bg)

    let cx = ML
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j]
      const val = String(rows[i][j] ?? '')
      const font = col.bold ? ctx.fonts.bold : ctx.fonts.regular
      const color = col.color ?? C.text
      drawText(page, val, cx + 4, pdfY(topY + ROW_H - 4), font, 8, color, col.w - 8, col.align ?? 'left')
      cx += col.w
    }

    // ligne de séparation
    const page2 = getPage(ctx)
    page2.drawLine({ start: { x: ML, y: pdfY(topY + ROW_H) }, end: { x: ML + TW, y: pdfY(topY + ROW_H) }, thickness: 0.3, color: C.border })

    topY += ROW_H
  }
  return topY
}

// ── Section title ─────────────────────────────────────────────────────────────

function sectionTitle(ctx: DrawCtx, title: string, topY: number): number {
  const page = getPage(ctx)
  drawText(page, title, ML, pdfY(topY + 11), ctx.fonts.bold, 11, C.primary)
  page.drawLine({ start: { x: ML, y: pdfY(topY + 18) }, end: { x: ML + TW, y: pdfY(topY + 18) }, thickness: 0.5, color: C.border })
  return topY + 24
}

// ── Pied de page ──────────────────────────────────────────────────────────────

function addFooters(doc: PDFDocument, fonts: Fonts, nomEntreprise: string) {
  const dateGen = new Date().toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })
  const pages = doc.getPages()
  const total = pages.length
  for (let i = 0; i < total; i++) {
    const page = pages[i]
    fillRect(page, 0, 0, PW, 28, C.lightBg)
    page.drawLine({ start: { x: 0, y: 28 }, end: { x: PW, y: 28 }, thickness: 0.5, color: C.border })
    drawText(page, `VisitPro — ${nomEntreprise}`, ML, 10, fonts.regular, 7, C.gray)
    drawText(page, `Page ${i + 1} / ${total} — Genere le ${dateGen}`, ML, 10, fonts.regular, 7, C.gray, TW, 'right')
  }
}

// ── Générateur principal ──────────────────────────────────────────────────────

export async function genererPdfRapport(data: RapportPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Rapport VisitPro — ${data.nomEntreprise}`)
  doc.setAuthor('VisitPro')

  const [regular, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ])

  const fonts: Fonts = { regular, bold }

  // Première page
  doc.addPage(PageSizes.A4)
  const ctx: DrawCtx = { doc, fonts, pages: doc.getPages(), currentPage: 0 }

  const dateGen = new Date().toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── EN-TÊTE ────────────────────────────────────────────────────────────────
  const p0 = getPage(ctx)
  fillRect(p0, 0, PH - 78, PW, 78, C.primary)
  drawText(p0, 'Rapport hebdomadaire', ML, PH - 30, fonts.bold, 18, C.white)
  drawText(p0, data.nomEntreprise, ML, PH - 48, fonts.regular, 11, rgb(0.576, 0.773, 0.992))
  drawText(p0, `${data.periodeDebut} — ${data.periodeFin}`, ML, PH - 65, fonts.regular, 9, rgb(0.796, 0.835, 0.886))
  drawText(p0, `Genere le ${dateGen}`, ML, PH - 18, fonts.regular, 8, rgb(0.796, 0.835, 0.886), PW - ML * 2, 'right')

  let topY = 95

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const KW = (TW - 9) / 4
  const KH = 52
  const delta = data.deltaVisites

  const kpis = [
    { val: String(data.nbVisites), label: 'Visites totales', sub: delta != null ? `${delta >= 0 ? '+' : ''}${delta} vs sem. prec.` : '', valColor: C.primary, bg: C.blueLight },
    { val: `${data.tauxAcceptation}%`, label: "Taux d'acceptation", sub: `${data.nbAcceptees} acceptees`, valColor: C.green, bg: C.greenLight },
    { val: `${data.tempsMoyen} mn`, label: 'Attente moyenne', sub: '', valColor: C.amber, bg: C.amberLight },
    { val: String(data.nbDeclinee), label: 'Declinees', sub: data.nbRedirigees > 0 ? `${data.nbRedirigees} redirigee(s)` : '', valColor: C.red, bg: C.redLight },
  ]

  kpis.forEach((k, i) => {
    const kx = ML + i * (KW + 3)
    const page = getPage(ctx)
    fillRect(page, kx, pdfY(topY + KH), KW, KH, k.bg)
    strokeRect(page, kx, pdfY(topY + KH), KW, KH, C.border, 0.5)
    drawText(page, k.val, kx, pdfY(topY + 28), fonts.bold, 18, k.valColor, KW, 'center')
    drawText(page, k.label, kx, pdfY(topY + 44), fonts.regular, 7, C.gray, KW, 'center')
    if (k.sub) drawText(page, k.sub, kx, pdfY(topY + 52), fonts.regular, 7, k.valColor, KW, 'center')
  })

  topY += KH + 18

  // ── TABLE COLLABORATEURS ────────────────────────────────────────────────────
  topY = sectionTitle(ctx, 'Visites par collaborateur', topY)
  const cw0 = TW * 0.34, cw1 = TW * 0.13, cw2 = TW * 0.14
  const cw3 = TW * 0.14, cw4 = TW * 0.12, cw5 = TW * 0.13

  topY = drawTable(ctx, topY, [
    { label: 'Collaborateur', w: cw0 },
    { label: 'Visites',       w: cw1, align: 'center' },
    { label: 'Acceptees',     w: cw2, align: 'center', color: C.green },
    { label: 'Declinees',     w: cw3, align: 'center', color: C.red },
    { label: 'Redirect.',     w: cw4, align: 'center', color: C.amber },
    { label: 'Taux',          w: cw5, align: 'center', bold: true },
  ], data.collabStats.slice(0, 25).map(c => {
    const taux = c.total > 0 ? Math.round((c.acceptees / c.total) * 100) : 0
    return [c.nom, c.total, c.acceptees, c.declinees, c.redirigees, `${taux}%`]
  }))

  topY += 14

  // ── TABLE TOP VISITEURS ─────────────────────────────────────────────────────
  if (topY > PH - 160) { addPage(ctx); topY = ML + 10 }
  topY = sectionTitle(ctx, 'Top visiteurs', topY)
  topY = drawTable(ctx, topY, [
    { label: 'Visiteur',   w: TW * 0.78 },
    { label: 'Nb visites', w: TW * 0.22, align: 'center', bold: true, color: C.primary },
  ], data.topVisiteurs.slice(0, 20).map(v => [v.nom, v.total]))

  topY += 14

  // ── TABLE MOTIFS ────────────────────────────────────────────────────────────
  if (data.motifStats.length > 0) {
    if (topY > PH - 160) { addPage(ctx); topY = ML + 10 }
    topY = sectionTitle(ctx, 'Motifs de visite', topY)
    topY = drawTable(ctx, topY, [
      { label: '#',          w: TW * 0.07, align: 'center', color: C.gray },
      { label: 'Motif',      w: TW * 0.70 },
      { label: 'Occurrences',w: TW * 0.13, align: 'center' },
      { label: 'Part',       w: TW * 0.10, align: 'center', bold: true, color: C.primary },
    ], data.motifStats.slice(0, 15).map((m, i) => {
      const pct = data.nbVisites > 0 ? Math.round((m.total / data.nbVisites) * 100) : 0
      return [i + 1, m.motif || '(non renseigne)', m.total, `${pct}%`]
    }))
    topY += 14
  }

  // ── RDV ────────────────────────────────────────────────────────────────────
  if (data.rdvConfirmes > 0 || data.rdvAnnules > 0) {
    if (topY > PH - 120) { addPage(ctx); topY = ML + 10 }
    topY = sectionTitle(ctx, 'Rendez-vous', topY)
    const RW = (TW - 8) / 2
    const rdvItems = [
      { label: 'RDV confirmes', val: data.rdvConfirmes, bg: C.blueLight,  vc: rgb(0.114, 0.306, 0.863) },
      { label: 'RDV annules',   val: data.rdvAnnules,   bg: C.redLight,   vc: C.red },
    ]
    rdvItems.forEach((item, i) => {
      const rx = ML + i * (RW + 8)
      const page = getPage(ctx)
      fillRect(page, rx, pdfY(topY + 42), RW, 42, item.bg)
      strokeRect(page, rx, pdfY(topY + 42), RW, 42, C.border, 0.4)
      drawText(page, String(item.val), rx, pdfY(topY + 22), fonts.bold, 20, item.vc, RW, 'center')
      drawText(page, item.label, rx, pdfY(topY + 38), fonts.regular, 8, item.vc, RW, 'center')
    })
    topY += 56
  }

  // ── PIEDS DE PAGE ──────────────────────────────────────────────────────────
  addFooters(doc, fonts, data.nomEntreprise)

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
