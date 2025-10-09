-- Seed values for Dernier Metro API
-- Safe to re-run: upserts on conflict

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
