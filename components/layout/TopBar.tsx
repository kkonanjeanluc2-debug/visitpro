'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Utilisateur, Notification } from '@/types'

const ROUTE_TITRES: { prefix: string; titre: string }[] = [
  { prefix: '/secretaire/visites',     titre: 'Visites du jour'   },
  { prefix: '/secretaire/rendez-vous', titre: 'Rendez-vous'       },
  { prefix: '/secretaire/registre',    titre: 'Registre'          },
  { prefix: '/secretaire/visiteurs',   titre: 'Fiche visiteur'    },
  { prefix: '/secretaire/messages',    titre: 'Messages'          },
  { prefix: '/secretaire',             titre: 'Accueil'           },
  { prefix: '/dashboard/messages',     titre: 'Messages'          },
  { prefix: '/dashboard/mes-visites',  titre: 'Mes visites'       },
  { prefix: '/dashboard/agenda',       titre: 'Mon agenda'        },
  { prefix: '/dashboard/stats',        titre: 'Statistiques'      },
  { prefix: '/dashboard/visiteurs',    titre: 'Fiche visiteur'    },
  { prefix: '/dashboard',              titre: 'Tableau de bord'   },
  { prefix: '/admin/collaborateurs',   titre: 'Collaborateurs'    },
  { prefix: '/admin/abonnement',       titre: 'Plans & Tarifs'    },
  { prefix: '/admin',                  titre: 'Paramètres'        },
  { prefix: '/securite',               titre: 'Liste noire'       },
  { prefix: '/rapports',               titre: 'Rapports'          },
  { prefix: '/display',                titre: "Écran d'accueil"   },
  { prefix: '/superadmin',             titre: 'Super Admin'       },
]

import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import { formatHeure, nomComplet, libelleRole } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import StatutDispo from '@/components/layout/StatutDispo'
import { useNotifications } from '@/hooks/useNotifications'

interface TopBarProps {
  utilisateur: Utilisateur
  notifications?: Notification[]
  titre?: string
}

