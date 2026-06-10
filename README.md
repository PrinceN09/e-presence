# e-Présence — Système de Gestion du Temps et des Présences

> Production: **https://www.e-presence.org**  
> Repository: **https://github.com/PrinceN09/e-presence**

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, TanStack Query |
| Backend | NestJS, TypeScript, Prisma ORM |
| Base de données | PostgreSQL 16 |
| Auth | JWT + Refresh Tokens |
| Email | SendGrid (admin@e-presence.org) |
| SMS | Twilio |
| Rapports | PDFKit + ExcelJS |
| Déploiement | Docker Compose + Nginx + Namecheap VPS |
| CI/CD | GitHub Actions |

---

## Première connexion (Admin)

Après le déploiement initial, se connecter avec :

| Champ | Valeur |
|---|---|
| Matricule | `0.000.001` |
| Mot de passe | `Admin@1234` |

**⚠️ Important — à faire immédiatement après la première connexion :**
1. Aller dans **Profil → Changer le mot de passe**
2. Remplacer `Admin@1234` par un mot de passe fort
3. Le système forcera ce changement car `firstLogin = true` est activé sur le compte admin

Pour les employés importés via Excel, leur mot de passe initial est leur **numéro de matricule**. Ils seront invités à le changer à leur première connexion.

---

## Fonctionnalités

### Employé
- Connexion avec matricule + mot de passe
- Réinitialisation de mot de passe obligatoire à la première connexion
- Saisie du code de présence journalier (reçu par SMS/email)
- Pointage d'arrivée avec QR code, GPS et selfie
- Pointage de déjeuner (sortie + retour)
- Pointage de départ
- Consultation de son historique de présence
- Demande de congé (maladie, maternité, personnel, vacances, mission)
| Mot de passe oublié via email

### Administrateur
- **Tableau de bord** : présents, retards, absents, taux du jour
- **Gestion des employés** : ajout, modification, désactivation, import Excel, réinitialisation de mot de passe
- **Gestion des présences** : filtres par date/semaine/mois, durée travaillée, heures supplémentaires
- **Code du jour** : génération automatique lun–sam à 07:00, régénération manuelle, envoi SMS/email
- **Historique des codes** : consultation des codes passés
- **Rapports** : export PDF ou Excel (journalier, hebdomadaire, mensuel), envoi par email
- **Congés** : approbation/refus des demandes, note admin
- **Jours fériés** : gestion des jours fériés DRC (pré-chargés)
- **Départements** : création et gestion
- **Journal d'audit** : toutes les actions admin tracées, export PDF
- **Paramètres** : localisation GPS du bureau, rayon autorisé

### Règles de présence
| Heure de pointage | Statut |
|---|---|
| ≤ 08:30 | Présent |
| > 08:30 | En retard |
| Pas de pointage | Absent |

### Jours de travail
- **Lundi → Samedi** : code généré, présences enregistrées
- **Dimanche** : aucun code généré, pointage refusé

---

## Démarrage local (développement)

### Prérequis
- Node.js 20+
- PostgreSQL 16 (ou Docker)

### Backend
```bash
cd backend
cp .env.example .env
# Remplir les variables dans .env

npm install
npx prisma migrate dev --name init
npx prisma db seed        # Crée l'admin + départements + jours fériés DRC
npm run start:dev
```

Backend : http://localhost:4000  
API Docs : http://localhost:4000/api/docs

### Frontend
```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

npm install
npm run dev
```

Frontend : http://localhost:3000

---

## Déploiement en production

### Prérequis serveur
- Ubuntu 24.04 VPS (Namecheap Pulsar — 2 CPU, 2 GB RAM)
- Docker + Docker Compose installés
- Nginx installé
- Certificat SSL PositiveSSL (Namecheap)

### 1. Première installation sur le serveur

