// Génération PDF côté serveur via PDFKit (Node.js natif, sans dépendance navigateur)
import PDFDocument from 'pdfkit'

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

// ── Constantes ────────────────────────────────────────────────────────────────

const PW = 595.28  // A4 largeur pts
const PH = 841.89  // A4 hauteur pts
const ML = 40      // marge gauche/droite
const TW = PW - ML * 2

const C = {
  primary:  '#1E3A5F',
  green:    '#16A34A',
  red:      '#DC2626',
  amber:    '#D97706',
  blue:     '#3B82F6',
  gray:     '#64748B',
  lightBg:  '#F8FAFC',
  border:   '#E2E8F0',
  white:    '#FFFFFF',
  text:     '#1E293B',
}

// ── Helpers dessin ────────────────────────────────────────────────────────────

function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fill(color)
}

function strokeLine(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number, color: string, lw = 0.5) {
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(lw).stroke()
}

function text(
  doc: PDFKit.PDFDocument,
  str: string,
  x: number,
  y: number,
  opts: {
    color?: string
    size?: number
    bold?: boolean
    align?: 'left' | 'center' | 'right'
    width?: number
    ellipsis?: boolean
  } = {}
) {
  doc
    .fillColor(opts.color ?? C.text)
    .fontSize(opts.size ?? 9)
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .text(str, x, y, {
      width: opts.width,
      align: opts.align ?? 'left',
      ellipsis: opts.ellipsis ?? false,
      lineBreak: false,
    })
}

// ── Tableau générique ─────────────────────────────────────────────────────────

interface Col {
  label: string
  w: number
  align?: 'left' | 'center' | 'right'
  color?: string
  bold?: boolean
}

function drawTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  cols: Col[],
  rows: (string | number)[][]
): number {
  const ROW_H  = 18
  const HEAD_H = 22
  let y = startY

  // En-tête
  fillRect(doc, ML, y, TW, HEAD_H, C.primary)
  let cx = ML
  for (const col of cols) {
    text(doc, col.label, cx + 4, y + 7, { color: C.white, size: 8, bold: true, align: col.align ?? 'left', width: col.w - 8 })
    cx += col.w
  }
  y += HEAD_H

  if (rows.length === 0) {
    fillRect(doc, ML, y, TW, ROW_H, C.lightBg)
    text(doc, 'Aucune donnée pour cette période', ML, y + 4, { color: C.gray, size: 8, align: 'center', width: TW })
    return y + ROW_H
  }

  for (let i = 0; i < rows.length; i++) {
    // Vérifier espace restant
    if (y + ROW_H > PH - 50) {
      doc.addPage()
      y = ML + 10
    }
    const bg = i % 2 === 0 ? C.white : C.lightBg
    fillRect(doc, ML, y, TW, ROW_H, bg)

    cx = ML
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j]
      const val = String(rows[i][j] ?? '')
      const clr = col.color ?? C.text
      text(doc, val, cx + 4, y + 4, {
        color: clr,
        size: 8,
        bold: col.bold ?? false,
        align: col.align ?? 'left',
        width: col.w - 8,
        ellipsis: true,
      })
      cx += col.w
    }

    strokeLine(doc, ML, y + ROW_H, ML + TW, y + ROW_H, C.border, 0.3)
    y += ROW_H
  }
  return y
}

// ── Section title ─────────────────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  text(doc, title, ML, y, { color: C.primary, size: 11, bold: true })
  strokeLine(doc, ML, y + 15, ML + TW, y + 15, C.border)
  return y + 22
}

// ── Pied de page (appelé après génération) ────────────────────────────────────

function addFooters(doc: PDFKit.PDFDocument, nomEntreprise: string) {
  const range = (doc.bufferedPageRange as () => { start: number; count: number })()
  const dateGen = new Date().toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    fillRect(doc, 0, PH - 28, PW, 28, C.lightBg)
    strokeLine(doc, 0, PH - 28, PW, PH - 28, C.border)
    text(doc, `VisitPro — ${nomEntreprise}`, ML, PH - 16, { color: C.gray, size: 7 })
    text(doc, `Page ${i + 1} / ${range.count} — Genere le ${dateGen}`, ML, PH - 16, { color: C.gray, size: 7, align: 'right', width: TW })
  }
}

// ── Générateur principal ──────────────────────────────────────────────────────

