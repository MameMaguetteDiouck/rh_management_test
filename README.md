# RH Perspectives — Gestion des tâches

Application de gestion de tâches avec un processus de validation par rôle : un **Collaborateur** crée et soumet des tâches, un **Manager** les valide ou les rejette, un **Administrateur** gère les comptes et a une vue globale sur tout. Un manager peut aussi assigner des tâches à des collaborateurs, et un administrateur peut en assigner à des managers ou des collaborateurs.

📄 **Documentation complète de l'API : [docs/API.md](docs/API.md)** (endpoints, permissions, format des erreurs, pagination).

## Stack technique

- **Frontend** : Angular (Tailwind CSS)
- **Backend** : NestJS
- **Base de données** : PostgreSQL, via Prisma ORM
- **Authentification** : JWT (access token + refresh token, cookies `httpOnly`, rotation du refresh token)
- **Sécurité** : rate limiting (`@nestjs/throttler`), en-têtes de sécurité (`helmet`), validation stricte des variables d'environnement au démarrage
- **Infrastructure** : Docker Compose (PostgreSQL + Adminer)

## Prérequis

- Docker (Docker Desktop, ou Docker Engine accessible en ligne de commande — si vous êtes sous Windows avec Docker installé dans WSL, lancez les commandes `docker compose` depuis un terminal WSL)
- [Node.js](https://nodejs.org/) 20+ — uniquement nécessaire pour l'option B (développement en local avec rechargement à chaud)

## Installation

### Option A — Tout via Docker Compose (le plus simple)

À la racine du projet :

```bash
cp .env.example .env
# éditer .env si besoin — remplacer au moins JWT_SECRET/JWT_REFRESH_SECRET par des valeurs aléatoires (ex. openssl rand -hex 64)
docker compose up -d
```

Ça construit et démarre tout :
- **PostgreSQL** (port `5432`)
- **[Adminer](http://localhost:8080)** — interface web pour explorer la base
- **Backend NestJS** (port `3000`) — au démarrage du conteneur, les migrations Prisma s'appliquent et le seed de démo s'exécute automatiquement, avant que l'API ne se lance.
- **[Frontend Angular](http://localhost:4200)** (port `4200`) — build de production servi par nginx.

Rien d'autre à faire : **[http://localhost:4200](http://localhost:4200)** ouvre l'application dès que les conteneurs sont prêts (`docker compose ps` pour vérifier que `rh_management_db` est bien `healthy`).

> Pour repartir de zéro (efface toutes les données, y compris la base) : `docker compose down -v && docker compose up -d`.

### Option B — Backend en local avec rechargement à chaud (pour développer)

Utile si vous modifiez le code backend et voulez du live-reload plutôt que de reconstruire l'image à chaque changement.

À la racine, démarrer uniquement la base :

```bash
cp .env.example .env
docker compose up -d postgres adminer
```

Puis le backend :

```bash
cd backend
npm install
cp .env.example .env
```

Dans `backend/.env`, deux points d'attention :
- `DATABASE_URL` doit correspondre aux identifiants PostgreSQL définis dans le `.env` racine (même `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`/`POSTGRES_PORT`), avec `localhost` comme hôte (pas `postgres`, ce nom de service n'existe que dans le réseau Docker).
- `JWT_SECRET` et `JWT_REFRESH_SECRET` : à remplacer par des valeurs aléatoires.

Puis :

```bash
npx prisma migrate deploy   # crée les tables + rejoue automatiquement le seed
npm run start:dev
```

> Pour repartir sur une base vide avec les données de démo fraîches à tout moment : `npx prisma migrate reset` (⚠️ efface tout le contenu existant de la base).

> Le backend valide ses variables d'environnement au démarrage (`DATABASE_URL`, `JWT_SECRET`/`JWT_REFRESH_SECRET` d'au moins 16 caractères, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`) et refuse de démarrer si l'une d'elles est absente ou invalide — l'erreur au lancement pointe directement la variable en cause.

## Comptes de démonstration

Créés automatiquement par le seed (`backend/prisma/seed.ts`) au premier `migrate deploy`/`migrate reset` :

| Rôle           | Email              | Mot de passe   |
|----------------|--------------------|----------------|
| Administrateur | `admin@rh.local`   | `Admin123!`    |
| Manager        | `manager@rh.local` | `Manager123!`  |
| Collaborateur  | `collab@rh.local`  | `Collab123!`   |

Deux tâches de démonstration (une `DRAFT`, une `SUBMITTED`) sont aussi créées pour le compte collaborateur.

> À la première connexion, chaque compte est obligé de changer son mot de passe (redirection automatique vers la page Profil, reste de l'application bloquée jusque là) — c'est le comportement attendu, pas un bug.

## Aperçu de l'API

Authentification par cookies `httpOnly` (access token + refresh token) posés automatiquement à la connexion — aucun token à manipuler manuellement côté client. Pour tester avec curl/Postman, il suffit de conserver les cookies entre les requêtes (`-c`/`-b` avec curl, cookie jar automatique avec Postman).

| Groupe | Description |
|---|---|
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` | Connexion, renouvellement de session, déconnexion, "qui suis-je" |
| `POST/GET/PATCH /users`, `PATCH /users/:id/deactivate`, `/activate`, `/password` | Gestion des comptes — réservé à l'administrateur (sauf `PATCH /users/me/password`, en libre-service) |
| `POST/GET/PATCH/DELETE /tasks`, `/tasks/:id/submit`, `/validate`, `/reject` | CRUD des tâches + workflow de validation, assignation par un manager (à un collaborateur) ou un admin (à un manager ou un collaborateur) |

Toutes les routes sont protégées par défaut (JWT requis) et certaines sont en plus restreintes par rôle — une requête sans les droits suffisants renvoie `401` (non authentifié) ou `403` (authentifié mais rôle insuffisant). `GET /tasks` et `GET /users` sont paginées (`?page=&pageSize=`). Le détail complet (schémas de requête/réponse, règles d'autorisation par endpoint, codes d'erreur) est dans **[docs/API.md](docs/API.md)**.

## Tests

```bash
cd backend
npm test          # tests unitaires (services, guards)
npm run test:cov  # avec couverture
```
