# Dernier Métro API - DevOps Ninja

API REST Node.js pour obtenir les horaires du prochain métro à Paris.

## 🎯 État du projet

**Niveau d'avancement**: Production-ready avec CI/CD automatisé

### ✅ Fonctionnalités implémentées

- **API REST complète** avec 4 endpoints
- **Base de données PostgreSQL** avec 6 stations parisiennes
- **Docker & Docker Compose** pour développement local
- **Tests automatisés** (unitaires + E2E avec Jest)
- **Documentation OpenAPI** avec Swagger UI
- **CI/CD GitHub Actions** avec scans de sécurité (Trivy)
- **Déploiement** sur Render.com avec configuration as code

---

## 🚀 Démarrage rapide (local)

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (optionnel, utilisez Docker)

### Lancer le projet

```bash
# 1. Cloner le repo
git clone <url-du-repo>
cd devops-ninja

# 2. Lancer les services
docker compose up -d

# 3. Vérifier que tout fonctionne
curl http://localhost:5001/health
```

**Services démarrés :**

- API: http://localhost:5001
- Swagger UI: http://localhost:8080
- PostgreSQL: localhost:5433

### Tests

```bash
# Lancer tous les tests
cd api
npm test

# Tests E2E uniquement
npm run test:e2e

# Mode watch (développement)
npm run test:watch
```

---

## 📡 Endpoints API

| Endpoint                           | Description                     |
| ---------------------------------- | ------------------------------- |
| `GET /health`                      | Health check                    |
| `GET /db-test`                     | Test connexion PostgreSQL       |
| `GET /stations`                    | Liste toutes les stations       |
| `GET /next-metro?station=Châtelet` | Prochain métro pour une station |

**Exemple :**

```bash
curl "http://localhost:5001/next-metro?station=Châtelet"
```

Réponse:

```json
{
  "station": "Châtelet",
  "station_id": 1,
  "nextArrival": "14:35",
  "isLast": false,
  "headwayMin": 3,
  "lastMetroTime": "01:15:00",
  "tz": "Europe/Paris"
}
```

---

## 🗄️ Base de données

**Schema :** 4 tables (`config`, `stations`, `headways`, `last_metro`)

**Stations disponibles :** Châtelet, Gare de Lyon, République, Nation, Bastille, Opéra

**Commandes utiles :**

```bash
# Accéder à la base
docker compose exec postgres psql -U app -d dernier_metro

# Lister les stations
docker compose exec postgres psql -U app -d dernier_metro -c "SELECT * FROM stations;"

# Voir les fréquences
docker compose exec postgres psql -U app -d dernier_metro -c "SELECT s.name, h.minutes FROM stations s JOIN headways h ON s.id = h.station_id;"
```

---

## 🐳 Docker

### Développement

```bash
docker compose up -d          # Démarrer
docker compose logs -f api    # Logs API
docker compose down           # Arrêter
```

### Build de l'image

```bash
cd api
docker build -t dernier-metro-api .
docker run -p 5001:5000 dernier-metro-api
```

---

## 🔄 CI/CD Pipeline

**Workflow GitHub Actions** (`.github/workflows/ci.yml`) :

1. **Tests** : unitaires + E2E + npm audit
2. **Sécurité** : Trivy (code + image)
3. **Build** : image Docker → GHCR

**Scans actifs :**

- ✅ npm audit (high/critical)
- ✅ Trivy filesystem scan
- ✅ Trivy container scan

---

## 🌐 Déploiement Production

### Render.com (Recommandé) ⭐

**Déploiement en 5 minutes :**

1. Cliquez "New" → "Blueprint" sur [dashboard.render.com](https://dashboard.render.com)
2. Connectez votre repo GitHub
3. Render détecte `render.yaml` et configure automatiquement :
   - ✅ Web Service Node.js
   - ✅ PostgreSQL Database
   - ✅ Variables d'environnement
   - ✅ Health checks
4. Déployez et obtenez votre URL !

📖 **[Guide complet → RENDER_DEPLOY.md](RENDER_DEPLOY.md)**

---

## 📚 Documentation

- **OpenAPI Spec** : `openapi/openapi.yaml`
- **Swagger UI** : http://localhost:8080
- **Database Schema** : `db/schema.sql`

---

## 🧪 Tests

**Types de tests :**

- **Unitaires** : mocks PostgreSQL (`__tests__/api.test.js`)
- **E2E** : vraie API + DB (`__tests__/e2e.real.test.js`)
- **Fonctions métier** : `nextArrival()` (`__tests__/nextArrival.test.js`)

**Coverage :**

- Endpoints API
- Gestion horaires (fermeture 01:15-05:30)
- Détection dernier métro
- Gestion erreurs (404, 500)

---

## 🏗️ Architecture

```
devops-ninja/
├── api/                    # Application Node.js
│   ├── server.js           # Express + routes
│   ├── Dockerfile          # Image production
│   ├── package.json        # Dépendances
│   └── __tests__/          # Tests Jest
├── db/                     # PostgreSQL
│   ├── schema.sql          # Tables
│   └── seed.sql            # Données initiales
├── docker-compose.yml      # Développement
├── docker-compose.staging.yml  # Production (optionnel)
├── caddy/                  # Reverse proxy
│   └── Caddyfile           # Config HTTPS
├── openapi/                # Documentation
│   └── openapi.yaml        # Spécification
└── .github/workflows/      # CI/CD
    └── ci.yml              # Pipeline
```

---

## 📝 Notes Windows/PowerShell

- Exécutez les commandes séparément (pas `&&`)
- Utilisez `docker compose` (pas `docker-compose`)

---

## 🎯 Prochaines étapes possibles

- [ ] Monitoring (Prometheus + Grafana)
- [ ] Logging centralisé (ELK/Loki)
- [ ] Backups automatiques (PostgreSQL)
- [ ] Rate limiting
- [ ] Cache (Redis)
- [ ] Découplage API → microservices

---

**Auteur** : DevOps Ninja  
**Version** : 1.0.0  
**Licence** : MIT
