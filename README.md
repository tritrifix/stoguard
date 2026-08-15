# Stoguard

Suivi du stock alimentaire domestique : ce qu'il y a dans le frigo, le
congélateur et les placards, et jusqu'à quand c'est consommable. L'application
surveille les dates de péremption et remonte en tête ce qui est le plus urgent.

Elle gère aussi l'état **ouvert / pas ouvert** de chaque article : un pot de
crème fraîche ouvert se périme bien avant la date imprimée dessus, et c'est
cette date-là que Stoguard calcule et affiche.

## Pile technique

- **SvelteKit 2** + **Svelte 5** (mode runes) en **TypeScript**, servi par
  `@sveltejs/adapter-node`
- **PostgreSQL 16**
- **Prisma 7** avec le driver adapter `@prisma/adapter-pg`
- **Docker** / **Docker Compose**, avec **Caddy** en reverse proxy

## Logique métier : dates et ouverture

C'est le cœur du projet. À lire avant `src/lib/dates.ts`.

### DLC ou DDM : deux dates qui ne veulent pas dire la même chose

| Type    | Signification                          | Une fois dépassée                                    |
|---------|----------------------------------------|------------------------------------------------------|
| **DLC** | À consommer **jusqu'au**               | Risque sanitaire — le produit est à jeter            |
| **DDM** | À consommer **de préférence avant**    | Perte de qualité — le produit reste consommable      |

Le type de date **ne change pas le calcul** de la date effective : il change ce
qu'on affiche. Une DLC dépassée est signalée comme un danger, une DDM dépassée
comme une simple perte de qualité. Confondre les deux ferait jeter de la
nourriture parfaitement bonne — c'est précisément ce que ce projet cherche à
éviter.

### La date effective

La date imprimée sur l'emballage ne vaut que tant que le produit est fermé.
Une fois ouvert, il se périme plus vite. La date réellement pertinente, dite
**date effective**, se calcule ainsi :

- **Article fermé** → la date imprimée fait foi.
- **Article ouvert** → `min(dateImprimee, dateOuverture + délai)`

où le **délai** après ouverture, en jours, est :

1. `ArticleStock.delaiOuverture` s'il est renseigné (surcharge pour cet
   exemplaire précis) ;
2. sinon `Categorie.delaiApresOuverture` du produit (par exemple 3 jours pour
   les produits laitiers) ;
3. si aucun des deux n'est connu, l'ouverture n'avance rien et la date
   imprimée fait foi.

Le `min` est important : ouvrir un produit ne peut que rapprocher sa date,
jamais la repousser au-delà de ce qui est imprimé dessus.

**Exemple.** Une crème fraîche porte une DLC au 30 septembre, mais elle est
ouverte le 14 août et sa catégorie prévoit 3 jours après ouverture. Sa date
effective est le **17 août**, pas le 30 septembre.

À partir de cette date effective, chaque article reçoit un état : périmé,
à consommer sous 3 jours, sous 7 jours, ou OK.

### Une date de péremption est un jour, pas un instant

Ces dates sont stockées et comparées à **minuit UTC**. Les ancrer à minuit
local les décalerait d'un jour à la relecture depuis un environnement situé
dans un autre fuseau — le conteneur tourne en UTC là où la machine de
développement est en heure de Paris. La variable `TZ` du service `app` sert,
elle, à déterminer à quel moment on change de jour.

## Authentification

Stoguard est une application mono-utilisateur : un seul mot de passe, partagé,
protège tout le site. Pas de compte, pas d'inscription, pas de gestion de
droits.

**Protection fail-closed.** `src/hooks.server.ts` protège toutes les routes
par défaut — une nouvelle route est protégée automatiquement, sans rien à
déclarer. Seuls `/login`, `/health` et les ressources statiques sous `/_app/`
sont publics. Un visiteur non authentifié est redirigé vers `/login`. Dans le
même esprit, l'application **refuse de démarrer** si `AUTH_PASSWORD_HASH` ou
`SESSION_SECRET` est absent, plutôt que de tourner sans protection.

