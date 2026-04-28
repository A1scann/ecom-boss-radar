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
      keyword_metrics: {
        Row: {
          advertiser_density: number | null
          autocomplete: Json | null
          commercial_intent_score: number | null
          cpc_proxy: number | null
          geo: string
          id: string
          is_breakout: boolean | null
          is_rising: boolean | null
          keyword: string
          marketplace_dominance_score: number | null
          paa_questions: Json | null
          price_dispersion: number | null
          refreshed_at: string
          regional_demand: Json | null
          related_queries: Json | null
          related_topics: Json | null
          rising_queries: Json | null
          search_interest: number | null
          seasonality_score: number | null
          serp_weakness_score: number | null
          shopping_advertiser_count: number | null
          trend_series: Json | null
          trend_stability: number | null
        }
        Insert: {
          advertiser_density?: number | null
          autocomplete?: Json | null
          commercial_intent_score?: number | null
          cpc_proxy?: number | null
          geo?: string
          id?: string
          is_breakout?: boolean | null
          is_rising?: boolean | null
          keyword: string
          marketplace_dominance_score?: number | null
          paa_questions?: Json | null
          price_dispersion?: number | null
          refreshed_at?: string
          regional_demand?: Json | null
          related_queries?: Json | null
          related_topics?: Json | null
          rising_queries?: Json | null
          search_interest?: number | null
          seasonality_score?: number | null
          serp_weakness_score?: number | null
          shopping_advertiser_count?: number | null
          trend_series?: Json | null
          trend_stability?: number | null
        }
        Update: {
          advertiser_density?: number | null
          autocomplete?: Json | null
          commercial_intent_score?: number | null
          cpc_proxy?: number | null
          geo?: string
          id?: string
          is_breakout?: boolean | null
          is_rising?: boolean | null
          keyword?: string
          marketplace_dominance_score?: number | null
          paa_questions?: Json | null
          price_dispersion?: number | null
          refreshed_at?: string
          regional_demand?: Json | null
          related_queries?: Json | null
          related_topics?: Json | null
          rising_queries?: Json | null
          search_interest?: number | null
          seasonality_score?: number | null
          serp_weakness_score?: number | null
          shopping_advertiser_count?: number | null
          trend_series?: Json | null
          trend_stability?: number | null
        }
        Relationships: []
      }
      macro_niches_live: {
        Row: {
          avg_opportunity: number | null
          description: string | null
          icon: string | null
          id: string
          momentum: number | null
          name: string
          slug: string
          sub_niche_count: number | null
          total_demand: number | null
          updated_at: string
        }
        Insert: {
          avg_opportunity?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          momentum?: number | null
          name: string
          slug: string
          sub_niche_count?: number | null
          total_demand?: number | null
          updated_at?: string
        }
        Update: {
          avg_opportunity?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          momentum?: number | null
          name?: string
          slug?: string
          sub_niche_count?: number | null
          total_demand?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      niche_keywords: {
        Row: {
          added_at: string
          cluster_label: string | null
          commercial_intent_score: number | null
          id: string
          intent: string | null
          is_breakout: boolean | null
          is_rising: boolean | null
          keyword: string
          search_interest: number | null
          sub_niche_id: string | null
        }
        Insert: {
          added_at?: string
          cluster_label?: string | null
          commercial_intent_score?: number | null
          id?: string
          intent?: string | null
          is_breakout?: boolean | null
          is_rising?: boolean | null
          keyword: string
          search_interest?: number | null
          sub_niche_id?: string | null
        }
        Update: {
          added_at?: string
          cluster_label?: string | null
          commercial_intent_score?: number | null
          id?: string
          intent?: string | null
          is_breakout?: boolean | null
          is_rising?: boolean | null
          keyword?: string
          search_interest?: number | null
          sub_niche_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "niche_keywords_sub_niche_id_fkey"
            columns: ["sub_niche_id"]
            isOneToOne: false
            referencedRelation: "sub_niches_live"
            referencedColumns: ["id"]
          },
        ]
      }
      serpapi_cache: {
        Row: {
          cache_key: string
          engine: string
          expires_at: string
          fetched_at: string
          id: string
          params: Json
          query: string
          response: Json
        }
        Insert: {
          cache_key: string
          engine: string
          expires_at?: string
          fetched_at?: string
          id?: string
          params?: Json
          query: string
          response: Json
        }
        Update: {
          cache_key?: string
          engine?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          params?: Json
          query?: string
          response?: Json
        }
        Relationships: []
      }
      sub_niches_live: {
        Row: {
          advertiser_density: number | null
          alpha_score: number | null
          breakeven_roas: number | null
          category: string | null
          competition_shift: number | null
          cpc: number | null
          created_at: string
          data_source: string | null
          demand_acceleration: number | null
          demand_growth_90d: number | null
          emerging_clusters: Json | null
          estimated_cpa: number | null
          hidden_opportunity_score: number | null
          hidden_signal: string | null
          id: string
          last_signal_at: string
          macro_id: string | null
          margin_potential: number | null
          marketplace_dominance_score: number | null
          maturity: string | null
          mode: string | null
          name: string
          opportunity_score: number | null
          price_dispersion: number | null
          search_demand: number | null
          seasonality: number | null
          seed_keyword: string
          serp_weakness_score: number | null
          shopping_advertiser_count: number | null
          slug: string
          supplier_feasibility_score: number | null
          trend_series: Json | null
          updated_at: string
          watchlist: boolean | null
        }
        Insert: {
          advertiser_density?: number | null
          alpha_score?: number | null
          breakeven_roas?: number | null
          category?: string | null
          competition_shift?: number | null
          cpc?: number | null
          created_at?: string
          data_source?: string | null
          demand_acceleration?: number | null
          demand_growth_90d?: number | null
          emerging_clusters?: Json | null
          estimated_cpa?: number | null
          hidden_opportunity_score?: number | null
          hidden_signal?: string | null
          id?: string
          last_signal_at?: string
          macro_id?: string | null
          margin_potential?: number | null
          marketplace_dominance_score?: number | null
          maturity?: string | null
          mode?: string | null
          name: string
          opportunity_score?: number | null
          price_dispersion?: number | null
          search_demand?: number | null
          seasonality?: number | null
          seed_keyword: string
          serp_weakness_score?: number | null
          shopping_advertiser_count?: number | null
          slug: string
          supplier_feasibility_score?: number | null
          trend_series?: Json | null
          updated_at?: string
          watchlist?: boolean | null
        }
        Update: {
          advertiser_density?: number | null
          alpha_score?: number | null
          breakeven_roas?: number | null
          category?: string | null
          competition_shift?: number | null
          cpc?: number | null
          created_at?: string
          data_source?: string | null
          demand_acceleration?: number | null
          demand_growth_90d?: number | null
          emerging_clusters?: Json | null
          estimated_cpa?: number | null
          hidden_opportunity_score?: number | null
          hidden_signal?: string | null
          id?: string
          last_signal_at?: string
          macro_id?: string | null
          margin_potential?: number | null
          marketplace_dominance_score?: number | null
          maturity?: string | null
          mode?: string | null
          name?: string
          opportunity_score?: number | null
          price_dispersion?: number | null
          search_demand?: number | null
          seasonality?: number | null
          seed_keyword?: string
          serp_weakness_score?: number | null
          shopping_advertiser_count?: number | null
          slug?: string
          supplier_feasibility_score?: number | null
          trend_series?: Json | null
          updated_at?: string
          watchlist?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_niches_live_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "macro_niches_live"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
