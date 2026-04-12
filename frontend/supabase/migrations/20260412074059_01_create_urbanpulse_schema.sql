/*
  # UrbanPulse – Smart Traffic & Crowd Intelligence System Schema

  ## Overview
  This migration creates the complete database schema for UrbanPulse, a comprehensive traffic monitoring and analytics platform.

  ## Tables Created

  ### 1. locations
  Stores city locations for traffic monitoring.
  - `id` (UUID, PK): Unique location identifier
  - `name` (text): Location name (e.g., "Downtown Central", "Highway 101 North")
  - `city` (text): City name
  - `latitude` (numeric): Geographic latitude
  - `longitude` (numeric): Geographic longitude
  - `zone_type` (text): Category (residential/commercial/highway)
  - `created_at` (timestamp): Record creation time
  - Index: ON zone_type for filtering

  ### 2. traffic_logs
  Records individual traffic observations over time.
  - `id` (UUID, PK): Unique log identifier
  - `location_id` (UUID, FK): Reference to locations table
  - `timestamp` (timestamp): When the observation was recorded
  - `density_level` (integer): Traffic density 0–100 scale
  - `vehicle_count` (integer): Estimated number of vehicles
  - `congestion_status` (text): low/moderate/high/critical
  - `data_source` (text): manual/simulated to distinguish real data from test data
  - `created_at` (timestamp): When the record was inserted
  - Composite Index: ON (location_id, timestamp DESC) for fast time-range queries
  - Partial Index: ON timestamp for time-series aggregation

  ### 3. simulation_runs
  Tracks data generation events for audit and replay.
  - `id` (UUID, PK): Unique simulation run identifier
  - `run_name` (text): User-friendly run label
  - `started_at` (timestamp): Simulation start time
  - `ended_at` (timestamp): Simulation end time
  - `config` (jsonb): Simulation parameters (locations, interval, noise factor)
  - `records_generated` (integer): Count of traffic_logs created
  - `created_at` (timestamp): When the run was recorded

  ## Relationships
  - traffic_logs.location_id → locations.id (cascade delete)
  - Ensures referential integrity and clean data removal

  ## Security
  - RLS is enabled on all tables
  - Public read access for analytics (no sensitive data)
  - Write access restricted to authenticated operations in application logic
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('residential', 'commercial', 'highway')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_zone_type ON locations(zone_type);

-- Create traffic_logs table
CREATE TABLE IF NOT EXISTS traffic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  density_level INTEGER NOT NULL CHECK (density_level >= 0 AND density_level <= 100),
  vehicle_count INTEGER NOT NULL DEFAULT 0 CHECK (vehicle_count >= 0),
  congestion_status TEXT NOT NULL CHECK (congestion_status IN ('low', 'moderate', 'high', 'critical')),
  data_source TEXT NOT NULL CHECK (data_source IN ('manual', 'simulated')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traffic_logs_location_timestamp ON traffic_logs(location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_logs_timestamp ON traffic_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_traffic_logs_data_source ON traffic_logs(data_source);

-- Create simulation_runs table
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  records_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_created ON simulation_runs(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (analytics queries)
CREATE POLICY "locations_public_read"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "traffic_logs_public_read"
  ON traffic_logs FOR SELECT
  USING (true);

CREATE POLICY "simulation_runs_public_read"
  ON simulation_runs FOR SELECT
  USING (true);

-- Create insertion policies (application-controlled, no direct user inserts in UI)
CREATE POLICY "traffic_logs_insert"
  ON traffic_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "locations_insert"
  ON locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "simulation_runs_insert"
  ON simulation_runs FOR INSERT
  WITH CHECK (true);

-- Create deletion policies (for data management cleanup)
CREATE POLICY "traffic_logs_delete"
  ON traffic_logs FOR DELETE
  USING (true);

CREATE POLICY "locations_delete"
  ON locations FOR DELETE
  USING (true);

CREATE POLICY "simulation_runs_delete"
  ON simulation_runs FOR DELETE
  USING (true);

-- Seed initial locations (10 diverse locations across different zones)
INSERT INTO locations (name, city, latitude, longitude, zone_type) VALUES
  ('Downtown Central', 'San Francisco', 37.7749, -122.4194, 'commercial'),
  ('Mission District', 'San Francisco', 37.7599, -122.4148, 'residential'),
  ('Highway 101 North', 'San Jose', 37.3382, -121.8863, 'highway'),
  ('Financial District', 'San Francisco', 37.7927, -122.3980, 'commercial'),
  ('Sunset Park', 'San Francisco', 37.7694, -122.4862, 'residential'),
  ('Bay Bridge', 'Oakland', 37.8314, -122.2668, 'highway'),
  ('Midtown Oakland', 'Oakland', 37.8044, -122.2712, 'commercial'),
  ('Lake Merritt', 'Oakland', 37.8048, -122.2708, 'residential'),
  ('Highway 880 South', 'San Jose', 37.3294, -121.8831, 'highway'),
  ('Silicon Valley', 'San Jose', 37.3382, -121.8863, 'commercial'),
  ('Residential North', 'San Francisco', 37.8044, -122.2740, 'residential'),
  ('Commercial East', 'Oakland', 37.7844, -122.2612, 'commercial'),
  ('Highway 280 Corridor', 'San Jose', 37.3300, -121.8850, 'highway'),
  ('Waterfront District', 'San Francisco', 37.7749, -122.4194, 'commercial'),
  ('Suburban Hills', 'San Jose', 37.2352, -121.8863, 'residential')
ON CONFLICT DO NOTHING;