export function genererPdfRapport(data: RapportPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        info: { Title: `Rapport VisitPro — ${data.nomEntreprise}`, Author: 'VisitPro' },
      })

      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end',  () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const dateGen = new Date().toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })

      // ── EN-TÊTE ────────────────────────────────────────────────────────────
      fillRect(doc, 0, 0, PW, 78, C.primary)
      text(doc, 'Rapport hebdomadaire', ML, 16, { color: C.white, size: 18, bold: true })
      text(doc, data.nomEntreprise, ML, 42, { color: '#93C5FD', size: 11 })
      text(doc, `${data.periodeDebut} — ${data.periodeFin}`, ML, 58, { color: '#CBD5E1', size: 9 })
      text(doc, `Genere le ${dateGen}`, 0, 10, { color: '#CBD5E1', size: 8, align: 'right', width: PW - ML })

      let y = 95

      // ── KPIs ───────────────────────────────────────────────────────────────
      const KW = (TW - 9) / 4
      const KH = 52

      const delta = data.deltaVisites
      const kpis = [
        { val: String(data.nbVisites), label: 'Visites totales', sub: delta != null ? `${delta >= 0 ? '+' : ''}${delta} vs sem. prec.` : '', valColor: C.primary, bg: '#EFF6FF' },
        { val: `${data.tauxAcceptation}%`, label: "Taux d'acceptation", sub: `${data.nbAcceptees} acceptees`, valColor: C.green, bg: '#F0FDF4' },
        { val: `${data.tempsMoyen} mn`, label: 'Attente moyenne', sub: '', valColor: C.amber, bg: '#FEFCE8' },
        { val: String(data.nbDeclinee), label: 'Declinees', sub: data.nbRedirigees > 0 ? `${data.nbRedirigees} redirigee(s)` : '', valColor: C.red, bg: '#FEF2F2' },
      ]

      kpis.forEach((k, i) => {
        const kx = ML + i * (KW + 3)
        fillRect(doc, kx, y, KW, KH, k.bg)
        doc.rect(kx, y, KW, KH).strokeColor(C.border).lineWidth(0.5).stroke()
        text(doc, k.val, kx, y + 8, { color: k.valColor, size: 18, bold: true, align: 'center', width: KW })
        text(doc, k.label, kx, y + 32, { color: C.gray, size: 7, align: 'center', width: KW })
        if (k.sub) text(doc, k.sub, kx, y + 43, { color: k.valColor, size: 7, align: 'center', width: KW })
      })

      y += KH + 18

      // ── TABLE COLLABORATEURS ───────────────────────────────────────────────
      y = sectionTitle(doc, 'Visites par collaborateur', y)
      const cw0 = TW * 0.34
      const cw1 = TW * 0.13
      const cw2 = TW * 0.14
      const cw3 = TW * 0.14
      const cw4 = TW * 0.12
      const cw5 = TW * 0.13

      y = drawTable(doc, y, [
        { label: 'Collaborateur', w: cw0 },
        { label: 'Visites', w: cw1, align: 'center' },
        { label: 'Acceptees', w: cw2, align: 'center', color: C.green },
        { label: 'Declinees', w: cw3, align: 'center', color: C.red },
        { label: 'Redirect.', w: cw4, align: 'center', color: C.amber },
        { label: 'Taux', w: cw5, align: 'center', bold: true },
      ], data.collabStats.slice(0, 25).map(c => {
        const taux = c.total > 0 ? Math.round((c.acceptees / c.total) * 100) : 0
        return [c.nom, c.total, c.acceptees, c.declinees, c.redirigees, `${taux}%`]
      }))

      y += 14

      // ── TABLE TOP VISITEURS ────────────────────────────────────────────────
      if (y > PH - 160) { doc.addPage(); y = ML + 10 }
      y = sectionTitle(doc, 'Top visiteurs', y)
      y = drawTable(doc, y, [
        { label: 'Visiteur', w: TW * 0.78 },
        { label: 'Nb visites', w: TW * 0.22, align: 'center', bold: true, color: C.primary },
      ], data.topVisiteurs.slice(0, 20).map(v => [v.nom, v.total]))

      y += 14

      // ── TABLE MOTIFS ───────────────────────────────────────────────────────
      if (data.motifStats.length > 0) {
        if (y > PH - 160) { doc.addPage(); y = ML + 10 }
        y = sectionTitle(doc, 'Motifs de visite', y)
        y = drawTable(doc, y, [
          { label: '#', w: TW * 0.07, align: 'center', color: C.gray },
          { label: 'Motif', w: TW * 0.70 },
          { label: 'Occurrences', w: TW * 0.13, align: 'center' },
          { label: 'Part', w: TW * 0.10, align: 'center', bold: true, color: C.primary },
        ], data.motifStats.slice(0, 15).map((m, i) => {
          const pct = data.nbVisites > 0 ? Math.round((m.total / data.nbVisites) * 100) : 0
          return [i + 1, m.motif || '(non renseigne)', m.total, `${pct}%`]
        }))
        y += 14
      }

      // ── RDV ───────────────────────────────────────────────────────────────
      if (data.rdvConfirmes > 0 || data.rdvAnnules > 0) {
        if (y > PH - 120) { doc.addPage(); y = ML + 10 }
        y = sectionTitle(doc, 'Rendez-vous', y)

        const RW = (TW - 8) / 2
        ;[
          { label: 'RDV confirmes', val: data.rdvConfirmes, bg: '#EFF6FF', vc: '#1D4ED8' },
          { label: 'RDV annules',   val: data.rdvAnnules,   bg: '#FEF2F2', vc: C.red },
        ].forEach((item, i) => {
          const rx = ML + i * (RW + 8)
          fillRect(doc, rx, y, RW, 42, item.bg)
          doc.rect(rx, y, RW, 42).strokeColor(C.border).lineWidth(0.4).stroke()
          text(doc, String(item.val), rx, y + 6, { color: item.vc, size: 20, bold: true, align: 'center', width: RW })
          text(doc, item.label, rx, y + 30, { color: item.vc, size: 8, align: 'center', width: RW })
        })
        y += 56
      }

      // ── PIEDS DE PAGE ──────────────────────────────────────────────────────
      addFooters(doc, data.nomEntreprise)

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
