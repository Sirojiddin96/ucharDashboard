-- Legacy Tables for Data Migration
-- These tables hold read-only snapshots of old data from the legacy project
-- Each table includes: source='legacy', old_id (original ID), migrated_at timestamp

-- ── Pre-requisite: ensure orders has all columns the views depend on ─────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address       text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS region_id     uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_id    uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bot_id        text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bot_token     text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dropoff_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS note          text;

CREATE SCHEMA IF NOT EXISTS legacy_archive;

-- 1. Legacy Orders
CREATE TABLE IF NOT EXISTS legacy_archive.legacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_id text,
  address text,
  amount numeric,
  billing_started_at timestamptz,
  bot_id text,
  bot_token text,
  cancelled_at timestamptz,
  car_brand text,
  car_color text,
  car_model text,
  car_number text,
  channel text DEFAULT 'legacy',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  current_status smallint,
  dest_latitude double precision,
  dest_longitude double precision,
  distance_m real,
  driver_assigned_at timestamptz,
  driver_id text,
  driver_name text,
  driver_reassignment_count integer DEFAULT 0,
  dropoff_address text,
  final_status smallint,
  gps_accuracy real,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  note text,
  phone text,
  polling_stopped_at timestamptz,
  region_id uuid,
  scat_uuid text,
  service_id uuid,
  telegram_user_id bigint,
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  source text DEFAULT 'legacy',
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_orders_created_at ON legacy_archive.legacy_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_final_status ON legacy_archive.legacy_orders(final_status);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_old_id ON legacy_archive.legacy_orders(old_id);

