export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_important: boolean | null
          title: string
          tournament_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_important?: boolean | null
          title: string
          tournament_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_important?: boolean | null
          title?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      map_veto_actions: {
        Row: {
          action: Database["public"]["Enums"]["map_veto_action"]
          id: string
          map_id: string | null
          order_number: number
          performed_at: string | null
          performed_by: string | null
          team_id: string | null
          veto_session_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["map_veto_action"]
          id?: string
          map_id?: string | null
          order_number: number
          performed_at?: string | null
          performed_by?: string | null
          team_id?: string | null
          veto_session_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["map_veto_action"]
          id?: string
          map_id?: string | null
          order_number?: number
          performed_at?: string | null
          performed_by?: string | null
          team_id?: string | null
          veto_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_veto_actions_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_actions_veto_session_id_fkey"
            columns: ["veto_session_id"]
            isOneToOne: false
            referencedRelation: "map_veto_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      map_veto_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_turn_team_id: string | null
          id: string
          match_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_turn_team_id?: string | null
          id?: string
          match_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_turn_team_id?: string | null
          id?: string
          match_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "map_veto_sessions_current_turn_team_id_fkey"
            columns: ["current_turn_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_sessions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_maps: {
        Row: {
          completed_at: string | null
          id: string
          map_id: string | null
          map_order: number
          match_id: string | null
          started_at: string | null
          team1_score: number | null
          team2_score: number | null
          winner_team_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          map_id?: string | null
          map_order: number
          match_id?: string | null
          started_at?: string | null
          team1_score?: number | null
          team2_score?: number | null
          winner_team_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          map_id?: string | null
          map_order?: number
          match_id?: string | null
          started_at?: string | null
          team1_score?: number | null
          team2_score?: number | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_maps_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_maps_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_maps_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          best_of: number | null
          bracket_position: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          match_number: number
          notes: string | null
          round_number: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          stream_url: string | null
          team1_id: string | null
          team2_id: string | null
          tournament_id: string | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          best_of?: number | null
          bracket_position?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number: number
          notes?: string | null
          round_number: number
          scheduled_time?: string | null
          score_team1?: number | null
          score_team2?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          stream_url?: string | null
          team1_id?: string | null
          team2_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          best_of?: number | null
          bracket_position?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number?: number
          notes?: string | null
          round_number?: number
          scheduled_time?: string | null
          score_team1?: number | null
          score_team2?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          stream_url?: string | null
          team1_id?: string | null
          team2_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      phantom_players: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          tournament_id: string
          weight_rating: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          tournament_id: string
          weight_rating?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          tournament_id?: string
          weight_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phantom_players_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phantom_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          is_captain: boolean | null
          joined_at: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          name: string
          seed: number | null
          status: Database["public"]["Enums"]["team_status"] | null
          total_rank_points: number | null
          tournament_id: string | null
          updated_at: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          seed?: number | null
          status?: Database["public"]["Enums"]["team_status"] | null
          total_rank_points?: number | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["team_status"] | null
          total_rank_points?: number | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_signups: {
        Row: {
          checked_in_at: string | null
          id: string
          is_checked_in: boolean | null
          is_substitute: boolean | null
          signed_up_at: string | null
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          is_substitute?: boolean | null
          signed_up_at?: string | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          is_substitute?: boolean | null
          signed_up_at?: string | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_signups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bracket_type: string | null
          check_in_ends_at: string | null
          check_in_required: boolean | null
          check_in_starts_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          match_format: Database["public"]["Enums"]["match_format"] | null
          max_players: number
          max_teams: number
          name: string
          prize_pool: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["tournament_status"] | null
          updated_at: string | null
        }
        Insert: {
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          match_format?: Database["public"]["Enums"]["match_format"] | null
          max_players?: number
          max_teams: number
          name: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          updated_at?: string | null
        }
        Update: {
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          match_format?: Database["public"]["Enums"]["match_format"] | null
          max_players?: number
          max_teams?: number
          name?: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ban_expires_at: string | null
          ban_reason: string | null
          created_at: string | null
          current_rank: string | null
          discord_id: string | null
          discord_username: string | null
          id: string
          is_banned: boolean | null
          is_phantom: boolean | null
          last_rank_update: string | null
          mvp_awards: number | null
          peak_rank: string | null
          rank_points: number | null
          riot_id: string | null
          riot_id_last_updated: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          tournaments_played: number | null
          tournaments_won: number | null
          updated_at: string | null
          weight_rating: number | null
        }
        Insert: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id: string
          is_banned?: boolean | null
          is_phantom?: boolean | null
          last_rank_update?: string | null
          mvp_awards?: number | null
          peak_rank?: string | null
          rank_points?: number | null
          riot_id?: string | null
          riot_id_last_updated?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          weight_rating?: number | null
        }
        Update: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          is_banned?: boolean | null
          is_phantom?: boolean | null
          last_rank_update?: string | null
          mvp_awards?: number | null
          peak_rank?: string | null
          rank_points?: number | null
          riot_id?: string | null
          riot_id_last_updated?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          weight_rating?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_team_captain: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      map_veto_action: "ban" | "pick"
      map_veto_status: "pending" | "in_progress" | "completed"
      match_format: "BO1" | "BO3" | "BO5"
      match_status: "pending" | "live" | "completed"
      team_status: "pending" | "confirmed" | "eliminated" | "winner"
      tournament_status:
        | "draft"
        | "open"
        | "balancing"
        | "live"
        | "completed"
        | "archived"
      user_role: "admin" | "player" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      map_veto_action: ["ban", "pick"],
      map_veto_status: ["pending", "in_progress", "completed"],
      match_format: ["BO1", "BO3", "BO5"],
      match_status: ["pending", "live", "completed"],
      team_status: ["pending", "confirmed", "eliminated", "winner"],
      tournament_status: [
        "draft",
        "open",
        "balancing",
        "live",
        "completed",
        "archived",
      ],
      user_role: ["admin", "player", "viewer"],
    },
  },
} as const
