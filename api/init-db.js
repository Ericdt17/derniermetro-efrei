"use strict";
const { Pool } = require("pg");

// Schema SQL
const schema = `
-- Table de configuration
CREATE TABLE IF NOT EXISTS public.config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- Table des stations
CREATE TABLE IF NOT EXISTS public.stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Table des fréquences de passage (en minutes)
CREATE TABLE IF NOT EXISTS public.headways (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL CHECK (minutes > 0)
);

-- Table des horaires du dernier métro
CREATE TABLE IF NOT EXISTS public.last_metro (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL UNIQUE REFERENCES stations(id) ON DELETE CASCADE,
  departed_at TIME NOT NULL
);
`;

// Seed data
const seed = `
-- Configuration
INSERT INTO public.config(key, value) VALUES
  ('app.name',       '{"service":"dernier-metro-api"}'),
  ('metro.defaults', '{"line":"M1","headwayMin":3,"tz":"Europe/Paris"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Stations de test
INSERT INTO public.stations (name) VALUES
  ('Châtelet'),
  ('Gare de Lyon'),
  ('République'),
  ('Nation'),
  ('Bastille'),
  ('Opéra')
ON CONFLICT (name) DO NOTHING;

-- Fréquences de passage (minutes > 0)
INSERT INTO public.headways (station_id, minutes) 
SELECT s.id, v.minutes 
FROM stations s
CROSS JOIN (VALUES 
  ('Châtelet', 3),
  ('Gare de Lyon', 5),
  ('République', 4),
  ('Nation', 6),
  ('Bastille', 4),
  ('Opéra', 3)
) AS v(station_name, minutes)
WHERE s.name = v.station_name
ON CONFLICT DO NOTHING;

-- Horaires du dernier métro (station_id UNIQUE)
INSERT INTO public.last_metro (station_id, departed_at)
SELECT s.id, v.departed_at::TIME
FROM stations s
CROSS JOIN (VALUES
  ('Châtelet', '01:15:00'),
  ('Gare de Lyon', '01:10:00'),
  ('République', '01:12:00'),
  ('Nation', '01:08:00'),
  ('Bastille', '01:14:00'),
  ('Opéra', '01:13:00')
) AS v(station_name, departed_at)
WHERE s.name = v.station_name
ON CONFLICT (station_id) DO UPDATE SET departed_at = EXCLUDED.departed_at;
`;

async function initDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "app",
    password: process.env.DB_PASSWORD || "app",
    database: process.env.DB_NAME || "dernier_metro",
  });

  try {
    console.log("📦 Initializing database schema...");
    await pool.query(schema);
    
    console.log("🌱 Seeding database with initial data...");
    await pool.query(seed);
    
    console.log("✅ Database initialized successfully!");
    await pool.end();
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };

