# API — RH Perspectives

API REST NestJS. Toutes les routes sont préfixées par l'URL de base du backend (`http://localhost:3000` en local).

## Authentification

L'authentification se fait par **cookies `httpOnly`**, posés automatiquement par le serveur — il n'y a aucun token à lire ou à transmettre manuellement côté client.

| Cookie | Contenu | Durée de vie | Portée (`path`) |
|---|---|---|---|
| `access_token` | JWT signé (`sub`, `email`, `role`) | 15 min | `/` |
| `refresh_token` | JWT signé (`sub`) | 7 jours | `/auth` |

- Le `refresh_token` est à **usage unique** : chaque appel à `POST /auth/refresh` le supprime en base et en émet un nouveau (rotation). Un token déjà utilisé est donc rejeté.
- Le rôle (`role`) est figé dans l'`access_token` pendant sa durée de vie ; en revanche `mustChangePassword` et l'état désactivé du compte sont revérifiés en base à **chaque requête**, donc une désactivation ou un changement de mot de passe prennent effet immédiatement, sans attendre l'expiration du token.
- Pour tester avec curl/Postman : il suffit de conserver les cookies entre les requêtes (`-c cookies.txt -b cookies.txt` avec curl, cookie jar automatique avec Postman/Insomnia).

### Cycle de vie d'une session

