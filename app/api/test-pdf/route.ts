export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { genererPdfRapport } from '@/lib/pdf-rapport'

// Endpoint de diagnostic : génère le PDF et le retourne directement en téléchargement
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const pdf = await genererPdfRapport({
      nomEntreprise: 'Test Entreprise',
      periodeDebut: '25 juin 2026',
      periodeFin: '1 juillet 2026',
      nbVisites: 42,
      nbAcceptees: 30,
      nbDeclinee: 8,
      nbRedirigees: 4,
      tauxAcceptation: 71,
      tempsMoyen: 12,
      deltaVisites: 5,
      rdvConfirmes: 6,
      rdvAnnules: 2,
      collabStats: [
        { nom: 'Jean Dupont', total: 20, acceptees: 15, declinees: 3, redirigees: 2 },
        { nom: 'Marie Konan', total: 15, acceptees: 10, declinees: 4, redirigees: 1 },
        { nom: 'Paul Koffi', total: 7, acceptees: 5, declinees: 1, redirigees: 1 },
      ],
      topVisiteurs: [
        { nom: 'Kouassi Jean', total: 5 },
        { nom: 'Awa Diallo', total: 3 },
        { nom: 'Marc Bamba', total: 2 },
      ],
      motifStats: [
        { motif: 'Demande de partenariat', total: 12 },
        { motif: 'Livraison', total: 8 },
        { motif: 'Réunion', total: 6 },
      ],
    })

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-rapport.pdf"',
        'Content-Length': String(pdf.length),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Erreur génération PDF', detail: msg }, { status: 500 })
  }
}
