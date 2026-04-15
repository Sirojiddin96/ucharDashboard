


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."bot_event_type" AS ENUM (
    'bot_start',
    'phone_registered',
    'location_help_requested',
    'location_received',
    'location_blocked_gps',
    'location_warned_gps',
    'order_precost_called',
    'order_created',
    'order_create_failed',
    'driver_assigned',
    'order_status_changed',
    'order_unknown_status',
    'order_completed',
    'order_cancelled',
    'polling_timeout',
    'polling_error',
    'driver_reassigned',
    'feedback_submitted',
    'badge_upgraded',
    'leaderboard_published'
);


ALTER TYPE "public"."bot_event_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_fare"("p_rate_id" integer, "p_distance_m" double precision, "p_duration_s" integer) RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r              public.scat_rates%rowtype;
  v_km           double precision;
  v_running_fare numeric;
  v_wait_mins    integer;
  v_wait_charge  numeric;
  v_total_uzs    numeric;
begin
  select * into r
    from public.scat_rates
   where id = p_rate_id
     and is_active = true;

  if not found then
    -- Fallback: flat minimum if rate is unknown / inactive
    return 0;
  end if;

  v_km           := greatest(p_distance_m, 0) / 1000.0;
  v_running_fare := r.pick_up_flagfall + r.km_cost * v_km;

  -- Enforce minimum_fare floor
  v_running_fare := greatest(v_running_fare, r.minimum_fare);

  -- Waiting charge: minutes beyond free_wait_time, rounded up
  v_wait_mins    := greatest(
    ceil(p_duration_s::double precision / 60.0)::integer - r.free_wait_time,
    0
  );
  v_wait_charge  := v_wait_mins * r.stand_cost;

  v_total_uzs    := v_running_fare + v_wait_charge;

  -- Return tiyin (× 100)
  return (v_total_uzs * 100)::bigint;
end;
$$;


