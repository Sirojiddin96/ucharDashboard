export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bot_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["bot_event_type"]
          id: number
          metadata: Json | null
          order_id: string | null
          scat_uuid: string | null
          telegram_user_id: number | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["bot_event_type"]
          id?: number
          metadata?: Json | null
          order_id?: string | null
          scat_uuid?: string | null
          telegram_user_id?: number | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["bot_event_type"]
          id?: number
          metadata?: Json | null
          order_id?: string | null
          scat_uuid?: string | null
          telegram_user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_events_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      bot_users: {
        Row: {
          badge: string
          badge_updated_at: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          telegram_id: number
          total_amount: number
          total_ride_minutes: number
          total_rides: number
          updated_at: string
          username: string | null
        }
        Insert: {
          badge?: string
          badge_updated_at?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          telegram_id: number
          total_amount?: number
          total_ride_minutes?: number
          total_rides?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          badge?: string
          badge_updated_at?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          telegram_id?: number
          total_amount?: number
          total_ride_minutes?: number
          total_rides?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      default_addresses: {
        Row: {
          address: string | null
          category: string
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          name_ru: string | null
          name_uz: string | null
          region_id: string
          short_name: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          name_ru?: string | null
          name_uz?: string | null
          region_id: string
          short_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          name_ru?: string | null
          name_uz?: string | null
          region_id?: string
          short_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_addresses_region_fk"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tax_users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_applications: {
        Row: {
          call_sign: string | null
          car_brand_client: string | null
          car_color_client: string | null
          car_reg_number: string | null
          city: string | null
          connection_type: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          phone: string | null
          profile: string | null
          service: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          call_sign?: string | null
          car_brand_client?: string | null
          car_color_client?: string | null
          car_reg_number?: string | null
          city?: string | null
          connection_type?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          profile?: string | null
          service?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          call_sign?: string | null
          car_brand_client?: string | null
          car_color_client?: string | null
          car_reg_number?: string | null
          city?: string | null
          connection_type?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          profile?: string | null
          service?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      driver_offers: {
        Row: {
          attempt_number: number
          distance_m: number | null
          driver_id: string | null
          dropoff_address: string | null
          estimated_fare: number | null
          expires_at: string | null
          id: string
          offered_at: string
          order_id: string
          pickup_address: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          attempt_number?: number
          distance_m?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          estimated_fare?: number | null
          expires_at?: string | null
          id?: string
          offered_at?: string
          order_id: string
          pickup_address?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          attempt_number?: number
          distance_m?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          estimated_fare?: number | null
          expires_at?: string | null
          id?: string
          offered_at?: string
          order_id?: string
          pickup_address?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      driver_online_status: {
        Row: {
          driver_id: string
          is_online: boolean
          lat: number | null
          lon: number | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          is_online?: boolean
          lat?: number | null
          lon?: number | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          is_online?: boolean
          lat?: number | null
          lon?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      order_driver_assignments: {
        Row: {
          assigned_at: string
          car_brand: string | null
          car_color: string | null
          car_model: string | null
          car_number: string | null
          driver_id: string | null
          driver_name: string | null
          id: number
          order_id: string
          remaining_time: number | null
          scat_uuid: string | null
        }
        Insert: {
          assigned_at?: string
          car_brand?: string | null
          car_color?: string | null
          car_model?: string | null
          car_number?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          order_id: string
          remaining_time?: number | null
          scat_uuid?: string | null
        }
        Update: {
          assigned_at?: string
          car_brand?: string | null
          car_color?: string | null
          car_model?: string | null
          car_number?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          order_id?: string
          remaining_time?: number | null
          scat_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_driver_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_driver_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_logs: {
        Row: {
          amount: number | null
          created_at: string
          driver_id: string | null
          id: number
          order_id: string
          raw_response: Json | null
          remaining_time: number | null
          scat_uuid: string
          status_code: number
          status_message: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          driver_id?: string | null
          id?: number
          order_id: string
          raw_response?: Json | null
          remaining_time?: number | null
          scat_uuid: string
          status_code: number
          status_message?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          driver_id?: string | null
          id?: number
          order_id?: string
          raw_response?: Json | null
          remaining_time?: number | null
          scat_uuid?: string
          status_code?: number
          status_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          amount: number | null
          billing_started_at: string | null
          bot_id: string | null
          bot_token: string | null
          cancelled_at: string | null
          car_brand: string | null
          car_color: string | null
          car_model: string | null
          car_number: string | null
          channel: string
          completed_at: string | null
          created_at: string
          current_status: number | null
          dest_latitude: number | null
          dest_longitude: number | null
          distance_m: number | null
          driver_assigned_at: string | null
          driver_id: string | null
          driver_name: string | null
          driver_reassignment_count: number
          dropoff_address: string | null
          final_status: number | null
          gps_accuracy: number | null
          id: string
          latitude: number
          longitude: number
          note: string | null
          phone: string | null
          polling_stopped_at: string | null
          region_id: string | null
          scat_uuid: string | null
          service_id: string | null
          telegram_user_id: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          amount?: number | null
          billing_started_at?: string | null
          bot_id?: string | null
          bot_token?: string | null
          cancelled_at?: string | null
          car_brand?: string | null
          car_color?: string | null
          car_model?: string | null
          car_number?: string | null
          channel?: string
          completed_at?: string | null
          created_at?: string
          current_status?: number | null
          dest_latitude?: number | null
          dest_longitude?: number | null
          distance_m?: number | null
          driver_assigned_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_reassignment_count?: number
          dropoff_address?: string | null
          final_status?: number | null
          gps_accuracy?: number | null
          id?: string
          latitude: number
          longitude: number
          note?: string | null
          phone?: string | null
          polling_stopped_at?: string | null
          region_id?: string | null
          scat_uuid?: string | null
          service_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          amount?: number | null
          billing_started_at?: string | null
          bot_id?: string | null
          bot_token?: string | null
          cancelled_at?: string | null
          car_brand?: string | null
          car_color?: string | null
          car_model?: string | null
          car_number?: string | null
          channel?: string
          completed_at?: string | null
          created_at?: string
          current_status?: number | null
          dest_latitude?: number | null
          dest_longitude?: number | null
          distance_m?: number | null
          driver_assigned_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_reassignment_count?: number
          dropoff_address?: string | null
          final_status?: number | null
          gps_accuracy?: number | null
          id?: string
          latitude?: number
          longitude?: number
          note?: string | null
          phone?: string | null
          polling_stopped_at?: string | null
          region_id?: string | null
          scat_uuid?: string | null
          service_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tax_users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          org_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          org_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          org_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          slug?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          created_at: string
          expires_at: string
          failed_attempts: number
          id: string
          otp_hash: string
          phone: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          failed_attempts?: number
          id?: string
          otp_hash: string
          phone: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          otp_hash?: string
          phone?: string
        }
        Relationships: []
      }
      region_service_tariffs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          region_id: string
          scat_rate_id: number | null
          service_type_id: string
          sort_order: number
          tariff_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          region_id: string
          scat_rate_id?: number | null
          service_type_id: string
          sort_order?: number
          tariff_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          region_id?: string
          scat_rate_id?: number | null
          service_type_id?: string
          sort_order?: number
          tariff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          center_lat: number
          center_lon: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          name_ru: string | null
          name_uz: string | null
          slug: string
          sort_order: number
          timezone: string
          updated_at: string
        }
        Insert: {
          center_lat: number
          center_lon: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          name_ru?: string | null
          name_uz?: string | null
          slug: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          center_lat?: number
          center_lon?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ru?: string | null
          name_uz?: string | null
          slug?: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ride_feedbacks: {
        Row: {
          car_number: string | null
          comment: string | null
          created_at: string
          driver_id: string | null
          driver_name: string | null
          id: number
          order_id: string | null
          rating: number
          telegram_user_id: number | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          car_number?: string | null
          comment?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          order_id?: string | null
          rating: number
          telegram_user_id?: number | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Update: {
          car_number?: string | null
          comment?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          order_id?: string | null
          rating?: number
          telegram_user_id?: number | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_feedbacks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_feedbacks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tax_users"
            referencedColumns: ["id"]
          },
        ]
      }
      scat_rates: {
        Row: {
          city_id: number
          end_hour: number | null
          free_stand_time: number
          free_wait_time: number
          id: number
          is_active: boolean
          km_cost: number
          km_start: number
          minimum_fare: number
          name: string
          pick_up_flagfall: number
          ride_type: string | null
          stand_cost: number
          start_hour: number | null
          start_price: number
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          city_id?: number
          end_hour?: number | null
          free_stand_time?: number
          free_wait_time?: number
          id: number
          is_active?: boolean
          km_cost?: number
          km_start?: number
          minimum_fare?: number
          name: string
          pick_up_flagfall?: number
          ride_type?: string | null
          stand_cost?: number
          start_hour?: number | null
          start_price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          city_id?: number
          end_hour?: number | null
          free_stand_time?: number
          free_wait_time?: number
          id?: number
          is_active?: boolean
          km_cost?: number
          km_start?: number
          minimum_fare?: number
          name?: string
          pick_up_flagfall?: number
          ride_type?: string | null
          stand_cost?: number
          start_hour?: number | null
          start_price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      service_types: {
        Row: {
          created_at: string
          description: string | null
          description_ru: string | null
          description_uz: string | null
          estimated_pickup_minutes: number | null
          features: string[] | null
          icon_key: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          max_passengers: number
          name: string
          name_ru: string | null
          name_uz: string | null
          service_class: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ru?: string | null
          description_uz?: string | null
          estimated_pickup_minutes?: number | null
          features?: string[] | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_passengers?: number
          name: string
          name_ru?: string | null
          name_uz?: string | null
          service_class: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ru?: string | null
          description_uz?: string | null
          estimated_pickup_minutes?: number | null
          features?: string[] | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_passengers?: number
          name?: string
          name_ru?: string | null
          name_uz?: string | null
          service_class?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          estimated_pickup_minutes: number | null
          icon_key: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          max_passengers: number
          name: string
          name_ru: string | null
          name_uz: string | null
          region_id: string
          service_class: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_pickup_minutes?: number | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_passengers?: number
          name: string
          name_ru?: string | null
          name_uz?: string | null
          region_id: string
          service_class: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_pickup_minutes?: number | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_passengers?: number
          name?: string
          name_ru?: string | null
          name_uz?: string | null
          region_id?: string
          service_class?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tariff_tiers: {
        Row: {
          created_at: string
          from_km: number
          id: string
          pricing_type: string
          rate: number
          rst_id: string
          sort_order: number
          to_km: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_km: number
          id?: string
          pricing_type?: string
          rate: number
          rst_id: string
          sort_order?: number
          to_km?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_km?: number
          id?: string
          pricing_type?: string
          rate?: number
          rst_id?: string
          sort_order?: number
          to_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_tiers_rst_fk"
            columns: ["rst_id"]
            isOneToOne: false
            referencedRelation: "region_service_tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          base_fare: number
          cancellation_fee: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          minimum_fare: number
          name: string
          night_end_hour: number
          night_start_hour: number
          night_surcharge: number
          per_km: number
          per_min_driving: number
          per_min_waiting: number
          surge_multiplier: number
          surge_preset: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          base_fare?: number
          cancellation_fee?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          minimum_fare?: number
          name: string
          night_end_hour?: number
          night_start_hour?: number
          night_surcharge?: number
          per_km?: number
          per_min_driving?: number
          per_min_waiting?: number
          surge_multiplier?: number
          surge_preset?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          base_fare?: number
          cancellation_fee?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          minimum_fare?: number
          name?: string
          night_end_hour?: number
          night_start_hour?: number
          night_surcharge?: number
          per_km?: number
          per_min_driving?: number
          per_min_waiting?: number
          surge_multiplier?: number
          surge_preset?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      tax_users: {
        Row: {
          auth_user_id: string | null
          badge: string
          badge_updated_at: string | null
          created_at: string
          fcm_token: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          last_name: string | null
          phone: string
          region_id: string | null
          role: string | null
          service_class: string | null
          source: string
          telegram_id: number | null
          total_amount: number
          total_ride_minutes: number
          total_rides: number
          updated_at: string
          username: string | null
        }
        Insert: {
          auth_user_id?: string | null
          badge?: string
          badge_updated_at?: string | null
          created_at?: string
          fcm_token?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          last_name?: string | null
          phone: string
          region_id?: string | null
          role?: string | null
          service_class?: string | null
          source?: string
          telegram_id?: number | null
          total_amount?: number
          total_ride_minutes?: number
          total_rides?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          auth_user_id?: string | null
          badge?: string
          badge_updated_at?: string | null
          created_at?: string
          fcm_token?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          last_name?: string | null
          phone?: string
          region_id?: string | null
          role?: string | null
          service_class?: string | null
          source?: string
          telegram_id?: number | null
          total_amount?: number
          total_ride_minutes?: number
          total_rides?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      tenant_databases: {
        Row: {
          connected_at: string | null
          org_id: string
          status: string | null
          supabase_anon_key: string | null
          supabase_service_key_enc: string
          supabase_url: string
        }
        Insert: {
          connected_at?: string | null
          org_id: string
          status?: string | null
          supabase_anon_key?: string | null
          supabase_service_key_enc: string
          supabase_url: string
        }
        Update: {
          connected_at?: string | null
          org_id?: string
          status?: string | null
          supabase_anon_key?: string | null
          supabase_service_key_enc?: string
          supabase_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_databases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          reserved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          reserved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          reserved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_bot_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: number | null
          metadata: Json | null
          migrated_at: string | null
          old_id: string | null
          order_id: string | null
          scat_uuid: string | null
          source: string | null
          telegram_user_id: number | null
        }
        Relationships: []
      }
      app_driver_ratings: {
        Row: {
          avg_rating: number | null
          driver_id: string | null
          driver_name: string | null
          source: string | null
          total_feedbacks: number | null
        }
        Relationships: []
      }
      app_order_driver_assignments: {
        Row: {
          assigned_at: string | null
          car_brand: string | null
          car_color: string | null
          car_model: string | null
          car_number: string | null
          driver_id: string | null
          driver_name: string | null
          id: number | null
          migrated_at: string | null
          old_id: string | null
          order_id: string | null
          remaining_time: number | null
          scat_uuid: string | null
          source: string | null
        }
        Relationships: []
      }
      app_order_status_logs: {
        Row: {
          amount: number | null
          created_at: string | null
          driver_id: string | null
          id: number | null
          migrated_at: string | null
          old_id: string | null
          order_id: string | null
          raw_response: Json | null
          remaining_time: number | null
          scat_uuid: string | null
          source: string | null
          status_code: number | null
          status_message: string | null
        }
        Relationships: []
      }
      app_orders: {
        Row: {
          address: string | null
          amount: number | null
          billing_started_at: string | null
          bot_id: string | null
          bot_token: string | null
          cancelled_at: string | null
          car_brand: string | null
          car_color: string | null
          car_model: string | null
          car_number: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          current_status: number | null
          dest_latitude: number | null
          dest_longitude: number | null
          distance_m: number | null
          driver_assigned_at: string | null
          driver_id: string | null
          driver_name: string | null
          driver_reassignment_count: number | null
          dropoff_address: string | null
          final_status: number | null
          gps_accuracy: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          migrated_at: string | null
          note: string | null
          old_id: string | null
          phone: string | null
          polling_stopped_at: string | null
          region_id: string | null
          scat_uuid: string | null
          service_id: string | null
          source: string | null
          telegram_user_id: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      app_orders_with_reassignments: {
        Row: {
          created_at: string | null
          driver_reassignment_count: number | null
          final_status: number | null
          id: string | null
          old_id: string | null
          phone: string | null
          scat_uuid: string | null
          source: string | null
        }
        Relationships: []
      }
      app_ride_feedbacks: {
        Row: {
          car_number: string | null
          comment: string | null
          created_at: string | null
          driver_id: string | null
          driver_name: string | null
          id: number | null
          migrated_at: string | null
          old_id: string | null
          order_id: string | null
          rating: number | null
          source: string | null
          telegram_user_id: number | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: []
      }
      driver_ratings: {
        Row: {
          avg_rating: number | null
          driver_id: string | null
          driver_name: string | null
          total_feedbacks: number | null
        }
        Relationships: []
      }
      legacy_driver_ratings: {
        Row: {
          avg_rating: number | null
          driver_id: string | null
          driver_name: string | null
          source: string | null
          total_feedbacks: number | null
        }
        Relationships: []
      }
      legacy_orders_with_reassignments: {
        Row: {
          created_at: string | null
          driver_reassignment_count: number | null
          final_status: number | null
          id: string | null
          old_id: string | null
          phone: string | null
          scat_uuid: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          driver_reassignment_count?: number | null
          final_status?: number | null
          id?: string | null
          old_id?: string | null
          phone?: string | null
          scat_uuid?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          driver_reassignment_count?: number | null
          final_status?: number | null
          id?: string | null
          old_id?: string | null
          phone?: string | null
          scat_uuid?: string | null
          source?: string | null
        }
        Relationships: []
      }
      orders_with_reassignments: {
        Row: {
          created_at: string | null
          driver_reassignment_count: number | null
          final_status: number | null
          id: string | null
          phone: string | null
          scat_uuid: string | null
        }
        Insert: {
          created_at?: string | null
          driver_reassignment_count?: number | null
          final_status?: number | null
          id?: string | null
          phone?: string | null
          scat_uuid?: string | null
        }
        Update: {
          created_at?: string | null
          driver_reassignment_count?: number | null
          final_status?: number | null
          id?: string | null
          phone?: string | null
          scat_uuid?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_nearest_online_driver: {
        Args: {
          p_lat: number
          p_lon: number
          p_radius_m?: number
          p_region_id?: string
        }
        Returns: {
          distance_m: number
          driver_id: string
        }[]
      }
      increment_user_stats: {
        Args: {
          p_amount: number
          p_ride_minutes: number
          p_telegram_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      bot_event_type:
        | "bot_start"
        | "phone_registered"
        | "location_help_requested"
        | "location_received"
        | "location_blocked_gps"
        | "location_warned_gps"
        | "order_precost_called"
        | "order_created"
        | "order_create_failed"
        | "driver_assigned"
        | "order_status_changed"
        | "order_unknown_status"
        | "order_completed"
        | "order_cancelled"
        | "polling_timeout"
        | "polling_error"
        | "driver_reassigned"
        | "feedback_submitted"
        | "badge_upgraded"
        | "leaderboard_published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bot_event_type: [
        "bot_start",
        "phone_registered",
        "location_help_requested",
        "location_received",
        "location_blocked_gps",
        "location_warned_gps",
        "order_precost_called",
        "order_created",
        "order_create_failed",
        "driver_assigned",
        "order_status_changed",
        "order_unknown_status",
        "order_completed",
        "order_cancelled",
        "polling_timeout",
        "polling_error",
        "driver_reassigned",
        "feedback_submitted",
        "badge_upgraded",
        "leaderboard_published",
      ],
    },
  },
} as const
