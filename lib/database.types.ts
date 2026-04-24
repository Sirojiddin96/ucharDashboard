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
          amount: number | null
          billing_started_at: string | null
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
          scat_uuid: string | null
          telegram_user_id: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          billing_started_at?: string | null
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
          scat_uuid?: string | null
          telegram_user_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          billing_started_at?: string | null
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
          scat_uuid?: string | null
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
      tax_users: {
        Row: {
          auth_user_id: string | null
          badge: string
          badge_updated_at: string | null
          created_at: string
          fcm_token: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string
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
          last_name?: string | null
          phone: string
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
          last_name?: string | null
          phone?: string
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
