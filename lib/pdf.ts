import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Visite, Entreprise } from '@/types'
import { formatDateHeure, formatHeure, formatDuree, libelleStatut, nomComplet } from './utils'

export function genererBadgeVisiteur(visite: Visite, entreprise: Entreprise, numeroVisite: string, nomSite?: string): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [148, 105],
  })

  // Fond blanc
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 148, 105, 'F')

  // Bande en-tête bleue
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 148, 22, 'F')

  // Nom entreprise (+ site si secrétaire rattaché à un site)
  doc.setTextColor(255, 255, 255)
  if (nomSite) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(entreprise.nom.toUpperCase(), 74, 7, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(147, 197, 253) // bleu clair
    doc.text(nomSite.toUpperCase(), 74, 13, { align: 'center' })

    doc.setFontSize(7)
    doc.setTextColor(200, 220, 240)
    doc.text('BADGE VISITEUR', 74, 19, { align: 'center' })
  } else {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(entreprise.nom.toUpperCase(), 74, 9, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('BADGE VISITEUR', 74, 16, { align: 'center' })
  }

  // Nom du visiteur
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const nomVis = nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)
  doc.text(nomVis.toUpperCase(), 74, 35, { align: 'center' })

  // Organisation
  if (visite.organisation_visiteur) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(visite.organisation_visiteur, 74, 43, { align: 'center' })
  }

  // Séparateur
  doc.setDrawColor(29, 158, 117)
  doc.setLineWidth(0.5)
  doc.line(10, 48, 138, 48)

  // Infos visite
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const colG = 12
  const colD = 74
  let y = 56

  doc.setFont('helvetica', 'bold')
  doc.text('Motif :', colG, y)
  doc.setFont('helvetica', 'normal')
  doc.text(visite.motif, colG + 18, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Visitant :', colG, y)
  doc.setFont('helvetica', 'normal')
  const dest = visite.destinataire
  doc.text(dest ? nomComplet(dest.nom, dest.prenom) : '—', colG + 22, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Arrivée :', colD, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatHeure(visite.heure_arrivee), colD + 22, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Date :', colG, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateHeure(visite.heure_arrivee), colG + 15, y)

  // Numéro de visite
  doc.setFontSize(8)
  doc.setTextColor(29, 158, 117)
  doc.text(`N° ${numeroVisite}`, 74, 84, { align: 'center' })

  // Pied de page
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 90, 148, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.text('Valable aujourd\'hui uniquement — À remettre à la sortie', 74, 100, { align: 'center' })

  doc.save(`badge-${numeroVisite}.pdf`)
}

export function genererRegistrePdf(
  visites: Visite[],
  entreprise: Entreprise,
  periode: { debut: string; fin: string }
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // En-tête
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 297, 25, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`REGISTRE DES VISITES — ${entreprise.nom.toUpperCase()}`, 148, 10, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Période : ${periode.debut} au ${periode.fin} — Total : ${visites.length} visite(s)`,
    148,
    18,
    { align: 'center' }
  )

  // Tableau
  const rows = visites.map((v, i) => [
    String(i + 1),
    formatDateHeure(v.heure_arrivee),
    nomComplet(v.nom_visiteur, v.prenom_visiteur ?? undefined),
    v.organisation_visiteur ?? '—',
    v.destinataire ? nomComplet(v.destinataire.nom, v.destinataire.prenom) : '—',
    v.motif,
    v.heure_entree ? formatHeure(v.heure_entree) : '—',
    v.heure_sortie ? formatHeure(v.heure_sortie) : '—',
    v.duree_attente !== null && v.duree_attente !== undefined ? formatDuree(v.duree_attente) : '—',
    v.duree_visite !== null && v.duree_visite !== undefined ? formatDuree(v.duree_visite) : '—',
    libelleStatut(v.statut),
  ])

  autoTable(doc, {
    head: [['#', 'Date/Heure', 'Visiteur', 'Organisation', 'Destinataire', 'Motif', 'Entrée', 'Sortie', 'Attente', 'Durée', 'Statut']],
    body: rows,
    startY: 30,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 32 },
      3: { cellWidth: 30 },
      4: { cellWidth: 28 },
      5: { cellWidth: 40 },
      6: { cellWidth: 14 },
      7: { cellWidth: 14 },
      8: { cellWidth: 16 },
      9: { cellWidth: 14 },
      10: { cellWidth: 20 },
    },
  })

  // Pied de page
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `VisitPro — Page ${i}/${totalPages} — Généré le ${new Date().toLocaleDateString('fr-CI')}`,
      148,
      205,
      { align: 'center' }
    )
  }

  const nomFichier = `registre-visites-${periode.debut.replace(/\//g, '-')}.pdf`
  doc.save(nomFichier)
}
