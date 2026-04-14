-- ============================================================
-- Migration 002: Region-based architecture
-- Creates:
--   service_types  — global service catalog (Economy, Comfort, …)
--   region_service_tariffs — mapping: region ↔ service_type ↔ tariff ↔ scat_rate
-- Modifies:
--   tariffs — removes region_id and service_id (now standalone pricing rules)
-- ============================================================

-- ── Step 1: Global service_types catalog ────────────────────
CREATE TABLE IF NOT EXISTS public.service_types (
  id                       uuid        DEFAULT gen_random_uuid() NOT NULL,
  name                     text        NOT NULL,
  name_uz                  text,
  name_ru                  text,
  service_class            text        NOT NULL,
  description              text,
  description_uz           text,
  description_ru           text,
  icon_key                 text,
  icon_url                 text,
  max_passengers           integer     DEFAULT 4   NOT NULL,
  features                 text[],
  estimated_pickup_minutes integer,
  is_active                boolean     DEFAULT true NOT NULL,
  sort_order               integer     DEFAULT 0    NOT NULL,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT service_types_pkey            PRIMARY KEY (id),
  CONSTRAINT service_types_service_class_check CHECK (
    service_class = ANY (ARRAY[
      'economy'::text, 'standard'::text, 'comfort'::text,
      'business'::text, 'minivan'::text, 'cargo'::text, 'intercity'::text
    ])
  )
);

-- ── Step 2: Migrate existing services → service_types ───────
-- Deduplicates by service_class, keeps the earliest per class.
INSERT INTO public.service_types (
  name, name_uz, name_ru, service_class,
  icon_key, icon_url, max_passengers,
  estimated_pickup_minutes, is_active, sort_order, created_at
)
SELECT DISTINCT ON (service_class)
  name, name_uz, name_ru, service_class,
  icon_key, icon_url, max_passengers,
  estimated_pickup_minutes, is_active, sort_order, created_at
FROM public.services
ORDER BY service_class, sort_order ASC, created_at ASC
ON CONFLICT DO NOTHING;

-- ── Step 3: region_service_tariffs join table ────────────────
-- Ties a (region, service_type) pair to a tariff and optional scat_rate.
CREATE TABLE IF NOT EXISTS public.region_service_tariffs (
  id              uuid    DEFAULT gen_random_uuid() NOT NULL,
  region_id       uuid    NOT NULL,
  service_type_id uuid    NOT NULL,
  tariff_id       uuid,
  scat_rate_id    integer,
  is_active       boolean DEFAULT true NOT NULL,
  sort_order      integer DEFAULT 0    NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT region_service_tariffs_pkey   PRIMARY KEY (id),
  CONSTRAINT region_service_tariffs_unique UNIQUE (region_id, service_type_id),
  CONSTRAINT rst_region_fk       FOREIGN KEY (region_id)       REFERENCES public.regions(id)        ON DELETE CASCADE,
  CONSTRAINT rst_service_type_fk FOREIGN KEY (service_type_id) REFERENCES public.service_types(id)  ON DELETE CASCADE,
  CONSTRAINT rst_tariff_fk       FOREIGN KEY (tariff_id)       REFERENCES public.tariffs(id)        ON DELETE SET NULL,
  CONSTRAINT rst_scat_rate_fk    FOREIGN KEY (scat_rate_id)    REFERENCES public.scat_rates(id)     ON DELETE SET NULL
);

-- ── Step 4: Migrate existing data into region_service_tariffs ─
-- Must happen BEFORE we drop tariffs.service_id.
INSERT INTO public.region_service_tariffs (region_id, service_type_id, tariff_id, is_active)
SELECT
  s.region_id,
  st.id  AS service_type_id,
  t.id   AS tariff_id,
  s.is_active
FROM public.services s
JOIN public.service_types st ON st.service_class = s.service_class
LEFT JOIN public.tariffs   t  ON t.service_id     = s.id
ON CONFLICT (region_id, service_type_id) DO NOTHING;

-- ── Step 5: Drop obsolete FK columns from tariffs ────────────
ALTER TABLE public.tariffs DROP COLUMN IF EXISTS region_id;
ALTER TABLE public.tariffs DROP COLUMN IF EXISTS service_id;
ALTER TABLE public.tariffs DROP COLUMN IF EXISTS fare_policy_id;

-- ── Step 6: Drop now-stale indexes ──────────────────────────
DROP INDEX IF EXISTS public.tariffs_region_id_idx;
DROP INDEX IF EXISTS public.tariffs_service_id_idx;

-- ── Step 7: RLS on new tables ────────────────────────────────
ALTER TABLE public.service_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_service_tariffs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read service_types"          ON public.service_types          FOR SELECT USING (true);
CREATE POLICY "Public read region_service_tariffs" ON public.region_service_tariffs FOR SELECT USING (true);

-- ── Step 8: updated_at triggers ─────────────────────────────
CREATE OR REPLACE TRIGGER service_types_set_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER rst_set_updated_at
  BEFORE UPDATE ON public.region_service_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Future: migrate orders.service_id → service_type_id ──────
-- Run manually after verifying no active orders reference old services:
--
--   ALTER TABLE orders ADD COLUMN service_type_id uuid REFERENCES public.service_types(id) ON DELETE SET NULL;
--   UPDATE orders o
--     SET service_type_id = st.id
--     FROM public.services s
--     JOIN public.service_types st ON st.service_class = s.service_class
--     WHERE s.id = o.service_id;
--   ALTER TABLE orders DROP COLUMN service_id;
--   DROP TABLE public.services;