ALTER FUNCTION "public"."calculate_fare"("p_rate_id" integer, "p_distance_m" double precision, "p_duration_s" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision DEFAULT 5000, "p_exclude_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS TABLE("driver_id" "uuid", "distance_m" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT driver_id, distance_m
  FROM (
    SELECT
      dos.driver_id,
      -- Haversine distance in metres
      6371000.0 * acos(
        LEAST(1.0,
          sin(radians(p_lat))  * sin(radians(dos.lat))  +
          cos(radians(p_lat))  * cos(radians(dos.lat))  *
          cos(radians(dos.lon) - radians(p_lon))
        )
      ) AS distance_m
    FROM public.driver_online_status dos
    WHERE
      dos.is_online  = true
      AND dos.lat   IS NOT NULL
      AND dos.lon   IS NOT NULL
      AND dos.driver_id != ALL(COALESCE(p_exclude_ids, '{}'))
      -- pre-filter with a bounding box to avoid full-table Haversine scan
      AND dos.lat BETWEEN p_lat - (p_radius_m / 111320.0)
                      AND p_lat + (p_radius_m / 111320.0)
      AND dos.lon BETWEEN p_lon - (p_radius_m / (111320.0 * cos(radians(p_lat))))
                      AND p_lon + (p_radius_m / (111320.0 * cos(radians(p_lat))))
  ) sub
  WHERE sub.distance_m <= p_radius_m
  ORDER BY sub.distance_m
  LIMIT 1;
$$;


ALTER FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision DEFAULT 5000, "p_exclude_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_region_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("driver_id" "uuid", "distance_m" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT driver_id, distance_m
  FROM (
    SELECT
      dos.driver_id,
      6371000.0 * acos(
        LEAST(1.0,
          sin(radians(p_lat)) * sin(radians(dos.lat)) +
          cos(radians(p_lat)) * cos(radians(dos.lat)) *
          cos(radians(dos.lon) - radians(p_lon))
        )
      ) AS distance_m
    FROM public.driver_online_status dos
    JOIN public.users u ON u.id = dos.driver_id
    WHERE
      dos.is_online = true
      AND dos.lat IS NOT NULL
      AND dos.lon IS NOT NULL
      AND dos.driver_id != ALL(COALESCE(p_exclude_ids, '{}'))
      AND (p_region_id IS NULL OR u.region_id = p_region_id)
      AND dos.lat BETWEEN p_lat - (p_radius_m / 111320.0)
                      AND p_lat + (p_radius_m / 111320.0)
      AND dos.lon BETWEEN p_lon - (p_radius_m / (111320.0 * cos(radians(p_lat))))
                      AND p_lon + (p_radius_m / (111320.0 * cos(radians(p_lat))))
  ) sub
  WHERE sub.distance_m <= p_radius_m
  ORDER BY sub.distance_m
  LIMIT 1;
$$;


ALTER FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[], "p_region_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_auto_create_driver_offer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_attempt_number integer;
  v_offered_at     timestamptz := now();
  v_expires_at     timestamptz := now() + interval '30 seconds';
BEGIN
  -- Only act when driver_id is being set (or changed) to a non-null value.
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If driver_id hasn't changed, do nothing.
  IF OLD.driver_id IS NOT DISTINCT FROM NEW.driver_id THEN
    RETURN NEW;
  END IF;

  -- Determine attempt number (count prior offers for this order).
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO   v_attempt_number
  FROM   public.driver_offers
  WHERE  order_id = NEW.id;

  -- Cancel any still-pending offer for the previous driver (reassignment case).
  IF OLD.driver_id IS NOT NULL THEN
    UPDATE public.driver_offers
    SET    status       = 'cancelled',
           responded_at = now()
    WHERE  order_id  = NEW.id
      AND  driver_id = OLD.driver_id
      AND  status    = 'pending';
  END IF;

  -- Insert a fresh offer for the newly assigned driver.
  INSERT INTO public.driver_offers (
    order_id,
    driver_id,
    pickup_lat,
    pickup_lon,
    pickup_address,
    distance_m,
    status,
    offered_at,
    expires_at,
    attempt_number
  ) VALUES (
    NEW.id,
    NEW.driver_id,
    NEW.latitude,
    NEW.longitude,
    NEW.address,
    NEW.distance_m,
    'pending',
    v_offered_at,
    v_expires_at,
    v_attempt_number
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_auto_create_driver_offer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_phone TEXT;
BEGIN
    -- Normalise to digits-only so the bot format ("998...") and E.164 ("+998...")
    -- are treated as the same phone number in public.users.
    v_phone := regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g');

    -- If auth.users.phone is empty/null there is nothing useful to store yet;
    -- the set-user-name edge function will upsert the correct phone explicitly.
    IF v_phone = '' THEN
        RETURN NEW;
    END IF;

    -- Clear stale auth_user_id from any other row for the same auth UID.
    UPDATE public.users
    SET auth_user_id = NULL
    WHERE auth_user_id = NEW.id
      AND phone != v_phone;

    INSERT INTO public.users (phone, auth_user_id, source)
    VALUES (v_phone, NEW.id, 'app')
    ON CONFLICT (phone) DO UPDATE
        SET auth_user_id = EXCLUDED.auth_user_id,
            source = CASE
                WHEN public.users.source = 'bot' THEN 'both'
                ELSE public.users.source
            END,
            updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- users jadvalini yangilash
    UPDATE users
    SET
        total_rides        = total_rides + 1,
        total_amount       = total_amount + COALESCE(p_amount, 0),
        total_ride_minutes = total_ride_minutes + COALESCE(p_ride_minutes, 0)
    WHERE telegram_id = p_telegram_id;
END;
$$;


ALTER FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_wallet_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_wallet_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_charge"("p_order_id" "uuid", "p_final_amount" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_driver_id uuid;
  v_reserved  bigint;
  v_balance   bigint;
  v_deduct    bigint;
begin
  -- Find the driver via the most recent reserve transaction for this order
  select user_id into v_driver_id
    from public.wallet_transactions
   where order_id = p_order_id
     and type     = 'reserve'
   order by created_at desc
   limit 1;

  if not found then
    raise exception 'no reservation found for order %', p_order_id;
  end if;

  -- Lock wallet
  select balance, reserved
    into v_balance, v_reserved
    from public.wallets
   where user_id = v_driver_id
     for update;

  -- How much do we actually deduct? Cap at current balance
  v_deduct := least(p_final_amount, v_balance);

  -- Release the reservation, deduct final amount
  update public.wallets
     set balance    = balance    - v_deduct,
         reserved   = greatest(reserved - v_reserved, 0),
         updated_at = now()
   where user_id = v_driver_id;

  insert into public.wallet_transactions
    (user_id, order_id, type, amount, balance_after)
  values
    (v_driver_id, p_order_id, 'charge', v_deduct, v_balance - v_deduct);
end;
$$;


ALTER FUNCTION "public"."wallet_charge"("p_order_id" "uuid", "p_final_amount" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_release"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_driver_id   uuid;
  v_reserved_tx bigint;
  v_balance     bigint;
  v_reserved    bigint;
begin
  -- Find the most recent reserve transaction for this order
  select user_id, amount into v_driver_id, v_reserved_tx
    from public.wallet_transactions
   where order_id = p_order_id
     and type     = 'reserve'
   order by created_at desc
   limit 1;

  -- No reservation → nothing to release
  if not found then
    return;
  end if;

  -- Lock wallet
  select balance, reserved
    into v_balance, v_reserved
    from public.wallets
   where user_id = v_driver_id
     for update;

  update public.wallets
     set reserved   = greatest(reserved - v_reserved_tx, 0),
         updated_at = now()
   where user_id = v_driver_id;

  insert into public.wallet_transactions
    (user_id, order_id, type, amount, balance_after)
  values
    (v_driver_id, p_order_id, 'release', v_reserved_tx, v_balance);
end;
$$;


ALTER FUNCTION "public"."wallet_release"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_reserve"("p_driver_id" "uuid", "p_order_id" "uuid", "p_amount" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_balance  bigint;
  v_reserved bigint;
begin
  -- Lock the wallet row to prevent concurrent reservations
  select balance, reserved
    into v_balance, v_reserved
    from public.wallets
   where user_id = p_driver_id
     for update;

  if not found then
    raise exception 'wallet not found for driver %', p_driver_id;
  end if;

  if (v_balance - v_reserved) < p_amount then
    raise exception 'insufficient balance: available=%, required=%',
      (v_balance - v_reserved), p_amount;
  end if;

  -- Reserve the amount
  update public.wallets
     set reserved   = reserved + p_amount,
         updated_at = now()
   where user_id = p_driver_id;

  -- Record transaction
  insert into public.wallet_transactions
    (user_id, order_id, type, amount, balance_after)
  values
    (p_driver_id, p_order_id, 'reserve', p_amount, v_balance - (v_reserved + p_amount));
end;
$$;


ALTER FUNCTION "public"."wallet_reserve"("p_driver_id" "uuid", "p_order_id" "uuid", "p_amount" bigint) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "platform" "text" NOT NULL,
    "latest_version" "text" NOT NULL,
    "store_url" "text" NOT NULL,
    "notes_uz" "text",
    "notes_ru" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latest_build" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "app_versions_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bot_events" (
    "id" bigint NOT NULL,
    "telegram_user_id" bigint,
    "event_type" "public"."bot_event_type" NOT NULL,
    "order_id" "uuid",
    "scat_uuid" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bot_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."bot_events" IS 'Bot dagi barcha actionlar — audit log';



COMMENT ON COLUMN "public"."bot_events"."scat_uuid" IS 'order_id bo''lmagan hollarda SCAT UUID ni bevosita saqlash';



COMMENT ON COLUMN "public"."bot_events"."metadata" IS 'Event turiga xos qo''shimcha ma''lumotlar (JSONB)';



CREATE SEQUENCE IF NOT EXISTS "public"."bot_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bot_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bot_events_id_seq" OWNED BY "public"."bot_events"."id";



CREATE TABLE IF NOT EXISTS "public"."default_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "name_uz" "text",
    "name_ru" "text",
    "short_name" "text",
    "address" "text" NOT NULL,
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "latitude" numeric NOT NULL,
    "longitude" numeric NOT NULL,
    "icon_key" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "default_addresses_category_check" CHECK (("category" = ANY (ARRAY['airport'::"text", 'train_station'::"text", 'bus_terminal'::"text", 'metro_station'::"text", 'hotel'::"text", 'shopping_mall'::"text", 'hospital'::"text", 'university'::"text", 'government'::"text", 'park'::"text", 'stadium'::"text", 'restaurant'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."default_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'android'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text"])))
);


ALTER TABLE "public"."device_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."device_tokens" IS 'FCM push notification device tokenlari';



COMMENT ON COLUMN "public"."device_tokens"."user_id" IS 'users.id ga bog''langan (CASCADE o''chirish)';



COMMENT ON COLUMN "public"."device_tokens"."token" IS 'Firebase Cloud Messaging (FCM) device token (noyob)';



COMMENT ON COLUMN "public"."device_tokens"."platform" IS 'android | ios';



CREATE TABLE IF NOT EXISTS "public"."driver_announcement_reads" (
    "driver_id" "uuid" NOT NULL,
    "announcement_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_announcement_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "title_uz" "text",
    "title_ru" "text",
    "body" "text",
    "body_uz" "text",
    "body_ru" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "user_id" "uuid",
    "city" "text" NOT NULL,
    "service" "text" NOT NULL,
    "profile" "text" NOT NULL,
    "call_sign" "text",
    "connection_type" "text" DEFAULT 'terminal'::"text" NOT NULL,
    "car_brand_client" "text" NOT NULL,
    "car_color_client" "text" NOT NULL,
    "car_brand_dispatcher" "text" NOT NULL,
    "car_color_dispatcher" "text" NOT NULL,
    "car_reg_number" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "middle_name" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text",
    "driver_license" "text" NOT NULL,
    "photo_url" "text",
    CONSTRAINT "driver_applications_connection_type_check" CHECK (("connection_type" = ANY (ARRAY['terminal'::"text", 'radio'::"text"]))),
    CONSTRAINT "driver_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."driver_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_fcm_tokens" (
    "driver_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_fcm_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "pickup_lat" double precision,
    "pickup_lon" double precision,
    "pickup_address" "text",
    "dropoff_address" "text",
    "distance_m" integer,
    "estimated_fare" bigint,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "offered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "responded_at" timestamp with time zone,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "driver_offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'timeout'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."driver_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_online_status" (
    "driver_id" "uuid" NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "lat" double precision,
    "lon" double precision,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_online_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ride_feedbacks" (
    "id" bigint NOT NULL,
    "order_id" "uuid",
    "telegram_user_id" bigint,
    "driver_id" "text",
    "driver_name" "text",
    "car_number" "text",
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'ride'::"text" NOT NULL,
    "title" "text",
    "user_id" "uuid",
    CONSTRAINT "ride_feedbacks_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ride_feedbacks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."driver_ratings" WITH ("security_invoker"='on') AS
 SELECT "driver_id",
    "driver_name",
    "count"(*) AS "total_feedbacks",
    "round"("avg"("rating"), 2) AS "avg_rating"
   FROM "public"."ride_feedbacks"
  WHERE ("driver_id" IS NOT NULL)
  GROUP BY "driver_id", "driver_name"
  ORDER BY ("round"("avg"("rating"), 2)) DESC;


ALTER VIEW "public"."driver_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_driver_assignments" (
    "id" bigint NOT NULL,
    "order_id" "uuid" NOT NULL,
    "scat_uuid" "text",
    "driver_id" "text",
    "driver_name" "text",
    "car_brand" "text",
    "car_model" "text",
    "car_color" "text",
    "car_number" "text",
    "remaining_time" integer,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_driver_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_driver_assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_driver_assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_driver_assignments_id_seq" OWNED BY "public"."order_driver_assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."order_status_logs" (
    "id" bigint NOT NULL,
    "order_id" "uuid" NOT NULL,
    "scat_uuid" "text" NOT NULL,
    "status_code" smallint NOT NULL,
    "status_message" "text",
    "driver_id" "text",
    "remaining_time" smallint,
    "amount" numeric(10,2),
    "raw_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_status_logs" IS 'Polling davomida kelgan har bir status o''zgarishi';



COMMENT ON COLUMN "public"."order_status_logs"."raw_response" IS 'SCAT GET /api/order response.response to''liq JSON';



CREATE SEQUENCE IF NOT EXISTS "public"."order_status_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_status_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_status_logs_id_seq" OWNED BY "public"."order_status_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scat_uuid" "text",
    "telegram_user_id" bigint,
    "phone" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "gps_accuracy" real,
    "current_status" smallint,
    "final_status" smallint,
    "driver_id" "text",
    "driver_name" "text",
    "car_brand" "text",
    "car_model" "text",
    "car_color" "text",
    "car_number" "text",
    "amount" numeric(10,2),
    "driver_assigned_at" timestamp with time zone,
    "billing_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "polling_stopped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "driver_reassignment_count" integer DEFAULT 0 NOT NULL,
    "dest_latitude" double precision,
    "dest_longitude" double precision,
    "distance_m" real,
    "user_id" "uuid",
    "channel" "text" DEFAULT 'bot'::"text" NOT NULL,
    "address" "text",
    "bot_token" "text",
    "bot_id" "text",
    "region_id" "uuid",
    "service_id" "uuid",
    "note" "text",
    "dropoff_address" "text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Taxi buyurtmalari';



COMMENT ON COLUMN "public"."orders"."scat_uuid" IS 'SCAT API POST /api/order javobi uuid';



COMMENT ON COLUMN "public"."orders"."gps_accuracy" IS 'Telegram location.horizontal_accuracy (metr)';



COMMENT ON COLUMN "public"."orders"."current_status" IS 'Eng oxirgi polling da kelgan SCAT status kodi';



COMMENT ON COLUMN "public"."orders"."final_status" IS 'Terminal holat (8=bekor, 9=dispatcher bekor, 10=topilmadi, 100=yakunlandi)';



COMMENT ON COLUMN "public"."orders"."billing_started_at" IS 'Haydovchi Start ni bosgan vaqt (status 4)';



COMMENT ON COLUMN "public"."orders"."dest_latitude" IS 'Sayohat tugagan nuqta kenglik (SCAT status=100 dan)';



COMMENT ON COLUMN "public"."orders"."dest_longitude" IS 'Sayohat tugagan nuqta uzunlik (SCAT status=100 dan)';



COMMENT ON COLUMN "public"."orders"."distance_m" IS 'Bosib o''tilgan masofa metrda (SCAT distance field)';



COMMENT ON COLUMN "public"."orders"."bot_token" IS 'Telegram bot token for sending notifications to the correct bot instance';



COMMENT ON COLUMN "public"."orders"."bot_id" IS 'Bot identifier for selecting the correct bot token for notifications';



CREATE OR REPLACE VIEW "public"."orders_with_reassignments" WITH ("security_invoker"='on') AS
 SELECT "id",
    "scat_uuid",
    "phone",
    "driver_reassignment_count",
    "created_at",
    "final_status"
   FROM "public"."orders" "o"
  WHERE ("driver_reassignment_count" > 0)
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."orders_with_reassignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "otp_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "failed_attempts" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."region_service_tariffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "uuid" NOT NULL,
    "service_type_id" "uuid" NOT NULL,
    "tariff_id" "uuid",
    "scat_rate_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."region_service_tariffs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_uz" "text",
    "name_ru" "text",
    "slug" "text" NOT NULL,
    "country_code" "text" DEFAULT 'UZ'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Tashkent'::"text" NOT NULL,
    "currency" "text" DEFAULT 'UZS'::"text" NOT NULL,
    "scat_zone_id" "text",
    "center_lat" numeric NOT NULL,
    "center_lon" numeric NOT NULL,
    "bounds_ne_lat" numeric,
    "bounds_ne_lon" numeric,
    "bounds_sw_lat" numeric,
    "bounds_sw_lon" numeric,
    "min_gps_accuracy_meters" numeric,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ride_feedbacks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ride_feedbacks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ride_feedbacks_id_seq" OWNED BY "public"."ride_feedbacks"."id";



CREATE TABLE IF NOT EXISTS "public"."scat_rates" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "km_cost" numeric DEFAULT 0 NOT NULL,
    "km_start" integer DEFAULT 0 NOT NULL,
    "stand_cost" numeric DEFAULT 500 NOT NULL,
    "free_stand_time" integer DEFAULT 20 NOT NULL,
    "free_wait_time" integer DEFAULT 2 NOT NULL,
    "start_hour" integer,
    "end_hour" integer,
    "city_id" integer DEFAULT 1 NOT NULL,
    "minimum_fare" numeric DEFAULT 0 NOT NULL,
    "pick_up_flagfall" numeric DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "zone_id" "text",
    "ride_type" "text",
    "start_price" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."scat_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_uz" "text",
    "name_ru" "text",
    "service_class" "text" NOT NULL,
    "description" "text",
    "description_uz" "text",
    "description_ru" "text",
    "icon_key" "text",
    "icon_url" "text",
    "max_passengers" integer DEFAULT 4 NOT NULL,
    "features" "text"[],
    "estimated_pickup_minutes" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_types_service_class_check" CHECK (("service_class" = ANY (ARRAY['economy'::"text", 'standard'::"text", 'comfort'::"text", 'business'::"text", 'minivan'::"text", 'cargo'::"text", 'intercity'::"text"])))
);


ALTER TABLE "public"."service_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "name_uz" "text",
    "name_ru" "text",
    "service_class" "text" NOT NULL,
    "description" "text",
    "description_uz" "text",
    "description_ru" "text",
    "icon_key" "text",
    "icon_url" "text",
    "max_passengers" integer DEFAULT 4 NOT NULL,
    "features" "text"[],
    "estimated_pickup_minutes" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "services_service_class_check" CHECK (("service_class" = ANY (ARRAY['economy'::"text", 'standard'::"text", 'comfort'::"text", 'business'::"text", 'minivan'::"text", 'cargo'::"text", 'intercity'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tariffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "currency" "text" DEFAULT 'UZS'::"text" NOT NULL,
    "base_fare" numeric DEFAULT 0 NOT NULL,
    "per_km" numeric DEFAULT 0 NOT NULL,
    "per_min_driving" numeric DEFAULT 0 NOT NULL,
    "per_min_waiting" numeric DEFAULT 0 NOT NULL,
    "minimum_fare" numeric DEFAULT 0 NOT NULL,
    "cancellation_fee" numeric DEFAULT 0 NOT NULL,
    "surge_multiplier" numeric DEFAULT 1.0 NOT NULL,
    "surge_preset" "text" DEFAULT 'none'::"text" NOT NULL,
    "night_surcharge" numeric DEFAULT 0 NOT NULL,
    "night_start_hour" integer,
    "night_end_hour" integer,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "region_id" "uuid",
    "service_id" "uuid",
    CONSTRAINT "tariffs_surge_preset_check" CHECK (("surge_preset" = ANY (ARRAY['none'::"text", 'low'::"text", 'medium'::"text", 'high'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."tariffs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text",
    "telegram_id" bigint,
    "source" "text" DEFAULT 'bot'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "username" "text",
    "total_rides" integer DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_ride_minutes" integer DEFAULT 0 NOT NULL,
    "badge" "text" DEFAULT 'newbie'::"text" NOT NULL,
    "badge_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "fcm_token" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "role" "text" DEFAULT 'courier'::"text" NOT NULL,
    "region_id" "uuid",
    "service_class" "text",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['driver'::"text", 'courier'::"text", 'admin'::"text"]))),
    CONSTRAINT "users_service_class_check" CHECK (("service_class" = ANY (ARRAY['economy'::"text", 'standard'::"text", 'comfort'::"text", 'business'::"text", 'minivan'::"text", 'cargo'::"text", 'intercity'::"text"]))),
    CONSTRAINT "users_source_check" CHECK (("source" = ANY (ARRAY['bot'::"text", 'app'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Unified foydalanuvchilar: bot + app. Telefon raqami asosiy kalit.';



COMMENT ON COLUMN "public"."users"."telegram_id" IS 'NULL — app-only foydalanuvchi; bot orqali ro''yxatdan o''tganda to''ldiriladi';



COMMENT ON COLUMN "public"."users"."source" IS 'Qayerdan ro''yxatdan o''tdi: bot | app | both (ikkalasida ham)';



CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "type" "text" NOT NULL,
    "amount" bigint NOT NULL,
    "balance_after" bigint NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['topup'::"text", 'reserve'::"text", 'charge'::"text", 'refund'::"text", 'release'::"text"])))
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "user_id" "uuid" NOT NULL,
    "balance" bigint DEFAULT 0 NOT NULL,
    "reserved" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallets_balance_check" CHECK (("balance" >= 0)),
    CONSTRAINT "wallets_reserved_check" CHECK (("reserved" >= 0))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bot_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bot_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_driver_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_driver_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_status_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_status_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ride_feedbacks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ride_feedbacks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("platform");



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."default_addresses"
    ADD CONSTRAINT "default_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."driver_announcement_reads"
    ADD CONSTRAINT "driver_announcement_reads_pkey" PRIMARY KEY ("driver_id", "announcement_id");



ALTER TABLE ONLY "public"."driver_announcements"
    ADD CONSTRAINT "driver_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_applications"
    ADD CONSTRAINT "driver_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_fcm_tokens"
    ADD CONSTRAINT "driver_fcm_tokens_pkey" PRIMARY KEY ("driver_id");



ALTER TABLE ONLY "public"."driver_offers"
    ADD CONSTRAINT "driver_offers_order_id_driver_id_attempt_number_key" UNIQUE ("order_id", "driver_id", "attempt_number");



ALTER TABLE ONLY "public"."driver_offers"
    ADD CONSTRAINT "driver_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_online_status"
    ADD CONSTRAINT "driver_online_status_pkey" PRIMARY KEY ("driver_id");



ALTER TABLE ONLY "public"."order_driver_assignments"
    ADD CONSTRAINT "order_driver_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_scat_uuid_key" UNIQUE ("scat_uuid");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "region_service_tariffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "region_service_tariffs_unique" UNIQUE ("region_id", "service_type_id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scat_rates"
    ADD CONSTRAINT "scat_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_types"
    ADD CONSTRAINT "service_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tariffs"
    ADD CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_telegram_id_key" UNIQUE ("telegram_id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "ann_reads_driver_idx" ON "public"."driver_announcement_reads" USING "btree" ("driver_id");



CREATE INDEX "default_addresses_region_id_idx" ON "public"."default_addresses" USING "btree" ("region_id");



CREATE INDEX "driver_applications_city_idx" ON "public"."driver_applications" USING "btree" ("city");



CREATE INDEX "driver_applications_created_at_idx" ON "public"."driver_applications" USING "btree" ("created_at" DESC);



CREATE INDEX "driver_applications_status_idx" ON "public"."driver_applications" USING "btree" ("status");



CREATE INDEX "driver_fcm_tokens_driver_id_idx" ON "public"."driver_fcm_tokens" USING "btree" ("driver_id");



CREATE INDEX "driver_offers_driver_idx" ON "public"."driver_offers" USING "btree" ("driver_id", "status");



CREATE INDEX "driver_offers_order_idx" ON "public"."driver_offers" USING "btree" ("order_id", "status");



CREATE INDEX "idx_bot_events_created_at" ON "public"."bot_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bot_events_event_type" ON "public"."bot_events" USING "btree" ("event_type");



CREATE INDEX "idx_bot_events_order_id" ON "public"."bot_events" USING "btree" ("order_id");



CREATE INDEX "idx_bot_events_telegram_user_id" ON "public"."bot_events" USING "btree" ("telegram_user_id");



CREATE INDEX "idx_device_tokens_user_id" ON "public"."device_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_oda_order_id" ON "public"."order_driver_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_order_status_logs_created_at" ON "public"."order_status_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_status_logs_order_id" ON "public"."order_status_logs" USING "btree" ("order_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_dest_coords" ON "public"."orders" USING "btree" ("dest_latitude", "dest_longitude") WHERE ("dest_latitude" IS NOT NULL);



CREATE INDEX "idx_orders_scat_uuid" ON "public"."orders" USING "btree" ("scat_uuid");



CREATE INDEX "idx_orders_telegram_user_id" ON "public"."orders" USING "btree" ("telegram_user_id");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_rf_driver_id" ON "public"."ride_feedbacks" USING "btree" ("driver_id");



CREATE INDEX "idx_rf_order_id" ON "public"."ride_feedbacks" USING "btree" ("order_id");



CREATE INDEX "idx_rf_rating" ON "public"."ride_feedbacks" USING "btree" ("rating");



CREATE UNIQUE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "idx_users_region_id" ON "public"."users" USING "btree" ("region_id");



CREATE INDEX "idx_users_telegram_id" ON "public"."users" USING "btree" ("telegram_id");



CREATE INDEX "idx_users_total_rides" ON "public"."users" USING "btree" ("total_rides" DESC) WHERE ("total_rides" > 0);



CREATE INDEX "orders_channel_idx" ON "public"."orders" USING "btree" ("channel");



CREATE INDEX "orders_region_id_idx" ON "public"."orders" USING "btree" ("region_id");



CREATE INDEX "orders_service_id_idx" ON "public"."orders" USING "btree" ("service_id");



CREATE INDEX "otp_codes_phone_idx" ON "public"."otp_codes" USING "btree" ("phone", "expires_at");



CREATE INDEX "ride_feedbacks_type_idx" ON "public"."ride_feedbacks" USING "btree" ("type");



CREATE INDEX "ride_feedbacks_user_id_idx" ON "public"."ride_feedbacks" USING "btree" ("user_id");



CREATE INDEX "services_region_id_idx" ON "public"."services" USING "btree" ("region_id");



CREATE INDEX "tariffs_active_idx" ON "public"."tariffs" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "tariffs_region_id_idx" ON "public"."tariffs" USING "btree" ("region_id");



CREATE INDEX "tariffs_service_id_idx" ON "public"."tariffs" USING "btree" ("service_id");



CREATE INDEX "wallet_tx_order_idx" ON "public"."wallet_transactions" USING "btree" ("order_id");



CREATE INDEX "wallet_tx_user_idx" ON "public"."wallet_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "rst_set_updated_at" BEFORE UPDATE ON "public"."region_service_tariffs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_types_set_updated_at" BEFORE UPDATE ON "public"."service_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_default_addresses_updated_at" BEFORE UPDATE ON "public"."default_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_regions_updated_at" BEFORE UPDATE ON "public"."regions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_tariffs_updated_at" BEFORE UPDATE ON "public"."tariffs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_orders" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_auto_create_driver_offer" AFTER UPDATE OF "driver_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_auto_create_driver_offer"();



CREATE OR REPLACE TRIGGER "wallets_set_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."set_wallet_updated_at"();



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "public"."users"("telegram_id");



ALTER TABLE ONLY "public"."default_addresses"
    ADD CONSTRAINT "default_addresses_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_announcement_reads"
    ADD CONSTRAINT "driver_announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."driver_announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_announcement_reads"
    ADD CONSTRAINT "driver_announcement_reads_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_applications"
    ADD CONSTRAINT "driver_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."driver_fcm_tokens"
    ADD CONSTRAINT "driver_fcm_tokens_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_offers"
    ADD CONSTRAINT "driver_offers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_offers"
    ADD CONSTRAINT "driver_offers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_online_status"
    ADD CONSTRAINT "driver_online_status_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_driver_assignments"
    ADD CONSTRAINT "order_driver_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "public"."users"("telegram_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "rst_region_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "rst_scat_rate_fk" FOREIGN KEY ("scat_rate_id") REFERENCES "public"."scat_rates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "rst_service_type_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."region_service_tariffs"
    ADD CONSTRAINT "rst_tariff_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tariffs"
    ADD CONSTRAINT "tariffs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tariffs"
    ADD CONSTRAINT "tariffs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow insert driver applications" ON "public"."driver_applications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read on app_versions" ON "public"."app_versions" FOR SELECT USING (true);



CREATE POLICY "Allow select own driver application" ON "public"."driver_applications" FOR SELECT USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Driver manages own FCM token" ON "public"."driver_fcm_tokens" USING (("auth"."uid"() = "driver_id")) WITH CHECK (("auth"."uid"() = "driver_id"));



CREATE POLICY "Driver manages own reads" ON "public"."driver_announcement_reads" USING (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Enable read access for all users" ON "public"."orders" FOR SELECT USING (true);



CREATE POLICY "Public read active announcements" ON "public"."driver_announcements" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public read default_addresses" ON "public"."default_addresses" FOR SELECT USING (true);



CREATE POLICY "Public read region_service_tariffs" ON "public"."region_service_tariffs" FOR SELECT USING (true);



CREATE POLICY "Public read regions" ON "public"."regions" FOR SELECT USING (true);



CREATE POLICY "Public read scat_rates" ON "public"."scat_rates" FOR SELECT USING (true);



CREATE POLICY "Public read service_types" ON "public"."service_types" FOR SELECT USING (true);



CREATE POLICY "Public read services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Public read tariffs" ON "public"."tariffs" FOR SELECT USING (true);



CREATE POLICY "app_users_insert_feedback" ON "public"."ride_feedbacks" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bot_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."default_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_tokens_delete_own" ON "public"."device_tokens" FOR DELETE USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "device_tokens_insert_own" ON "public"."device_tokens" FOR INSERT WITH CHECK (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "device_tokens_select_own" ON "public"."device_tokens" FOR SELECT USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."driver_announcement_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_fcm_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "driver_offers_self_read" ON "public"."driver_offers" FOR SELECT USING (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "driver_offers_self_update" ON "public"."driver_offers" FOR UPDATE USING (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



ALTER TABLE "public"."driver_online_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "driver_online_status_self" ON "public"."driver_online_status" USING (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("driver_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "feedbacks: o'z yozuvlari" ON "public"."ride_feedbacks" USING ((("telegram_user_id" IS NOT NULL) OR ("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."order_driver_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_status_logs: o'z loglarini o'qish" ON "public"."order_status_logs" FOR SELECT USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders: o'z buyurtmalarini o'qish" ON "public"."orders" FOR SELECT USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "orders: yangi buyurtma yaratish" ON "public"."orders" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."region_service_tariffs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ride_feedbacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scat_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service role only" ON "public"."otp_codes" USING (false);



ALTER TABLE "public"."service_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tariffs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: leaderboard o'qish" ON "public"."users" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("total_rides" > 0)));



CREATE POLICY "users: o'z yozuvini o'qish" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "users: o'z yozuvini yangilash" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallet_tx_self_read" ON "public"."wallet_transactions" FOR SELECT USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallets_self_read" ON "public"."wallets" FOR SELECT USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_fare"("p_rate_id" integer, "p_distance_m" double precision, "p_duration_s" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_fare"("p_rate_id" integer, "p_distance_m" double precision, "p_duration_s" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_fare"("p_rate_id" integer, "p_distance_m" double precision, "p_duration_s" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[], "p_region_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[], "p_region_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearest_online_driver"("p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_exclude_ids" "uuid"[], "p_region_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_auto_create_driver_offer"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auto_create_driver_offer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auto_create_driver_offer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_wallet_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_wallet_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_wallet_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_charge"("p_order_id" "uuid", "p_final_amount" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_charge"("p_order_id" "uuid", "p_final_amount" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_charge"("p_order_id" "uuid", "p_final_amount" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_release"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_release"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_release"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_reserve"("p_driver_id" "uuid", "p_order_id" "uuid", "p_amount" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_reserve"("p_driver_id" "uuid", "p_order_id" "uuid", "p_amount" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_reserve"("p_driver_id" "uuid", "p_order_id" "uuid", "p_amount" bigint) TO "service_role";



GRANT ALL ON TABLE "public"."app_versions" TO "anon";
GRANT ALL ON TABLE "public"."app_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_versions" TO "service_role";



GRANT ALL ON TABLE "public"."bot_events" TO "anon";
GRANT ALL ON TABLE "public"."bot_events" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."default_addresses" TO "anon";
GRANT ALL ON TABLE "public"."default_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."default_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."device_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."driver_announcement_reads" TO "anon";
GRANT ALL ON TABLE "public"."driver_announcement_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_announcement_reads" TO "service_role";



GRANT ALL ON TABLE "public"."driver_announcements" TO "anon";
GRANT ALL ON TABLE "public"."driver_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."driver_applications" TO "anon";
GRANT ALL ON TABLE "public"."driver_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_applications" TO "service_role";



GRANT ALL ON TABLE "public"."driver_fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."driver_fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_fcm_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."driver_offers" TO "anon";
GRANT ALL ON TABLE "public"."driver_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_offers" TO "service_role";



GRANT ALL ON TABLE "public"."driver_online_status" TO "anon";
GRANT ALL ON TABLE "public"."driver_online_status" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_online_status" TO "service_role";



GRANT ALL ON TABLE "public"."ride_feedbacks" TO "anon";
GRANT ALL ON TABLE "public"."ride_feedbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."ride_feedbacks" TO "service_role";



GRANT ALL ON TABLE "public"."driver_ratings" TO "anon";
GRANT ALL ON TABLE "public"."driver_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."order_driver_assignments" TO "anon";
GRANT ALL ON TABLE "public"."order_driver_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."order_driver_assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_driver_assignments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_driver_assignments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_driver_assignments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."order_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_status_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_status_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_status_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."orders_with_reassignments" TO "anon";
GRANT ALL ON TABLE "public"."orders_with_reassignments" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_with_reassignments" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."region_service_tariffs" TO "anon";
GRANT ALL ON TABLE "public"."region_service_tariffs" TO "authenticated";
GRANT ALL ON TABLE "public"."region_service_tariffs" TO "service_role";



GRANT ALL ON TABLE "public"."regions" TO "anon";
GRANT ALL ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scat_rates" TO "anon";
GRANT ALL ON TABLE "public"."scat_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."scat_rates" TO "service_role";



GRANT ALL ON TABLE "public"."service_types" TO "anon";
GRANT ALL ON TABLE "public"."service_types" TO "authenticated";
GRANT ALL ON TABLE "public"."service_types" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."tariffs" TO "anon";
GRANT ALL ON TABLE "public"."tariffs" TO "authenticated";
GRANT ALL ON TABLE "public"."tariffs" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







