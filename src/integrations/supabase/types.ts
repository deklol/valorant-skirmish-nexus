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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points: number
          rarity: string
          requirement_metadata: Json | null
          requirement_type: string
          requirement_value: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          points?: number
          rarity?: string
          requirement_metadata?: Json | null
          requirement_type: string
          requirement_value: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          rarity?: string
          requirement_metadata?: Json | null
          requirement_type?: string
          requirement_value?: number
          updated_at?: string
        }
        Relationships: []
      }
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
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
      app_settings: {
        Row: {
          announcement_id: string | null
          app_name: string
          id: string
          last_updated_at: string | null
          notification_test_mode: boolean
          twitch_channel: string | null
          twitch_embed_enabled: boolean
        }
        Insert: {
          announcement_id?: string | null
          app_name?: string
          id?: string
          last_updated_at?: string | null
          notification_test_mode?: boolean
          twitch_channel?: string | null
          twitch_embed_enabled?: boolean
        }
        Update: {
          announcement_id?: string | null
          app_name?: string
          id?: string
          last_updated_at?: string | null
          notification_test_mode?: boolean
          twitch_channel?: string | null
          twitch_embed_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_announcement"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          map_display_name: string | null
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
          ip_address?: unknown
          map_display_name?: string | null
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
          ip_address?: unknown
          map_display_name?: string | null
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
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_queue: {
        Row: {
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_data: Json | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_data?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fulfillment_orders: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          fulfillment_notes: string | null
          id: string
          purchase_id: string
          shop_item_id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          fulfillment_notes?: string | null
          id?: string
          purchase_id: string
          shop_item_id: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          fulfillment_notes?: string | null
          id?: string
          purchase_id?: string
          shop_item_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_orders_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "user_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_user_id_fkey"
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
          side_choice: string | null
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
          side_choice?: string | null
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
          side_choice?: string | null
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
            referencedRelation: "public_user_profiles"
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
          away_team_id: string | null
          completed_at: string | null
          created_at: string | null
          current_turn_team_id: string | null
          home_team_id: string | null
          id: string
          match_id: string | null
          roll_initiator_id: string | null
          roll_seed: string | null
          roll_timestamp: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order: Json | null
        }
        Insert: {
          away_team_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_turn_team_id?: string | null
          home_team_id?: string | null
          id?: string
          match_id?: string | null
          roll_initiator_id?: string | null
          roll_seed?: string | null
          roll_timestamp?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order?: Json | null
        }
        Update: {
          away_team_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_turn_team_id?: string | null
          home_team_id?: string | null
          id?: string
          match_id?: string | null
          roll_initiator_id?: string | null
          roll_seed?: string | null
          roll_timestamp?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["map_veto_status"] | null
          veto_order?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "map_veto_sessions_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_sessions_current_turn_team_id_fkey"
            columns: ["current_turn_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_veto_sessions_home_team_id_fkey"
            columns: ["home_team_id"]
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
          is_active: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
      match_result_submissions: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          match_id: string
          score_team1: number
          score_team2: number
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          match_id: string
          score_team1?: number
          score_team2?: number
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          match_id?: string
          score_team1?: number
          score_team2?: number
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_result_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_result_submissions_winner_id_fkey"
            columns: ["winner_id"]
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
          map_veto_enabled: boolean | null
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
          map_veto_enabled?: boolean | null
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
          map_veto_enabled?: boolean | null
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
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          match_id: string | null
          message: string
          read: boolean | null
          team_id: string | null
          title: string
          tournament_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          match_id?: string | null
          message: string
          read?: boolean | null
          team_id?: string | null
          title: string
          tournament_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          match_id?: string | null
          message?: string
          read?: boolean | null
          team_id?: string | null
          title?: string
          tournament_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      persistent_team_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          invited_by: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          invited_by: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persistent_team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persistent_team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persistent_team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "persistent_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      persistent_team_members: {
        Row: {
          id: string
          is_captain: boolean | null
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persistent_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "persistent_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persistent_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persistent_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      persistent_teams: {
        Row: {
          avg_rank_points: number | null
          captain_id: string
          created_at: string | null
          description: string | null
          id: string
          invite_code: string | null
          is_active: boolean | null
          losses: number | null
          max_members: number | null
          name: string
          total_rank_points: number | null
          tournaments_played: number | null
          tournaments_won: number | null
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          avg_rank_points?: number | null
          captain_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          losses?: number | null
          max_members?: number | null
          name: string
          total_rank_points?: number | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          avg_rank_points?: number | null
          captain_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          losses?: number | null
          max_members?: number | null
          name?: string
          total_rank_points?: number | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "persistent_teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persistent_teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          subscription_data: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subscription_data: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subscription_data?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quick_match_queue: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_match_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_match_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_match_sessions: {
        Row: {
          balance_analysis: Json | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          discord_channel_id: string
          discord_message_id: string | null
          id: string
          match_id: string | null
          selected_map_id: string | null
          session_data: Json | null
          started_at: string | null
          status: string
          team_a_data: Json | null
          team_b_data: Json | null
          updated_at: string
        }
        Insert: {
          balance_analysis?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discord_channel_id: string
          discord_message_id?: string | null
          id?: string
          match_id?: string | null
          selected_map_id?: string | null
          session_data?: Json | null
          started_at?: string | null
          status?: string
          team_a_data?: Json | null
          team_b_data?: Json | null
          updated_at?: string
        }
        Update: {
          balance_analysis?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discord_channel_id?: string
          discord_message_id?: string | null
          id?: string
          match_id?: string | null
          selected_map_id?: string | null
          session_data?: Json | null
          started_at?: string | null
          status?: string
          team_a_data?: Json | null
          team_b_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_match_sessions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_match_sessions_selected_map_id_fkey"
            columns: ["selected_map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_match_votes: {
        Row: {
          discord_id: string
          id: string
          map_id: string
          session_id: string
          user_id: string
          voted_at: string
        }
        Insert: {
          discord_id: string
          id?: string
          map_id: string
          session_id: string
          user_id: string
          voted_at?: string
        }
        Update: {
          discord_id?: string
          id?: string
          map_id?: string
          session_id?: string
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_match_votes_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_match_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quick_match_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_history: {
        Row: {
          created_at: string
          id: string
          new_rank: string
          previous_rank: string | null
          rank_change_type: string
          rank_points_change: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_rank: string
          previous_rank?: string | null
          rank_change_type: string
          rank_points_change?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_rank?: string
          previous_rank?: string | null
          rank_change_type?: string
          rank_points_change?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: Database["public"]["Enums"]["shop_item_category"]
          created_at: string
          created_by: string | null
          description: string
          fulfillment_instructions: string | null
          fulfillment_required: boolean
          id: string
          is_active: boolean
          item_data: Json
          name: string
          price_points: number
          quantity_available: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["shop_item_category"]
          created_at?: string
          created_by?: string | null
          description: string
          fulfillment_instructions?: string | null
          fulfillment_required?: boolean
          id?: string
          is_active?: boolean
          item_data?: Json
          name: string
          price_points: number
          quantity_available?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["shop_item_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          fulfillment_instructions?: string | null
          fulfillment_required?: boolean
          id?: string
          is_active?: boolean
          item_data?: Json
          name?: string
          price_points?: number
          quantity_available?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
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
            referencedRelation: "public_user_profiles"
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
      team_session_modifications: {
        Row: {
          admin_user_id: string
          affected_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          modification_type: string
          new_team_weight: number | null
          original_team_weight: number | null
          reason: string | null
          stats_applied: Json | null
          stats_reversed: Json | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          admin_user_id: string
          affected_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          modification_type: string
          new_team_weight?: number | null
          original_team_weight?: number | null
          reason?: string | null
          stats_applied?: Json | null
          stats_reversed?: Json | null
          team_id: string
          tournament_id: string
        }
        Update: {
          admin_user_id?: string
          affected_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          modification_type?: string
          new_team_weight?: number | null
          original_team_weight?: number | null
          reason?: string | null
          stats_applied?: Json | null
          stats_reversed?: Json | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: []
      }
      team_tournament_registrations: {
        Row: {
          id: string
          registered_at: string | null
          status: string | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          id?: string
          registered_at?: string | null
          status?: string | null
          team_id: string
          tournament_id: string
        }
        Update: {
          id?: string
          registered_at?: string | null
          status?: string | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "persistent_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
      tournament_adaptive_weights: {
        Row: {
          adaptive_factor: number
          calculated_adaptive_weight: number
          calculation_reasoning: string | null
          created_at: string | null
          current_rank: string | null
          current_rank_points: number
          id: string
          manual_override_applied: boolean | null
          peak_rank: string | null
          peak_rank_points: number
          rank_decay_factor: number | null
          time_since_peak_days: number | null
          tournament_id: string
          updated_at: string | null
          user_id: string
          weight_source: string
        }
        Insert: {
          adaptive_factor?: number
          calculated_adaptive_weight?: number
          calculation_reasoning?: string | null
          created_at?: string | null
          current_rank?: string | null
          current_rank_points?: number
          id?: string
          manual_override_applied?: boolean | null
          peak_rank?: string | null
          peak_rank_points?: number
          rank_decay_factor?: number | null
          time_since_peak_days?: number | null
          tournament_id: string
          updated_at?: string | null
          user_id: string
          weight_source?: string
        }
        Update: {
          adaptive_factor?: number
          calculated_adaptive_weight?: number
          calculation_reasoning?: string | null
          created_at?: string | null
          current_rank?: string | null
          current_rank_points?: number
          id?: string
          manual_override_applied?: boolean | null
          peak_rank?: string | null
          peak_rank_points?: number
          rank_decay_factor?: number | null
          time_since_peak_days?: number | null
          tournament_id?: string
          updated_at?: string | null
          user_id?: string
          weight_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_adaptive_weights_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_adaptive_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_adaptive_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_analytics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number | null
          recorded_at: string | null
          tournament_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number | null
          recorded_at?: string | null
          tournament_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number | null
          recorded_at?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_analytics_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_page_views: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          referrer: string | null
          tournament_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          tournament_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          tournament_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_page_views_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_signups: {
        Row: {
          available: boolean | null
          checked_in_at: string | null
          id: string
          is_checked_in: boolean | null
          is_substitute: boolean | null
          notes: string | null
          priority: number | null
          signed_up_at: string | null
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          available?: boolean | null
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          is_substitute?: boolean | null
          notes?: string | null
          priority?: number | null
          signed_up_at?: string | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          available?: boolean | null
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          is_substitute?: boolean | null
          notes?: string | null
          priority?: number | null
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
            referencedRelation: "public_user_profiles"
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
      tournament_talent: {
        Row: {
          caster_1_id: string | null
          caster_1_manual_name: string | null
          caster_1_social_link: string | null
          caster_2_id: string | null
          caster_2_manual_name: string | null
          caster_2_social_link: string | null
          created_at: string
          id: string
          lead_tournament_admin_id: string | null
          observer_id: string | null
          observer_manual_name: string | null
          observer_social_link: string | null
          production_assistant_id: string | null
          production_assistant_manual_name: string | null
          production_assistant_social_link: string | null
          production_lead_id: string | null
          production_lead_manual_name: string | null
          replay_op_id: string | null
          replay_op_manual_name: string | null
          replay_op_social_link: string | null
          tournament_admin_ids: string[] | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          caster_1_id?: string | null
          caster_1_manual_name?: string | null
          caster_1_social_link?: string | null
          caster_2_id?: string | null
          caster_2_manual_name?: string | null
          caster_2_social_link?: string | null
          created_at?: string
          id?: string
          lead_tournament_admin_id?: string | null
          observer_id?: string | null
          observer_manual_name?: string | null
          observer_social_link?: string | null
          production_assistant_id?: string | null
          production_assistant_manual_name?: string | null
          production_assistant_social_link?: string | null
          production_lead_id?: string | null
          production_lead_manual_name?: string | null
          replay_op_id?: string | null
          replay_op_manual_name?: string | null
          replay_op_social_link?: string | null
          tournament_admin_ids?: string[] | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          caster_1_id?: string | null
          caster_1_manual_name?: string | null
          caster_1_social_link?: string | null
          caster_2_id?: string | null
          caster_2_manual_name?: string | null
          caster_2_social_link?: string | null
          created_at?: string
          id?: string
          lead_tournament_admin_id?: string | null
          observer_id?: string | null
          observer_manual_name?: string | null
          observer_social_link?: string | null
          production_assistant_id?: string | null
          production_assistant_manual_name?: string | null
          production_assistant_social_link?: string | null
          production_lead_id?: string | null
          production_lead_manual_name?: string | null
          replay_op_id?: string | null
          replay_op_manual_name?: string | null
          replay_op_social_link?: string | null
          tournament_admin_ids?: string[] | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          balance_analysis: Json | null
          banner_image_url: string | null
          bracket_generated: boolean | null
          bracket_type: string | null
          check_in_ends_at: string | null
          check_in_required: boolean | null
          check_in_starts_at: string | null
          created_at: string | null
          created_by: string | null
          day_of_reminder_sent: boolean | null
          description: string | null
          enable_adaptive_weights: boolean | null
          enable_map_veto: boolean | null
          final_match_format: Database["public"]["Enums"]["match_format"] | null
          generating_bracket: boolean | null
          id: string
          map_pool: Json | null
          map_veto_required_rounds: Json | null
          match_format: Database["public"]["Enums"]["match_format"] | null
          max_players: number
          max_teams: number
          name: string
          prize_pool: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          registration_type:
            | Database["public"]["Enums"]["registration_type"]
            | null
          semifinal_match_format:
            | Database["public"]["Enums"]["match_format"]
            | null
          start_time: string | null
          status: Database["public"]["Enums"]["tournament_status"] | null
          team_size: number | null
          updated_at: string | null
        }
        Insert: {
          balance_analysis?: Json | null
          banner_image_url?: string | null
          bracket_generated?: boolean | null
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_reminder_sent?: boolean | null
          description?: string | null
          enable_adaptive_weights?: boolean | null
          enable_map_veto?: boolean | null
          final_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
          generating_bracket?: boolean | null
          id?: string
          map_pool?: Json | null
          map_veto_required_rounds?: Json | null
          match_format?: Database["public"]["Enums"]["match_format"] | null
          max_players?: number
          max_teams: number
          name: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type"]
            | null
          semifinal_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          team_size?: number | null
          updated_at?: string | null
        }
        Update: {
          balance_analysis?: Json | null
          banner_image_url?: string | null
          bracket_generated?: boolean | null
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_reminder_sent?: boolean | null
          description?: string | null
          enable_adaptive_weights?: boolean | null
          enable_map_veto?: boolean | null
          final_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
          generating_bracket?: boolean | null
          id?: string
          map_pool?: Json | null
          map_veto_required_rounds?: Json | null
          match_format?: Database["public"]["Enums"]["match_format"] | null
          max_players?: number
          max_teams?: number
          name?: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type"]
            | null
          semifinal_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievement_progress: {
        Row: {
          achievement_id: string
          current_value: number
          id: string
          last_updated: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_effects: {
        Row: {
          activated_at: string
          effect_data: Json
          effect_type: string
          expires_at: string | null
          id: string
          purchase_id: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          effect_data?: Json
          effect_type: string
          expires_at?: string | null
          id?: string
          purchase_id?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string
          effect_data?: Json
          effect_type?: string
          expires_at?: string | null
          id?: string
          purchase_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_effects_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "user_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_effects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_effects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          followed_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          followed_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          followed_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          email_frequency: string | null
          id: string
          match_assigned: boolean | null
          match_ready: boolean | null
          new_tournament_posted: boolean | null
          post_results: boolean | null
          push_enabled: boolean | null
          team_assigned: boolean | null
          tournament_checkin_time: boolean | null
          tournament_signups_open: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          match_assigned?: boolean | null
          match_ready?: boolean | null
          new_tournament_posted?: boolean | null
          post_results?: boolean | null
          push_enabled?: boolean | null
          team_assigned?: boolean | null
          tournament_checkin_time?: boolean | null
          tournament_signups_open?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          match_assigned?: boolean | null
          match_ready?: boolean | null
          new_tournament_posted?: boolean | null
          post_results?: boolean | null
          push_enabled?: boolean | null
          team_assigned?: boolean | null
          tournament_checkin_time?: boolean | null
          tournament_signups_open?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          step_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          step_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          step_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          id: string
          points_spent: number
          purchase_data: Json
          purchased_at: string
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          shop_item_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          user_id: string
        }
        Insert: {
          id?: string
          points_spent: number
          purchase_data?: Json
          purchased_at?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          shop_item_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          user_id: string
        }
        Update: {
          id?: string
          points_spent?: number
          purchase_data?: Json
          purchased_at?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          shop_item_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
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
          bio: string | null
          created_at: string | null
          current_rank: string | null
          discord_avatar_url: string | null
          discord_id: string | null
          discord_username: string | null
          id: string
          is_banned: boolean | null
          is_phantom: boolean | null
          last_rank_update: string | null
          last_seen: string | null
          looking_for_team: boolean | null
          losses: number | null
          manual_rank_override: string | null
          manual_weight_override: number | null
          mvp_awards: number | null
          peak_rank: string | null
          profile_visibility: string | null
          rank_override_reason: string | null
          rank_override_set_at: string | null
          rank_override_set_by: string | null
          rank_points: number | null
          riot_id: string | null
          riot_id_last_updated: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          spendable_points: number
          status_message: string | null
          tournaments_played: number | null
          tournaments_won: number | null
          twitch_handle: string | null
          twitter_handle: string | null
          updated_at: string | null
          use_manual_override: boolean | null
          valorant_agent: string | null
          valorant_role: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating: number | null
          wins: number | null
        }
        Insert: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_avatar_url?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id: string
          is_banned?: boolean | null
          is_phantom?: boolean | null
          last_rank_update?: string | null
          last_seen?: string | null
          looking_for_team?: boolean | null
          losses?: number | null
          manual_rank_override?: string | null
          manual_weight_override?: number | null
          mvp_awards?: number | null
          peak_rank?: string | null
          profile_visibility?: string | null
          rank_override_reason?: string | null
          rank_override_set_at?: string | null
          rank_override_set_by?: string | null
          rank_points?: number | null
          riot_id?: string | null
          riot_id_last_updated?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          spendable_points?: number
          status_message?: string | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          use_manual_override?: boolean | null
          valorant_agent?: string | null
          valorant_role?: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating?: number | null
          wins?: number | null
        }
        Update: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_avatar_url?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          is_banned?: boolean | null
          is_phantom?: boolean | null
          last_rank_update?: string | null
          last_seen?: string | null
          looking_for_team?: boolean | null
          losses?: number | null
          manual_rank_override?: string | null
          manual_weight_override?: number | null
          mvp_awards?: number | null
          peak_rank?: string | null
          profile_visibility?: string | null
          rank_override_reason?: string | null
          rank_override_set_at?: string | null
          rank_override_set_by?: string | null
          rank_points?: number | null
          riot_id?: string | null
          riot_id_last_updated?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          spendable_points?: number
          status_message?: string | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          use_manual_override?: boolean | null
          valorant_agent?: string | null
          valorant_role?: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_rank_override_set_by_fkey"
            columns: ["rank_override_set_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_rank_override_set_by_fkey"
            columns: ["rank_override_set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vods: {
        Row: {
          casters: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          embed_id: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          production_team: string[] | null
          thumbnail_url: string | null
          title: string
          tournament_id: string | null
          updated_at: string | null
          video_platform: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          casters?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_id?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          production_team?: string[] | null
          thumbnail_url?: string | null
          title: string
          tournament_id?: string | null
          updated_at?: string | null
          video_platform?: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          casters?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_id?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          production_team?: string[] | null
          thumbnail_url?: string | null
          title?: string
          tournament_id?: string | null
          updated_at?: string | null
          video_platform?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vods_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_user_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          current_rank: string | null
          discord_avatar_url: string | null
          discord_username: string | null
          id: string | null
          is_admin_user: boolean | null
          is_phantom: boolean | null
          looking_for_team: boolean | null
          losses: number | null
          mvp_awards: number | null
          peak_rank: string | null
          rank_points: number | null
          status_message: string | null
          tournaments_played: number | null
          tournaments_won: number | null
          twitch_handle: string | null
          twitter_handle: string | null
          valorant_agent: string | null
          valorant_role: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating: number | null
          wins: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_avatar_url?: string | null
          discord_username?: string | null
          id?: string | null
          is_admin_user?: never
          is_phantom?: boolean | null
          looking_for_team?: boolean | null
          losses?: number | null
          mvp_awards?: number | null
          peak_rank?: string | null
          rank_points?: number | null
          status_message?: string | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          valorant_agent?: string | null
          valorant_role?: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating?: number | null
          wins?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          current_rank?: string | null
          discord_avatar_url?: string | null
          discord_username?: string | null
          id?: string | null
          is_admin_user?: never
          is_phantom?: boolean | null
          looking_for_team?: boolean | null
          losses?: number | null
          mvp_awards?: number | null
          peak_rank?: string | null
          rank_points?: number | null
          status_message?: string | null
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          valorant_agent?: string | null
          valorant_role?: Database["public"]["Enums"]["valorant_role"] | null
          weight_rating?: number | null
          wins?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_name_effect: {
        Args: { p_purchase_id: string; p_user_id: string }
        Returns: Json
      }
      add_player_to_team: {
        Args: {
          p_is_captain?: boolean
          p_reason?: string
          p_team_id: string
          p_tournament_id: string
          p_user_id: string
        }
        Returns: Json
      }
      advance_match_winner_secure: {
        Args: {
          p_loser_id: string
          p_match_id: string
          p_score_team1?: number
          p_score_team2?: number
          p_tournament_id: string
          p_winner_id: string
        }
        Returns: Json
      }
      can_user_perform_veto: {
        Args: {
          p_team_id: string
          p_user_id: string
          p_veto_session_id: string
        }
        Returns: string
      }
      capture_active_map_pool: { Args: never; Returns: Json }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: {
          achievement_name: string
          newly_earned_achievement_id: string
        }[]
      }
      choose_veto_side: {
        Args: { p_match_id: string; p_side_choice: string; p_user_id: string }
        Returns: Json
      }
      complete_bracket_generation: {
        Args: { p_success: boolean; p_tournament_id: string }
        Returns: Json
      }
      create_enhanced_notification: {
        Args: {
          p_data?: Json
          p_email_subject?: string
          p_match_id?: string
          p_message: string
          p_send_email?: boolean
          p_send_push?: boolean
          p_team_id?: string
          p_title: string
          p_tournament_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_missing_user_profile: {
        Args: { user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_expires_at?: string
          p_match_id?: string
          p_message: string
          p_team_id?: string
          p_title: string
          p_tournament_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      deactivate_name_effect: { Args: { p_user_id: string }; Returns: Json }
      diagnose_bracket_progression: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      disqualify_team: {
        Args: { p_reason?: string; p_team_id: string }
        Returns: Json
      }
      extract_video_embed_id: {
        Args: { platform: string; video_url: string }
        Returns: string
      }
      fix_all_bracket_progression: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      fix_missing_match_statistics: {
        Args: never
        Returns: {
          losses_added: number
          matches_processed: number
          wins_added: number
        }[]
      }
      fix_missing_tournament_wins: { Args: never; Returns: number }
      force_advance_team: {
        Args: { p_reason?: string; p_target_round: number; p_team_id: string }
        Returns: Json
      }
      generate_bracket_secure: {
        Args: { p_force?: boolean; p_tournament_id: string }
        Returns: Json
      }
      generate_team_invite_code: { Args: never; Returns: string }
      get_achievement_leaders: {
        Args: never
        Returns: {
          most_achievements_count: number
          most_achievements_user_id: string
          most_achievements_username: string
          top_points_total: number
          top_points_user_id: string
          top_points_username: string
        }[]
      }
      get_bracket_matches: {
        Args: { p_tournament_id: string }
        Returns: {
          id: string
          map_veto_enabled: boolean
          match_number: number
          round_number: number
          scheduled_time: string
          score_team1: number
          score_team2: number
          status: string
          team1: Json
          team1_id: string
          team2: Json
          team2_id: string
          tournament_id: string
          winner_id: string
        }[]
      }
      get_bracket_tournament_meta: {
        Args: { p_tournament_id: string }
        Returns: {
          bracket_type: string
          id: string
          match_format: string
          max_teams: number
          name: string
          status: string
        }[]
      }
      get_next_substitute: {
        Args: { p_tournament_id: string }
        Returns: {
          current_rank: string
          discord_username: string
          priority: number
          rank_points: number
          riot_id: string
          user_id: string
        }[]
      }
      get_tournament_map_pool: {
        Args: { p_tournament_id: string }
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          name: string
          thumbnail_url: string
        }[]
      }
      get_user_achievement_summary: {
        Args: { p_user_id: string }
        Returns: {
          achievement_rank: number
          latest_achievement_date: string
          latest_achievement_name: string
          total_achievements: number
          total_points: number
        }[]
      }
      get_user_follow_stats: {
        Args: { user_id: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_user_info_for_audit: { Args: never; Returns: Json }
      get_user_match_history: {
        Args: { match_limit?: number; profile_user_id: string }
        Returns: {
          is_winner: boolean
          match_date: string
          match_id: string
          opponent_team_name: string
          opponent_team_score: number
          team_name: string
          tournament_name: string
          user_team_score: number
        }[]
      }
      get_user_profile: {
        Args: { profile_user_id: string }
        Returns: {
          bio: string
          created_at: string
          current_rank: string
          discord_avatar_url: string
          discord_username: string
          id: string
          last_seen: string
          looking_for_team: boolean
          losses: number
          mvp_awards: number
          peak_rank: string
          profile_visibility: string
          rank_points: number
          riot_id: string
          role: string
          status_message: string
          tournaments_played: number
          tournaments_won: number
          twitch_handle: string
          twitter_handle: string
          valorant_agent: string
          valorant_role: Database["public"]["Enums"]["valorant_role"]
          wins: number
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tournament_history: {
        Args: { profile_user_id: string }
        Returns: {
          placement: string
          team_name: string
          team_status: string
          tournament_date: string
          tournament_id: string
          tournament_name: string
        }[]
      }
      increment_team_losses: { Args: { p_team_id: string }; Returns: undefined }
      increment_team_tournament_wins: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_team_tournaments_played: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_team_wins: { Args: { p_team_id: string }; Returns: undefined }
      increment_user_losses: { Args: { user_id: string }; Returns: undefined }
      increment_user_tournament_wins: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_user_tournaments_played: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_user_wins: { Args: { user_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_captain: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_user_on_team: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      log_application_error: {
        Args: {
          p_component: string
          p_error_code?: string
          p_error_message: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_description?: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      manually_advance_team: {
        Args: {
          p_reason?: string
          p_team_id: string
          p_to_match_number: number
          p_to_round: number
        }
        Returns: Json
      }
      perform_veto_action: {
        Args: {
          p_map_id: string
          p_team_id: string
          p_user_id: string
          p_veto_session_id: string
        }
        Returns: string
      }
      perform_veto_ban: {
        Args: { p_map_id: string; p_match_id: string; p_user_id: string }
        Returns: Json
      }
      process_shop_purchase: {
        Args: { p_shop_item_id: string; p_user_id: string }
        Returns: Json
      }
      promote_substitute_to_player: {
        Args: { p_substitute_user_id: string; p_tournament_id: string }
        Returns: Json
      }
      queue_email_notification: {
        Args: {
          p_content: string
          p_notification_type: string
          p_scheduled_for?: string
          p_subject: string
          p_template_data?: Json
          p_user_id: string
        }
        Returns: string
      }
      recalculate_all_user_statistics: {
        Args: never
        Returns: {
          total_losses: number
          total_tournament_wins: number
          total_tournaments_played: number
          total_wins: number
          users_updated: number
        }[]
      }
      recalculate_team_weight: { Args: { p_team_id: string }; Returns: number }
      record_tournament_metric: {
        Args: {
          p_metadata?: Json
          p_metric_type: string
          p_metric_value?: number
          p_tournament_id: string
        }
        Returns: string
      }
      refund_purchase: {
        Args: { p_purchase_id: string; p_refund_reason?: string }
        Returns: Json
      }
      remove_player_from_team: {
        Args: {
          p_reason?: string
          p_team_id: string
          p_tournament_id: string
          p_user_id: string
        }
        Returns: Json
      }
      reset_match_secure: {
        Args: { p_match_id: string; p_reason?: string }
        Returns: Json
      }
      reverse_player_tournament_stats: {
        Args: { p_team_id: string; p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      reverse_team_progression: {
        Args: { p_reason?: string; p_target_round: number; p_team_id: string }
        Returns: Json
      }
      roll_veto_dice: {
        Args: { p_initiator_user_id: string; p_match_id: string }
        Returns: Json
      }
      rollback_match_result: {
        Args: { p_match_id: string; p_reason?: string }
        Returns: Json
      }
      rollback_tournament_to_round: {
        Args: {
          p_reason?: string
          p_target_round: number
          p_tournament_id: string
        }
        Returns: Json
      }
      safe_delete_tournament: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      send_push_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_icon?: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_manual_winner: {
        Args: {
          p_match_id: string
          p_reason?: string
          p_score_team1?: number
          p_score_team2?: number
          p_winner_team_id: string
        }
        Returns: Json
      }
      set_side_choice: {
        Args: { p_match_id: string; p_side_choice: string; p_user_id: string }
        Returns: string
      }
      track_tournament_page_view: {
        Args: {
          p_ip_address?: unknown
          p_referrer?: string
          p_tournament_id: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      update_onboarding_progress: {
        Args: { p_metadata?: Json; p_step_id: string; p_user_id: string }
        Returns: undefined
      }
      update_team_avg_rank_points: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      user_has_notification_enabled: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      validate_and_repair_bracket: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      validate_bracket_structure: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      withdraw_team: {
        Args: { p_reason?: string; p_team_id: string }
        Returns: Json
      }
    }
    Enums: {
      map_veto_action: "ban" | "pick"
      map_veto_status: "pending" | "in_progress" | "completed"
      match_format: "BO1" | "BO3" | "BO5"
      match_status: "pending" | "live" | "completed"
      purchase_status: "completed" | "refunded"
      registration_type: "solo" | "team"
      shop_item_category:
        | "name_effects"
        | "profile_enhancements"
        | "gaming_rewards"
        | "platform_perks"
        | "random_boxes"
        | "skins"
        | "in_game_items"
      team_status:
        | "pending"
        | "confirmed"
        | "eliminated"
        | "winner"
        | "disqualified"
        | "withdrawn"
        | "forfeited"
      tournament_status:
        | "draft"
        | "open"
        | "balancing"
        | "live"
        | "completed"
        | "archived"
      user_role: "admin" | "player" | "viewer"
      valorant_role: "Duelist" | "Controller" | "Initiator" | "Sentinel"
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
      map_veto_action: ["ban", "pick"],
      map_veto_status: ["pending", "in_progress", "completed"],
      match_format: ["BO1", "BO3", "BO5"],
      match_status: ["pending", "live", "completed"],
      purchase_status: ["completed", "refunded"],
      registration_type: ["solo", "team"],
      shop_item_category: [
        "name_effects",
        "profile_enhancements",
        "gaming_rewards",
        "platform_perks",
        "random_boxes",
        "skins",
        "in_game_items",
      ],
      team_status: [
        "pending",
        "confirmed",
        "eliminated",
        "winner",
        "disqualified",
        "withdrawn",
        "forfeited",
      ],
      tournament_status: [
        "draft",
        "open",
        "balancing",
        "live",
        "completed",
        "archived",
      ],
      user_role: ["admin", "player", "viewer"],
      valorant_role: ["Duelist", "Controller", "Initiator", "Sentinel"],
    },
  },
} as const
