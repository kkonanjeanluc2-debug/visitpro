import { createClient } from '@/lib/supabase/client'
import type {
  Reunion, ReunionParticipant, ReunionPoint, ReunionPreparation,
  CompteRendu, StatutReunion, StatutParticipant, StatutPointOdj,
  TypeReunion, TypePreparation, StatutPreparation, PointAction,
} from '@/types'

export type CreateReunionInput = {
  titre: string
  type: TypeReunion
  date_reunion: string
  heure_debut: string
  heure_fin?: string
  lieu?: string
  description?: string
  entreprise_id: string
  organisateur_id: string
}

export type CreatePointInput = {
  titre?: string
  description?: string
  responsable_id?: string
  duree_estimee?: number
  statut?: string
}

export type CreatePreparationInput = {
  type: TypePreparation
  titre: string
  contenu?: string
  point_id?: string
}

export type CreateCRInput = {
  resume?: string
  decisions: string[]
  plan_actions: PointAction[]
  observations?: string
}

// ── Réunions ──────────────────────────────────────────────────────────────────

export async function listerReunions(entrepriseId: string): Promise<Reunion[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunions')
    .select(`
      *,
      organisateur:utilisateurs!reunions_organisateur_id_fkey(id, nom, prenom, photo_url),
      participants:reunion_participants(id, utilisateur_id, nom_externe, statut_presence),
      points:reunion_points(id),
      compte_rendu:comptes_rendus(id, statut)
    `)
    .eq('entreprise_id', entrepriseId)
    .order('date_reunion', { ascending: true })
    .order('heure_debut', { ascending: true })

  if (error) throw error
  return (data ?? []) as Reunion[]
}

