"use strict";
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "app",
  database: process.env.DB_NAME || "dernier_metro",
});

// Tester la connexion au démarrage
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Erreur de connexion à PostgreSQL:", err);
  } else {
    console.log("✅ Connecté à PostgreSQL:", res.rows[0].now);
  }
});
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

app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
