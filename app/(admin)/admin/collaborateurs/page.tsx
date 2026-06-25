'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import type { Utilisateur, Role, Site, UserPermissions, Plan } from '@/types'
import { PLANS } from '@/types'
import { nomComplet } from '@/lib/utils'

const PERMS_CONFIG: { key: keyof UserPermissions; label: string; desc: string }[] = [
  { key: 'voir_stats', label: 'Statistiques', desc: 'Accès à la page Statistiques' },
  { key: 'gestion_visites', label: 'Gérer les visites', desc: 'Accepter / décliner toutes les visites de l\'équipe' },
  { key: 'gestion_rdv', label: 'Gérer les RDV', desc: 'Créer et modifier les RDV de toute l\'équipe' },
  { key: 'export_donnees', label: 'Exporter', desc: 'Exporter les données en PDF / Excel' },
  { key: 'responsable_site', label: 'Responsable de site', desc: 'Voit toutes les données de son site assigné' },
]

function PermToggle({ checked, onChange, label, desc }: { checked?: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none
          ${checked ? 'bg-accent' : 'bg-gray-200 group-hover:bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
          ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </label>
  )
}

const ROLES: { value: Role; label: string }[] = [
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'collaborateur', label: 'Collaborateur' },
  { value: 'patron', label: 'Administrateur' },
]

