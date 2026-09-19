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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chat_history: {
        Row: {
          content: string
          created_at: string
          id: number
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      completed_workouts: {
        Row: {
          actual_distance_km: number | null
          actual_duration_minutes: number | null
          avg_heart_rate: number | null
          avg_pace_or_power: string | null
          created_at: string
          discipline: Database["public"]["Enums"]["discipline"]
          execution_date: string
          external_activity_id: string | null
          id: number
          notes: string | null
          planned_workout_id: number | null
          rpe: number | null
          source: Database["public"]["Enums"]["workout_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          avg_heart_rate?: number | null
          avg_pace_or_power?: string | null
          created_at?: string
          discipline: Database["public"]["Enums"]["discipline"]
          execution_date: string
          external_activity_id?: string | null
          id?: never
          notes?: string | null
          planned_workout_id?: number | null
          rpe?: number | null
          source?: Database["public"]["Enums"]["workout_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          avg_heart_rate?: number | null
          avg_pace_or_power?: string | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          execution_date?: string
          external_activity_id?: string | null
          id?: never
          notes?: string | null
          planned_workout_id?: number | null
          rpe?: number | null
          source?: Database["public"]["Enums"]["workout_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_workouts_planned_workout_id_fkey"
            columns: ["planned_workout_id"]
            isOneToOne: false
            referencedRelation: "planned_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          athlete_id: string | null
          connected_at: string | null
          created_at: string
          expires_at: string | null
          id: number
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          athlete_id?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: never
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          athlete_id?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: never
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      planned_workouts: {
        Row: {
          created_at: string
          discipline: Database["public"]["Enums"]["discipline"]
          id: number
          notes: string | null
          planned_distance_km: number | null
          planned_duration_minutes: number | null
          target_date: string
          target_zone: Database["public"]["Enums"]["intensity_zone"] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline: Database["public"]["Enums"]["discipline"]
          id?: never
          notes?: string | null
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          target_date: string
          target_zone?: Database["public"]["Enums"]["intensity_zone"] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          id?: never
          notes?: string | null
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          target_date?: string
          target_zone?: Database["public"]["Enums"]["intensity_zone"] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          fitness_level: Database["public"]["Enums"]["fitness_level"]
          id: string
          max_heart_rate: number | null
          primary_discipline: Database["public"]["Enums"]["discipline"]
          resting_heart_rate: number | null
          target_race_date: string | null
          target_race_distance: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          fitness_level?: Database["public"]["Enums"]["fitness_level"]
          id: string
          max_heart_rate?: number | null
          primary_discipline?: Database["public"]["Enums"]["discipline"]
          resting_heart_rate?: number | null
          target_race_date?: string | null
          target_race_distance?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          fitness_level?: Database["public"]["Enums"]["fitness_level"]
          id?: string
          max_heart_rate?: number | null
          primary_discipline?: Database["public"]["Enums"]["discipline"]
          resting_heart_rate?: number | null
          target_race_date?: string | null
          target_race_distance?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      discipline: "swim" | "bike" | "run" | "strength" | "other"
      fitness_level: "beginner" | "intermediate" | "advanced"
      intensity_zone: "z1" | "z2" | "z3" | "z4" | "z5"
      workout_source: "manual" | "strava"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      discipline: ["swim", "bike", "run", "strength", "other"],
      fitness_level: ["beginner", "intermediate", "advanced"],
      intensity_zone: ["z1", "z2", "z3", "z4", "z5"],
      workout_source: ["manual", "strava"],
    },
  },
} as const