export default function TopBar({ utilisateur, titre: titreProp }: TopBarProps) {
  const { notifications, nonLues, messagesNonLus } = useNotifications(utilisateur.id)
  const pathname = usePathname()
  const titre = titreProp ?? ROUTE_TITRES.find((r) => pathname.startsWith(r.prefix))?.titre
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profilModalOpen, setProfilModalOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // ─── États édition profil ──────────────────────────────────────────────────
  const [editPrenom, setEditPrenom] = useState(utilisateur.prenom)
  const [editNom, setEditNom] = useState(utilisateur.nom)
  const [editPoste, setEditPoste] = useState(utilisateur.poste ?? '')
  const [editTel, setEditTel] = useState(utilisateur.telephone ?? '')
  const [editPhotoUrl, setEditPhotoUrl] = useState(utilisateur.photo_url ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Messages panel ────────────────────────────────────────────────────────
  interface MessageThread {
    visite_id: string
    visiteurNom: string
    dernierCorps: string
    dernierAuteurNom: string
    estMoi: boolean
    created_at: string
    nonLus: number
  }
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)

  const urlMessages = () =>
    ['secretaire', 'admin'].includes(utilisateur.role)
      ? '/secretaire/messages'
      : '/dashboard/messages'

  const ouvrirProfil = () => {
    setEditPrenom(utilisateur.prenom)
    setEditNom(utilisateur.nom)
    setEditPoste(utilisateur.poste ?? '')
    setEditTel(utilisateur.telephone ?? '')
    setEditPhotoUrl(utilisateur.photo_url ?? '')
    setPreviewUrl(null)
    setSaveError('')
    setSaveOk(false)
    setProfileOpen(false)
    setProfilModalOpen(true)
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `avatars/${utilisateur.id}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  const sauvegarderProfil = async () => {
    if (!editPrenom.trim() || !editNom.trim()) {
      setSaveError('Le prénom et le nom sont requis.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      // Photo : si un nouveau fichier a été sélectionné → upload vers Storage
      // On ne sauvegarde JAMAIS une blob URL en DB
      let photoUrl = utilisateur.photo_url ?? null
      const newFile = fileInputRef.current?.files?.[0]
      if (newFile) {
        const url = await uploadPhoto(newFile)
        if (url) {
          photoUrl = url
        } else {
          setSaveError("L'upload de la photo a échoué. Vérifiez le bucket Storage.")
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('utilisateurs')
        .update({
          prenom: editPrenom.trim(),
          nom: editNom.trim(),
          poste: editPoste.trim() || null,
          telephone: editTel.trim() || null,
          photo_url: photoUrl,
        })
        .eq('id', utilisateur.id)
      if (error) { setSaveError('Erreur lors de la sauvegarde.'); return }
      setSaveOk(true)
      setTimeout(() => { setProfilModalOpen(false); router.refresh() }, 1200)
    } finally {
      setSaving(false)
    }
  }

  const totalBadge = nonLues + messagesNonLus

  useEffect(() => {
    document.title = totalBadge > 0 ? `(${totalBadge}) VisitPro` : 'VisitPro'
  }, [totalBadge])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const marquerLues = async () => {
    if (nonLues === 0) return
    await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('destinataire_id', utilisateur.id)
      .eq('lue', false)
  }

  const marquerMessagesLus = async () => {
    if (messagesNonLus === 0) return
    await supabase
      .from('messages_visite')
      .update({ lu: true, lu_at: new Date().toISOString() })
      .eq('destinataire_id', utilisateur.id)
      .eq('lu', false)
  }

  const chargerMessageThreads = useCallback(async () => {
    setLoadingThreads(true)
    try {
      const { data } = await supabase
        .from('messages_visite')
        .select(`
          visite_id, corps, created_at, lu, auteur_id, destinataire_id,
          auteur:utilisateurs!auteur_id(nom, prenom),
          visite:visites!visite_id(nom_visiteur, prenom_visiteur)
        `)
        .or(`auteur_id.eq.${utilisateur.id},destinataire_id.eq.${utilisateur.id}`)
        .eq('entreprise_id', utilisateur.entreprise_id)
        .order('created_at', { ascending: false })
        .limit(100)

      const map: Record<string, MessageThread> = {}
      for (const m of (data ?? [])) {
        const vid = m.visite_id as string
        const auteur = m.auteur as unknown as { nom: string; prenom: string } | null
        const visite = m.visite as unknown as { nom_visiteur: string; prenom_visiteur?: string } | null
        if (!map[vid]) {
          map[vid] = {
            visite_id: vid,
            visiteurNom: visite ? `${visite.prenom_visiteur ?? ''} ${visite.nom_visiteur}`.trim() : 'Visiteur',
            dernierCorps: m.corps,
            dernierAuteurNom: auteur ? `${auteur.prenom} ${auteur.nom}`.trim() : '',
            estMoi: m.auteur_id === utilisateur.id,
            created_at: m.created_at,
            nonLus: 0,
          }
        }
        if (!m.lu && m.destinataire_id === utilisateur.id) {
          map[vid].nonLus++
        }
      }
      setMessageThreads(Object.values(map).slice(0, 8))
    } finally {
      setLoadingThreads(false)
    }
  }, [utilisateur.id, utilisateur.entreprise_id])

  useEffect(() => {
    if (messagesOpen) chargerMessageThreads()
  }, [messagesOpen, chargerMessageThreads])

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
      style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-dark-rgb)) 100%)', boxShadow: '0 2px 12px rgb(var(--color-primary-rgb) / 0.25)' }}
    >

      {/* Gauche — logo mobile ou titre */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">VisitPro</span>
        </div>
        {titre && (
          <h1 className="hidden lg:block text-base font-semibold text-white/90 tracking-tight">{titre}</h1>
        )}
      </div>

      {/* Droite — actions */}
      <div className="flex items-center gap-1">

        {/* Statut dispo */}
        {['collaborateur', 'patron'].includes(utilisateur.role) && (
          <>
            <StatutDispo utilisateur={utilisateur} />
            <div className="w-px h-6 bg-white/20 mx-2" />
          </>
        )}

        {/* Messagerie */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !messagesOpen
              setMessagesOpen(next)
              setNotifOpen(false)
              setProfileOpen(false)
              if (next) marquerMessagesLus()
            }}
            className={`relative p-2 rounded-lg transition-all ${messagesOpen ? 'bg-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            aria-label="Messages"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {messagesNonLus > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                {messagesNonLus > 9 ? '9+' : messagesNonLus}
              </span>
            )}
          </button>

          {messagesOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Messages</span>
                </div>
                {messagesNonLus > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    {messagesNonLus} non lu{messagesNonLus > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {loadingThreads ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messageThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <svg className="w-8 h-8 mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="text-sm">Aucun message</p>
                  </div>
                ) : (
                  messageThreads.map((thread) => (
                    <Link
                      key={thread.visite_id}
                      href={`${urlMessages()}?visite=${thread.visite_id}`}
                      onClick={() => setMessagesOpen(false)}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${thread.nonLus > 0 ? 'bg-emerald-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm truncate ${thread.nonLus > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {thread.visiteurNom}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {thread.estMoi ? 'Vous' : thread.dernierAuteurNom} : {thread.dernierCorps}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{formatHeure(thread.created_at)}</span>
                          {thread.nonLus > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                              {thread.nonLus > 9 ? '9+' : thread.nonLus}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 px-4 py-2.5">
                <Link
                  href={urlMessages()}
                  onClick={() => setMessagesOpen(false)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  Voir toutes les conversations →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Cloche */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setMessagesOpen(false); setProfileOpen(false); marquerLues() }}
            className={`relative p-2 rounded-lg transition-all ${notifOpen ? 'bg-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            aria-label="Notifications"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {nonLues > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                {nonLues > 9 ? '9+' : nonLues}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                </div>
                {totalBadge > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {totalBadge} non lue{totalBadge > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <svg className="w-8 h-8 mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.lue ? 'bg-blue-50/40 border-l-2 border-primary' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{n.titre}</p>
                        {!n.lue && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                      {n.corps && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.corps}</p>}
                      <p className="text-xs text-gray-400 mt-1.5">{formatHeure(n.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Profil */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
            className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all ${profileOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            <Avatar nom={utilisateur.nom} prenom={utilisateur.prenom} photoUrl={utilisateur.photo_url ?? undefined} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-white leading-tight">{utilisateur.prenom}</p>
              <p className="text-xs text-white/60 leading-tight">{libelleRole(utilisateur.role)}</p>
            </div>
            <svg className={`w-3.5 h-3.5 text-white/60 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Carte utilisateur */}
              <div className="px-4 py-4 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar nom={utilisateur.nom} prenom={utilisateur.prenom} photoUrl={utilisateur.photo_url ?? undefined} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{nomComplet(utilisateur.nom, utilisateur.prenom)}</p>
                    <p className="text-xs text-primary font-medium">{libelleRole(utilisateur.role)}</p>
                    {utilisateur.poste && <p className="text-xs text-gray-500 truncate">{utilisateur.poste}</p>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1.5">
                {utilisateur.is_super_admin && (
                  <Link
                    href="/superadmin"
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent font-semibold hover:bg-accent/5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    Super Admin
                  </Link>
                )}
                <button
                  onClick={ouvrirProfil}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Mon profil
                </button>
              </div>

              <div className="border-t border-gray-100 py-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay fermeture */}
      {(notifOpen || profileOpen || messagesOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setNotifOpen(false); setProfileOpen(false); setMessagesOpen(false) }} />
      )}

      {/* ─── Modal édition profil ──────────────────────────────────────────── */}
      {profilModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProfilModalOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: 'min(90vh, 640px)' }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Mon profil</h2>
              <button onClick={() => setProfilModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {(previewUrl || editPhotoUrl) ? (
                    <img src={previewUrl ?? editPhotoUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <span className="text-2xl font-bold text-primary">
                        {(editPrenom.charAt(0) + editNom.charAt(0)).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow hover:bg-primary/90 transition-colors"
                    title="Changer la photo"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setPreviewUrl(URL.createObjectURL(file))
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400">Cliquer sur l&apos;icône pour changer la photo</p>
              </div>

              {/* Champs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    value={editPrenom}
                    onChange={(e) => setEditPrenom(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Poste / Fonction</label>
                <input
                  value={editPoste}
                  onChange={(e) => setEditPoste(e.target.value)}
                  placeholder="Ex: Directeur commercial"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                <input
                  value={editTel}
                  onChange={(e) => setEditTel(e.target.value)}
                  placeholder="+225 00 00 00 00 00"
                  type="tel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Infos non modifiables */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Rôle</span>
                  <span className="font-medium text-gray-700">{libelleRole(utilisateur.role)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-700 text-right break-all">{utilisateur.telephone ?? '—'}</span>
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
              )}
              {saveOk && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  ✓ Profil mis à jour avec succès !
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 pb-5 pt-2 flex gap-2 border-t border-gray-100">
              <button
                onClick={() => setProfilModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={sauvegarderProfil}
                disabled={saving || saveOk}
                className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

