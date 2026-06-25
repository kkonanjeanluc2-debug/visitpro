export type Lang = 'fr' | 'en'

const t = {
  fr: {
    nav: {
      dashboard:    'Tableau de bord',
      my_visits:    'Mes visites',
      my_agenda:    'Mon agenda',
      messages:     'Messages',
      stats:        'Statistiques',
      settings:     'Paramètres',
      blacklist:    'Liste noire',
      reports:      'Rapports',
      display:      "Écran d'accueil",
      more:         'Plus',
      home:         'Accueil',
      visits:       'Visites',
      visits_today: 'Visites du jour',
      appointments: 'Rendez-vous',
      rdv:          'RDV',
      register:     'Registre',
      visitors:     'Visiteurs',
    },
    common: {
      save:        'Enregistrer',
      saving:      'Enregistrement…',
      cancel:      'Annuler',
      edit:        'Modifier',
      delete:      'Supprimer',
      add:         'Ajouter',
      search:      'Rechercher',
      loading:     'Chargement…',
      back:        'Retour',
      confirm:     'Confirmer',
      active:      'Actif',
      inactive:    'Inactif',
      available:   'Disponible',
      unavailable: 'Absent',
      yes:         'Oui',
      no:          'Non',
    },
    settings: {
      title:         'Paramètres',
      company:       'Entreprise',
      sites:         'Sites',
      team:          'Équipe',
      subscription:  'Abonnement',
      security:      'Sécurité',
      notifications: 'Notifications',
      appearance:    'Apparence',
    },
    appearance: {
      title:              "Couleurs de l'application",
      title_desc:         "Personnalisez les couleurs de l'interface pour tous les utilisateurs.",
      primary_color:      'Couleur principale',
      primary_color_desc: 'Sidebar, boutons, liens actifs',
      accent_color:       "Couleur d'accentuation",
      accent_color_desc:  "Boutons d'action, badges, confirmations",
      preview:            'Aperçu',
      apply:              "Appliquer à toute l'entreprise",
      reset:              'Réinitialiser',
      colors_saved:       "Couleurs appliquées pour toute l'entreprise.",
      theme_title:        'Thème',
      theme_desc:         "Choisissez l'apparence de l'interface.",
      light:              'Clair',
      dark:               'Sombre',
      system:             'Système',
      lang_title:         'Langue & Région',
      lang_desc:          'Personnalisez l\'affichage selon vos préférences locales.',
      interface_lang:     "Langue de l'interface",
      date_format:        'Format de date',
      timezone:           'Fuseau horaire',
      about:              'À propos de VisitPro',
      version:            'Version',
      plan:               'Plan',
      region:             'Région',
    },
    security: {
      title:          'Changer le mot de passe',
      title_desc:     "Choisissez un mot de passe fort d'au moins 8 caractères.",
      new_password:   'Nouveau mot de passe',
      confirm_pw:     'Confirmer le mot de passe',
      update_btn:     'Mettre à jour le mot de passe',
      updating:       'Mise à jour…',
      success:        'Mot de passe mis à jour avec succès.',
      session_title:  'Session active',
      session_label:  'Session actuelle',
      tips_title:     'Bonnes pratiques de sécurité',
      tips: [
        "Utilisez un mot de passe unique d'au moins 12 caractères",
        'Ne partagez jamais vos identifiants de connexion',
        'Déconnectez-vous sur les appareils partagés',
        'Changez votre mot de passe tous les 3 mois',
      ],
      weak:      'Faible',
      medium:    'Moyen',
      strong:    'Fort',
      very_strong: 'Très fort',
    },
  },

  en: {
    nav: {
      dashboard:    'Dashboard',
      my_visits:    'My visits',
      my_agenda:    'My agenda',
      messages:     'Messages',
      stats:        'Statistics',
      settings:     'Settings',
      blacklist:    'Blacklist',
      reports:      'Reports',
      display:      'Welcome screen',
      more:         'More',
      home:         'Home',
      visits:       'Visits',
      visits_today: "Today's visits",
      appointments: 'Appointments',
      rdv:          'Appt.',
      register:     'Register',
      visitors:     'Visitors',
    },
    common: {
      save:        'Save',
      saving:      'Saving…',
      cancel:      'Cancel',
      edit:        'Edit',
      delete:      'Delete',
      add:         'Add',
      search:      'Search',
      loading:     'Loading…',
      back:        'Back',
      confirm:     'Confirm',
      active:      'Active',
      inactive:    'Inactive',
      available:   'Available',
      unavailable: 'Unavailable',
      yes:         'Yes',
      no:          'No',
    },
    settings: {
      title:         'Settings',
      company:       'Company',
      sites:         'Sites',
      team:          'Team',
      subscription:  'Subscription',
      security:      'Security',
      notifications: 'Notifications',
      appearance:    'Appearance',
    },
    appearance: {
      title:              'Application colors',
      title_desc:         'Customize the interface colors for all users in your company.',
      primary_color:      'Primary color',
      primary_color_desc: 'Sidebar, buttons, active links',
      accent_color:       'Accent color',
      accent_color_desc:  'Action buttons, badges, confirmations',
      preview:            'Preview',
      apply:              'Apply to entire company',
      reset:              'Reset',
      colors_saved:       'Colors applied for the entire company.',
      theme_title:        'Theme',
      theme_desc:         'Choose the interface appearance.',
      light:              'Light',
      dark:               'Dark',
      system:             'System',
      lang_title:         'Language & Region',
      lang_desc:          'Customize the display according to your local preferences.',
      interface_lang:     'Interface language',
      date_format:        'Date format',
      timezone:           'Timezone',
      about:              'About VisitPro',
      version:            'Version',
      plan:               'Plan',
      region:             'Region',
    },
    security: {
      title:          'Change password',
      title_desc:     'Choose a strong password of at least 8 characters.',
      new_password:   'New password',
      confirm_pw:     'Confirm password',
      update_btn:     'Update password',
      updating:       'Updating…',
      success:        'Password updated successfully.',
      session_title:  'Active session',
      session_label:  'Current session',
      tips_title:     'Security best practices',
      tips: [
        'Use a unique password of at least 12 characters',
        'Never share your login credentials',
        'Log out on shared devices',
        'Change your password every 3 months',
      ],
      weak:       'Weak',
      medium:     'Medium',
      strong:     'Strong',
      very_strong: 'Very strong',
    },
  },
}