export async function obtenirReunion(id: string): Promise<Reunion> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunions')
    .select(`
      *,
      organisateur:utilisateurs!reunions_organisateur_id_fkey(id, nom, prenom, photo_url, poste),
      participants:reunion_participants(
        *,
        utilisateur:utilisateurs(id, nom, prenom, photo_url, poste, email)
      ),
      points:reunion_points(
        *,
        responsable:utilisateurs(id, nom, prenom),
        preparations:reunion_preparations(*)
      ),
      compte_rendu:comptes_rendus(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Reunion
}

export async function creerReunion(input: CreateReunionInput): Promise<Reunion> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunions')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Reunion
}

export async function modifierReunion(id: string, updates: Partial<Omit<CreateReunionInput, 'entreprise_id' | 'organisateur_id'>>): Promise<Reunion> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Reunion
}

export async function changerStatutReunion(id: string, statut: StatutReunion): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunions').update({ statut }).eq('id', id)
  if (error) throw error
}

export async function supprimerReunion(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunions').delete().eq('id', id)
  if (error) throw error
}

// ── Participants ──────────────────────────────────────────────────────────────

export async function ajouterParticipantInterne(reunionId: string, utilisateurId: string): Promise<ReunionParticipant> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunion_participants')
    .insert({ reunion_id: reunionId, utilisateur_id: utilisateurId, statut_presence: 'invite' })
    .select(`*, utilisateur:utilisateurs(id, nom, prenom, photo_url, poste, email)`)
    .single()

  if (error) throw error
  return data as ReunionParticipant
}

export async function ajouterParticipantExterne(reunionId: string, nomExterne: string, emailExterne?: string): Promise<ReunionParticipant> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunion_participants')
    .insert({ reunion_id: reunionId, nom_externe: nomExterne, email_externe: emailExterne ?? null, statut_presence: 'invite' })
    .select()
    .single()

  if (error) throw error
  return data as ReunionParticipant
}

export async function supprimerParticipant(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_participants').delete().eq('id', id)
  if (error) throw error
}

export async function mettreAJourPresence(id: string, statut: StatutParticipant): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_participants').update({ statut_presence: statut }).eq('id', id)
  if (error) throw error
}

export async function assignerRoleSeance(
  reunionId: string,
  participantId: string | null,
  role: 'secretaire' | 'president'
): Promise<void> {
  const sb = createClient()
  // Retirer le rôle à l'éventuel titulaire actuel
  await sb.from('reunion_participants')
    .update({ role_seance: null })
    .eq('reunion_id', reunionId)
    .eq('role_seance', role)
  // Assigner au nouveau participant (null = juste retirer)
  if (participantId) {
    const { error } = await sb.from('reunion_participants')
      .update({ role_seance: role })
      .eq('id', participantId)
    if (error) throw error
  }
}

export async function marquerConvocationEnvoyee(reunionId: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb
    .from('reunion_participants')
    .update({ convocation_envoyee: true })
    .eq('reunion_id', reunionId)

  if (error) throw error
}

// ── Points ordre du jour ──────────────────────────────────────────────────────

export async function ajouterPoint(reunionId: string, input: CreatePointInput, ordre: number): Promise<ReunionPoint> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunion_points')
    .insert({ ...input, reunion_id: reunionId, ordre })
    .select(`*, responsable:utilisateurs(id, nom, prenom)`)
    .single()

  if (error) throw error
  return data as ReunionPoint
}

export async function modifierPoint(id: string, updates: Partial<CreatePointInput>): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_points').update(updates).eq('id', id)
  if (error) throw error
}

export async function changerStatutPoint(id: string, statut: StatutPointOdj): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_points').update({ statut }).eq('id', id)
  if (error) throw error
}

export async function supprimerPoint(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_points').delete().eq('id', id)
  if (error) throw error
}

// ── Préparations ──────────────────────────────────────────────────────────────

export async function ajouterPreparation(reunionId: string, auteurId: string, input: CreatePreparationInput): Promise<ReunionPreparation> {
  const sb = createClient()
  const { data, error } = await sb
    .from('reunion_preparations')
    .insert({ ...input, reunion_id: reunionId, auteur_id: auteurId, statut: 'en_cours' })
    .select(`*, auteur:utilisateurs(id, nom, prenom, photo_url)`)
    .single()

  if (error) throw error
  return data as ReunionPreparation
}

export async function modifierPreparation(id: string, updates: Partial<CreatePreparationInput> & { statut?: StatutPreparation }): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_preparations').update(updates).eq('id', id)
  if (error) throw error
}

export async function supprimerPreparation(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('reunion_preparations').delete().eq('id', id)
  if (error) throw error
}

// ── Compte-rendu ──────────────────────────────────────────────────────────────

export async function sauvegarderCompteRendu(reunionId: string, redacteurId: string, input: CreateCRInput): Promise<CompteRendu> {
  const sb = createClient()

  const { data: existing } = await sb
    .from('comptes_rendus')
    .select('id')
    .eq('reunion_id', reunionId)
    .single()

  if (existing) {
    const { data, error } = await sb
      .from('comptes_rendus')
      .update(input)
      .eq('reunion_id', reunionId)
      .select()
      .single()

    if (error) throw error
    return data as CompteRendu
  }

  const { data, error } = await sb
    .from('comptes_rendus')
    .insert({ ...input, reunion_id: reunionId, redacteur_id: redacteurId, statut: 'brouillon' })
    .select()
    .single()

  if (error) throw error
  return data as CompteRendu
}

export async function finaliserCompteRendu(reunionId: string): Promise<CompteRendu> {
  const sb = createClient()
  const { data, error } = await sb
    .from('comptes_rendus')
    .update({ statut: 'finalise', envoye_le: new Date().toISOString() })
    .eq('reunion_id', reunionId)
    .select()
    .single()

  if (error) throw error
  return data as CompteRendu
}

// ── Widget dashboard ──────────────────────────────────────────────────────────

export async function statsReunionsDashboard(entrepriseId: string) {
  const sb = createClient()
  const today = new Date().toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0]

  const [{ data: prochaines }, { count: brouillonsCR }] = await Promise.all([
    sb
      .from('reunions')
      .select('id, titre, date_reunion, heure_debut, type, statut')
      .eq('entreprise_id', entrepriseId)
      .gte('date_reunion', today)
      .lte('date_reunion', in7days)
      .in('statut', ['planifiee', 'en_cours'])
      .order('date_reunion')
      .order('heure_debut')
      .limit(3),
    sb
      .from('comptes_rendus')
      .select('id, reunions!inner(entreprise_id)', { count: 'exact', head: true })
      .eq('reunions.entreprise_id', entrepriseId)
      .eq('statut', 'brouillon'),
  ])

  return {
    prochaines: (prochaines ?? []) as Pick<Reunion, 'id' | 'titre' | 'date_reunion' | 'heure_debut' | 'type' | 'statut'>[],
    brouillonsCR: brouillonsCR ?? 0,
  }
}
