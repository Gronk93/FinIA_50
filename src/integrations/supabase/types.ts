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
      budget_rules: {
        Row: {
          created_at: string
          effective_from: string
          future_pct: number
          id: string
          is_default: boolean
          name: string
          needs_pct: number
          user_id: string
          wants_pct: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          future_pct?: number
          id?: string
          is_default?: boolean
          name?: string
          needs_pct?: number
          user_id?: string
          wants_pct?: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          future_pct?: number
          id?: string
          is_default?: boolean
          name?: string
          needs_pct?: number
          user_id?: string
          wants_pct?: number
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_type: string
          active: boolean
          created_at: string
          currency: string
          id: string
          initial_balance: number
          institution: string | null
          name: string
          user_id: string
        }
        Insert: {
          account_type: string
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          institution?: string | null
          name: string
          user_id?: string
        }
        Update: {
          account_type?: string
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          institution?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      future_allocation_rules: {
        Row: {
          debt_pct: number
          growth_pct: number
          id: string
          retirement_pct: number
          security_pct: number
          trading_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          debt_pct?: number
          growth_pct?: number
          id?: string
          retirement_pct?: number
          security_pct?: number
          trading_pct?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          debt_pct?: number
          growth_pct?: number
          id?: string
          retirement_pct?: number
          security_pct?: number
          trading_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      future_allocations: {
        Row: {
          alloc_date: string
          amount: number
          created_at: string
          destination: string
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          alloc_date: string
          amount: number
          created_at?: string
          destination: string
          id?: string
          transaction_id: string
          user_id?: string
        }
        Update: {
          alloc_date?: string
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          expected_amount: number
          frequency: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          expected_amount?: number
          frequency?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          expected_amount?: number
          frequency?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_snapshots: {
        Row: {
          accounts: Json
          actual_income: number
          budget_id: string
          compliance: Json
          created_at: string
          expected_income: number
          future_amount: number
          future_pct: number
          id: string
          is_current: boolean
          needs_amount: number
          needs_pct: number
          net_worth: number
          period: string
          rule_future_pct: number
          rule_needs_pct: number
          rule_wants_pct: number
          savings_rate: number
          unassigned_amount: number
          unassigned_decision: string | null
          user_id: string
          wants_amount: number
          wants_pct: number
        }
        Insert: {
          accounts?: Json
          actual_income: number
          budget_id: string
          compliance?: Json
          created_at?: string
          expected_income: number
          future_amount: number
          future_pct: number
          id?: string
          is_current?: boolean
          needs_amount: number
          needs_pct: number
          net_worth?: number
          period: string
          rule_future_pct: number
          rule_needs_pct: number
          rule_wants_pct: number
          savings_rate: number
          unassigned_amount: number
          unassigned_decision?: string | null
          user_id?: string
          wants_amount: number
          wants_pct: number
        }
        Update: {
          accounts?: Json
          actual_income?: number
          budget_id?: string
          compliance?: Json
          created_at?: string
          expected_income?: number
          future_amount?: number
          future_pct?: number
          id?: string
          is_current?: boolean
          needs_amount?: number
          needs_pct?: number
          net_worth?: number
          period?: string
          rule_future_pct?: number
          rule_needs_pct?: number
          rule_wants_pct?: number
          savings_rate?: number
          unassigned_amount?: number
          unassigned_decision?: string | null
          user_id?: string
          wants_amount?: number
          wants_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_snapshots_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_targets: {
        Row: {
          budget_class: string
          budget_id: string
          category_id: string | null
          created_at: string
          id: string
          percentage: number | null
          target_amount: number
          user_id: string
        }
        Insert: {
          budget_class: string
          budget_id: string
          category_id?: string | null
          created_at?: string
          id?: string
          percentage?: number | null
          target_amount: number
          user_id?: string
        }
        Update: {
          budget_class?: string
          budget_id?: string
          category_id?: string | null
          created_at?: string
          id?: string
          percentage?: number | null
          target_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_targets_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_budget_targets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          closed_at: string | null
          created_at: string
          expected_income: number
          future_pct: number
          id: string
          needs_pct: number
          period: string
          rule_id: string | null
          status: string
          user_id: string
          wants_pct: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          expected_income?: number
          future_pct?: number
          id?: string
          needs_pct?: number
          period: string
          rule_id?: string | null
          status?: string
          user_id?: string
          wants_pct?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          expected_income?: number
          future_pct?: number
          id?: string
          needs_pct?: number
          period?: string
          rule_id?: string | null
          status?: string
          user_id?: string
          wants_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "budget_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_close_log: {
        Row: {
          action: string
          budget_id: string
          created_at: string
          id: string
          period: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          budget_id: string
          created_at?: string
          id?: string
          period: string
          reason?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          budget_id?: string
          created_at?: string
          id?: string
          period?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_close_log_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approx_expenses: number
          birth_date: string | null
          country: string | null
          created_at: string
          currency: string
          expected_income: number
          full_name: string | null
          initial_net_worth: number
          interests: string[]
          onboarding_completed: boolean
          target_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approx_expenses?: number
          birth_date?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          expected_income?: number
          full_name?: string | null
          initial_net_worth?: number
          interests?: string[]
          onboarding_completed?: boolean
          target_age?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approx_expenses?: number
          birth_date?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          expected_income?: number
          full_name?: string | null
          initial_net_worth?: number
          interests?: string[]
          onboarding_completed?: boolean
          target_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          active: boolean
          created_at: string
          default_class: string | null
          id: string
          is_custom: boolean
          kind: string
          name: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_class?: string | null
          id?: string
          is_custom?: boolean
          kind: string
          name: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          default_class?: string | null
          id?: string
          is_custom?: boolean
          kind?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          adjustment_direction: string | null
          amount: number
          budget_class: string | null
          category_id: string | null
          concept: string
          created_at: string
          from_account_id: string | null
          future_destination: string | null
          id: string
          is_recurring: boolean
          merchant: string | null
          notes: string | null
          status: string
          to_account_id: string | null
          tx_date: string
          tx_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_direction?: string | null
          amount: number
          budget_class?: string | null
          category_id?: string | null
          concept: string
          created_at?: string
          from_account_id?: string | null
          future_destination?: string | null
          id?: string
          is_recurring?: boolean
          merchant?: string | null
          notes?: string | null
          status?: string
          to_account_id?: string | null
          tx_date?: string
          tx_type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          adjustment_direction?: string | null
          amount?: number
          budget_class?: string | null
          category_id?: string | null
          concept?: string
          created_at?: string
          from_account_id?: string | null
          future_destination?: string | null
          id?: string
          is_recurring?: boolean
          merchant?: string | null
          notes?: string | null
          status?: string
          to_account_id?: string | null
          tx_date?: string
          tx_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_month: {
        Args: { _period: string; _unassigned_decision?: string }
        Returns: Json
      }
      reopen_month: {
        Args: { _period: string; _reason: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
