export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          twitch_channel: string | null
          twitch_embed_enabled: boolean
        }
        Insert: {
          announcement_id?: string | null
          app_name?: string
          id?: string
          last_updated_at?: string | null
          twitch_channel?: string | null
          twitch_embed_enabled?: boolean
        }
        Update: {
          announcement_id?: string | null
          app_name?: string
          id?: string
          last_updated_at?: string | null
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "users"
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
          ip_address: unknown | null
          referrer: string | null
          tournament_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          tournament_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
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
          enable_map_veto: boolean | null
          final_match_format: Database["public"]["Enums"]["match_format"] | null
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
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enable_map_veto?: boolean | null
          final_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
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
          bracket_type?: string | null
          check_in_ends_at?: string | null
          check_in_required?: boolean | null
          check_in_starts_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enable_map_veto?: boolean | null
          final_match_format?:
            | Database["public"]["Enums"]["match_format"]
            | null
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
      user_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          match_assigned: boolean | null
          match_ready: boolean | null
          new_tournament_posted: boolean | null
          post_results: boolean | null
          team_assigned: boolean | null
          tournament_checkin_time: boolean | null
          tournament_signups_open: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_assigned?: boolean | null
          match_ready?: boolean | null
          new_tournament_posted?: boolean | null
          post_results?: boolean | null
          team_assigned?: boolean | null
          tournament_checkin_time?: boolean | null
          tournament_signups_open?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_assigned?: boolean | null
          match_ready?: boolean | null
          new_tournament_posted?: boolean | null
          post_results?: boolean | null
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
          tournaments_played: number | null
          tournaments_won: number | null
          twitch_handle: string | null
          twitter_handle: string | null
          updated_at: string | null
          use_manual_override: boolean | null
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
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          use_manual_override?: boolean | null
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
          tournaments_played?: number | null
          tournaments_won?: number | null
          twitch_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          use_manual_override?: boolean | null
          weight_rating?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_rank_override_set_by_fkey"
            columns: ["rank_override_set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_perform_veto: {
        Args: {
          p_veto_session_id: string
          p_user_id: string
          p_team_id: string
        }
        Returns: string
      }
      capture_active_map_pool: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: {
          newly_earned_achievement_id: string
          achievement_name: string
        }[]
      }
      choose_veto_side: {
        Args: { p_match_id: string; p_user_id: string; p_side_choice: string }
        Returns: Json
      }
      create_missing_user_profile: {
        Args: { user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_data?: Json
          p_tournament_id?: string
          p_match_id?: string
          p_team_id?: string
          p_expires_at?: string
        }
        Returns: string
      }
      disqualify_team: {
        Args: { p_team_id: string; p_reason?: string }
        Returns: Json
      }
      fix_missing_match_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          matches_processed: number
          wins_added: number
          losses_added: number
        }[]
      }
      fix_missing_tournament_wins: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_team_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_substitute: {
        Args: { p_tournament_id: string }
        Returns: {
          user_id: string
          discord_username: string
          current_rank: string
          riot_id: string
          rank_points: number
          priority: number
        }[]
      }
      get_tournament_map_pool: {
        Args: { p_tournament_id: string }
        Returns: {
          id: string
          name: string
          display_name: string
          thumbnail_url: string
          is_active: boolean
        }[]
      }
      get_user_achievement_summary: {
        Args: { p_user_id: string }
        Returns: {
          total_achievements: number
          total_points: number
          latest_achievement_name: string
          latest_achievement_date: string
          achievement_rank: number
        }[]
      }
      get_user_info_for_audit: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_match_history: {
        Args: { profile_user_id: string; match_limit?: number }
        Returns: {
          match_id: string
          tournament_name: string
          match_date: string
          team_name: string
          opponent_team_name: string
          user_team_score: number
          opponent_team_score: number
          is_winner: boolean
        }[]
      }
      get_user_profile: {
        Args: { profile_user_id: string }
        Returns: {
          id: string
          discord_username: string
          riot_id: string
          current_rank: string
          rank_points: number
          wins: number
          losses: number
          tournaments_played: number
          tournaments_won: number
          mvp_awards: number
          bio: string
          twitter_handle: string
          twitch_handle: string
          discord_avatar_url: string
          profile_visibility: string
          last_seen: string
          created_at: string
          peak_rank: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tournament_history: {
        Args: { profile_user_id: string }
        Returns: {
          tournament_id: string
          tournament_name: string
          tournament_date: string
          team_name: string
          team_status: string
          placement: string
        }[]
      }
      increment_team_losses: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_team_tournament_wins: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_team_tournaments_played: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_team_wins: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      increment_user_losses: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_user_tournament_wins: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_user_tournaments_played: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_user_wins: {
        Args: { user_id: string }
        Returns: undefined
      }
      is_team_captain: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_user_on_team: {
        Args: { p_user_id: string; p_team_id: string }
        Returns: boolean
      }
      log_application_error: {
        Args: {
          p_component: string
          p_error_message: string
          p_error_code?: string
          p_user_id?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          p_table_name: string
          p_action: string
          p_record_id: string
          p_old_values?: Json
          p_new_values?: Json
          p_description?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      manually_advance_team: {
        Args: {
          p_team_id: string
          p_to_round: number
          p_to_match_number: number
          p_reason?: string
        }
        Returns: Json
      }
      perform_veto_action: {
        Args: {
          p_veto_session_id: string
          p_user_id: string
          p_team_id: string
          p_map_id: string
        }
        Returns: string
      }
      perform_veto_ban: {
        Args: { p_match_id: string; p_user_id: string; p_map_id: string }
        Returns: Json
      }
      promote_substitute_to_player: {
        Args: { p_tournament_id: string; p_substitute_user_id: string }
        Returns: Json
      }
      record_tournament_metric: {
        Args: {
          p_tournament_id: string
          p_metric_type: string
          p_metric_value?: number
          p_metadata?: Json
        }
        Returns: string
      }
      roll_veto_dice: {
        Args: { p_match_id: string; p_initiator_user_id: string }
        Returns: Json
      }
      safe_delete_tournament: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      set_side_choice: {
        Args: {
          p_veto_session_id: string
          p_user_id: string
          p_side_choice: string
        }
        Returns: string
      }
      track_tournament_page_view: {
        Args: {
          p_tournament_id: string
          p_user_id?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_referrer?: string
        }
        Returns: string
      }
      update_onboarding_progress: {
        Args: { p_user_id: string; p_step_id: string; p_metadata?: Json }
        Returns: undefined
      }
      update_team_avg_rank_points: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      user_has_notification_enabled: {
        Args: { p_user_id: string; p_notification_type: string }
        Returns: boolean
      }
      withdraw_team: {
        Args: { p_team_id: string; p_reason?: string }
        Returns: Json
      }
    }
    Enums: {
      map_veto_action: "ban" | "pick"
      map_veto_status: "pending" | "in_progress" | "completed"
      match_format: "BO1" | "BO3" | "BO5"
      match_status: "pending" | "live" | "completed"
      registration_type: "solo" | "team"
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
      registration_type: ["solo", "team"],
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
    },
  },
} as const