export type Translations = {
  nav: {
    dashboard: string; my_visits: string; my_agenda: string; messages: string; stats: string
    settings: string; blacklist: string; reports: string; display: string; more: string
    home: string; visits: string; visits_today: string; appointments: string; rdv: string
    register: string; visitors: string
  }
  common: {
    save: string; saving: string; cancel: string; edit: string; delete: string; add: string
    search: string; loading: string; back: string; confirm: string
    active: string; inactive: string; available: string; unavailable: string; yes: string; no: string
  }
  settings: {
    title: string; company: string; sites: string; team: string
    subscription: string; security: string; notifications: string; appearance: string
  }
  appearance: {
    title: string; title_desc: string; primary_color: string; primary_color_desc: string
    accent_color: string; accent_color_desc: string; preview: string; apply: string; reset: string
    colors_saved: string; theme_title: string; theme_desc: string; light: string; dark: string; system: string
    lang_title: string; lang_desc: string; interface_lang: string; date_format: string; timezone: string
    about: string; version: string; plan: string; region: string
  }
  security: {
    title: string; title_desc: string; new_password: string; confirm_pw: string
    update_btn: string; updating: string; success: string
    session_title: string; session_label: string; tips_title: string; tips: string[]
    weak: string; medium: string; strong: string; very_strong: string
  }
}

export default t as Record<'fr' | 'en', Translations>
