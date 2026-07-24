# RH Perspectives — Gestion des tâches

Application de gestion de tâches avec un processus de validation par rôle : un **Collaborateur** crée et soumet des tâches, un **Manager** les valide ou les rejette, un **Administrateur** gère les comptes et a une vue globale sur tout.

## Stack technique

- **Frontend** : Angular *(à venir — le backend est fonctionnel, l'UI n'est pas encore construite)*
- **Backend** : NestJS
- **Base de données** : PostgreSQL, via Prisma ORM
- **Authentification** : JWT (access token + refresh token, cookies `httpOnly`)
- **Infrastructure** : Docker Compose (PostgreSQL + Adminer)

## Prérequis

- [Node.js](https://nodejs.org/) 20+
- Docker (Docker Desktop, ou Docker Engine accessible en ligne de commande — si vous êtes sous Windows avec Docker installé dans WSL, lancez les commandes `docker compose` depuis un terminal WSL)

## Installation

### 1. Base de données (Docker Compose)

À la racine du projet :

```bash
cp .env.example .env
# éditer .env si besoin (les valeurs par défaut fonctionnent pour du local)
docker compose up -d
```

Ça démarre PostgreSQL (port `5432`) et [Adminer](http://localhost:8080) (interface web pour explorer la base, port `8080`).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Dans `backend/.env`, deux points d'attention :
- `DATABASE_URL` doit correspondre aux identifiants PostgreSQL définis dans le `.env` racine à l'étape 1 (même `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`/`POSTGRES_PORT`).
- `JWT_SECRET` et `JWT_REFRESH_SECRET` : à remplacer par des valeurs aléatoires (ex. `openssl rand -hex 64`), même en local.

Puis :

```bash
npx prisma migrate deploy   # crée les tables + rejoue automatiquement le seed
npm run start:dev
```

L'API démarre sur `http://localhost:3000`.

> Pour repartir sur une base vide avec les données de démo fraîches à tout moment : `npx prisma migrate reset` (⚠️ efface tout le contenu existant de la base).

## Comptes de démonstration

Créés automatiquement par le seed (`backend/prisma/seed.ts`) au premier `migrate deploy`/`migrate reset` :

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | `admin@rh.local` | `Admin123!` |
| Manager | `manager@rh.local` | `Manager123!` |
| Collaborateur | `collab@rh.local` | `Collab123!` |

Deux tâches de démonstration (une `DRAFT`, une `SUBMITTED`) sont aussi créées pour le compte collaborateur.

## Aperçu de l'API

Authentification par cookies `httpOnly` (access token + refresh token) posés automatiquement à la connexion — aucun token à manipuler manuellement côté client. Pour tester avec curl/Postman, il suffit de conserver les cookies entre les requêtes (`-c`/`-b` avec curl, cookie jar automatique avec Postman).

| Groupe | Description |
|---|---|
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` | Connexion, renouvellement de session, déconnexion, "qui suis-je" |
| `POST/GET/PATCH /users`, `PATCH /users/:id/deactivate`, `/activate`, `/password` | Gestion des comptes — réservé à l'administrateur (sauf `PATCH /users/me/password`, en libre-service) |
| `POST/GET/PATCH/DELETE /tasks`, `/tasks/:id/submit`, `/validate`, `/reject` | CRUD des tâches + workflow de validation |

Toutes les routes sont protégées par défaut (JWT requis) et certaines sont en plus restreintes par rôle — une requête sans les droits suffisants renvoie `401` (non authentifié) ou `403` (authentifié mais rôle insuffisant).