-- 2. Legacy Ride Feedbacks
CREATE TABLE IF NOT EXISTS legacy_archive.legacy_ride_feedbacks (
  id bigint PRIMARY KEY,
  old_id text,
  car_number text,
  comment text,
  created_at timestamptz DEFAULT now(),
  driver_id text,
  driver_name text,
  order_id uuid,
  rating smallint NOT NULL,
  telegram_user_id bigint,
  title text,
  type text,
  user_id uuid,
  source text DEFAULT 'legacy',
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_ride_feedbacks_created_at ON legacy_archive.legacy_ride_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_ride_feedbacks_order_id ON legacy_archive.legacy_ride_feedbacks(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_ride_feedbacks_old_id ON legacy_archive.legacy_ride_feedbacks(old_id);

-- 3. Legacy Bot Events
CREATE TABLE IF NOT EXISTS legacy_archive.legacy_bot_events (
  id bigint PRIMARY KEY,
  old_id text,
  created_at timestamptz DEFAULT now(),
  event_type text NOT NULL,
  metadata jsonb,
  order_id uuid,
  scat_uuid text,
  telegram_user_id bigint,
  source text DEFAULT 'legacy',
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_created_at ON legacy_archive.legacy_bot_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_event_type ON legacy_archive.legacy_bot_events(event_type);
CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_order_id ON legacy_archive.legacy_bot_events(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_old_id ON legacy_archive.legacy_bot_events(old_id);

-- 4. Legacy Order Status Logs
CREATE TABLE IF NOT EXISTS legacy_archive.legacy_order_status_logs (
  id bigint PRIMARY KEY,
  old_id text,
  amount numeric,
  created_at timestamptz DEFAULT now(),
  driver_id text,
  order_id uuid NOT NULL,
  raw_response jsonb,
  remaining_time smallint,
  scat_uuid text NOT NULL,
  status_code smallint NOT NULL,
  status_message text,
  source text DEFAULT 'legacy',
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_order_status_logs_created_at ON legacy_archive.legacy_order_status_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_order_status_logs_order_id ON legacy_archive.legacy_order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_order_status_logs_old_id ON legacy_archive.legacy_order_status_logs(old_id);

-- 5. Legacy Order Driver Assignments
CREATE TABLE IF NOT EXISTS legacy_archive.legacy_order_driver_assignments (
  id bigint PRIMARY KEY,
  old_id text,
  assigned_at timestamptz DEFAULT now(),
  car_brand text,
  car_color text,
  car_model text,
  car_number text,
  driver_id text,
  driver_name text,
  order_id uuid NOT NULL,
  remaining_time integer,
  scat_uuid text,
  source text DEFAULT 'legacy',
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_order_driver_assignments_created_at ON legacy_archive.legacy_order_driver_assignments(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_order_driver_assignments_order_id ON legacy_archive.legacy_order_driver_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_order_driver_assignments_old_id ON legacy_archive.legacy_order_driver_assignments(old_id);

-- Backward-compatible relaxations for previously created legacy tables
-- (if earlier attempts created old_id as UNIQUE NOT NULL)
ALTER TABLE IF EXISTS public.legacy_orders DROP CONSTRAINT IF EXISTS legacy_orders_old_id_key;
ALTER TABLE IF EXISTS public.legacy_ride_feedbacks DROP CONSTRAINT IF EXISTS legacy_ride_feedbacks_old_id_key;
ALTER TABLE IF EXISTS public.legacy_bot_events DROP CONSTRAINT IF EXISTS legacy_bot_events_old_id_key;
ALTER TABLE IF EXISTS public.legacy_order_status_logs DROP CONSTRAINT IF EXISTS legacy_order_status_logs_old_id_key;
ALTER TABLE IF EXISTS public.legacy_order_driver_assignments DROP CONSTRAINT IF EXISTS legacy_order_driver_assignments_old_id_key;

ALTER TABLE IF EXISTS public.legacy_orders ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.legacy_ride_feedbacks ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.legacy_bot_events ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.legacy_order_status_logs ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.legacy_order_driver_assignments ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.legacy_orders ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS public.legacy_ride_feedbacks ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS public.legacy_bot_events ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS public.legacy_order_status_logs ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS public.legacy_order_driver_assignments ALTER COLUMN old_id TYPE text USING old_id::text;

ALTER TABLE IF EXISTS legacy_archive.legacy_orders DROP CONSTRAINT IF EXISTS legacy_orders_old_id_key;
ALTER TABLE IF EXISTS legacy_archive.legacy_ride_feedbacks DROP CONSTRAINT IF EXISTS legacy_ride_feedbacks_old_id_key;
ALTER TABLE IF EXISTS legacy_archive.legacy_bot_events DROP CONSTRAINT IF EXISTS legacy_bot_events_old_id_key;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_status_logs DROP CONSTRAINT IF EXISTS legacy_order_status_logs_old_id_key;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_driver_assignments DROP CONSTRAINT IF EXISTS legacy_order_driver_assignments_old_id_key;

ALTER TABLE IF EXISTS legacy_archive.legacy_orders ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS legacy_archive.legacy_ride_feedbacks ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS legacy_archive.legacy_bot_events ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_status_logs ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_driver_assignments ALTER COLUMN old_id DROP NOT NULL;
ALTER TABLE IF EXISTS legacy_archive.legacy_orders ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS legacy_archive.legacy_ride_feedbacks ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS legacy_archive.legacy_bot_events ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_status_logs ALTER COLUMN old_id TYPE text USING old_id::text;
ALTER TABLE IF EXISTS legacy_archive.legacy_order_driver_assignments ALTER COLUMN old_id TYPE text USING old_id::text;

-- ============================================================================
-- UNIFIED VIEWS (read-only, combines new + legacy data)
-- ============================================================================

-- View: app_orders (combines current orders + legacy_orders)
DROP VIEW IF EXISTS public.app_orders CASCADE;
CREATE VIEW public.app_orders AS
  SELECT 
    id, NULL::text as old_id, address, amount, billing_started_at, bot_id, 
    bot_token, cancelled_at, car_brand, car_color, car_model, car_number, 
    channel, completed_at, created_at, current_status, dest_latitude, 
    dest_longitude, distance_m, driver_assigned_at, driver_id, driver_name, 
    driver_reassignment_count, dropoff_address, final_status, gps_accuracy, 
    latitude, longitude, note, phone, polling_stopped_at, region_id, 
    scat_uuid, service_id, telegram_user_id, updated_at, user_id, 
    'new'::text as source, now() as migrated_at
  FROM public.orders
  
  UNION ALL
  
  SELECT 
    id, old_id, address, amount, billing_started_at, bot_id, 
    bot_token, cancelled_at, car_brand, car_color, car_model, car_number, 
    channel, completed_at, created_at, current_status, dest_latitude, 
    dest_longitude, distance_m, driver_assigned_at, driver_id, driver_name, 
    driver_reassignment_count, dropoff_address, final_status, gps_accuracy, 
    latitude, longitude, note, phone, polling_stopped_at, region_id, 
    scat_uuid, service_id, telegram_user_id, updated_at, user_id, 
    source, migrated_at
  FROM legacy_archive.legacy_orders;

-- View: app_ride_feedbacks
DROP VIEW IF EXISTS public.app_ride_feedbacks CASCADE;
CREATE VIEW public.app_ride_feedbacks AS
  SELECT 
    id, NULL::text as old_id, car_number, comment, created_at, driver_id, 
    driver_name, order_id, rating, telegram_user_id, title, type, user_id, 
    'new'::text as source, now() as migrated_at
  FROM public.ride_feedbacks
  
  UNION ALL
  
  SELECT 
    id, old_id, car_number, comment, created_at, driver_id, 
    driver_name, order_id, rating, telegram_user_id, title, type, user_id, 
    source, migrated_at
  FROM legacy_archive.legacy_ride_feedbacks;

-- View: app_bot_events
DROP VIEW IF EXISTS public.app_bot_events CASCADE;
CREATE VIEW public.app_bot_events AS
  SELECT 
    id, NULL::text as old_id, created_at, event_type::text, metadata, 
    order_id, scat_uuid, telegram_user_id, 'new'::text as source, now() as migrated_at
  FROM public.bot_events
  
  UNION ALL
  
  SELECT 
    id, old_id, created_at, event_type, metadata, 
    order_id, scat_uuid, telegram_user_id, source, migrated_at
  FROM legacy_archive.legacy_bot_events;

-- View: app_order_status_logs
DROP VIEW IF EXISTS public.app_order_status_logs CASCADE;
CREATE VIEW public.app_order_status_logs AS
  SELECT 
    id, NULL::text as old_id, amount, created_at, driver_id, order_id, 
    raw_response, remaining_time, scat_uuid, status_code, status_message, 
    'new'::text as source, now() as migrated_at
  FROM public.order_status_logs
  
  UNION ALL
  
  SELECT 
    id, old_id, amount, created_at, driver_id, order_id, 
    raw_response, remaining_time, scat_uuid, status_code, status_message, 
    source, migrated_at
  FROM legacy_archive.legacy_order_status_logs;

-- View: app_order_driver_assignments
DROP VIEW IF EXISTS public.app_order_driver_assignments CASCADE;
CREATE VIEW public.app_order_driver_assignments AS
  SELECT 
    id, NULL::text as old_id, assigned_at, car_brand, car_color, car_model, 
    car_number, driver_id, driver_name, order_id, remaining_time, scat_uuid, 
    'new'::text as source, now() as migrated_at
  FROM public.order_driver_assignments
  
  UNION ALL
  
  SELECT 
    id, old_id, assigned_at, car_brand, car_color, car_model, 
    car_number, driver_id, driver_name, order_id, remaining_time, scat_uuid, 
    source, migrated_at
  FROM legacy_archive.legacy_order_driver_assignments;

-- ============================================================================
-- DERIVED VIEWS: driver_ratings and orders_with_reassignments
-- ============================================================================

-- View: legacy_driver_ratings (from legacy_ride_feedbacks)
DROP VIEW IF EXISTS public.legacy_driver_ratings CASCADE;
CREATE VIEW public.legacy_driver_ratings AS
  SELECT 
    driver_id,
    driver_name,
    COUNT(*) AS total_feedbacks,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating,
    'legacy'::text as source
  FROM legacy_archive.legacy_ride_feedbacks
  WHERE driver_id IS NOT NULL
  GROUP BY driver_id, driver_name
  ORDER BY ROUND(AVG(rating)::numeric, 2) DESC;

-- View: app_driver_ratings (combines new + legacy driver ratings)
DROP VIEW IF EXISTS public.app_driver_ratings CASCADE;
CREATE VIEW public.app_driver_ratings AS
  SELECT 
    driver_id,
    driver_name,
    total_feedbacks,
    avg_rating,
    'new'::text as source
  FROM (
    SELECT 
      driver_id,
      driver_name,
      COUNT(*) AS total_feedbacks,
      ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM public.ride_feedbacks
    WHERE driver_id IS NOT NULL
    GROUP BY driver_id, driver_name
  ) new_ratings
  
  UNION ALL
  
  SELECT 
    driver_id,
    driver_name,
    total_feedbacks,
    avg_rating,
    source
  FROM public.legacy_driver_ratings;

-- View: legacy_orders_with_reassignments
DROP VIEW IF EXISTS public.legacy_orders_with_reassignments CASCADE;
CREATE VIEW public.legacy_orders_with_reassignments AS
  SELECT 
    id,
    old_id,
    scat_uuid,
    phone,
    driver_reassignment_count,
    created_at,
    final_status,
    source
  FROM legacy_archive.legacy_orders
  WHERE driver_reassignment_count > 0
  ORDER BY created_at DESC;

-- View: app_orders_with_reassignments (combines new + legacy)
DROP VIEW IF EXISTS public.app_orders_with_reassignments CASCADE;
CREATE VIEW public.app_orders_with_reassignments AS
  SELECT 
    id,
    NULL::text as old_id,
    scat_uuid,
    phone,
    driver_reassignment_count,
    created_at,
    final_status,
    'new'::text as source
  FROM public.orders
  WHERE driver_reassignment_count > 0
  
  UNION ALL
  
  SELECT 
    id,
    old_id,
    scat_uuid,
    phone,
    driver_reassignment_count,
    created_at,
    final_status,
    source
  FROM public.legacy_orders_with_reassignments;

-- Read access for dashboard/browser consumers
GRANT SELECT ON TABLE public.app_orders TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_ride_feedbacks TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_bot_events TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_order_status_logs TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_order_driver_assignments TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_driver_ratings TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_orders_with_reassignments TO anon, authenticated, service_role;

-- Required because app_* views read from legacy_archive.* tables
GRANT USAGE ON SCHEMA legacy_archive TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA legacy_archive TO anon, authenticated, service_role;
