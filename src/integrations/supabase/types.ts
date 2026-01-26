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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      approved_estimates: {
        Row: {
          approved_by_staff_at: string | null
          approved_by_staff_user_id: string | null
          created_at: string | null
          id: string
          inspection_id: string
          job_id: string
          services: Json
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          approved_by_staff_at?: string | null
          approved_by_staff_user_id?: string | null
          created_at?: string | null
          id?: string
          inspection_id: string
          job_id: string
          services?: Json
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          approved_by_staff_at?: string | null
          approved_by_staff_user_id?: string | null
          created_at?: string | null
          id?: string
          inspection_id?: string
          job_id?: string
          services?: Json
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_estimates_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_accounts: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_job_access: {
        Row: {
          access_token: string
          client_id: string | null
          created_at: string | null
          email_error: string | null
          email_sent_at: string | null
          expires_at: string | null
          first_accessed_at: string | null
          id: string
          invited_email: string | null
          job_id: string
          password_set_at: string | null
        }
        Insert: {
          access_token: string
          client_id?: string | null
          created_at?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          first_accessed_at?: string | null
          id?: string
          invited_email?: string | null
          job_id: string
          password_set_at?: string | null
        }
        Update: {
          access_token?: string
          client_id?: string | null
          created_at?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          first_accessed_at?: string | null
          id?: string
          invited_email?: string | null
          job_id?: string
          password_set_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_job_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_job_access_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_selections: {
        Row: {
          approved_estimate_id: string
          client_job_access_id: string
          created_at: string | null
          id: string
          selected_services: Json
          total_selected: number
          updated_at: string | null
        }
        Insert: {
          approved_estimate_id: string
          client_job_access_id: string
          created_at?: string | null
          id?: string
          selected_services?: Json
          total_selected?: number
          updated_at?: string | null
        }
        Update: {
          approved_estimate_id?: string
          client_job_access_id?: string
          created_at?: string | null
          id?: string
          selected_services?: Json
          total_selected?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_service_selections_approved_estimate_id_fkey"
            columns: ["approved_estimate_id"]
            isOneToOne: false
            referencedRelation: "approved_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_selections_client_job_access_id_fkey"
            columns: ["client_job_access_id"]
            isOneToOne: false
            referencedRelation: "client_job_access"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          subject: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          subject: string
          template_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          subject?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          analysis_report: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          estimate_approved: boolean | null
          id: string
          image_annotations: Json | null
          job_id: string | null
          length: number | null
          notes: string | null
          photo_urls: string[] | null
          rug_number: string
          rug_type: string
          user_id: string | null
          width: number | null
        }
        Insert: {
          analysis_report?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          estimate_approved?: boolean | null
          id?: string
          image_annotations?: Json | null
          job_id?: string | null
          length?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          rug_number: string
          rug_type: string
          user_id?: string | null
          width?: number | null
        }
        Update: {
          analysis_report?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          estimate_approved?: boolean | null
          id?: string
          image_annotations?: Json | null
          job_id?: string | null
          length?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          rug_number?: string
          rug_type?: string
          user_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          all_estimates_approved: boolean | null
          client_approved_at: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          client_portal_enabled: boolean | null
          created_at: string
          follow_up_notes: string | null
          id: string
          job_number: string
          last_activity_at: string | null
          next_follow_up_at: string | null
          notes: string | null
          payment_status: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_estimates_approved?: boolean | null
          client_approved_at?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          client_portal_enabled?: boolean | null
          created_at?: string
          follow_up_notes?: string | null
          id?: string
          job_number: string
          last_activity_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          payment_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_estimates_approved?: boolean | null
          client_approved_at?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          client_portal_enabled?: boolean | null
          created_at?: string
          follow_up_notes?: string | null
          id?: string
          job_number?: string
          last_activity_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          payment_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          job_id: string
          metadata: Json | null
          paid_at: string | null
          platform_fee: number | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          paid_at?: string | null
          platform_fee?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          paid_at?: string | null
          platform_fee?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          gross_revenue: number | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period_end: string | null
          period_start: string | null
          platform_fees_deducted: number | null
          reference_number: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          gross_revenue?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_fees_deducted?: number | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          gross_revenue?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_fees_deducted?: number | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          bank_routing_number: string | null
          business_address: string | null
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          created_at: string
          full_name: string | null
          id: string
          logo_url: string | null
          payment_method: string | null
          payment_notes: string | null
          paypal_email: string | null
          updated_at: string
          user_id: string
          venmo_handle: string | null
          zelle_email: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          paypal_email?: string | null
          updated_at?: string
          user_id: string
          venmo_handle?: string | null
          zelle_email?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          paypal_email?: string | null
          updated_at?: string
          user_id?: string
          venmo_handle?: string | null
          zelle_email?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_completions: {
        Row: {
          approved_estimate_id: string
          completed_at: string
          completed_by: string | null
          created_at: string
          id: string
          notes: string | null
          service_id: string
        }
        Insert: {
          approved_estimate_id: string
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          service_id: string
        }
        Update: {
          approved_estimate_id?: string
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_approved_estimate_id_fkey"
            columns: ["approved_estimate_id"]
            isOneToOne: false
            referencedRelation: "approved_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_prices: {
        Row: {
          created_at: string
          id: string
          is_additional: boolean
          service_name: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_additional?: boolean
          service_name: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_additional?: boolean
          service_name?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_has_job_access: {
        Args: { check_job_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_client_access_tracking: {
        Args: {
          _access_token: string
          _first_accessed?: boolean
          _password_set?: boolean
        }
        Returns: undefined
      }
      validate_access_token: {
        Args: { _token: string }
        Returns: {
          access_id: string
          client_id: string
          client_name: string
          invited_email: string
          job_id: string
          job_number: string
          job_status: string
          staff_user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "staff" | "client" | "admin"
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
      app_role: ["staff", "client", "admin"],
    },
  },
} as const