```bash
# Se connecter au serveur
ssh root@YOUR_SERVER_IP

# Installer Docker
curl -fsSL https://get.docker.com | sh

# Installer Nginx
apt install nginx -y

# Cloner le repo
git clone https://github.com/PrinceN09/e-presence.git /opt/e-presence
cd /opt/e-presence

# Copier les fichiers de production
cp backend/.env.production backend/.env
cp frontend/.env.production frontend/.env.local

# Éditer le mot de passe de la base de données
nano backend/.env  # changer CHANGE_ME par le vrai mot de passe

# Lancer l'application
docker compose -f docker-compose.prod.yml up -d

# Migrations + seed
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec backend npx ts-node prisma/seed.ts
```

### 2. Configuration Nginx + SSL

```nginx
# /etc/nginx/sites-available/e-presence
server {
    listen 80;
    server_name e-presence.org www.e-presence.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name e-presence.org www.e-presence.org;

    ssl_certificate     /etc/ssl/e-presence/certificate.crt;
    ssl_certificate_key /etc/ssl/e-presence/private.key;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/e-presence /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 3. Activer le certificat SSL PositiveSSL (Namecheap)

```bash
# Générer la clé privée et le CSR sur le serveur
mkdir /etc/ssl/e-presence
openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/ssl/e-presence/private.key \
  -out /etc/ssl/e-presence/e-presence.csr \
  -subj "/C=CD/ST=Kinshasa/L=Kinshasa/O=e-Presence/CN=e-presence.org"

# Afficher le CSR à coller dans Namecheap
cat /etc/ssl/e-presence/e-presence.csr
```

Coller ce CSR dans Namecheap → SSL Certificates → Activate.  
Après validation, télécharger et uploader `certificate.crt` dans `/etc/ssl/e-presence/`.

---

## CI/CD — GitHub Actions

Le pipeline se déclenche à chaque push sur `main` :

1. **Build check** — compile backend (NestJS) et frontend (Next.js)
2. **Deploy** — SSH sur le serveur, `git pull`, rebuild Docker
3. **Health check** — vérifie `GET /api/health` (HTTP 200)
4. **Rollback automatique** si le health check échoue

### Secrets GitHub requis

Aller dans : **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Valeur |
|---|---|
| `SERVER_IP` | Adresse IP du serveur Namecheap |
| `SERVER_PASSWORD` | Mot de passe root du serveur |

---

## Structure du projet

```
e-presence/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── auth/               # JWT, login, refresh tokens
│   │   ├── employees/          # CRUD + import Excel
│   │   ├── departments/        # CRUD départements
│   │   ├── attendance/         # Pointage, dashboard, rapports
│   │   ├── daily-code/         # Génération + broadcast SMS/email
│   │   ├── reports/            # PDF + Excel
│   │   ├── leaves/             # Congés
│   │   ├── public-holidays/    # Jours fériés
│   │   ├── audit/              # Journal d'audit
│   │   ├── settings/           # Config GPS
│   │   ├── email/              # SendGrid
│   │   ├── sms/                # Twilio
│   │   └── prisma/             # Prisma service
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env.example
│   └── .env.production         # Variables de production
├── frontend/
│   ├── src/app/
│   │   ├── login/              # Page de connexion
│   │   ├── employee/           # Portail employé
│   │   └── admin/              # Interface admin
│   ├── public/                 # Icons PWA + favicon
│   ├── .env.example
│   └── .env.production
└── docker-compose.prod.yml
```

---

## Variables d'environnement

### Backend
| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret JWT (ne pas partager) |
| `FRONTEND_URL` | https://www.e-presence.org |
| `ALLOWED_ORIGINS` | Origines CORS autorisées |
| `SENDGRID_API_KEY` | Clé API SendGrid |
| `SENDGRID_FROM_EMAIL` | admin@e-presence.org |
| `TWILIO_ACCOUNT_SID` | Account SID Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token Twilio |
| `TWILIO_PHONE_NUMBER` | Numéro d'envoi Twilio |

### Frontend
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | https://www.e-presence.org/api |

---

## PWA — Installation mobile

L'application est installable comme une app native :

- **Android (Chrome)** : une bannière "Installer e-Présence" apparaît automatiquement
- **iPhone (Safari)** : Partager → Sur l'écran d'accueil

Une fois installée, l'app s'ouvre en plein écran sans barre de navigateur.
