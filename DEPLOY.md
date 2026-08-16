# Déploiement de Stoguard

Procédure de déploiement manuel, sans CI/CD : l'image est construite
directement sur la machine cible à partir du code source (`build: .` dans
`docker-compose.yml`), pas récupérée depuis un registre.

## Prérequis

Sur la machine cible (n'importe quel Linux/macOS avec accès réseau) :

- **Docker** (moteur) — [instructions d'installation](https://docs.docker.com/engine/install/)
- **Docker Compose** (plugin `docker compose`, inclus avec Docker Desktop et
  les paquets Docker récents sur Linux)
- **git**

Vérifier que tout est en place :

```sh
docker --version
docker compose version
git --version
```

## 1. Cloner le dépôt

```sh
git clone <url-du-dépôt> stoguard
cd stoguard
```

## 2. Créer le fichier `.env`

```sh
cp .env.example .env
```

Puis éditer `.env` et renseigner chaque variable :

| Variable             | Rôle                                                                                          | Comment obtenir la valeur                                                              |
|-----------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `POSTGRES_USER`       | Nom d'utilisateur créé dans le conteneur Postgres au premier démarrage.                       | Pas un secret : garder `stoguard` ou choisir un autre nom.                              |
| `POSTGRES_PASSWORD`   | Mot de passe de cet utilisateur Postgres.                                                     | À générer aléatoirement, voir commande ci-dessous. Ne jamais garder `changeme`.         |
| `POSTGRES_DB`         | Nom de la base créée au premier démarrage.                                                    | Pas un secret : garder `stoguard` ou choisir un autre nom.                              |
| `DATABASE_URL`        | URL de connexion utilisée par l'application et par Prisma.                                    | À reconstruire à la main à partir des trois valeurs ci-dessus (voir plus bas).          |
| `SESSION_SECRET`      | Clé utilisée pour signer les cookies de session.                                              | À générer aléatoirement, voir commande ci-dessous.                                      |
| `AUTH_PASSWORD_HASH`  | Hash (scrypt) du mot de passe de connexion à l'application.                                   | **Laisser vide pour l'instant**, généré à l'étape suivante. L'application refuse de démarrer tant qu'il est vide. |
| `TZ`                  | Fuseau horaire du conteneur. Il détermine à quel moment on change de jour, donc le calcul des « jours restants » avant péremption. | Facultatif : `Europe/Paris` par défaut. Ne changer que si vous n'êtes pas en France métropolitaine. |
| `OFF_CONTACT_EMAIL`   | Adresse de contact envoyée à Open Food Facts dans le User-Agent (`Stoguard/0.1 (<cette adresse>)`), pour qu'ils puissent joindre l'auteur en cas d'usage anormal. | Facultatif : `contact@example.com` par défaut si absent (juste un avertissement dans les logs, l'application démarre quand même). La valeur d'exemple fonctionne, mais il est correct d'y mettre une vraie adresse. |

Générer un secret aléatoire (utilisable pour `POSTGRES_PASSWORD` comme pour
`SESSION_SECRET`) :

```sh
openssl rand -hex 32
```

Exemple de `.env` complet une fois rempli (remplacer les valeurs générées) :

```env
POSTGRES_USER=stoguard
POSTGRES_PASSWORD=<valeur générée avec openssl rand -hex 32>
POSTGRES_DB=stoguard

# "db" est le nom du service Postgres sur le réseau Docker interne, pas
# "localhost" — ne pas changer ce host même si Postgres tourne sur la même
# machine que l'app.
DATABASE_URL=postgresql://stoguard:<même mot de passe que POSTGRES_PASSWORD>@db:5432/stoguard

SESSION_SECRET=<autre valeur générée avec openssl rand -hex 32>

AUTH_PASSWORD_HASH=

OFF_CONTACT_EMAIL=contact@example.com
```

`.env` n'est jamais commité (il est dans `.gitignore`) : chaque machine de
déploiement a le sien.

## 3. Générer le mot de passe de connexion

L'application n'a pas de compte ni d'inscription : un seul mot de passe,
partagé, protège tout le site. Sans `AUTH_PASSWORD_HASH` renseigné dans
`.env`, elle refuse de démarrer plutôt que de tourner sans protection.

Construisez d'abord l'image (elle contient le script de hachage) :

```sh
docker compose build app
```

Puis générez le hash, dans un conteneur jetable qui ne touche pas à la base
de données (l'option `--entrypoint npm` court-circuite volontairement les
migrations automatiques, inutiles ici) :

```sh
docker compose run --rm --entrypoint npm app run auth:hash
```

Le mot de passe est saisi en masqué, jamais affiché ni écrit sur disque.
Collez la valeur affichée (`<sel>:<hash>`) dans `AUTH_PASSWORD_HASH=` de
`.env`.

## 4. Lancer l'application

```sh
docker compose up -d --build
```

Cette commande construit l'image de l'app à partir du `Dockerfile` (déjà fait
à l'étape précédente, donc rapide ici), démarre Postgres, applique
automatiquement les migrations Prisma (voir section « Mise à jour »
ci-dessous) puis démarre l'app et Caddy.

## 5. Charger les données de référence (première installation uniquement)

L'application a besoin de sa liste d'emplacements (Réfrigérateur, Congélateur,
Placard, Cave) et de catégories (avec leur délai de consommation après
ouverture). Sans elles, le formulaire d'ajout n'a aucun emplacement à proposer.

```sh
docker compose exec app node_modules/.bin/prisma db seed
```

Cette commande est **idempotente** : la relancer ne crée pas de doublons. Elle
réaligne en revanche les délais des catégories sur les valeurs par défaut, donc
ne la relancez pas si vous avez personnalisé ces délais.

## 6. Vérifier que ça tourne

État des services :

```sh
docker compose ps
```

Les trois services (`app`, `db`, `caddy`) doivent afficher `Up` (et `healthy`
pour `db`).

Contrôle applicatif via le endpoint de santé, à travers Caddy :

```sh
curl -i http://localhost/health
```

Une réponse `HTTP/1.1 200 OK` avec le corps `OK` confirme que l'app répond et
que Caddy relaie correctement vers elle.

## 7. Mettre à jour une instance existante

```sh
git pull
docker compose up -d --build
```

Cette seule commande suffit : l'image est reconstruite avec le nouveau code,
et l'entrypoint du conteneur `app` exécute automatiquement
`prisma migrate deploy` **avant** de démarrer l'application, à chaque
redémarrage du conteneur. Si une migration échoue, le conteneur s'arrête en
erreur au lieu de démarrer l'app sur une base au mauvais schéma — dans ce cas,
regarder les logs (`docker compose logs app`) avant de réessayer.

## 8. Logs et redémarrage

Suivre les logs d'un service en continu :

```sh
docker compose logs -f app
docker compose logs -f db
docker compose logs -f caddy
```

Redémarrer un seul service (sans reconstruire l'image) :

```sh
docker compose restart app
```

## 9. Sauvegarde de la base de données

Le volume Docker `db_data` (données Postgres) est **la seule chose du projet
qui n'est pas reconstructible** : le code est dans git, l'image se
reconstruit à partir du code, mais les données doivent être sauvegardées
explicitement.

Dump complet de la base, à lancer régulièrement (ou avant toute opération
risquée) :

```sh
docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backup_$(date +%Y%m%d_%H%M%S).sql
```

(`$POSTGRES_USER` et `$POSTGRES_DB` doivent être exportés dans le shell, ou
remplacés directement par les valeurs présentes dans `.env`.)

Restauration à partir d'un dump :

```sh
cat backup_20260101_120000.sql | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## 10. À propos de Caddy et du HTTPS

Le `Caddyfile` fourni écoute en clair sur le port `:80`, sans TLS :

```
:80 {
	reverse_proxy app:3000
}
```

C'est volontaire : ce déploiement suppose qu'un reverse proxy externe (autre
machine, load balancer, etc.) gère déjà le HTTPS et transmet le trafic en
HTTP vers cette machine.

**Ne pas remplacer `:80` par un nom de domaine dans le `Caddyfile`** tant que
ce n'est pas réellement le cas : si un nom de domaine y est renseigné, Caddy
tente automatiquement d'obtenir un certificat Let's Encrypt pour ce domaine
au démarrage, et échoue (DNS non pointé, port 443 non joignable depuis
l'extérieur, etc.), ce qui empêche le service `caddy` de démarrer
correctement.

### En-têtes attendus du reverse proxy externe

Ce reverse proxy externe (celui qui termine le TLS, en amont de Caddy) doit
transmettre trois en-têtes :

- `X-Forwarded-Proto` — le schéma d'origine (`https`), pour que l'application
  reconstruise correctement son URL publique.
- `X-Forwarded-Host` — le nom d'hôte public.
- `X-Forwarded-For` — l'adresse IP du visiteur.

Exemple avec HAProxy :

```
acl https ssl_fc
http-request set-header X-Forwarded-Proto https if https
option forwardfor
```

Le `Caddyfile` fait confiance à ces en-têtes via `trusted_proxies static
private_ranges` (bloc global en tête de fichier) — sans quoi Caddy les
ignorerait et les remplacerait par ce qu'il observe lui-même, du HTTP en
clair. **Sans cette configuration, deux choses cassent :**

- **Tous les formulaires renvoient 403** (« Cross-site POST form submissions
  are forbidden ») : l'application croit tourner en HTTP alors que le
  navigateur envoie `Origin: https://...`, la protection CSRF d'adapter-node
  rejette l'écart.
- **Le limiteur anti-force-brute de `/login` devient inopérant** : tous les
  visiteurs partagent la même IP observée (celle du reverse proxy), donc le
  même compteur.

Si le reverse proxy externe ajoute lui-même un ou plusieurs sauts avant
Caddy (comme HAProxy), la variable `XFF_DEPTH` du service `app` (dans
`docker-compose.yml`) doit refléter le nombre total de sauts dans la chaîne
`X-Forwarded-For` telle que vue par l'application — Caddy ajoute son propre
saut à la valeur reçue plutôt que de la remplacer.

### Sonde de santé

Le reverse proxy externe doit interroger **`/health`**, jamais `/` : depuis
la mise en place de l'authentification, `/` renvoie une redirection 303 vers
`/login` pour un visiteur non authentifié, ce qu'une sonde de santé
interpréterait à tort comme un service en panne.