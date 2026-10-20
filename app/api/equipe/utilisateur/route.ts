export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifierGestionnaireEquipe, peutGererUtilisateur, verifierLimitePlan, ROLES_ATTRIBUABLES,
} from '@/lib/equipe-auth'
import type { UserPermissions } from '@/types'

const CLES_PERMISSIONS: (keyof UserPermissions)[] = [
  'voir_stats', 'gestion_visites', 'gestion_rdv', 'export_donnees', 'responsable_site',
]

// Modifie un membre de l'équipe (profil, rôle, site, permissions, actif).
// Patron/admin : toute l'entreprise. Responsable de site : non-administrateurs de son site.
export async function PATCH(req: Request) {
  const auth = await verifierGestionnaireEquipe()
  if (!auth.ok) return auth.reponse
  const g = auth.gestionnaire

  const body = await req.json().catch(() => null)
  if (!body || typeof body.userId !== 'string') {
    return NextResponse.json({ erreur: 'Requête invalide' }, { status: 400 })
  }
  if (body.userId === g.id) {
    return NextResponse.json({ erreur: 'Vous ne pouvez pas modifier votre propre compte ici' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: cible } = await admin
    .from('utilisateurs')
    .select('entreprise_id, site_id, role, actif, permissions, is_super_admin')
    .eq('id', body.userId)
    .single()

  if (!cible || !peutGererUtilisateur(g, cible)) {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 })
  }

  const maj: Record<string, unknown> = {}

  // ── Statut actif ──────────────────────────────────────────────────────────
  if (body.actif !== undefined) {
    if (typeof body.actif !== 'boolean') return NextResponse.json({ erreur: 'Requête invalide' }, { status: 400 })
    if (body.actif && !cible.actif) {
      const erreurLimite = await verifierLimitePlan(g.entreprise_id)
      if (erreurLimite) return NextResponse.json({ erreur: erreurLimite }, { status: 403 })
    }
    maj.actif = body.actif
  }

  // ── Profil ────────────────────────────────────────────────────────────────
  for (const champ of ['nom', 'prenom'] as const) {
    if (body[champ] !== undefined) {
      if (typeof body[champ] !== 'string' || !body[champ].trim()) {
        return NextResponse.json({ erreur: 'Nom et prénom sont obligatoires' }, { status: 400 })
      }
      maj[champ] = body[champ].trim()
    }
  }
  for (const champ of ['poste', 'service'] as const) {
    if (body[champ] !== undefined) {
      maj[champ] = typeof body[champ] === 'string' && body[champ].trim() ? body[champ].trim() : null
    }
  }

  // ── Rôle ──────────────────────────────────────────────────────────────────
  const role: string = body.role ?? cible.role
  if (body.role !== undefined) {
    if (!ROLES_ATTRIBUABLES.includes(role) || (!g.estAdmin && role === 'patron')) {
      return NextResponse.json({ erreur: 'Rôle non autorisé' }, { status: 403 })
    }
    maj.role = role
  }

  // ── Site ──────────────────────────────────────────────────────────────────
  if (body.site_id !== undefined) {
    if (!g.estAdmin) {
      maj.site_id = g.site_id // un responsable ne déplace personne hors de son site
    } else if (body.site_id) {
      const { data: site } = await admin
        .from('sites').select('id').eq('id', body.site_id).eq('entreprise_id', g.entreprise_id).maybeSingle()
      if (!site) return NextResponse.json({ erreur: 'Site invalide' }, { status: 400 })
      maj.site_id = body.site_id
    } else {
      maj.site_id = null
    }
  }

  // ── Permissions (seulement pour collaborateur et secrétaire) ──────────────
  if (body.permissions !== undefined || body.role !== undefined) {
    const perms: UserPermissions = {}
    if (role === 'collaborateur' || role === 'secretaire') {
      const recu = (body.permissions ?? cible.permissions ?? {}) as Record<string, unknown>
      for (const cle of CLES_PERMISSIONS) {
        if (recu[cle] === true) perms[cle] = true
      }
      // Seul un patron/admin peut nommer (ou retirer) un responsable de site
      if (!g.estAdmin) {
        if (cible.permissions?.responsable_site) perms.responsable_site = true
        else delete perms.responsable_site
      }
    }
    maj.permissions = perms
  }

  if (Object.keys(maj).length === 0) return NextResponse.json({ ok: true })

  const { error } = await admin.from('utilisateurs').update(maj).eq('id', body.userId)
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
