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
export type StatutDispoType = 'disponible' | 'en_reunion' | 'ne_pas_deranger' | 'absent'
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
  couleur_primaire?: string
  couleur_accent?: string
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
  statut_dispo?: StatutDispoType
  dispo_message?: string
  dispo_retour_auto?: string
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
  est_vip?: boolean
  preferences?: string
  notes_privees?: string
  sujets_historique?: string[]
  type_piece_identite?: string
  numero_piece_identite?: string
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
  sujet_traite?: string
  ordre_file?: number
  temps_attente_estime?: number
}

export interface MessageVisite {
  id: string
  visite_id: string
  entreprise_id: string
  auteur_id: string
  destinataire_id?: string
  corps: string
  lu?: boolean
  lu_at?: string
  created_at: string
  auteur?: Utilisateur
}

export interface ListeNoire {
  id: string
  entreprise_id: string
  visiteur_id?: string
  nom: string
  prenom?: string
  telephone?: string
  email?: string
  organisation?: string
  motif: string
  signale_par: string
  actif: boolean
  created_at: string
  signale_par_user?: Utilisateur
}

export interface RapportEnvoye {
  id: string
  entreprise_id: string
  periode_debut: string
  periode_fin: string
  nb_visites: number
  nb_acceptees: number
  nb_declinee: number
  temps_attente_moyen?: number
  envoye_a: string[]
  envoye_at: string
  created_at: string
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

export interface VisiteResume {
  statut: string
  heure_arrivee: string
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
  tagline: string
  prix: number
  prix_annuel?: number
  max_utilisateurs: number | null
  max_visites_mois: number | null
  sms: boolean
  export_pdf: boolean
  multi_sites: boolean
  notifications_realtime: boolean
  messagerie: boolean
  rapports: boolean
  liste_noire: boolean
  badge_qr: boolean
  ecran_accueil: boolean
  api_access: boolean
  support: 'email' | 'prioritaire'
}

export const PLANS: Record<Plan, PlanInfo> = {
  starter: {
    nom: 'Starter',
    tagline: 'Pour démarrer',
    prix: 0,
    max_utilisateurs: 3,
    max_visites_mois: 50,
    sms: false,
    export_pdf: false,
    multi_sites: false,
    notifications_realtime: true,
    messagerie: false,
    rapports: false,
    liste_noire: false,
    badge_qr: true,
    ecran_accueil: false,
    api_access: false,
    support: 'email',
  },
  pro: {
    nom: 'Pro',
    tagline: 'Idéal pour les PME',
    prix: 20000,
    prix_annuel: 200000,
    max_utilisateurs: 5,
    max_visites_mois: null,
    sms: true,
    export_pdf: true,
    multi_sites: false,
    notifications_realtime: true,
    messagerie: false,
    rapports: true,
    liste_noire: true,
    badge_qr: true,
    ecran_accueil: true,
    api_access: false,
    support: 'email',
  },
  enterprise: {
    nom: 'Enterprise',
    tagline: 'Grandes structures & multi-sites',
    prix: 45000,
    prix_annuel: 450000,
    max_utilisateurs: 25,
    max_visites_mois: null,
    sms: true,
    export_pdf: true,
    multi_sites: true,
    notifications_realtime: true,
    messagerie: true,
    rapports: true,
    liste_noire: true,
    badge_qr: true,
    ecran_accueil: true,
    api_access: true,
    support: 'prioritaire',
  },
}
