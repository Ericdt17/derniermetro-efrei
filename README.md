
# 03 — Compose + Swagger UI

Objectif: Ajouter Swagger UI comme sidecar pour documenter l'API.

Points clés:
- Le fichier OpenAPI est monté dans le conteneur Swagger et servi à `/openapi/openapi.yaml`.
- Swagger UI est accessible sur http://localhost:8080
- Le bouton “Try it out” peut être bloqué par CORS (on règle cela à l'étape 04).

Commandes:
- `docker compose up -d`
- Ouvrir http://localhost:8080
- API: `curl http://localhost:5000/health`

---

## Ajout base PostgreSQL (init simple)

Ce dossier contient un service PostgreSQL prêt à l'emploi pour la suite de la roadmap.

- Service: `postgres:16-alpine` avec DB `dernier_metro`, utilisateur/mot de passe `app`.
- Les scripts d'init sont montés via `./db` dans `/docker-entrypoint-initdb.d/`:
  - `db/schema.sql` crée une table `config(key text primary key, value jsonb)`.
  - `db/seed.sql` insère quelques valeurs par défaut.

Démarrer:

- `docker compose up -d`

Vérifier la base (exemples):

- `docker compose exec postgres psql -U app -d dernier_metro -c "\dt"`
- `docker compose exec postgres psql -U app -d dernier_metro -c "select * from config;"`

Notes Windows:

- Si vous utilisez PowerShell, évitez `&&` dans les commandes; exécutez chaque commande séparément.
