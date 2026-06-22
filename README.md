# VisitPro — Gestion des visites d'entreprise

Solution SaaS de gestion des visites et rendez-vous pour les entreprises de Côte d'Ivoire.

## Fonctionnalités

- **Enregistrement visiteurs** : Formulaire rapide (< 30 secondes) avec autocomplete
- **Notifications temps réel** : Supabase Realtime, pas de rechargement de page
- **Décisions instantanées** : Faire entrer / Attendre / Décliner / Rediriger
- **Gestion des RDV** : Agenda, SMS de confirmation Orange, rappels automatiques
- **Registre officiel** : Export PDF A4 et Excel
- **Badge visiteur** : PDF A6 imprimable avec QR code
- **Statistiques** : Graphiques recharts (patron uniquement)
- **Abonnements** : Wave & Orange Money via CinetPay
- **PWA** : Installable sur PC, tablette et mobile
- **Multi-rôles** : Secrétaire, Collaborateur, Patron, Admin

## Stack technique

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Realtime, Storage)
- next-pwa
- CinetPay (paiements CI)
- Orange SMS API CI
- jsPDF + jspdf-autotable
- recharts

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` :

```env
# Supabase (dashboard.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# CinetPay (dashboard.cinetpay.com)
CINETPAY_API_KEY=xxxxx
CINETPAY_SITE_ID=xxxxx
CINETPAY_WEBHOOK_SECRET=xxxxx

# Orange SMS (developer.orange.com)
ORANGE_SMS_API_KEY=Bearer_xxxxx
ORANGE_SMS_SENDER=VisitPro

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=VisitPro
```

### 3. Configurer Supabase

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref YOUR_PROJECT_REF

# Pousser le schéma
supabase db push

# Déployer les Edge Functions
supabase functions deploy sms-rdv
supabase functions deploy cinetpay-webhook
```

### 4. Lancer l'application

```bash
npm run dev
# → http://localhost:3000
```

## Premier test complet

1. **Register** `/auth/register` → Créer entreprise + compte patron
2. **Admin** `/admin/collaborateurs` → Créer comptes Secrétaire et Collaborateur
3. **Secrétaire** (onglet privé) → Enregistrer une visite fictive
4. **Patron** (autre onglet) → Voir la notification temps réel sur `/dashboard`
5. Cliquer **"Faire entrer"** → Voir le statut changer côté secrétaire en temps réel

## Structure du projet

```
visitpro/
├── app/
│   ├── (auth)/         → Login, Register
│   ├── (secretaire)/   → Accueil, Visites, RDV, Registre
│   ├── (dashboard)/    → Dashboard, Mes visites, Agenda, Stats
│   ├── (admin)/        → Paramètres, Collaborateurs, Abonnement
│   └── api/            → CinetPay webhook, SMS, Auth invite
├── components/
│   ├── ui/             → Button, Card, Badge, Input, Modal, Select, Avatar
│   ├── layout/         → Sidebar, TopBar, BottomNav
│   ├── secretaire/     → VisiteForm, VisiteCard, AgendaJour, BadgeVisiteur
│   └── dashboard/      → NotifVisite, DecisionButtons, KpiGrid, StatsChart
├── hooks/              → useAuth, useNotifications, useVisites, useRendezVous
├── lib/                → supabase, utils, sms, pdf
├── types/              → TypeScript types
└── supabase/
    ├── migrations/     → Schéma SQL complet + RLS + index
    └── functions/      → SMS rappels + CinetPay webhook
```

## Plans tarifaires

| Plan | Prix | Utilisateurs | Visites/mois |
|------|------|-------------|--------------|
| Starter | Gratuit | 3 | 50 |
| Pro | 15 000 FCFA/mois | 15 | Illimitées |
| Enterprise | 40 000 FCFA/mois | Illimités | Illimitées |

## Support

Email : support@visitpro.ci
