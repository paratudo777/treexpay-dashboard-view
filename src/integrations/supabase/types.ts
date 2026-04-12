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
      acquirer_config: {
        Row: {
          default_provider: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_provider?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_provider?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          public_key: string | null
          secret_key: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          public_key?: string | null
          secret_key?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          public_key?: string | null
          secret_key?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      api_payments: {
        Row: {
          amount: number
          api_key_id: string
          created_at: string
          customer_email: string | null
          description: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          pix_code: string | null
          provider: string | null
          qr_code: string | null
          status: string
          updated_at: string
          user_id: string
          webhook_sent: boolean
          webhook_url: string | null
        }
        Insert: {
          amount: number
          api_key_id: string
          created_at?: string
          customer_email?: string | null
          description?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          provider?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Update: {
          amount?: number
          api_key_id?: string
          created_at?: string
          customer_email?: string | null
          description?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          provider?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_payments_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_payments: {
        Row: {
          amount: number
          card_data: Json | null
          checkout_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
          id: string
          net_amount: number
          paid_at: string | null
          payment_method: string | null
          pix_data: Json | null
          platform_fee: number
          status: string
        }
        Insert: {
          amount: number
          card_data?: Json | null
          checkout_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          net_amount: number
          paid_at?: string | null
          payment_method?: string | null
          pix_data?: Json | null
          platform_fee?: number
          status?: string
        }
        Update: {
          amount?: number
          card_data?: Json | null
          checkout_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          net_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          pix_data?: Json | null
          platform_fee?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "public_checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkouts: {
        Row: {
          active: boolean
          amount: number
          button_text: string
          color_theme: string
          created_at: string
          description: string | null
          enable_card: boolean
          enable_pix: boolean
          id: string
          image_url: string | null
          notification_email: string | null
          security_message: string
          template: string
          title: string
          updated_at: string
          url_slug: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          button_text?: string
          color_theme?: string
          created_at?: string
          description?: string | null
          enable_card?: boolean
          enable_pix?: boolean
          id?: string
          image_url?: string | null
          notification_email?: string | null
          security_message?: string
          template?: string
          title: string
          updated_at?: string
          url_slug: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          button_text?: string
          color_theme?: string
          created_at?: string
          description?: string | null
          enable_card?: boolean
          enable_pix?: boolean
          id?: string
          image_url?: string | null
          notification_email?: string | null
          security_message?: string
          template?: string
          title?: string
          updated_at?: string
          url_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          pix_key: string | null
          qr_code: string | null
          receiver_name: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pix_key?: string | null
          qr_code?: string | null
          receiver_name?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pix_key?: string | null
          qr_code?: string | null
          receiver_name?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          id: string
          read: boolean
          sent_date: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          content: string
          id?: string
          read?: boolean
          sent_date?: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          read?: boolean
          sent_date?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          balance: number
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          notifications_enabled: boolean
          onesignal_player_id: string | null
          phone: string | null
          profile: Database["public"]["Enums"]["user_profile"]
          two_fa_enabled: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          balance?: number
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          notifications_enabled?: boolean
          onesignal_player_id?: string | null
          phone?: string | null
          profile?: Database["public"]["Enums"]["user_profile"]
          two_fa_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          balance?: number
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notifications_enabled?: boolean
          onesignal_player_id?: string | null
          phone?: string | null
          profile?: Database["public"]["Enums"]["user_profile"]
          two_fa_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ranking: {
        Row: {
          apelido: string
          created_at: string | null
          id: string
          ultima_venda_em: string | null
          updated_at: string | null
          user_id: string
          volume_total_mensal: number | null
        }
        Insert: {
          apelido: string
          created_at?: string | null
          id?: string
          ultima_venda_em?: string | null
          updated_at?: string | null
          user_id: string
          volume_total_mensal?: number | null
        }
        Update: {
          apelido?: string
          created_at?: string | null
          id?: string
          ultima_venda_em?: string | null
          updated_at?: string | null
          user_id?: string
          volume_total_mensal?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          deposit_fee: number
          id: string
          user_id: string
          withdrawal_fee: number
        }
        Insert: {
          created_at?: string
          deposit_fee?: number
          id?: string
          user_id: string
          withdrawal_fee?: number
        }
        Update: {
          created_at?: string
          deposit_fee?: number
          id?: string
          user_id?: string
          withdrawal_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          code: string
          created_at: string
          deposit_id: string | null
          description: string
          id: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          deposit_id?: string | null
          description: string
          id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          deposit_id?: string | null
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_auth: {
        Row: {
          active: boolean
          created_at: string
          google_auth_secret: string | null
          id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          google_auth_secret?: string | null
          id?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          google_auth_secret?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_acquirer_config: {
        Row: {
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_webhooks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string | null
          data: string | null
          id: string
          usuario_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          id?: string
          usuario_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          data?: string | null
          id?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt: number
          created_at: string
          event: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          event: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          event?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: Json
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          pix_key: string
          pix_key_type: string
          request_date: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pix_key: string
          pix_key_type: string
          request_date?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pix_key?: string
          pix_key_type?: string
          request_date?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_checkouts: {
        Row: {
          active: boolean | null
          amount: number | null
          button_text: string | null
          color_theme: string | null
          created_at: string | null
          description: string | null
          enable_card: boolean | null
          enable_pix: boolean | null
          id: string | null
          image_url: string | null
          security_message: string | null
          template: string | null
          title: string | null
          url_slug: string | null
        }
        Insert: {
          active?: boolean | null
          amount?: number | null
          button_text?: string | null
          color_theme?: string | null
          created_at?: string | null
          description?: string | null
          enable_card?: boolean | null
          enable_pix?: boolean | null
          id?: string | null
          image_url?: string | null
          security_message?: string | null
          template?: string | null
          title?: string | null
          url_slug?: string | null
        }
        Update: {
          active?: boolean | null
          amount?: number | null
          button_text?: string | null
          color_theme?: string | null
          created_at?: string | null
          description?: string | null
          enable_card?: boolean | null
          enable_pix?: boolean | null
          id?: string | null
          image_url?: string | null
          security_message?: string | null
          template?: string | null
          title?: string | null
          url_slug?: string | null
        }
        Relationships: []
      }
      public_ranking: {
        Row: {
          apelido: string | null
          ultima_venda_em: string | null
          volume_total_mensal: number | null
        }
        Insert: {
          apelido?: string | null
          ultima_venda_em?: string | null
          volume_total_mensal?: number | null
        }
        Update: {
          apelido?: string | null
          ultima_venda_em?: string | null
          volume_total_mensal?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_withdrawal: { Args: { withdrawal_id: string }; Returns: Json }
      count_user_checkouts: { Args: { p_user_id: string }; Returns: number }
      generate_api_keys_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_checkout_slug: { Args: never; Returns: string }
      generate_transaction_code: { Args: never; Returns: string }
      get_monthly_ranking: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          last_sale_date: string
          total_volume: number
          user_id: string
        }[]
      }
      incrementar_saldo_usuario: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      owns_checkout: {
        Args: { _checkout_id: string; _user_id: string }
        Returns: boolean
      }
      reject_withdrawal: { Args: { withdrawal_id: string }; Returns: Json }
      reset_monthly_volumes: { Args: never; Returns: undefined }
      resolve_user_provider: { Args: { p_user_id: string }; Returns: string }
      safe_update_profile: {
        Args: {
          p_cpf?: string
          p_name?: string
          p_notifications_enabled?: boolean
          p_onesignal_player_id?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_profile: {
        Args: { p_active?: boolean; p_profile: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      deposit_status: "waiting" | "completed" | "expired"
      notification_type:
        | "sale_pending"
        | "sale_approved"
        | "login"
        | "password_change"
      pix_key_type: "cpf" | "email" | "phone" | "random" | "cnpj"
      transaction_status:
        | "pending"
        | "approved"
        | "cancelled"
        | "refunded"
        | "denied"
      transaction_type: "payment" | "withdrawal" | "deposit" | "refund"
      user_profile: "admin" | "user"
      withdrawal_status: "requested" | "processed" | "rejected"
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
      deposit_status: ["waiting", "completed", "expired"],
      notification_type: [
        "sale_pending",
        "sale_approved",
        "login",
        "password_change",
      ],
      pix_key_type: ["cpf", "email", "phone", "random", "cnpj"],
      transaction_status: [
        "pending",
        "approved",
        "cancelled",
        "refunded",
        "denied",
      ],
      transaction_type: ["payment", "withdrawal", "deposit", "refund"],
      user_profile: ["admin", "user"],
      withdrawal_status: ["requested", "processed", "rejected"],
    },
  },
} as const
