


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


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users (phone, auth_user_id, source)
    VALUES (
        NEW.phone,       -- auth.users.phone (Supabase Auth saqlaydi)
        NEW.id,
        'app'
    )
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
    -- Asosiy: users jadvalini yangilash
    UPDATE users
    SET
        total_rides        = total_rides + 1,
        total_amount       = total_amount + COALESCE(p_amount, 0),
        total_ride_minutes = total_ride_minutes + COALESCE(p_ride_minutes, 0)
    WHERE telegram_id = p_telegram_id;

    -- Compat: bot_users ham parallel yangilanadi (eski dashboard uchun)
    UPDATE bot_users
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


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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



CREATE TABLE IF NOT EXISTS "public"."bot_users" (
    "telegram_id" bigint NOT NULL,
    "username" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_rides" integer DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_ride_minutes" integer DEFAULT 0 NOT NULL,
    "badge" "text" DEFAULT 'newbie'::"text" NOT NULL,
    "badge_updated_at" timestamp with time zone
);


ALTER TABLE "public"."bot_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."bot_users" IS 'Telegram foydalanuvchilari va ularning telefon raqamlari';



COMMENT ON COLUMN "public"."bot_users"."telegram_id" IS 'Telegram tomonidan beriladigan noyob foydalanuvchi ID';



COMMENT ON COLUMN "public"."bot_users"."phone" IS 'Contact orqali yuborilgan telefon raqami';



COMMENT ON COLUMN "public"."bot_users"."badge" IS 'Foydalanuvchi badge darajasi: newbie|regular|active|partner|elite|legend';



COMMENT ON COLUMN "public"."bot_users"."badge_updated_at" IS 'Badge oxirgi yangilangan vaqt';



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
    "user_id" "uuid",
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
    "channel" "text" DEFAULT 'bot'::"text" NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."tax_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
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
    CONSTRAINT "users_source_check" CHECK (("source" = ANY (ARRAY['bot'::"text", 'app'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."tax_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."tax_users" IS 'Unified foydalanuvchilar: bot + app. Telefon raqami asosiy kalit.';



COMMENT ON COLUMN "public"."tax_users"."telegram_id" IS 'NULL — app-only foydalanuvchi; bot orqali ro''yxatdan o''tganda to''ldiriladi';



COMMENT ON COLUMN "public"."tax_users"."source" IS 'Qayerdan ro''yxatdan o''tdi: bot | app | both (ikkalasida ham)';



ALTER TABLE ONLY "public"."bot_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bot_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_driver_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_driver_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_status_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_status_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ride_feedbacks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ride_feedbacks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bot_users"
    ADD CONSTRAINT "bot_users_pkey" PRIMARY KEY ("telegram_id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_token_key" UNIQUE ("token");



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



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scat_rates"
    ADD CONSTRAINT "scat_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."tax_users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_users"
    ADD CONSTRAINT "users_telegram_id_key" UNIQUE ("telegram_id");



CREATE INDEX "idx_bot_events_created_at" ON "public"."bot_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bot_events_event_type" ON "public"."bot_events" USING "btree" ("event_type");



CREATE INDEX "idx_bot_events_order_id" ON "public"."bot_events" USING "btree" ("order_id");



CREATE INDEX "idx_bot_events_telegram_user_id" ON "public"."bot_events" USING "btree" ("telegram_user_id");



CREATE INDEX "idx_bot_users_total_rides" ON "public"."bot_users" USING "btree" ("total_rides" DESC) WHERE ("total_rides" > 0);



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



CREATE UNIQUE INDEX "idx_users_auth_user_id" ON "public"."tax_users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE INDEX "idx_users_phone" ON "public"."tax_users" USING "btree" ("phone");



CREATE INDEX "idx_users_telegram_id" ON "public"."tax_users" USING "btree" ("telegram_id");



CREATE INDEX "idx_users_total_rides" ON "public"."tax_users" USING "btree" ("total_rides" DESC) WHERE ("total_rides" > 0);



CREATE INDEX "orders_channel_idx" ON "public"."orders" USING "btree" ("channel");



CREATE INDEX "otp_codes_phone_idx" ON "public"."otp_codes" USING "btree" ("phone", "expires_at");



CREATE INDEX "ride_feedbacks_type_idx" ON "public"."ride_feedbacks" USING "btree" ("type");



CREATE INDEX "ride_feedbacks_user_id_idx" ON "public"."ride_feedbacks" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_updated_at_bot_users" BEFORE UPDATE ON "public"."bot_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_orders" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_users" BEFORE UPDATE ON "public"."tax_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."bot_events"
    ADD CONSTRAINT "bot_events_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "public"."bot_users"("telegram_id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tax_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_driver_assignments"
    ADD CONSTRAINT "order_driver_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "public"."bot_users"("telegram_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tax_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ride_feedbacks"
    ADD CONSTRAINT "ride_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tax_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tax_users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Public read scat_rates" ON "public"."scat_rates" FOR SELECT USING (true);



CREATE POLICY "app_users_insert_feedback" ON "public"."ride_feedbacks" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."bot_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bot_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_tokens_delete_own" ON "public"."device_tokens" FOR DELETE USING (("user_id" = ( SELECT "tax_users"."id"
   FROM "public"."tax_users"
  WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "device_tokens_insert_own" ON "public"."device_tokens" FOR INSERT WITH CHECK (("user_id" = ( SELECT "tax_users"."id"
   FROM "public"."tax_users"
  WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "device_tokens_select_own" ON "public"."device_tokens" FOR SELECT USING (("user_id" = ( SELECT "tax_users"."id"
   FROM "public"."tax_users"
  WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "feedbacks: o'z yozuvlari" ON "public"."ride_feedbacks" USING ((("telegram_user_id" IS NOT NULL) OR ("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" IN ( SELECT "tax_users"."id"
           FROM "public"."tax_users"
          WHERE ("tax_users"."auth_user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."order_driver_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_status_logs: o'z loglarini o'qish" ON "public"."order_status_logs" FOR SELECT USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" IN ( SELECT "tax_users"."id"
           FROM "public"."tax_users"
          WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders: o'z buyurtmalarini o'qish" ON "public"."orders" FOR SELECT USING (("user_id" IN ( SELECT "tax_users"."id"
   FROM "public"."tax_users"
  WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "orders: yangi buyurtma yaratish" ON "public"."orders" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "tax_users"."id"
   FROM "public"."tax_users"
  WHERE ("tax_users"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ride_feedbacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scat_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: leaderboard o'qish" ON "public"."tax_users" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("total_rides" > 0)));



CREATE POLICY "users: o'z yozuvini o'qish" ON "public"."tax_users" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "users: o'z yozuvini yangilash" ON "public"."tax_users" FOR UPDATE USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("p_telegram_id" bigint, "p_amount" numeric, "p_ride_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."bot_events" TO "anon";
GRANT ALL ON TABLE "public"."bot_events" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bot_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bot_users" TO "anon";
GRANT ALL ON TABLE "public"."bot_users" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_users" TO "service_role";



GRANT ALL ON TABLE "public"."device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."device_tokens" TO "service_role";



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



GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ride_feedbacks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scat_rates" TO "anon";
GRANT ALL ON TABLE "public"."scat_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."scat_rates" TO "service_role";



GRANT ALL ON TABLE "public"."tax_users" TO "anon";
GRANT ALL ON TABLE "public"."tax_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_users" TO "service_role";



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







