"use strict";
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la connexion PostgreSQL (compose/local)
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "app",
  database: process.env.DB_NAME || "dernier_metro",
});

// Initialize database on first run (for Render/production environments)
let dbInitialized = false;
async function ensureDBInitialized() {
  if (!dbInitialized) {
    try {
      // Check if config table exists
      const result = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'config')"
      );

      if (!result.rows[0].exists) {
        console.log("📦 Database not initialized, running init...");
        // Create new pool for init (to avoid conflicts)
        const initPool = new Pool({
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || "app",
          password: process.env.DB_PASSWORD || "app",
          database: process.env.DB_NAME || "dernier_metro",
        });

        // Initialize schema
        const schema = `
        CREATE TABLE IF NOT EXISTS public.config (
          key   text PRIMARY KEY,
          value jsonb NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.stations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS public.headways (
          id SERIAL PRIMARY KEY,
          station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
          minutes INTEGER NOT NULL CHECK (minutes > 0)
        );
        CREATE TABLE IF NOT EXISTS public.last_metro (
          id SERIAL PRIMARY KEY,
          station_id INTEGER NOT NULL UNIQUE REFERENCES stations(id) ON DELETE CASCADE,
          departed_at TIME NOT NULL
        );
        `;

        const seed = `
        INSERT INTO public.config(key, value) VALUES
          ('app.name',       '{"service":"dernier-metro-api"}'),
          ('metro.defaults', '{"line":"M1","headwayMin":3,"tz":"Europe/Paris"}')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.stations (name) VALUES
          ('Châtelet'), ('Gare de Lyon'), ('République'), ('Nation'), ('Bastille'), ('Opéra')
        ON CONFLICT (name) DO NOTHING;
        INSERT INTO public.headways (station_id, minutes) 
        SELECT s.id, v.minutes 
        FROM stations s
        CROSS JOIN (VALUES 
          ('Châtelet', 3), ('Gare de Lyon', 5), ('République', 4),
          ('Nation', 6), ('Bastille', 4), ('Opéra', 3)
        ) AS v(station_name, minutes)
        WHERE s.name = v.station_name
        ON CONFLICT DO NOTHING;
        INSERT INTO public.last_metro (station_id, departed_at)
        SELECT s.id, v.departed_at::TIME
        FROM stations s
        CROSS JOIN (VALUES
          ('Châtelet', '01:15:00'), ('Gare de Lyon', '01:10:00'), ('République', '01:12:00'),
          ('Nation', '01:08:00'), ('Bastille', '01:14:00'), ('Opéra', '01:13:00')
        ) AS v(station_name, departed_at)
        WHERE s.name = v.station_name
        ON CONFLICT (station_id) DO UPDATE SET departed_at = EXCLUDED.departed_at;
        `;

        await initPool.query(schema);
        await initPool.query(seed);
        await initPool.end();
        console.log("✅ Database initialized");
      }
      dbInitialized = true;
    } catch (error) {
      console.error("⚠️  DB init error (non-fatal):", error.message);
    }
  }
}

// Tester la connexion au démarrage (sauf en tests CI)
if (process.env.NODE_ENV !== "test") {
  pool.query("SELECT NOW()", async (err, res) => {
    if (err) {
      console.error("❌ Erreur de connexion à PostgreSQL:", err);
    } else {
      console.log("✅ Connecté à PostgreSQL:", res.rows[0].now);
      // Ensure DB initialized
      await ensureDBInitialized();
    }
  });
}
// Activer CORS pour Swagger UI
app.use(cors());

// Logger minimal: méthode, chemin, status, durée
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    const dt = Date.now() - t0;
    console.log(`${req.method} ${req.path} -> ${res.statusCode} ${dt}ms`);
  });
  next();
});

// Santé
app.get("/health", (_req, res) =>
  res
    .status(200)
    .json({ status: "ok", service: "dernier-metro-api", version: "1.0." })
);

// Test de connexion à la base de données
app.get("/db-test", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM config");
    return res.status(200).json({
      status: "connected",
      configCount: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Liste toutes les stations avec leurs infos
app.get("/stations", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.name,
        h.minutes as headway_minutes,
        l.departed_at as last_metro_time
      FROM stations s
      LEFT JOIN headways h ON s.id = h.station_id
      LEFT JOIN last_metro l ON s.id = l.station_id
      ORDER BY s.id
    `);
    return res.status(200).json({
      count: result.rows.length,
      stations: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Fonction réaliste avec horaires de service et détection du dernier métro
function nextArrival(now = new Date(), headwayMin = 3) {
  const tz = "Europe/Paris";
  const toHM = (d) =>
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0");

  const m = now.getHours() * 60 + now.getMinutes(); // 0..1439
  const serviceOpen = m >= 330 || m <= 75; // 05:30–24:00 OR 00:00–01:15
  if (!serviceOpen) return { service: "closed", tz };

  const isLast = m >= 45 && m <= 75; // 00:45–01:15
  const next = new Date(now.getTime() + headwayMin * 60 * 1000);

  return { nextArrival: toHM(next), isLast, headwayMin, tz };
}

// Endpoint métier avec données réelles de la base
app.get("/next-metro", async (req, res) => {
  const station = (req.query.station || "").toString().trim();
  if (!station) return res.status(400).json({ error: "missing station" });

  try {
    // Vérifier si la station existe et récupérer ses données
    const stationResult = await pool.query(
      `
      SELECT 
        s.id,
        s.name,
        h.minutes as headway_minutes,
        l.departed_at as last_metro_time
      FROM stations s
      LEFT JOIN headways h ON s.id = h.station_id
      LEFT JOIN last_metro l ON s.id = l.station_id
      WHERE s.name = $1
    `,
      [station]
    );

    // Station introuvable
    if (stationResult.rows.length === 0) {
      return res.status(404).json({
        error: `Station '${station}' introuvable`,
        availableStations: [
          "Châtelet",
          "Gare de Lyon",
          "République",
          "Nation",
          "Bastille",
          "Opéra",
        ],
      });
    }

    const stationData = stationResult.rows[0];
    const headwayMin = stationData.headway_minutes || 3; // Valeur par défaut si pas de fréquence

    const result = nextArrival(new Date(), headwayMin);

    // Si le service est fermé
    if (result.service === "closed") {
      return res.status(200).json({
        station: stationData.name,
        station_id: stationData.id,
        service: "closed",
        message: "Le métro est fermé (01:15-05:30)",
        tz: result.tz,
      });
    }

    // Service ouvert
    return res.status(200).json({
      station: stationData.name,
      station_id: stationData.id,
      nextArrival: result.nextArrival,
      isLast: result.isLast,
      headwayMin: headwayMin,
      lastMetroTime: stationData.last_metro_time,
      tz: result.tz,
    });
  } catch (error) {
    console.error("Erreur dans /next-metro:", error);
    return res.status(500).json({
      error: "Erreur de base de données",
      message: error.message,
    });
  }
});

// 404 JSON
app.use((_req, res) => res.status(404).json({ error: "not found" }));

// Démarrage uniquement si le fichier est exécuté directement
if (require.main === module) {
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
}

// Exports pour les tests
module.exports = { app, nextArrival };
