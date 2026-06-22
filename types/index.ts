export type Role = 'secretaire' | 'collaborateur' | 'patron' | 'admin'

export interface UserPermissions {
  voir_stats?: boolean
  gestion_visites?: boolean
  gestion_rdv?: boolean
  export_donnees?: boolean
  responsable_site?: boolean
}
export type StatutVisite = 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'declinee' | 'redirigee'
export type TypeVisite = 'spontanee' | 'rdv' | 'livraison' | 'autre'
export type NiveauUrgence = 'normal' | 'urgent' | 'vip'
export type StatutRdv = 'confirme' | 'annule' | 'reporte' | 'termine'
export type StatutAbonnement = 'actif' | 'expire' | 'suspendu' | 'essai'
export type Plan = 'starter' | 'pro' | 'enterprise'

export interface Site {
  id: string
  entreprise_id: string
  nom: string
  adresse?: string
  telephone?: string
  responsable_id?: string
  actif: boolean
  created_at: string
  responsable?: Utilisateur
  nb_utilisateurs?: number
}

export interface Entreprise {
  id: string
  nom: string
  secteur?: string
  adresse?: string
  telephone?: string
  email?: string
  logo_url?: string
  plan: Plan
  created_at: string
}

export interface Utilisateur {
  id: string
  entreprise_id: string
  nom: string
  prenom: string
  role: Role
  poste?: string
  email?: string
  telephone?: string
  photo_url?: string
  actif: boolean
  site_id?: string
  is_super_admin?: boolean
  permissions?: UserPermissions
  created_at: string
  entreprise?: Entreprise
  site?: Site
}

export interface Visiteur {
  id: string
  entreprise_id: string
  nom: string
  prenom?: string
  organisation?: string
  telephone?: string
  email?: string
  photo_url?: string
  nombre_visites: number
  derniere_visite?: string
  created_at: string
}

export interface RendezVous {
  id: string
  entreprise_id: string
  titre: string
  description?: string
  site_id?: string
  destinataire_id: string
  cree_par: string
  visiteur_id?: string
  nom_visiteur_externe?: string
  telephone_visiteur_externe?: string
  email_visiteur_externe?: string
  organisation_externe?: string
  date_rdv: string
  heure_debut: string
  heure_fin?: string
  statut: StatutRdv
  sms_envoye: boolean
  rappel_envoye: boolean
  notes?: string
  created_at: string
  destinataire?: Utilisateur
  visiteur?: Visiteur
}

export interface Visite {
  id: string
  entreprise_id: string
  visiteur_id?: string
  nom_visiteur: string
  prenom_visiteur?: string
  organisation_visiteur?: string
  telephone_visiteur?: string
  destinataire_id: string
  enregistre_par: string
  motif: string
  type_visite: TypeVisite
  rendez_vous_id?: string
  niveau_urgence: NiveauUrgence
  statut: StatutVisite
  decision_par?: string
  decision_at?: string
  note_decision?: string
  heure_arrivee: string
  heure_entree?: string
  heure_sortie?: string
  duree_attente?: number
  duree_visite?: number
  site_id?: string
  badge_imprime: boolean
  created_at: string
  visiteur?: Visiteur
  destinataire?: Utilisateur
  enregistre_par_user?: Utilisateur
  decision_par_user?: Utilisateur
  rendez_vous?: RendezVous
  duree_attente_calculee?: number
}

export interface Notification {
  id: string
  entreprise_id: string
  destinataire_id: string
  type: 'nouvelle_visite' | 'decision_prise' | 'rdv_rappel' | 'redirection'
  visite_id?: string
  rdv_id?: string
  titre: string
  corps?: string
  lue: boolean
  created_at: string
  visite?: Visite
  rdv?: RendezVous
}

export interface Abonnement {
  id: string
  entreprise_id: string
  plan: Plan
  statut: StatutAbonnement
  date_debut: string
  date_fin?: string
  date_fin_essai?: string
  essai_jours?: number
  duree_mois?: number
  notes?: string
  attribue_par?: string
  cinetpay_transaction_id?: string
  montant?: number
  created_at: string
  entreprise?: Entreprise
  attribue_par_user?: Utilisateur
}

export interface DashboardStats {
  visites_aujourd_hui: number
  visites_en_attente: number
  visites_acceptees: number
  visites_declinee: number
  temps_attente_moyen: number
  rdv_aujourd_hui: number
  rdv_a_venir: number
}

export interface PlanInfo {
  nom: string
  prix: number
  max_utilisateurs: number | null
  max_visites_mois: number | null
  sms: boolean
  export_pdf: boolean
  multi_sites: boolean
}

export const PLANS: Record<Plan, PlanInfo> = {
  starter: {
    nom: 'Starter',
    prix: 0,
    max_utilisateurs: 3,
    max_visites_mois: 50,
    sms: false,
    export_pdf: false,
    multi_sites: false,
  },
  pro: {
    nom: 'Pro',
    prix: 15000,
    max_utilisateurs: 15,
    max_visites_mois: null,
    sms: true,
    export_pdf: true,
    multi_sites: false,
  },
  enterprise: {
    nom: 'Enterprise',
    prix: 40000,
    max_utilisateurs: null,
    max_visites_mois: null,
    sms: true,
    export_pdf: true,
    multi_sites: true,
  },
}
