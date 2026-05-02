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
      macro_niches: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
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
      micro_niches: {
        Row: {
          created_at: string | null
          id: string
          macro_id: string | null
          name: string
          niche_id: string | null
          seed_keyword: string | null
          slug: string
          sub_niche_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          macro_id?: string | null
          name: string
          niche_id?: string | null
          seed_keyword?: string | null
          slug: string
          sub_niche_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          macro_id?: string | null
          name?: string
          niche_id?: string | null
          seed_keyword?: string | null
          slug?: string
          sub_niche_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_niches_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "macro_niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_niches_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_niches_sub_niche_id_fkey"
            columns: ["sub_niche_id"]
            isOneToOne: false
            referencedRelation: "sub_niches"
            referencedColumns: ["id"]
          },
        ]
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
      niches: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          macro_id: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          macro_id?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          macro_id?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "niches_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "macro_niches"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_edges: {
        Row: {
          created_at: string
          edge_type: string
          id: string
          source_id: string
          target_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          edge_type?: string
          id?: string
          source_id: string
          target_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          edge_type?: string
          id?: string
          source_id?: string
          target_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sub_niches_live"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "sub_niches_live"
            referencedColumns: ["id"]
          },
        ]
      }
      product_watchlist: {
        Row: {
          added_at: string
          id: string
          last_refreshed_at: string
          product_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          last_refreshed_at?: string
          product_id: string
        }
        Update: {
          added_at?: string
          id?: string
          last_refreshed_at?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_watchlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_live"
            referencedColumns: ["id"]
          },
        ]
      }
      products_live: {
        Row: {
          advertiser_count: number | null
          buy_price_estimate: number | null
          buying_intent: number | null
          competition_difficulty: number | null
          competitors: Json | null
          created_at: string
          data_source: string | null
          id: string
          last_signal_at: string
          margin_potential: number | null
          max_price: number | null
          median_price: number | null
          min_price: number | null
          name: string
          offline_scarcity: number | null
          opportunity_score: number | null
          score_history: Json
          seed_keyword: string | null
          sell_price_estimate: number | null
          source_url: string | null
          sub_niche_id: string | null
          sub_niche_slug: string
          thumbnail: string | null
          updated_at: string
          verdict: string | null
        }
        Insert: {
          advertiser_count?: number | null
          buy_price_estimate?: number | null
          buying_intent?: number | null
          competition_difficulty?: number | null
          competitors?: Json | null
          created_at?: string
          data_source?: string | null
          id?: string
          last_signal_at?: string
          margin_potential?: number | null
          max_price?: number | null
          median_price?: number | null
          min_price?: number | null
          name: string
          offline_scarcity?: number | null
          opportunity_score?: number | null
          score_history?: Json
          seed_keyword?: string | null
          sell_price_estimate?: number | null
          source_url?: string | null
          sub_niche_id?: string | null
          sub_niche_slug: string
          thumbnail?: string | null
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          advertiser_count?: number | null
          buy_price_estimate?: number | null
          buying_intent?: number | null
          competition_difficulty?: number | null
          competitors?: Json | null
          created_at?: string
          data_source?: string | null
          id?: string
          last_signal_at?: string
          margin_potential?: number | null
          max_price?: number | null
          median_price?: number | null
          min_price?: number | null
          name?: string
          offline_scarcity?: number | null
          opportunity_score?: number | null
          score_history?: Json
          seed_keyword?: string | null
          sell_price_estimate?: number | null
          source_url?: string | null
          sub_niche_id?: string | null
          sub_niche_slug?: string
          thumbnail?: string | null
          updated_at?: string
          verdict?: string | null
        }
        Relationships: []
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
      sub_niches: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          macro_id: string | null
          name: string
          niche_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          macro_id?: string | null
          name: string
          niche_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          macro_id?: string | null
          name?: string
          niche_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_niches_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "macro_niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_niches_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
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
          depth: number
          description: string | null
          discovery_mode: string
          emerging_clusters: Json | null
          estimated_cpa: number | null
          hidden_opportunity_score: number | null
          hidden_signal: string | null
          id: string
          is_seed: boolean
          last_signal_at: string
          macro_id: string | null
          margin_potential: number | null
          marketplace_dominance_score: number | null
          maturity: string | null
          mode: string | null
          name: string
          opportunity_score: number | null
          parent_id: string | null
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
          depth?: number
          description?: string | null
          discovery_mode?: string
          emerging_clusters?: Json | null
          estimated_cpa?: number | null
          hidden_opportunity_score?: number | null
          hidden_signal?: string | null
          id?: string
          is_seed?: boolean
          last_signal_at?: string
          macro_id?: string | null
          margin_potential?: number | null
          marketplace_dominance_score?: number | null
          maturity?: string | null
          mode?: string | null
          name: string
          opportunity_score?: number | null
          parent_id?: string | null
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
          depth?: number
          description?: string | null
          discovery_mode?: string
          emerging_clusters?: Json | null
          estimated_cpa?: number | null
          hidden_opportunity_score?: number | null
          hidden_signal?: string | null
          id?: string
          is_seed?: boolean
          last_signal_at?: string
          macro_id?: string | null
          margin_potential?: number | null
          marketplace_dominance_score?: number | null
          maturity?: string | null
          mode?: string | null
          name?: string
          opportunity_score?: number | null
          parent_id?: string | null
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
          {
            foreignKeyName: "sub_niches_live_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sub_niches_live"
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
