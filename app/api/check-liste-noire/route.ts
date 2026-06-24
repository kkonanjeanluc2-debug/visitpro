import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Auth requise — rôle secrétaire minimum
    const userClient = createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { entreprise_id, visiteur_id, nom, prenom, telephone } = body

    if (!entreprise_id || !nom) {
      return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
    }

    // Requête avec service_role pour contourner RLS (la raison reste côté serveur)
    const supabase = createServiceClient()

    // Vérification par visiteur_id (correspondance exacte, prioritaire)
    if (visiteur_id) {
      const { data: parId } = await supabase
        .from('liste_noire')
        .select('id')
        .eq('entreprise_id', entreprise_id)
        .eq('visiteur_id', visiteur_id)
        .eq('actif', true)
        .limit(1)

      if (parId && parId.length > 0) {
        // Ne PAS retourner le motif au rôle secrétaire
        return NextResponse.json({ interdit: true })
      }
    }

    // Vérification par nom (ILIKE) + téléphone / nom+prénom
    const { data } = await supabase
      .from('liste_noire')
      .select('id, nom, prenom, telephone')
      .eq('entreprise_id', entreprise_id)
      .eq('actif', true)
      .ilike('nom', nom)
      .limit(5)

    if (!data || data.length === 0) {
      return NextResponse.json({ interdit: false })
    }

    for (const entree of data) {
      // Par téléphone
      if (telephone && entree.telephone) {
        const norm = (t: string) => t.replace(/\D/g, '')
        if (norm(telephone) === norm(entree.telephone)) {
          return NextResponse.json({ interdit: true })
        }
      }

      // Par nom + prénom
      const nomMatch = entree.nom.toLowerCase().trim() === nom.toLowerCase().trim()
      const prenomMatch = !entree.prenom || !prenom ||
        entree.prenom.toLowerCase().trim() === prenom.toLowerCase().trim()

      if (nomMatch && prenomMatch) {
        return NextResponse.json({ interdit: true })
      }
    }

    return NextResponse.json({ interdit: false })
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
