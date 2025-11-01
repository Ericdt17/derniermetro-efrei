# 🚀 Déploiement sur Render.com

Guide complet pour déployer l'API Dernier Métro sur Render.

## 📋 Prérequis

1. Compte Render.com (gratuit à [render.com](https://render.com))
2. Repo GitHub/GitLab avec le code
3. 5-10 minutes

---

## 🎯 Méthode 1 : Déploiement automatisé (Recommandé)

Render supporte `render.yaml` pour configuration as code.

### Étapes

1. **Connectez votre repo GitHub**
   - Allez sur [dashboard.render.com](https://dashboard.render.com)
   - Cliquez "New" → "Blueprint" (si disponible)
   - Ou "New" → "Web Service"

2. **Sélectionnez le repo**
   - Connectez GitHub si nécessaire
   - Sélectionnez `devops-ninja`
   - Render détectera `render.yaml`

3. **Configuration automatique**
   Render créera :
   - ✅ Web Service (API Node.js)
   - ✅ PostgreSQL Database
   - ✅ Variables d'environnement
   - ✅ Health checks

4. **Déployer**
   - Cliquez "Apply"
   - Attendez ~5-10 minutes
   - L'API sera accessible sur `https://votre-service.onrender.com`

---

## 🛠️ Méthode 2 : Déploiement manuel

### Étape 1 : Créer PostgreSQL Database

1. Dashboard → "New" → "PostgreSQL"
2. Configuration :
   - **Name** : `dernier-metro-db`
   - **Database** : `dernier_metro`
   - **User** : `app`
   - **Plan** : `Free` (ou `Starter` pour prod)
   - **Region** : `Frankfurt` (Europe)
3. Notez les credentials (affichés une seule fois)

### Étape 2 : Créer Web Service

1. Dashboard → "New" → "Web Service"
2. Connectez votre repo GitHub
3. Configuration :

#### Build & Deploy
- **Name** : `dernier-metro-api`
- **Runtime** : `Docker`
- **Region** : `Frankfurt` (même que DB)
- **Branch** : `main`
- **Dockerfile Path** : `api/Dockerfile`
- **Docker Context** : `api`

#### Environment
Configurez ces variables :

| Key | Value | Description |
|-----|-------|-------------|
| `DB_HOST` | Voir infra | Host PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USER` | Voir infra | User PostgreSQL |
| `DB_PASSWORD` | Voir infra | Password PostgreSQL |
| `DB_NAME` | `dernier_metro` | Database name |
| `NODE_ENV` | `production` | Mode production |
| `PORT` | `5000` | Port interne |

**Obtenir les credentials PostgreSQL** :
- Dans le dashboard de votre DB
- "Connections" → copiez les valeurs

#### Auto-Deploy
- ✅ Activé par défaut
- Déploie sur chaque push `main`

#### Health Check
- **Path** : `/health`

### Étape 3 : Vérifier le déploiement

1. **Logs**
   ```bash
   # Dans Render dashboard → votre service → Logs
   # Cherchez:
   ✅ Connecté à PostgreSQL
   📦 Database not initialized, running init...
   ✅ Database initialized
   API ready on http://localhost:5000
   ```

2. **Test Health**
   ```bash
   curl https://votre-service.onrender.com/health
   # Devrait retourner: {"status":"ok",...}
   ```

3. **Test Stations**
   ```bash
   curl https://votre-service.onrender.com/stations
   # Devrait retourner 6 stations
   ```

4. **Test Next Metro**
   ```bash
   curl "https://votre-service.onrender.com/next-metro?station=Châtelet"
   # Devrait retourner nextArrival
   ```

---

## 🔧 Variables d'environnement requises

| Variable | Production | Description |
|----------|-----------|-------------|
| `DB_HOST` | Auto (Render) | Host PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USER` | Auto (Render) | User DB |
| `DB_PASSWORD` | Auto (Render) | Password DB |
| `DB_NAME` | `dernier_metro` | Database name |
| `NODE_ENV` | `production` | Mode prod |
| `PORT` | `5000` | Port interne |

**Note** : Avec `render.yaml`, ces variables sont automatiques.

---

## 🐛 Dépannage

### L'API ne démarre pas

1. **Vérifier les logs**
   ```bash
   # Render Dashboard → Service → Logs
   ```

2. **Erreur "Cannot connect to PostgreSQL"**
   - Vérifier `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - S'assurer que la DB est démarrée

3. **Erreur "Database not initialized"**
   - Normal au premier lancement
   - Attendre l'init auto (~10s)
   - Vérifier : "✅ Database initialized"

4. **Build Docker échoue**
   - Vérifier `Dockerfile`
   - Logs : "Build Logs" dans Render

### Health check échoue

- Timeout par défaut : 90s
- Si >90s, augmenter dans la config Render
- Endpoint `/health` doit répondre vite

### Endpoints retournent 500

1. Vérifier l'init de la DB
2. Tester : `curl https://votre-url.onrender.com/db-test`
3. Vérifier la présence de 6 stations

---

## 🚦 Pláns Render

### Free Tier
- ✅ Web Service gratuit
- ✅ PostgreSQL 1GB
- ⚠️ Sleep après 15min inactivité
- ⚠️ Limites : RAM, CPU

### Starter ($7/mois)
- ✅ Pas de sleep
- ✅ RAM/CPU dédiés
- ⚠️ Un seul service

### Standard ($25/mois)
- ✅ Auto-scaling
- ✅ Haute disponibilité
- ✅ SLA 99.95%

**Recommandation** : Commencez par Free pour tester.

---

## 🔗 URLs et endpoints

Après déploiement :

```
Base URL: https://dernier-metro-api.onrender.com

Endpoints:
  GET /health              → Health check
  GET /db-test             → Test DB
  GET /stations            → Liste stations
  GET /next-metro?station=Châtelet  → Prochain métro
```

---

## 📊 Monitoring

Render fournit :
- ✅ Logs temps réel
- ✅ Metrics CPU/RAM
- ✅ Health status
- ✅ Deploy history

Accès : Dashboard → Votre service → "Metrics" / "Logs"

---

## 🔄 Déploiement continu

Auto-deploy activé par défaut :
- Chaque push `main` → nouveau déploiement
- Pull requests → preview deploys (optionnel)

Désactiver : Settings → "Auto-Deploy" → OFF

---

## 🔐 Sécurité

### Secrets
- ✅ Postgres credentials → auto-rotés par Render
- ✅ Variables env → non visibles publiquement
- ✅ HTTPS → automatique pour `.onrender.com`

### Best practices
- Ne pas commiter secrets
- Utiliser Render variables pour prod
- Activer 2FA sur le compte Render

---

## 📝 Notes importantes

1. **Init DB** : Automatique au premier lancement
2. **Sleep Free Tier** : Attendre 30s après réveil
3. **Build** : Premier déploiement ~5-10min
4. **Updates** : Subsequents ~2-5min
5. **Region** : Choisir proche de vos users

---

## ✅ Checklist de déploiement

- [ ] Repo GitHub connecté
- [ ] PostgreSQL créée
- [ ] Web Service créée
- [ ] Variables d'environnement configurées
- [ ] Build réussi
- [ ] Health check OK
- [ ] `/stations` retourne 6 stations
- [ ] `/next-metro` fonctionne
- [ ] Logs sans erreurs

---

## 🎉 Félicitations !

Votre API est en production sur Render ! 🚀

**Prochaines étapes** :
- Ajouter un domaine custom
- Configurer monitoring avancé
- Activer les backups DB
- Scale up si nécessaire

---

**Support** :
- Documentation : [render.com/docs](https://render.com/docs)
- Discord : Render Community
- Support : support@render.com