1. `POST /auth/login` → pose les deux cookies.
2. Le frontend appelle les routes normalement ; si l'`access_token` a expiré, une réponse `401` est renvoyée.
3. En cas de `401` (hors routes d'auth elles-mêmes), le frontend appelle `POST /auth/refresh` une fois puis rejoue la requête d'origine. Si le refresh échoue aussi, l'utilisateur est déconnecté et redirigé vers `/login`.
4. `POST /auth/logout` invalide le refresh token en base et efface les deux cookies.

### Limitation de débit (rate limiting)

- `POST /auth/login` : **5 tentatives / minute** par IP (protection contre le bruteforce de mot de passe).
- Toutes les autres routes : **100 requêtes / minute** par IP.
- Une requête bloquée reçoit `429 Too Many Requests`.

## Rôles

| Rôle | Résumé |
|---|---|
| `COLLABORATOR` | Crée et soumet ses propres tâches. |
| `MANAGER` | Peut assigner des tâches à des collaborateurs, et valide/rejette celles qu'il a lui-même assignées. |
| `ADMINISTRATOR` | Gère les comptes utilisateurs, peut assigner une tâche à un manager ou un collaborateur, et peut agir sur n'importe quelle tâche. |

Chaque route protégée par rôle renvoie :
- `401 Unauthorized` si la requête n'est pas authentifiée (cookie manquant/invalide/expiré) ;
- `403 Forbidden` si authentifiée mais que le rôle (ou une règle métier, voir plus bas) ne l'autorise pas.

Une route supplémentaire (`MustChangePasswordGuard`) bloque **tout** endpoint (sauf `GET /auth/me` et `PATCH /users/me/password`) tant que `mustChangePassword` vaut `true` sur le compte — typiquement juste après la création du compte ou une réinitialisation de mot de passe par un administrateur.

## Pagination

`GET /tasks` et `GET /users` acceptent des paramètres de requête de pagination et renvoient une enveloppe paginée plutôt qu'un tableau brut :

**Requête** — query params (tous optionnels) :

| Param | Type | Défaut | Limites |
|---|---|---|---|
| `page` | entier | `1` | ≥ 1 |
| `pageSize` | entier | `50` | 1 – 200 |

**Réponse :**

```json
{
  "items": [ /* Task[] ou User[] */ ],
  "total": 137,
  "page": 1,
  "pageSize": 50
}
```

## Format des erreurs

```json
{
  "statusCode": 400,
  "message": "Cette valeur est déjà utilisée.",
  "error": "Conflict"
}
```

| Code | Signification |
|---|---|
| `400` | Corps de requête invalide (validation `class-validator`) — `message` est un tableau de messages si plusieurs champs sont en erreur. |
| `401` | Non authentifié, ou identifiants/mot de passe actuel incorrects. |
| `403` | Authentifié mais rôle ou règle métier insuffisants (voir messages détaillés par endpoint). |
| `404` | Ressource introuvable — **ou invisible pour le rôle courant** (ex. un collaborateur qui demande une tâche d'un autre collaborateur reçoit `404`, pas `403`, pour ne pas confirmer son existence). |
| `409` | Conflit (ex. email déjà utilisé), ou suppression bloquée par une contrainte de clé étrangère. |
| `429` | Trop de requêtes (rate limiting). |
| `500` | Erreur serveur inattendue. |

---

## `Auth`

### `POST /auth/login`

Public. Limité à 5 req/min/IP.

**Body**
```json
{ "email": "admin@rh.local", "password": "Admin123!" }
```

**Réponse `200`** — pose les cookies, renvoie l'utilisateur :
```json
{ "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "ADMINISTRATOR", "mustChangePassword": false } }
```

**Erreurs** : `401` (email inconnu, compte désactivé, ou mot de passe incorrect — même message générique dans les trois cas pour ne pas révéler si l'email existe).

### `POST /auth/refresh`

Public. Lit le cookie `refresh_token`.

**Réponse `200`** — rotation : ancien refresh token détruit, nouveau couple de cookies posé, `{ "user": {...} }`.

**Erreurs** : `401` si le cookie est absent, invalide, expiré, déjà consommé, ou si le compte a été désactivé depuis.

### `POST /auth/logout`

Public (ne nécessite pas d'être authentifié pour éviter un blocage si le token est déjà expiré).

Supprime le refresh token correspondant en base et efface les deux cookies. **Réponse `200`** : `{ "success": true }`.

### `GET /auth/me`

Authentifié (exempté du `MustChangePasswordGuard`). Renvoie le profil courant :
```json
{ "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "...", "mustChangePassword": false }
```

---

## `Users` — réservé à l'administrateur (sauf mention contraire)

Objet `User` renvoyé par l'API (jamais de champ `password`) :
```json
{
  "id": "uuid",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "COLLABORATOR | MANAGER | ADMINISTRATOR",
  "createdAt": "date",
  "updatedAt": "date",
  "deactivatedAt": "date | null",
  "mustChangePassword": "boolean"
}
```

### `POST /users` — `ADMINISTRATOR`

**Body**
```json
{ "firstName": "string", "lastName": "string", "email": "string", "password": "string (6-72)", "role": "COLLABORATOR | MANAGER | ADMINISTRATOR" }
```
Le compte créé a `mustChangePassword: true` — il devra changer son mot de passe à la première connexion. **Réponse `201`** : `User`. **Erreurs** : `409` si l'email existe déjà.

### `GET /users` — `MANAGER`, `ADMINISTRATOR`

Paginé (voir [Pagination](#pagination)). Un manager y accède pour retrouver la liste des collaborateurs à qui assigner une tâche.

### `PATCH /users/me/password` — self-service, tout rôle authentifié

**Body**
```json
{ "currentPassword": "string", "newPassword": "string (6-72)" }
```
Vérifie `currentPassword`, mémorise le nouveau mot de passe, invalide toutes les sessions existantes (tous les refresh tokens du compte sont révoqués) puis **réémet immédiatement** un nouveau couple de cookies pour la session en cours — l'appelant n'est donc pas déconnecté par son propre changement de mot de passe. `mustChangePassword` repasse à `false`. **Erreurs** : `401` si `currentPassword` est incorrect.

### `PATCH /users/:id/password` — `ADMINISTRATOR`

**Body** : `{ "newPassword": "string (6-72)" }`. Réinitialisation forcée (pas de mot de passe actuel requis) : `mustChangePassword` repasse à `true` et toutes les sessions du compte ciblé sont révoquées.

### `PATCH /users/:id/deactivate` — `ADMINISTRATOR`

Désactive le compte (`deactivatedAt` posé, refresh tokens révoqués — un token déjà émis ne survit pas à la désactivation). Le compte ne peut plus se connecter mais ses données sont conservées.

**Erreurs** : `403` si la cible est le **dernier administrateur actif** — pour ne jamais se retrouver sans aucun administrateur.

### `PATCH /users/:id/activate` — `ADMINISTRATOR`

Réactive un compte désactivé (`deactivatedAt` remis à `null`).

### `PATCH /users/:id` — `ADMINISTRATOR`

**Body** (tous les champs optionnels) : `{ "firstName"?, "lastName"?, "email"?, "role"? }`.

**Erreurs** : `403` si le changement de rôle retirerait ses droits au **dernier administrateur actif**.

### `DELETE /users/:id` — `ADMINISTRATOR`

Supprime le compte. En cascade (transaction) : les tâches **créées par** ce compte sont supprimées ; les tâches où il apparaît seulement comme assigneur ou validateur sont conservées mais détachées (`assignedById`/`validatorId` mis à `null`) ; ses refresh tokens sont supprimés.

**Erreurs** : `403` si `id` correspond à l'appelant lui-même (auto-suppression interdite — utiliser la désactivation à la place).

---

## `Tasks`

Objet `Task` renvoyé par l'API :
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "DRAFT | SUBMITTED | APPROVED | REJECTED",
  "createdAt": "date",
  "updatedAt": "date",
  "rejectionReason": "string | null",
  "creatorId": "uuid",
  "validatorId": "uuid | null",
  "assignedById": "uuid | null",
  "creator": { "id": "uuid", "firstName": "string", "lastName": "string" },
  "assignedBy": { "id": "uuid", "firstName": "string", "lastName": "string" } | null,
  "validator": { "id": "uuid", "firstName": "string", "lastName": "string" } | null
}
```

### Cycle de vie d'une tâche

```
DRAFT ──submit──▶ SUBMITTED ──validate──▶ APPROVED
  ▲                   │
  └──────reject────────┘   (repasse en REJECTED, resoumissible)
```

`REJECTED` se comporte comme `DRAFT` : la tâche reste éditable et resoumettable (`rejectionReason` est effacé dès la resoumission).

### Qui peut assigner une tâche à qui

| Créateur de la requête | Peut assigner à |
|---|---|
| `COLLABORATOR` | personne (`creatorId` dans le body est ignoré, la tâche est pour lui-même) |
| `MANAGER` | un `COLLABORATOR` uniquement |
| `ADMINISTRATOR` | un `COLLABORATOR` ou un `MANAGER` |

Quand une tâche est assignée, `assignedById` = celui qui assigne, `creatorId` = celui qui reçoit la tâche (c'est lui qui doit la remplir et la soumettre).

### `POST /tasks` — tout rôle authentifié

**Body**
```json
{ "title": "string (1-150)", "description": "string (1-2000)", "creatorId?": "uuid" }
```
`creatorId` optionnel : assigne la tâche à ce destinataire au lieu de soi-même (voir tableau ci-dessus ; `404` si la cible n'existe pas ou n'a pas un rôle assignable par l'appelant).

### `GET /tasks` — tout rôle authentifié

Paginé (voir [Pagination](#pagination)). Visibilité selon le rôle :

| Rôle | Tâches visibles |
|---|---|
| `ADMINISTRATOR` | toutes |
| `MANAGER` | toutes les tâches `SUBMITTED`/`REJECTED` (pipeline global à réviser), + celles qu'il a validées, + celles qu'il a assignées, + les siennes propres (auto-créées ou assignées par l'admin) |
| `COLLABORATOR` | uniquement celles qu'il a créées |

### `GET /tasks/:id` — tout rôle authentifié

`404` si la tâche n'existe pas, ou si l'appelant est un `COLLABORATOR` qui n'en est pas le créateur.

### `PATCH /tasks/:id` — tout rôle authentifié

**Body** (champs optionnels) : `{ "title"?, "description"? }`.

Autorisé pour : le créateur de la tâche (si statut `DRAFT`/`REJECTED`), **ou** le manager qui l'a assignée (même condition de statut), **ou** un `ADMINISTRATOR` (sans condition de statut). **Erreurs** : `403` sinon.

### `DELETE /tasks/:id` — tout rôle authentifié

Mêmes règles d'autorisation que `PATCH /tasks/:id` ci-dessus.

### `POST /tasks/:id/submit` — tout rôle authentifié

Passe la tâche en `SUBMITTED` (efface `rejectionReason` et `validatorId`). Réservé au **créateur** de la tâche ou à un `ADMINISTRATOR` — contrairement à l'édition/suppression, le manager assigneur ne peut pas soumettre à la place du collaborateur. Doit être en statut `DRAFT`/`REJECTED`.

### `POST /tasks/:id/validate` — `MANAGER`, `ADMINISTRATOR`

Passe la tâche en `APPROVED`, enregistre `validatorId`. La tâche doit être `SUBMITTED`.

**Règle de séparation des rôles** : un `MANAGER` ne peut valider que les tâches **qu'il a lui-même assignées** (`assignedById === son id`) — ni une tâche auto-créée par le collaborateur (non assignée), ni une tâche assignée par un autre manager ou par l'admin. Un `ADMINISTRATOR` peut valider n'importe quelle tâche soumise.

### `POST /tasks/:id/reject` — `MANAGER`, `ADMINISTRATOR`

**Body** : `{ "rejectionReason": "string (1-500)" }`. Mêmes règles d'autorisation que `validate`. Passe la tâche en `REJECTED`.
