import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, type Plan } from '@/types'

export type GestionnaireEquipe = {
  id: string
  entreprise_id: string
  site_id: string | null
  // true = patron/admin (toute l'entreprise), false = responsable de site (son site uniquement)
  estAdmin: boolean
}

// Identifie l'appelant et vérifie qu'il peut gérer l'équipe :
// patron/admin actif, ou collaborateur actif responsable d'un site.
export async function verifierGestionnaireEquipe(): Promise<
  { ok: true; gestionnaire: GestionnaireEquipe } | { ok: false; reponse: NextResponse }
> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, reponse: NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 }) }
  }

  const { data: moi } = await createAdminClient()
    .from('utilisateurs')
    .select('role, entreprise_id, site_id, actif, permissions')
    .eq('id', user.id)
    .single()

  const estAdmin = moi?.role === 'patron' || moi?.role === 'admin'
  const estResponsableSite =
    moi?.role === 'collaborateur' && moi?.permissions?.responsable_site === true && !!moi?.site_id

  if (!moi || !moi.actif || !moi.entreprise_id || (!estAdmin && !estResponsableSite)) {
    return { ok: false, reponse: NextResponse.json({ erreur: 'Accès interdit' }, { status: 403 }) }
  }

  return {
    ok: true,
    gestionnaire: { id: user.id, entreprise_id: moi.entreprise_id, site_id: moi.site_id ?? null, estAdmin },
  }
}

export const ROLES_ATTRIBUABLES = ['secretaire', 'collaborateur', 'patron']

// Renvoie un message d'erreur si l'entreprise a atteint la limite d'utilisateurs actifs de son plan.
export async function verifierLimitePlan(entreprise_id: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: ent } = await admin.from('entreprises').select('plan').eq('id', entreprise_id).single()
  const maxUsers = PLANS[(ent?.plan ?? 'starter') as Plan]?.max_utilisateurs ?? null
  if (maxUsers === null) return null

  const { count } = await admin
    .from('utilisateurs')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', entreprise_id)
    .eq('actif', true)
  return (count ?? 0) >= maxUsers ? `Limite atteinte : votre plan autorise ${maxUsers} utilisateurs maximum.` : null
}

// Un responsable de site ne gère que les non-administrateurs de son site.
export function peutGererUtilisateur(
  g: GestionnaireEquipe,
  cible: { entreprise_id: string | null; site_id: string | null; role: string; is_super_admin?: boolean | null },
): boolean {
  if (cible.entreprise_id !== g.entreprise_id) return false
  if (cible.is_super_admin) return false
  if (g.estAdmin) return true
  return cible.site_id === g.site_id && cible.role !== 'patron' && cible.role !== 'admin'
}
