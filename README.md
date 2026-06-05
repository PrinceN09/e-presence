# e-Présence — Système de Gestion du Temps et des Présences

## Stack Technique
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, ShadCN UI, TanStack Query
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Base de données**: PostgreSQL
- **Auth**: JWT + Refresh Tokens
- **SMS**: Twilio
- **Rapports**: PDFKit + ExcelJS
- **Déploiement**: Docker, AWS (phase 2)

---

## Démarrage rapide (développement local)

### Prérequis
- Node.js 20+
- PostgreSQL 16 (ou Docker)
- Compte Twilio (optionnel — sans credentials, les SMS sont loggés en console)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Remplir les variables dans .env

npm install
npx prisma migrate dev --name init
npx prisma db seed           # Crée l'admin et les départements de base
npm run start:dev
```

Backend disponible sur http://localhost:4000  
Documentation API: http://localhost:4000/api/docs

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend disponible sur http://localhost:3000

---

## Démarrage avec Docker Compose

```bash
# Copier les env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Lancer tous les services
docker compose up -d

# Exécuter les migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

---

## Compte admin par défaut

| Champ | Valeur |
|-------|--------|
| Matricule | `0.000.001` |
| Mot de passe | `Admin@1234` |

---

## Fonctionnalités

### Employé
- Connexion avec matricule + mot de passe
- Saisie du code de présence journalier (reçu par SMS)
- Pointage d'arrivée (→ Présent si ≤ 08:30, En retard sinon)
- Pointage de départ
- Consultation de son historique de présence
- Changement de mot de passe

### Administrateur
- **Tableau de bord**: statistiques du jour (présents, retards, absents, taux de présence)
- **Gestion des employés**: ajout, modification, désactivation, suppression, réinitialisation de mot de passe
- **Gestion des présences**: consultation avec filtres (date, département, statut, recherche)
- **Code du jour**: visualisation, régénération, envoi SMS broadcast
- **Rapports**: export PDF ou Excel (journalier, hebdomadaire, mensuel)

### Règles de présence
| Heure de pointage | Statut |
|---|---|
| ≤ 08:30 | Présent |
| > 08:30 | En retard |
| Pas de pointage | Absent |

### Code de présence
- Généré automatiquement chaque jour ouvrable à 07:00
- Envoyé par SMS à tous les employés actifs (Twilio)
- L'admin peut régénérer et renvoyer manuellement

---

## Structure du projet

```
e-presence/
├── backend/
│   ├── src/
│   │   ├── auth/          # JWT, strategies, guards
│   │   ├── employees/     # CRUD employés
│   │   ├── departments/   # CRUD départements
│   │   ├── attendance/    # Pointage + dashboard
│   │   ├── daily-code/    # Génération + envoi SMS
│   │   ├── reports/       # PDF + Excel
│   │   ├── sms/           # Twilio wrapper
│   │   └── prisma/        # Prisma service
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/
│       │   ├── employee/  # Portail employé
│       │   └── admin/     # Interface admin
│       └── lib/           # API client, utils, auth
└── docker-compose.yml
```

---

## Variables d'environnement importantes

### Backend (.env)
| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret JWT (changer en production!) |
| `TWILIO_ACCOUNT_SID` | Account SID Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token Twilio |
| `TWILIO_PHONE_NUMBER` | Numéro d'envoi Twilio |
| `FRONTEND_URL` | URL du frontend (pour CORS) |

> Sans les credentials Twilio, l'app fonctionne normalement — les SMS sont simplement loggés en console.
