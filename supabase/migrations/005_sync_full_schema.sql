-- ============================================================================
-- Migration 005: Sync full schema to new project
-- Adds all tables, columns, views, functions needed by the dashboard
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE guards everywhere)
-- ============================================================================

-- ── 0. Enums ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE TYPE public.bot_event_type AS ENUM (
    'bot_start', 'phone_registered', 'location_help_requested',
    'location_received', 'location_blocked_gps', 'location_warned_gps',
    'order_precost_called', 'order_created', 'order_create_failed',
    'driver_assigned', 'order_status_changed', 'order_unknown_status',
    'order_completed', 'order_cancelled', 'polling_timeout',
    'polling_error', 'driver_reassigned', 'feedback_submitted',
    'badge_upgraded', 'leaderboard_published'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. Helper functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Alias used in migration 002
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 2. bot_users ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bot_users (
  telegram_id        bigint  NOT NULL,
  username           text,
  first_name         text,
  last_name          text,
  phone              text,
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL,
  total_rides        integer DEFAULT 0 NOT NULL,
  total_amount       numeric(12,2) DEFAULT 0 NOT NULL,
  total_ride_minutes integer DEFAULT 0 NOT NULL,
  badge              text DEFAULT 'newbie' NOT NULL,
  badge_updated_at   timestamptz,
  CONSTRAINT bot_users_pkey PRIMARY KEY (telegram_id)
);

CREATE OR REPLACE TRIGGER set_updated_at_bot_users
  BEFORE UPDATE ON public.bot_users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;

-- ── 3. device_tokens ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid NOT NULL,
  token      text NOT NULL,
  platform   text DEFAULT 'android' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT device_tokens_token_key UNIQUE (token),
  CONSTRAINT device_tokens_platform_check CHECK (platform = ANY (ARRAY['android', 'ios']))
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- ── 4. ride_feedbacks ────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.ride_feedbacks_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.ride_feedbacks (
  id               bigint DEFAULT nextval('public.ride_feedbacks_id_seq') NOT NULL,
  order_id         uuid,
  telegram_user_id bigint,
  driver_id        text,
  driver_name      text,
  car_number       text,
  rating           smallint NOT NULL,
  comment          text,
  created_at       timestamptz DEFAULT now() NOT NULL,
  type             text DEFAULT 'ride' NOT NULL,
  title            text,
  user_id          uuid,
  CONSTRAINT ride_feedbacks_pkey PRIMARY KEY (id),
  CONSTRAINT ride_feedbacks_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_rf_driver_id ON public.ride_feedbacks(driver_id);
CREATE INDEX IF NOT EXISTS idx_rf_order_id  ON public.ride_feedbacks(order_id);
CREATE INDEX IF NOT EXISTS idx_rf_rating    ON public.ride_feedbacks(rating);
CREATE INDEX IF NOT EXISTS ride_feedbacks_type_idx    ON public.ride_feedbacks(type);
CREATE INDEX IF NOT EXISTS ride_feedbacks_user_id_idx ON public.ride_feedbacks(user_id);
ALTER TABLE public.ride_feedbacks ENABLE ROW LEVEL SECURITY;

-- ── 5. otp_codes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  phone           text NOT NULL,
  otp_hash        text NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  failed_attempts integer DEFAULT 0 NOT NULL,
  CONSTRAINT otp_codes_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON public.otp_codes(phone, expires_at);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- ── 6. scat_rates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scat_rates (
  id               integer NOT NULL,
  name             text NOT NULL,
  km_cost          numeric DEFAULT 0 NOT NULL,
  km_start         integer DEFAULT 0 NOT NULL,
  stand_cost       numeric DEFAULT 500 NOT NULL,
  free_stand_time  integer DEFAULT 20 NOT NULL,
  free_wait_time   integer DEFAULT 2 NOT NULL,
  start_hour       integer,
  end_hour         integer,
  city_id          integer DEFAULT 1 NOT NULL,
  minimum_fare     numeric DEFAULT 0 NOT NULL,
  pick_up_flagfall numeric DEFAULT 0 NOT NULL,
  is_active        boolean DEFAULT true NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  zone_id          text,
  ride_type        text,
  start_price      numeric DEFAULT 0 NOT NULL,
  CONSTRAINT scat_rates_pkey PRIMARY KEY (id)
);

ALTER TABLE public.scat_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read scat_rates" ON public.scat_rates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 7. Add missing columns to orders ─────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address          text,
  ADD COLUMN IF NOT EXISTS region_id        uuid,
  ADD COLUMN IF NOT EXISTS service_id       uuid,
  ADD COLUMN IF NOT EXISTS bot_id           text,
  ADD COLUMN IF NOT EXISTS bot_token        text,
  ADD COLUMN IF NOT EXISTS dropoff_address  text,
  ADD COLUMN IF NOT EXISTS note             text;

-- ── 8. Add missing columns to tax_users ──────────────────────────────────────
ALTER TABLE public.tax_users
  ADD COLUMN IF NOT EXISTS role          text DEFAULT 'passenger',
  ADD COLUMN IF NOT EXISTS is_deleted    boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS region_id     uuid,
  ADD COLUMN IF NOT EXISTS service_class text,
  ADD COLUMN IF NOT EXISTS full_name     text,
  ADD COLUMN IF NOT EXISTS is_active     boolean DEFAULT true NOT NULL;

-- ── 9. regions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regions (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  name       text NOT NULL,
  name_uz    text,
  name_ru    text,
  slug       text NOT NULL,
  currency   text DEFAULT 'UZS' NOT NULL,
  timezone   text DEFAULT 'Asia/Tashkent' NOT NULL,
  center_lat double precision NOT NULL,
  center_lon double precision NOT NULL,
  is_active  boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT regions_pkey PRIMARY KEY (id),
  CONSTRAINT regions_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_regions_is_active ON public.regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_sort_order ON public.regions(sort_order);

CREATE OR REPLACE TRIGGER regions_set_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.regions TO anon, authenticated, service_role;

-- ── 10. services (region-specific) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id                       uuid DEFAULT gen_random_uuid() NOT NULL,
  region_id                uuid NOT NULL,
  name                     text NOT NULL,
  name_uz                  text,
  name_ru                  text,
  service_class            text NOT NULL,
  icon_key                 text,
  icon_url                 text,
  max_passengers           integer DEFAULT 4 NOT NULL,
  estimated_pickup_minutes integer,
  is_active                boolean DEFAULT true NOT NULL,
  sort_order               integer DEFAULT 0 NOT NULL,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_service_class_check CHECK (
    service_class = ANY (ARRAY[
      'economy', 'standard', 'comfort',
      'business', 'minivan', 'cargo', 'intercity'
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_services_region_id ON public.services(region_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

CREATE OR REPLACE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;

-- ── 11. service_types (global catalog) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_types (
  id                       uuid DEFAULT gen_random_uuid() NOT NULL,
  name                     text NOT NULL,
  name_uz                  text,
  name_ru                  text,
  service_class            text NOT NULL,
  description              text,
  description_uz           text,
  description_ru           text,
  icon_key                 text,
  icon_url                 text,
  max_passengers           integer DEFAULT 4 NOT NULL,
  features                 text[],
  estimated_pickup_minutes integer,
  is_active                boolean DEFAULT true NOT NULL,
  sort_order               integer DEFAULT 0 NOT NULL,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT service_types_pkey PRIMARY KEY (id),
  CONSTRAINT service_types_service_class_check CHECK (
    service_class = ANY (ARRAY[
      'economy', 'standard', 'comfort',
      'business', 'minivan', 'cargo', 'intercity'
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_service_types_is_active   ON public.service_types(is_active);
CREATE INDEX IF NOT EXISTS idx_service_types_sort_order  ON public.service_types(sort_order);

CREATE OR REPLACE TRIGGER service_types_set_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read service_types" ON public.service_types FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.service_types TO anon, authenticated, service_role;

-- ── 12. tariffs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tariffs (
  id                  uuid DEFAULT gen_random_uuid() NOT NULL,
  name                text NOT NULL,
  currency            text DEFAULT 'UZS' NOT NULL,
  base_fare           numeric DEFAULT 0 NOT NULL,
  per_km              numeric DEFAULT 0 NOT NULL,
  per_min_driving     numeric DEFAULT 0 NOT NULL,
  per_min_waiting     numeric DEFAULT 0 NOT NULL,
  minimum_fare        numeric DEFAULT 0 NOT NULL,
  cancellation_fee    numeric DEFAULT 0 NOT NULL,
  surge_multiplier    numeric DEFAULT 1.0 NOT NULL,
  surge_preset        text DEFAULT 'none' NOT NULL,
  night_surcharge     numeric DEFAULT 0 NOT NULL,
  night_start_hour    integer DEFAULT 22 NOT NULL,
  night_end_hour      integer DEFAULT 6 NOT NULL,
  valid_from          timestamptz,
  valid_to            timestamptz,
  is_active           boolean DEFAULT true NOT NULL,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tariffs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tariffs_is_active ON public.tariffs(is_active);

CREATE OR REPLACE TRIGGER tariffs_set_updated_at
  BEFORE UPDATE ON public.tariffs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read tariffs" ON public.tariffs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.tariffs TO anon, authenticated, service_role;

-- ── 13. region_service_tariffs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.region_service_tariffs (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  region_id       uuid NOT NULL,
  service_type_id uuid NOT NULL,
  tariff_id       uuid,
  scat_rate_id    integer,
  is_active       boolean DEFAULT true NOT NULL,
  sort_order      integer DEFAULT 0 NOT NULL,
  display_fare    numeric DEFAULT 0 NOT NULL,
  start_fare      numeric DEFAULT 0 NOT NULL,
  minimum_fare    numeric DEFAULT 0 NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT region_service_tariffs_pkey   PRIMARY KEY (id),
  CONSTRAINT region_service_tariffs_unique UNIQUE (region_id, service_type_id),
  CONSTRAINT rst_region_fk       FOREIGN KEY (region_id)       REFERENCES public.regions(id)        ON DELETE CASCADE,
  CONSTRAINT rst_service_type_fk FOREIGN KEY (service_type_id) REFERENCES public.service_types(id)  ON DELETE CASCADE,
  CONSTRAINT rst_tariff_fk       FOREIGN KEY (tariff_id)       REFERENCES public.tariffs(id)        ON DELETE SET NULL,
  CONSTRAINT rst_scat_rate_fk    FOREIGN KEY (scat_rate_id)    REFERENCES public.scat_rates(id)     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rst_region_id       ON public.region_service_tariffs(region_id);
CREATE INDEX IF NOT EXISTS idx_rst_service_type_id ON public.region_service_tariffs(service_type_id);

CREATE OR REPLACE TRIGGER rst_set_updated_at
  BEFORE UPDATE ON public.region_service_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.region_service_tariffs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read region_service_tariffs" ON public.region_service_tariffs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.region_service_tariffs TO anon, authenticated, service_role;

-- ── 14. tariff_tiers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tariff_tiers (
  id           uuid DEFAULT gen_random_uuid() NOT NULL,
  rst_id       uuid NOT NULL,
  from_km      numeric NOT NULL,
  to_km        numeric,
  pricing_type text DEFAULT 'per_km' NOT NULL,
  rate         numeric NOT NULL,
  sort_order   integer DEFAULT 0 NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tariff_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT tariff_tiers_rst_fk FOREIGN KEY (rst_id) REFERENCES public.region_service_tariffs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tariff_tiers_rst_id ON public.tariff_tiers(rst_id);

CREATE OR REPLACE TRIGGER tariff_tiers_set_updated_at
  BEFORE UPDATE ON public.tariff_tiers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.tariff_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read tariff_tiers" ON public.tariff_tiers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.tariff_tiers TO anon, authenticated, service_role;

-- ── 15. default_addresses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.default_addresses (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  region_id  uuid NOT NULL,
  name       text NOT NULL,
  name_uz    text,
  name_ru    text,
  short_name text,
  address    text,
  latitude   double precision NOT NULL,
  longitude  double precision NOT NULL,
  category   text DEFAULT 'other' NOT NULL,
  icon_key   text,
  is_active  boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT default_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT default_addresses_region_fk FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_default_addresses_region_id ON public.default_addresses(region_id);
CREATE INDEX IF NOT EXISTS idx_default_addresses_is_active ON public.default_addresses(is_active);

CREATE OR REPLACE TRIGGER default_addresses_set_updated_at
  BEFORE UPDATE ON public.default_addresses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.default_addresses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read default_addresses" ON public.default_addresses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.default_addresses TO anon, authenticated, service_role;

-- ── 16. driver_online_status ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_online_status (
  driver_id  uuid NOT NULL,
  is_online  boolean DEFAULT false NOT NULL,
  lat        double precision,
  lon        double precision,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT driver_online_status_pkey PRIMARY KEY (driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_online_status_is_online ON public.driver_online_status(is_online);

ALTER TABLE public.driver_online_status ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Service role full access driver_online_status"
    ON public.driver_online_status USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.driver_online_status TO anon, authenticated, service_role;

-- ── 17. wallets ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid NOT NULL,
  balance    numeric(12,2) DEFAULT 0 NOT NULL,
  reserved   numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT wallets_pkey    PRIMARY KEY (id),
  CONSTRAINT wallets_user_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

CREATE OR REPLACE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.wallets TO anon, authenticated, service_role;

-- ── 18. wallet_transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id       uuid NOT NULL,
  type          text NOT NULL,
  amount        numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  note          text,
  order_id      uuid,
  created_at    timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT wallet_transactions_pkey    PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_type_check CHECK (
    type = ANY (ARRAY['topup', 'debit', 'refund', 'bonus', 'adjustment'])
  )
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id    ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order_id   ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.wallet_transactions TO anon, authenticated, service_role;

-- ── 19. driver_applications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id               uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id          uuid,
  status           text DEFAULT 'pending' NOT NULL,
  first_name       text,
  last_name        text,
  middle_name      text,
  phone            text,
  city             text,
  service          text,
  profile          text,
  call_sign        text,
  connection_type  text,
  car_brand_client text,
  car_color_client text,
  car_reg_number   text,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT driver_applications_pkey PRIMARY KEY (id),
  CONSTRAINT driver_applications_status_check CHECK (
    status = ANY (ARRAY['pending', 'approved', 'rejected'])
  )
);

CREATE INDEX IF NOT EXISTS idx_driver_applications_user_id   ON public.driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status    ON public.driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_applications_created_at ON public.driver_applications(created_at DESC);

CREATE OR REPLACE TRIGGER driver_applications_set_updated_at
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.driver_applications TO anon, authenticated, service_role;

-- ── 20. driver_offers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_offers (
  id               uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id         uuid NOT NULL,
  driver_id        text,
  status           text DEFAULT 'pending' NOT NULL,
  attempt_number   integer DEFAULT 1 NOT NULL,
  distance_m       real,
  estimated_fare   numeric(10,2),
  pickup_address   text,
  dropoff_address  text,
  offered_at       timestamptz DEFAULT now() NOT NULL,
  expires_at       timestamptz,
  responded_at     timestamptz,
  CONSTRAINT driver_offers_pkey PRIMARY KEY (id),
  CONSTRAINT driver_offers_status_check CHECK (
    status = ANY (ARRAY['pending', 'accepted', 'declined', 'expired', 'cancelled'])
  )
);

CREATE INDEX IF NOT EXISTS idx_driver_offers_order_id  ON public.driver_offers(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_offers_driver_id ON public.driver_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_offers_status    ON public.driver_offers(status);

ALTER TABLE public.driver_offers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.driver_offers TO anon, authenticated, service_role;

-- ── 21. deletion_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid,
  phone      text,
  reason     text,
  status     text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT deletion_requests_pkey PRIMARY KEY (id)
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.deletion_requests TO anon, authenticated, service_role;

-- ── 22. driver_ratings view ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.driver_ratings
  WITH (security_invoker = on) AS
  SELECT
    driver_id,
    driver_name,
    count(*) AS total_feedbacks,
    round(avg(rating), 2) AS avg_rating
  FROM public.ride_feedbacks
  WHERE driver_id IS NOT NULL
  GROUP BY driver_id, driver_name
  ORDER BY round(avg(rating), 2) DESC;

-- ── 23. Legacy archive schema and tables ─────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS legacy_archive;

CREATE TABLE IF NOT EXISTS legacy_archive.legacy_orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_id                    text,
  address                   text,
  amount                    numeric,
  billing_started_at        timestamptz,
  bot_id                    text,
  bot_token                 text,
  cancelled_at              timestamptz,
  car_brand                 text,
  car_color                 text,
  car_model                 text,
  car_number                text,
  channel                   text DEFAULT 'legacy',
  completed_at              timestamptz,
  created_at                timestamptz DEFAULT now(),
  current_status            smallint,
  dest_latitude             double precision,
  dest_longitude            double precision,
  distance_m                real,
  driver_assigned_at        timestamptz,
  driver_id                 text,
  driver_name               text,
  driver_reassignment_count integer DEFAULT 0,
  dropoff_address           text,
  final_status              smallint,
  gps_accuracy              real,
  latitude                  double precision NOT NULL,
  longitude                 double precision NOT NULL,
  note                      text,
  phone                     text,
  polling_stopped_at        timestamptz,
  region_id                 uuid,
  scat_uuid                 text,
  service_id                uuid,
  telegram_user_id          bigint,
  updated_at                timestamptz DEFAULT now(),
  user_id                   uuid,
  source                    text DEFAULT 'legacy',
  migrated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_orders_created_at  ON legacy_archive.legacy_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_final_status ON legacy_archive.legacy_orders(final_status);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_old_id      ON legacy_archive.legacy_orders(old_id);

CREATE TABLE IF NOT EXISTS legacy_archive.legacy_ride_feedbacks (
  id               bigint PRIMARY KEY,
  old_id           text,
  car_number       text,
  comment          text,
  created_at       timestamptz DEFAULT now(),
  driver_id        text,
  driver_name      text,
  order_id         uuid,
  rating           smallint NOT NULL,
  telegram_user_id bigint,
  title            text,
  type             text,
  user_id          uuid,
  source           text DEFAULT 'legacy',
  migrated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_ride_feedbacks_created_at ON legacy_archive.legacy_ride_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_ride_feedbacks_order_id   ON legacy_archive.legacy_ride_feedbacks(order_id);

CREATE TABLE IF NOT EXISTS legacy_archive.legacy_bot_events (
  id               bigint PRIMARY KEY,
  old_id           text,
  created_at       timestamptz DEFAULT now(),
  event_type       text NOT NULL,
  metadata         jsonb,
  order_id         uuid,
  scat_uuid        text,
  telegram_user_id bigint,
  source           text DEFAULT 'legacy',
  migrated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_created_at ON legacy_archive.legacy_bot_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_event_type ON legacy_archive.legacy_bot_events(event_type);
CREATE INDEX IF NOT EXISTS idx_legacy_bot_events_order_id   ON legacy_archive.legacy_bot_events(order_id);

CREATE TABLE IF NOT EXISTS legacy_archive.legacy_order_status_logs (
  id             bigint PRIMARY KEY,
  old_id         text,
  amount         numeric,
  created_at     timestamptz DEFAULT now(),
  driver_id      text,
  order_id       uuid NOT NULL,
  raw_response   jsonb,
  remaining_time smallint,
  scat_uuid      text NOT NULL,
  status_code    smallint NOT NULL,
  status_message text,
  source         text DEFAULT 'legacy',
  migrated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_order_status_logs_created_at ON legacy_archive.legacy_order_status_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_order_status_logs_order_id   ON legacy_archive.legacy_order_status_logs(order_id);

CREATE TABLE IF NOT EXISTS legacy_archive.legacy_order_driver_assignments (
  id             bigint PRIMARY KEY,
  old_id         text,
  assigned_at    timestamptz DEFAULT now(),
  car_brand      text,
  car_color      text,
  car_model      text,
  car_number     text,
  driver_id      text,
  driver_name    text,
  order_id       uuid NOT NULL,
  remaining_time integer,
  scat_uuid      text,
  source         text DEFAULT 'legacy',
  migrated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_order_driver_assignments_order_id ON legacy_archive.legacy_order_driver_assignments(order_id);

-- Grant schema access
GRANT USAGE ON SCHEMA legacy_archive TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA legacy_archive TO anon, authenticated, service_role;

-- ── 24. Unified app_* views ───────────────────────────────────────────────────
DROP VIEW IF EXISTS public.app_orders CASCADE;
CREATE VIEW public.app_orders AS
  SELECT
    id, NULL::text AS old_id, address, amount, billing_started_at, bot_id,
    bot_token, cancelled_at, car_brand, car_color, car_model, car_number,
    channel, completed_at, created_at, current_status, dest_latitude,
    dest_longitude, distance_m, driver_assigned_at, driver_id, driver_name,
    driver_reassignment_count, dropoff_address, final_status, gps_accuracy,
    latitude, longitude, note, phone, polling_stopped_at, region_id,
    scat_uuid, service_id, telegram_user_id, updated_at, user_id,
    'new'::text AS source, now() AS migrated_at
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

DROP VIEW IF EXISTS public.app_ride_feedbacks CASCADE;
CREATE VIEW public.app_ride_feedbacks AS
  SELECT
    id, NULL::text AS old_id, car_number, comment, created_at, driver_id,
    driver_name, order_id, rating, telegram_user_id, title, type, user_id,
    'new'::text AS source, now() AS migrated_at
  FROM public.ride_feedbacks
  UNION ALL
  SELECT
    id, old_id, car_number, comment, created_at, driver_id,
    driver_name, order_id, rating, telegram_user_id, title, type, user_id,
    source, migrated_at
  FROM legacy_archive.legacy_ride_feedbacks;

DROP VIEW IF EXISTS public.app_bot_events CASCADE;
CREATE VIEW public.app_bot_events AS
  SELECT
    id, NULL::text AS old_id, created_at, event_type::text, metadata,
    order_id, scat_uuid, telegram_user_id, 'new'::text AS source, now() AS migrated_at
  FROM public.bot_events
  UNION ALL
  SELECT
    id, old_id, created_at, event_type, metadata,
    order_id, scat_uuid, telegram_user_id, source, migrated_at
  FROM legacy_archive.legacy_bot_events;

DROP VIEW IF EXISTS public.app_order_status_logs CASCADE;
CREATE VIEW public.app_order_status_logs AS
  SELECT
    id, NULL::text AS old_id, amount, created_at, driver_id, order_id,
    raw_response, remaining_time, scat_uuid, status_code, status_message,
    'new'::text AS source, now() AS migrated_at
  FROM public.order_status_logs
  UNION ALL
  SELECT
    id, old_id, amount, created_at, driver_id, order_id,
    raw_response, remaining_time, scat_uuid, status_code, status_message,
    source, migrated_at
  FROM legacy_archive.legacy_order_status_logs;

DROP VIEW IF EXISTS public.app_order_driver_assignments CASCADE;
CREATE VIEW public.app_order_driver_assignments AS
  SELECT
    id, NULL::text AS old_id, assigned_at, car_brand, car_color, car_model,
    car_number, driver_id, driver_name, order_id, remaining_time, scat_uuid,
    'new'::text AS source, now() AS migrated_at
  FROM public.order_driver_assignments
  UNION ALL
  SELECT
    id, old_id, assigned_at, car_brand, car_color, car_model,
    car_number, driver_id, driver_name, order_id, remaining_time, scat_uuid,
    source, migrated_at
  FROM legacy_archive.legacy_order_driver_assignments;

DROP VIEW IF EXISTS public.legacy_driver_ratings CASCADE;
CREATE VIEW public.legacy_driver_ratings AS
  SELECT
    driver_id, driver_name,
    COUNT(*) AS total_feedbacks,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating,
    'legacy'::text AS source
  FROM legacy_archive.legacy_ride_feedbacks
  WHERE driver_id IS NOT NULL
  GROUP BY driver_id, driver_name
  ORDER BY ROUND(AVG(rating)::numeric, 2) DESC;

DROP VIEW IF EXISTS public.app_driver_ratings CASCADE;
CREATE VIEW public.app_driver_ratings AS
  SELECT driver_id, driver_name, total_feedbacks, avg_rating, 'new'::text AS source
  FROM (
    SELECT driver_id, driver_name,
      COUNT(*) AS total_feedbacks,
      ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM public.ride_feedbacks
    WHERE driver_id IS NOT NULL
    GROUP BY driver_id, driver_name
  ) new_ratings
  UNION ALL
  SELECT driver_id, driver_name, total_feedbacks, avg_rating, source
  FROM public.legacy_driver_ratings;

DROP VIEW IF EXISTS public.legacy_orders_with_reassignments CASCADE;
CREATE VIEW public.legacy_orders_with_reassignments AS
  SELECT id, old_id, scat_uuid, phone, driver_reassignment_count, created_at, final_status, source
  FROM legacy_archive.legacy_orders
  WHERE driver_reassignment_count > 0
  ORDER BY created_at DESC;

DROP VIEW IF EXISTS public.app_orders_with_reassignments CASCADE;
CREATE VIEW public.app_orders_with_reassignments AS
  SELECT id, NULL::text AS old_id, scat_uuid, phone, driver_reassignment_count, created_at, final_status, 'new'::text AS source
  FROM public.orders
  WHERE driver_reassignment_count > 0
  UNION ALL
  SELECT id, old_id, scat_uuid, phone, driver_reassignment_count, created_at, final_status, source
  FROM public.legacy_orders_with_reassignments;

-- Grant view access
GRANT SELECT ON TABLE public.app_orders                   TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_ride_feedbacks           TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_bot_events               TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_order_status_logs        TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_order_driver_assignments TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_driver_ratings           TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.app_orders_with_reassignments TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.legacy_driver_ratings         TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.legacy_orders_with_reassignments TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.driver_ratings                TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.orders_with_reassignments     TO anon, authenticated, service_role;

-- ── 25. find_nearest_online_driver RPC (used by dispatch/drivers route) ───────
CREATE OR REPLACE FUNCTION public.find_nearest_online_driver(
  p_lat      double precision,
  p_lon      double precision,
  p_radius_m double precision DEFAULT 10000,
  p_region_id uuid DEFAULT NULL
)
RETURNS TABLE(driver_id uuid, distance_m double precision)
LANGUAGE sql STABLE AS $$
  SELECT
    dos.driver_id,
    (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(dos.lat)) *
        cos(radians(dos.lon) - radians(p_lon)) +
        sin(radians(p_lat)) * sin(radians(dos.lat))
      )
    ) AS distance_m
  FROM public.driver_online_status dos
  JOIN public.tax_users tu ON tu.id = dos.driver_id
  WHERE
    dos.is_online = true
    AND (p_region_id IS NULL OR tu.region_id = p_region_id)
    AND (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(dos.lat)) *
        cos(radians(dos.lon) - radians(p_lon)) +
        sin(radians(p_lat)) * sin(radians(dos.lat))
      )
    ) <= p_radius_m
  ORDER BY distance_m ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearest_online_driver TO anon, authenticated, service_role;

-- ── 26. FK constraints on existing tables (add if not already present) ────────
DO $$ BEGIN
  ALTER TABLE public.bot_events
    ADD CONSTRAINT bot_events_telegram_user_id_fkey
    FOREIGN KEY (telegram_user_id) REFERENCES public.bot_users(telegram_id);
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_telegram_user_id_fkey
    FOREIGN KEY (telegram_user_id) REFERENCES public.bot_users(telegram_id);
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ride_feedbacks
    ADD CONSTRAINT ride_feedbacks_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ride_feedbacks
    ADD CONSTRAINT ride_feedbacks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.tax_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.tax_users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;
