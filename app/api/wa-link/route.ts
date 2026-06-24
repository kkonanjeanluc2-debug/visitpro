import { NextRequest, NextResponse } from 'next/server'
import {
  lienWaConfirmationRdv,
  lienWaRappelRdv,
  lienWaBienvenueVisite,
  lienWaAttenteVisite,
  lienWaVisiteDeclinee,
} from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...params } = body

    if (!type) {
      return NextResponse.json({ erreur: 'Paramètre "type" manquant' }, { status: 400 })
    }

    let lien: string

    switch (type) {
      case 'confirmation_rdv':  lien = lienWaConfirmationRdv(params);  break
      case 'rappel_rdv':        lien = lienWaRappelRdv(params);        break
      case 'bienvenue_visite':  lien = lienWaBienvenueVisite(params);  break
      case 'attente_visite':    lien = lienWaAttenteVisite(params);    break
      case 'decline_visite':    lien = lienWaVisiteDeclinee(params);   break
      default:
        return NextResponse.json({ erreur: `Type inconnu : ${type}` }, { status: 400 })
    }

    return NextResponse.json({ lien })
  } catch (error) {
    console.error('Erreur wa-link:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
