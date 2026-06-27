-- migrations/001_init.sql
-- Run this file to initialize the WasteFlow database schema.
-- BE Dev 2 owns this file.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users (crew + managers)
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       VARCHAR(16) NOT NULL CHECK (role IN ('manager', 'crew')),
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clusters (geographic groups of nearby reports)
CREATE TABLE IF NOT EXISTS clusters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centroid       GEOGRAPHY(POINT, 4326) NOT NULL,
  priority_score FLOAT DEFAULT 0,
  report_count   INT DEFAULT 0,
  status         VARCHAR(16) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  route_id       UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (submitted by citizens)
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type   VARCHAR(32) NOT NULL
                 CHECK (issue_type IN ('overflow', 'bulky', 'contamination', 'odor', 'illegal_dump')),
  severity     VARCHAR(8) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url    TEXT,
  description  TEXT,
  status       VARCHAR(16) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed')),
  cluster_id   UUID REFERENCES clusters(id) ON DELETE SET NULL,
  contact_info TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes (assigned to crew for a shift)
CREATE TABLE IF NOT EXISTS routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id      UUID REFERENCES users(id),
  shift_date   DATE NOT NULL,
  stops        JSONB DEFAULT '[]',
  distance_km  FLOAT DEFAULT 0,
  baseline_km  FLOAT DEFAULT 0,
  status       VARCHAR(16) DEFAULT 'planned'
                 CHECK (status IN ('planned', 'active', 'completed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- FK: clusters → routes (deferred to avoid circular dependency)
ALTER TABLE clusters ADD CONSTRAINT fk_cluster_route
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- Spatial index for fast proximity queries
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_clusters_centroid ON clusters USING GIST (centroid);
