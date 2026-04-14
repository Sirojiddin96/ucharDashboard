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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          latest_build: number
          latest_version: string
          notes_ru: string | null
          notes_uz: string | null
          platform: string
          store_url: string
          updated_at: string
        }
        Insert: {
          latest_build?: number
          latest_version: string
          notes_ru?: string | null
          notes_uz?: string | null
          platform: string
          store_url: string
          updated_at?: string
        }
        Update: {
          latest_build?: number
          latest_version?: string
          notes_ru?: string | null
          notes_uz?: string | null
          platform?: string
          store_url?: string
          updated_at?: string
        }
        Relationships: []
      }
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
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      default_addresses: {
        Row: {
          address: string
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
          address: string
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
          address?: string
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
            foreignKeyName: "default_addresses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_announcement_reads: {
        Row: {
          announcement_id: string
          driver_id: string
          read_at: string
        }
        Insert: {
          announcement_id: string
          driver_id: string
          read_at?: string
        }
        Update: {
          announcement_id?: string
          driver_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "driver_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_announcement_reads_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_announcements: {
        Row: {
          body: string | null
          body_ru: string | null
          body_uz: string | null
          created_at: string
          id: string
          is_active: boolean
          published_at: string
          title: string
          title_ru: string | null
          title_uz: string | null
        }
        Insert: {
          body?: string | null
          body_ru?: string | null
          body_uz?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string
          title: string
          title_ru?: string | null
          title_uz?: string | null
        }
        Update: {
          body?: string | null
          body_ru?: string | null
          body_uz?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string
          title?: string
          title_ru?: string | null
          title_uz?: string | null
        }
        Relationships: []
      }
      driver_applications: {
        Row: {
          call_sign: string | null
          car_brand_client: string
          car_brand_dispatcher: string
          car_color_client: string
          car_color_dispatcher: string
          car_reg_number: string
          city: string
          connection_type: string
          created_at: string
          driver_license: string
          first_name: string
          id: string
          last_name: string
          middle_name: string
          phone: string | null
          photo_url: string | null
          profile: string
          service: string
          status: string
          user_id: string | null
        }
        Insert: {
          call_sign?: string | null
          car_brand_client: string
          car_brand_dispatcher: string
          car_color_client: string
          car_color_dispatcher: string
          car_reg_number: string
          city: string
          connection_type?: string
          created_at?: string
          driver_license: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string
          phone?: string | null
          photo_url?: string | null
          profile: string
          service: string
          status?: string
          user_id?: string | null
        }
        Update: {
          call_sign?: string | null
          car_brand_client?: string
          car_brand_dispatcher?: string
          car_color_client?: string
          car_color_dispatcher?: string
          car_reg_number?: string
          city?: string
          connection_type?: string
          created_at?: string
          driver_license?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string
          phone?: string | null
          photo_url?: string | null
          profile?: string
          service?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_fcm_tokens: {
        Row: {
          driver_id: string
          token: string
          updated_at: string
        }
        Insert: {
          driver_id: string
          token: string
          updated_at?: string
        }
        Update: {
          driver_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_offers: {
        Row: {
          attempt_number: number
          distance_m: number | null
          driver_id: string
          dropoff_address: string | null
          estimated_fare: number | null
          expires_at: string
          id: string
          offered_at: string
          order_id: string
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lon: number | null
          responded_at: string | null
          status: string
        }
        Insert: {
          attempt_number?: number
          distance_m?: number | null
          driver_id: string
          dropoff_address?: string | null
          estimated_fare?: number | null
          expires_at: string
          id?: string
          offered_at?: string
          order_id: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lon?: number | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          attempt_number?: number
          distance_m?: number | null
          driver_id?: string
          dropoff_address?: string | null
          estimated_fare?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          order_id?: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lon?: number | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "driver_online_status_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          final_status: number | null
          gps_accuracy: number | null
          id: string
          latitude: number
          longitude: number
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
          final_status?: number | null
          gps_accuracy?: number | null
          id?: string
          latitude: number
          longitude: number
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
          final_status?: number | null
          gps_accuracy?: number | null
          id?: string
          latitude?: number
          longitude?: number
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
            foreignKeyName: "orders_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      regions: {
        Row: {
          bounds_ne_lat: number | null
          bounds_ne_lon: number | null
          bounds_sw_lat: number | null
          bounds_sw_lon: number | null
          center_lat: number
          center_lon: number
          country_code: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          min_gps_accuracy_meters: number | null
          name: string
          name_ru: string | null
          name_uz: string | null
          scat_zone_id: string | null
          slug: string
          sort_order: number
          timezone: string
          updated_at: string
        }
        Insert: {
          bounds_ne_lat?: number | null
          bounds_ne_lon?: number | null
          bounds_sw_lat?: number | null
          bounds_sw_lon?: number | null
          center_lat: number
          center_lon: number
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          min_gps_accuracy_meters?: number | null
          name: string
          name_ru?: string | null
          name_uz?: string | null
          scat_zone_id?: string | null
          slug: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          bounds_ne_lat?: number | null
          bounds_ne_lon?: number | null
          bounds_sw_lat?: number | null
          bounds_sw_lon?: number | null
          center_lat?: number
          center_lon?: number
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          min_gps_accuracy_meters?: number | null
          name?: string
          name_ru?: string | null
          name_uz?: string | null
          scat_zone_id?: string | null
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
            referencedRelation: "users"
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
      services: {
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
          region_id: string
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
          region_id: string
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
          region_id?: string
          service_class?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
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
          fare_policy_id: string | null
          id: string
          is_active: boolean
          minimum_fare: number
          name: string | null
          night_end_hour: number | null
          night_start_hour: number | null
          night_surcharge: number
          per_km: number
          per_min_driving: number
          per_min_waiting: number
          region_id: string
          service_id: string
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
          fare_policy_id?: string | null
          id?: string
          is_active?: boolean
          minimum_fare?: number
          name?: string | null
          night_end_hour?: number | null
          night_start_hour?: number | null
          night_surcharge?: number
          per_km?: number
          per_min_driving?: number
          per_min_waiting?: number
          region_id: string
          service_id: string
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
          fare_policy_id?: string | null
          id?: string
          is_active?: boolean
          minimum_fare?: number
          name?: string | null
          night_end_hour?: number | null
          night_start_hour?: number | null
          night_surcharge?: number
          per_km?: number
          per_min_driving?: number
          per_min_waiting?: number
          region_id?: string
          service_id?: string
          surge_multiplier?: number
          surge_preset?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariffs_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariffs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          badge: string
          badge_updated_at: string | null
          created_at: string
          fcm_token: string | null
          first_name: string | null
          id: string
          is_deleted: boolean
          last_name: string | null
          phone: string | null
          role: string
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
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string
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
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string
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
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_reassignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          reserved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          reserved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          reserved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      driver_ratings: {
        Row: {
          avg_rating: number | null
          driver_id: string | null
          driver_name: string | null
          total_feedbacks: number | null
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
      calculate_fare: {
        Args: { p_distance_m: number; p_duration_s: number; p_rate_id: number }
        Returns: number
      }
      find_nearest_online_driver: {
        Args: {
          p_exclude_ids?: string[]
          p_lat: number
          p_lon: number
          p_radius_m?: number
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
      wallet_charge: {
        Args: { p_final_amount: number; p_order_id: string }
        Returns: undefined
      }
      wallet_release: { Args: { p_order_id: string }; Returns: undefined }
      wallet_reserve: {
        Args: { p_amount: number; p_driver_id: string; p_order_id: string }
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
  graphql_public: {
    Enums: {},
  },
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
