-- Schema pour Dernier Metro API
-- Tables : config, stations, headways, last_metro

-- Table de configuration (existante)
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

