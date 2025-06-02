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
      activation_deliverables: {
        Row: {
          activation_id: string
          created_at: string
          feedback: string | null
          id: string
          metrics_achieved: Json | null
          proof: string | null
          requirement_id: string
          reviewed_date: string | null
          reviewer_id: string | null
          revision_count: number | null
          status: Database["public"]["Enums"]["deliverable_status"] | null
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          activation_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          metrics_achieved?: Json | null
          proof?: string | null
          requirement_id: string
          reviewed_date?: string | null
          reviewer_id?: string | null
          revision_count?: number | null
          status?: Database["public"]["Enums"]["deliverable_status"] | null
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          activation_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          metrics_achieved?: Json | null
          proof?: string | null
          requirement_id?: string
          reviewed_date?: string | null
          reviewer_id?: string | null
          revision_count?: number | null
          status?: Database["public"]["Enums"]["deliverable_status"] | null
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_deliverables_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_deliverables_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_deliverables_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activations: {
        Row: {
          assigned_date: string
          completed_date: string | null
          created_at: string
          id: string
          kpi_targets: Json | null
          notes: string | null
          payment_status: string | null
          performance_metrics: Json | null
          sponsorship_id: string
          status: Database["public"]["Enums"]["activation_status"] | null
          talent_id: string
          updated_at: string
        }
        Insert: {
          assigned_date: string
          completed_date?: string | null
          created_at?: string
          id?: string
          kpi_targets?: Json | null
          notes?: string | null
          payment_status?: string | null
          performance_metrics?: Json | null
          sponsorship_id: string
          status?: Database["public"]["Enums"]["activation_status"] | null
          talent_id: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          completed_date?: string | null
          created_at?: string
          id?: string
          kpi_targets?: Json | null
          notes?: string | null
          payment_status?: string | null
          performance_metrics?: Json | null
          sponsorship_id?: string
          status?: Database["public"]["Enums"]["activation_status"] | null
          talent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activations_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          created_at: string
          creator_id: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          organization_id: string
          related_activation_id: string | null
          related_sponsorship_id: string | null
          related_talent_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          organization_id: string
          related_activation_id?: string | null
          related_sponsorship_id?: string | null
          related_talent_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          organization_id?: string
          related_activation_id?: string | null
          related_sponsorship_id?: string | null
          related_talent_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_activation_id_fkey"
            columns: ["related_activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_sponsorship_id_fkey"
            columns: ["related_sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_talent_id_fkey"
            columns: ["related_talent_id"]
            isOneToOne: false
            referencedRelation: "talent"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          logo: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          logo?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          logo?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      social_media_analytics: {
        Row: {
          comments: number | null
          created_at: string
          date: string
          engagement_rate: number | null
          followers: number | null
          id: string
          likes: number | null
          platform: string
          shares: number | null
          talent_id: string
          updated_at: string
          views: number | null
          watch_time: unknown | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          date: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          likes?: number | null
          platform: string
          shares?: number | null
          talent_id: string
          updated_at?: string
          views?: number | null
          watch_time?: unknown | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          likes?: number | null
          platform?: string
          shares?: number | null
          talent_id?: string
          updated_at?: string
          views?: number | null
          watch_time?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_analytics_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_contacts: {
        Row: {
          company: string
          created_at: string
          email: string | null
          id: string
          last_contact_date: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          organization_id: string
          owner_id: string | null
          phone: string | null
          role: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          organization_id: string
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          organization_id?: string
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_requirements: {
        Row: {
          completed: boolean | null
          created_at: string
          deliverables: Json | null
          description: string
          due_date: string | null
          id: string
          metrics_target: Json | null
          required_proof: string[] | null
          sponsorship_id: string
          type: Database["public"]["Enums"]["requirement_type"]
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          deliverables?: Json | null
          description: string
          due_date?: string | null
          id?: string
          metrics_target?: Json | null
          required_proof?: string[] | null
          sponsorship_id: string
          type: Database["public"]["Enums"]["requirement_type"]
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          deliverables?: Json | null
          description?: string
          due_date?: string | null
          id?: string
          metrics_target?: Json | null
          required_proof?: string[] | null
          sponsorship_id?: string
          type?: Database["public"]["Enums"]["requirement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_requirements_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorships: {
        Row: {
          brand: string
          budget: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          logo: string | null
          name: string
          organization_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["sponsorship_status"]
          updated_at: string
        }
        Insert: {
          brand: string
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          logo?: string | null
          name: string
          organization_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["sponsorship_status"]
          updated_at?: string
        }
        Update: {
          brand?: string
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          logo?: string | null
          name?: string
          organization_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["sponsorship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_sessions: {
        Row: {
          average_viewers: number | null
          created_at: string
          duration: unknown | null
          end_time: string | null
          followers_gained: number | null
          game: string | null
          id: string
          peak_viewers: number | null
          platform: string
          sponsorships: string[] | null
          start_time: string
          stream_id: string
          tags: string[] | null
          talent_id: string
          title: string | null
          updated_at: string
          vod_url: string | null
        }
        Insert: {
          average_viewers?: number | null
          created_at?: string
          duration?: unknown | null
          end_time?: string | null
          followers_gained?: number | null
          game?: string | null
          id?: string
          peak_viewers?: number | null
          platform: string
          sponsorships?: string[] | null
          start_time: string
          stream_id: string
          tags?: string[] | null
          talent_id: string
          title?: string | null
          updated_at?: string
          vod_url?: string | null
        }
        Update: {
          average_viewers?: number | null
          created_at?: string
          duration?: unknown | null
          end_time?: string | null
          followers_gained?: number | null
          game?: string | null
          id?: string
          peak_viewers?: number | null
          platform?: string
          sponsorships?: string[] | null
          start_time?: string
          stream_id?: string
          tags?: string[] | null
          talent_id?: string
          title?: string | null
          updated_at?: string
          vod_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_sessions_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent"
            referencedColumns: ["id"]
          },
        ]
      }
      talent: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string
          id: string
          metrics: Json
          name: string
          organization_id: string | null
          social_links: Json
          tags: string[] | null
          twitch_username: string | null
          twitter_handle: string | null
          updated_at: string
          user_id: string
          youtube_channel_id: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          name: string
          organization_id?: string | null
          social_links?: Json
          tags?: string[] | null
          twitch_username?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id: string
          youtube_channel_id?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          name?: string
          organization_id?: string | null
          social_links?: Json
          tags?: string[] | null
          twitch_username?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      activation_status: "pending" | "in_progress" | "completed" | "overdue"
      deliverable_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "revision_requested"
      requirement_type:
        | "stream"
        | "social_post"
        | "logo_placement"
        | "video_integration"
        | "product_placement"
        | "live_mention"
        | "affiliate_link"
        | "giveaway"
        | "other"
      sponsorship_status: "draft" | "active" | "completed" | "cancelled"
      user_role: "admin" | "org_manager" | "talent" | "viewer"
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
      activation_status: ["pending", "in_progress", "completed", "overdue"],
      deliverable_status: [
        "pending",
        "submitted",
        "approved",
        "rejected",
        "revision_requested",
      ],
      requirement_type: [
        "stream",
        "social_post",
        "logo_placement",
        "video_integration",
        "product_placement",
        "live_mention",
        "affiliate_link",
        "giveaway",
        "other",
      ],
      sponsorship_status: ["draft", "active", "completed", "cancelled"],
      user_role: ["admin", "org_manager", "talent", "viewer"],
    },
  },
} as const
