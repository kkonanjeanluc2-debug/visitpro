type ClassValue = string | undefined | null | false | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Formater une date en français
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-CI', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Formater une date courte
export function formatDateCourt(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-CI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Formater une heure
export function formatHeure(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('fr-CI', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formater date + heure
export function formatDateHeure(date: string | Date): string {
  return `${formatDateCourt(date)} ${formatHeure(date)}`
}

// Calculer la durée d'attente en minutes depuis une date
export function calculerDureeAttente(heureArrivee: string | Date): number {
  const arrivee = typeof heureArrivee === 'string' ? new Date(heureArrivee) : heureArrivee
  const maintenant = new Date()
  return Math.floor((maintenant.getTime() - arrivee.getTime()) / 60000)
}

// Formater une durée en minutes en texte lisible
export function formatDuree(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const heures = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${heures}h`
  return `${heures}h ${mins}min`
}

// Formater un montant en FCFA
export function formatFcfa(montant: number): string {
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(montant)
}

// Générer un numéro de visite unique
export function genererNumeroVisite(index: number): string {
  const annee = new Date().getFullYear()
  const num = String(index).padStart(4, '0')
  return `V-${annee}-${num}`
}

// Obtenir les initiales d'un nom
export function getInitiales(nom: string, prenom?: string): string {
  const p = prenom ? prenom[0].toUpperCase() : ''
  const n = nom ? nom[0].toUpperCase() : ''
  return prenom ? `${p}${n}` : n
}

// Nom complet
export function nomComplet(nom: string, prenom?: string): string {
  return prenom ? `${prenom} ${nom}` : nom
}

// Couleur du badge selon le statut de la visite
export function couleurStatut(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-800 border-amber-300',
    acceptee: 'bg-green-100 text-green-800 border-green-300',
    en_cours: 'bg-blue-100 text-blue-800 border-blue-300',
    terminee: 'bg-gray-100 text-gray-800 border-gray-300',
    declinee: 'bg-red-100 text-red-800 border-red-300',
    redirigee: 'bg-purple-100 text-purple-800 border-purple-300',
  }
  return map[statut] ?? 'bg-gray-100 text-gray-800'
}

// Libellé du statut en français
export function libelleStatut(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_cours: 'En cours',
    terminee: 'Terminée',
    declinee: 'Déclinée',
    redirigee: 'Redirigée',
    confirme: 'Confirmé',
    annule: 'Annulé',
    reporte: 'Reporté',
    termine: 'Terminé',
  }
  return map[statut] ?? statut
}

// Libellé du rôle en français
export function libelleRole(role: string): string {
  const map: Record<string, string> = {
    secretaire: 'Secrétaire',
    collaborateur: 'Collaborateur',
    patron: 'Administrateur',
    admin: 'Super Admin',
  }
  return map[role] ?? role
}

// Couleur du badge d'urgence
export function couleurUrgence(niveau: string): string {
  const map: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-700',
    urgent: 'bg-orange-100 text-orange-700',
    vip: 'bg-yellow-100 text-yellow-700',
  }
  return map[niveau] ?? 'bg-gray-100 text-gray-700'
}