**Mot de passe.** Haché avec `scrypt` (`node:crypto`, sans dépendance), aux
paramètres recommandés par l'OWASP. Le hash — jamais le mot de passe — est
stocké dans `AUTH_PASSWORD_HASH`, généré une fois avec `npm run auth:hash`
(voir plus bas).

**Session.** Un cookie signé en HMAC-SHA256 avec `SESSION_SECRET`, sans table
en base : le serveur vérifie la signature et la date d'expiration, rien de
plus. Conséquence assumée pour un mono-utilisateur : pas de révocation
individuelle possible, seulement globale — changer `SESSION_SECRET` invalide
toutes les sessions d'un coup.

**Anti-force-brute.** `src/lib/server/limiteConnexion.ts` retarde
progressivement les tentatives successives, par IP, en mémoire. Limite connue
et documentée dans le fichier : le compteur est perdu à chaque redémarrage du
conteneur.

## Prérequis

- **Node.js 24** (voir `.nvmrc` ; le projet refuse les autres versions
  majeures)
- **Docker** et **Docker Compose**, pour la base de données

## Démarrage en développement

### 1. Base de données

```sh
docker compose up -d db
```

Seul le service `db` est nécessaire en développement : l'application tourne en
direct via Vite, pas dans un conteneur.

### 2. Variables d'environnement

```sh
cp .env.example .env
```

Renseignez `POSTGRES_PASSWORD` dans `.env` (par exemple avec
`openssl rand -hex 32`) et reportez la même valeur dans `DATABASE_URL`.

Créez ensuite un `.env.local`, qui n'est lu que par l'outillage local :

```sh
# .env.local — jamais commité, jamais copié dans l'image Docker
DATABASE_URL=postgresql://stoguard:<votre mot de passe>@127.0.0.1:5432/stoguard
```

Pourquoi deux fichiers : le `DATABASE_URL` de `.env` vise l'hôte `db`, qui
n'existe que sur le réseau interne de Docker Compose. Depuis votre machine, la
base est joignable sur `127.0.0.1:5432` (le port est publié en loopback
uniquement). `.env.local` est prioritaire côté outillage local, et Docker
Compose ne le lit jamais.

### 3. Dépendances et données de référence

```sh
npm install
npm run db:seed
```

`npm install` génère au passage le client Prisma. `npm run db:seed` charge les
emplacements (Réfrigérateur, Congélateur, Placard, Cave) et les catégories avec
leur délai après ouverture — sans eux, le formulaire d'ajout n'a aucun
emplacement à proposer. Le seed est idempotent : le relancer ne crée pas de
doublons, mais il réaligne les délais des catégories sur leurs valeurs par
défaut.

### 4. Mot de passe de connexion

```sh
npm run auth:hash
```

Demande le mot de passe en saisie masquée et affiche le hash à coller dans
`AUTH_PASSWORD_HASH=` de `.env`. L'application refuse de démarrer tant que
cette variable est vide (voir la section Authentification plus haut).

### 5. Lancer l'application

```sh
npm run dev
```

L'application est disponible sur http://localhost:5173.

## Commandes utiles

| Commande            | Rôle                                                            |
|---------------------|-----------------------------------------------------------------|
| `npm run dev`       | Serveur de développement avec rechargement à chaud              |
| `npm test`          | Tests (`node --test`, découverte automatique, sans dépendance)  |
| `npm run check`     | Vérification des types TypeScript et Svelte                     |
| `npm run build`     | Build de production                                             |
| `npm run db:seed`   | (Re)charge les données de référence                             |
| `npm run auth:hash` | Génère le hash à coller dans `AUTH_PASSWORD_HASH`               |

### Faire évoluer le schéma

Après avoir modifié `prisma/schema.prisma` :

```sh
npx prisma migrate dev --name <nom_de_la_migration>
```

Les migrations sont appliquées automatiquement au démarrage du conteneur en
production, par l'entrypoint.

## Mise en production

Voir **[DEPLOY.md](DEPLOY.md)** : procédure complète pour déployer sur une
machine vierge disposant de Docker, mettre à jour une instance existante et
sauvegarder la base.