export default function CollaborateursPage() {
  const { utilisateur } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const isResponsableSite = utilisateur?.permissions?.responsable_site === true && utilisateur?.role === 'collaborateur'

  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDesactiverModal, setShowDesactiverModal] = useState(false)
  const [userADesactiver, setUserADesactiver] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Modal modifier utilisateur
  const [showEditModal, setShowEditModal] = useState(false)
  const [userAEditer, setUserAEditer] = useState<Utilisateur | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [editPoste, setEditPoste] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<Role>('collaborateur')
  const [editPerms, setEditPerms] = useState<UserPermissions>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [erreurEdit, setErreurEdit] = useState<string | null>(null)

  // Formulaire nouvel utilisateur
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [poste, setPoste] = useState('')
  const [role, setRole] = useState<Role>('collaborateur')
  const [siteId, setSiteId] = useState('')
  const [editSiteId, setEditSiteId] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sites, setSites] = useState<Site[]>([])

  useEffect(() => {
    if (utilisateur?.entreprise_id) { charger(); chargerSites() }
  }, [utilisateur?.entreprise_id])

  const charger = async () => {
    let query = supabase
      .from('utilisateurs')
      .select('*, site:site_id(id,nom)')
      .eq('entreprise_id', utilisateur!.entreprise_id)
      .order('nom')

    if (isResponsableSite && utilisateur?.site_id) {
      query = query.eq('site_id', utilisateur.site_id)
    }

    const { data } = await query
    setUtilisateurs(data ?? [])
    setLoading(false)
  }

  const chargerSites = async () => {
    const { data } = await supabase.from('sites')
      .select('id,nom,actif').eq('entreprise_id', utilisateur!.entreprise_id).eq('actif', true)
    setSites((data ?? []) as unknown as Site[])
  }

  const creerUtilisateur = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom || !prenom || !email || !motDePasse) {
      setErreur('Tous les champs obligatoires doivent être remplis')
      return
    }
    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (limitAtteinte) {
      setErreur(`Limite atteinte : le plan ${planInfo.nom} autorise ${maxUsers} utilisateurs maximum.`)
      return
    }

    setSaving(true)
    setErreur(null)

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nom: nom.trim(),
          prenom: prenom.trim(),
          role,
          poste: poste.trim() || null,
          entreprise_id: utilisateur!.entreprise_id,
          mot_de_passe: motDePasse,
          site_id: isResponsableSite ? (utilisateur?.site_id ?? null) : (siteId || null),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.erreur ?? 'Erreur lors de la création')
      }

      setShowModal(false)
      resetForm()
      charger()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const ouvrirEdition = (u: Utilisateur) => {
    setUserAEditer(u)
    setEditNom(u.nom)
    setEditPrenom(u.prenom)
    setEditPoste(u.poste ?? '')
    setEditEmail(u.email ?? '')
    setEditRole(u.role as Role)
    setEditSiteId(u.site_id ?? '')
    setEditPerms(u.permissions ?? {})
    setErreurEdit(null)
    setShowEditModal(true)
  }

  const sauvegarderEdition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userAEditer || !editNom || !editPrenom) {
      setErreurEdit('Nom et prénom sont obligatoires')
      return
    }

    setSavingEdit(true)
    setErreurEdit(null)

    // Les admins/patrons n'ont pas besoin de permissions granulaires
    const permissionsToSave = ['collaborateur', 'secretaire'].includes(editRole) ? editPerms : {}

    const { error } = await supabase
      .from('utilisateurs')
      .update({
        nom: editNom.trim(),
        prenom: editPrenom.trim(),
        poste: editPoste.trim() || null,
        role: editRole,
        site_id: isResponsableSite ? (utilisateur?.site_id ?? null) : (editSiteId || null),
        permissions: permissionsToSave,
      })
      .eq('id', userAEditer.id)

    setSavingEdit(false)

    if (error) {
      setErreurEdit(error.message)
      return
    }

    setShowEditModal(false)
    setUserAEditer(null)
    charger()
  }

  const toggleActif = async (userId: string, actif: boolean) => {
    await supabase
      .from('utilisateurs')
      .update({ actif: !actif })
      .eq('id', userId)

    charger()
    setShowDesactiverModal(false)
    setUserADesactiver(null)
  }

  const resetForm = () => {
    setNom(''); setPrenom(''); setEmail(''); setPoste(''); setRole('collaborateur')
    setSiteId(''); setMotDePasse(''); setShowPassword(false); setErreur(null)
  }

  const roleBadge = (r: string) => {
    const map: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
      secretaire: 'info',
      collaborateur: 'default',
      patron: 'warning',
      admin: 'danger',
    }
    return map[r] ?? 'default'
  }

  const roleLabel = (r: string) => {
    const map: Record<string, string> = {
      secretaire: 'Secrétaire',
      collaborateur: 'Collaborateur',
      patron: 'Administrateur',
      admin: 'Admin',
    }
    return map[r] ?? r
  }

  if (!utilisateur) return null

  const planInfo = PLANS[(utilisateur.entreprise?.plan ?? 'starter') as Plan]
  const maxUsers = planInfo.max_utilisateurs
  const utilisateursActifs = utilisateurs.filter(u => u.actif)
  const limitAtteinte = maxUsers !== null && utilisateursActifs.length >= maxUsers

  // Responsable de site ne peut pas créer d'Administrateur
  const rolesDisponibles = isResponsableSite
    ? ROLES.filter(r => r.value !== 'patron')
    : ROLES

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-900"
            title="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Collaborateurs</h1>
        </div>
        {limitAtteinte ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Limite {maxUsers} utilisateurs (plan {planInfo.nom})
          </div>
        ) : (
          <Button onClick={() => setShowModal(true)} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </Button>
        )}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-16" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {utilisateurs.map((u) => (
              <div key={u.id} className={`flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors ${!u.actif ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <Avatar nom={u.nom} prenom={u.prenom} photoUrl={u.photo_url ?? undefined} size="md" />
                  <div>
                    <p className="font-medium text-gray-900">{nomComplet(u.nom, u.prenom)}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">{u.poste ?? '—'}</p>
                      {(u.site as any)?.nom && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-medium">
                          {(u.site as any).nom}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant={roleBadge(u.role)}>
                    {roleLabel(u.role)}
                  </Badge>
                  {u.permissions?.voir_stats && <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full font-medium">Stats</span>}
                  {u.permissions?.gestion_visites && <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-full font-medium">Visites</span>}
                  {u.permissions?.responsable_site && <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full font-medium">Resp. site</span>}
                  {!u.actif && (
                    <Badge variant="danger">Inactif</Badge>
                  )}
                  {u.id !== utilisateur.id && (
                    <>
                      {/* Modifier */}
                      <button
                        onClick={() => ouvrirEdition(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Désactiver / Réactiver */}
                      <button
                        onClick={() => {
                          setUserADesactiver(u.id)
                          setShowDesactiverModal(true)
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={u.actif ? 'Désactiver' : 'Réactiver'}
                      >
                        {u.actif ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal modifier utilisateur */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setUserAEditer(null) }}
        title={`Modifier — ${userAEditer ? nomComplet(userAEditer.nom, userAEditer.prenom) : ''}`}
        footer={
          <>
            <button onClick={() => { setShowEditModal(false); setUserAEditer(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <Button onClick={(e) => sauvegarderEdition(e as unknown as React.FormEvent)} loading={savingEdit} size="sm">
              Enregistrer
            </Button>
          </>
        }
      >
        <form onSubmit={sauvegarderEdition} className="space-y-4">
          {erreurEdit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{erreurEdit}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom *" value={editPrenom} onChange={(e) => setEditPrenom(e.target.value)} required />
            <Input label="Nom *" value={editNom} onChange={(e) => setEditNom(e.target.value)} required />
          </div>
          <Input label="Poste" value={editPoste} onChange={(e) => setEditPoste(e.target.value)} placeholder="Directeur Commercial" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={editEmail}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-default focus:outline-none"
            />
          </div>
          <Select
            label="Rôle *"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as Role)}
            options={rolesDisponibles}
          />
          {sites.length > 0 && !isResponsableSite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site assigné</label>
              <select value={editSiteId} onChange={e => setEditSiteId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                <option value="">— Tous les sites —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          )}

          {/* Permissions — uniquement pour collaborateur et secrétaire */}
          {['collaborateur', 'secretaire'].includes(editRole) && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Permissions</h3>
                <span className="text-xs text-gray-400">Les Administrateurs ont accès à tout</span>
              </div>
              <div className="space-y-3">
                {PERMS_CONFIG
                  .filter(p => {
                    if (p.key === 'responsable_site') return sites.length > 0 && !isResponsableSite
                    return true
                  })
                  .map(p => (
                    <PermToggle
                      key={p.key}
                      label={p.label}
                      desc={p.desc}
                      checked={editPerms[p.key]}
                      onChange={v => setEditPerms(prev => ({ ...prev, [p.key]: v }))}
                    />
                  ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              ⚠️ Changer le rôle modifie immédiatement les accès de cet utilisateur. Un <strong>Secrétaire</strong> accède à l&apos;accueil des visiteurs, un <strong>Collaborateur</strong> au tableau de bord personnel.
            </p>
          </div>
        </form>
      </Modal>

      {/* Modal créer utilisateur */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title="Créer un compte"
        footer={
          <>
            <button onClick={() => { setShowModal(false); resetForm() }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <Button onClick={(e) => creerUtilisateur(e as unknown as React.FormEvent)} loading={saving} size="sm">
              Créer le compte
            </Button>
          </>
        }
      >
        <form onSubmit={creerUtilisateur} className="space-y-4">
          {erreur && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom *" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
            <Input label="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <Input label="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Poste" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Directeur Commercial" />
          <Select
            label="Rôle *"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={rolesDisponibles}
          />
          {sites.length > 0 && !isResponsableSite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site assigné</label>
              <select value={siteId} onChange={e => setSiteId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                <option value="">— Tous les sites —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          )}
          <div className="relative">
            <Input
              label="Mot de passe *"
              type={showPassword ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Au moins 8 caractères"
              hint="Le collaborateur pourra le modifier après sa première connexion"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal désactiver */}
      <ConfirmModal
        isOpen={showDesactiverModal}
        onClose={() => { setShowDesactiverModal(false); setUserADesactiver(null) }}
        onConfirm={() => {
          const u = utilisateurs.find((x) => x.id === userADesactiver)
          if (u) toggleActif(u.id, u.actif)
        }}
        title="Modifier le statut"
        message="Êtes-vous sûr de vouloir modifier le statut de cet utilisateur ? L'historique des visites sera conservé."
        confirmLabel="Confirmer"
        variant="warning"
      />
    </div>
  )
}
