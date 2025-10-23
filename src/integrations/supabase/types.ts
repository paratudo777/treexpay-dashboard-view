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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      checkouts: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          notification_email: string | null
          title: string
          updated_at: string
          url_slug: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notification_email?: string | null
          title: string
          updated_at?: string
          url_slug: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notification_email?: string | null
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
      [_ in never]: never
    }
    Functions: {
      approve_withdrawal: { Args: { withdrawal_id: string }; Returns: Json }
      count_user_checkouts: { Args: { p_user_id: string }; Returns: number }
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
      reject_withdrawal: { Args: { withdrawal_id: string }; Returns: Json }
      reset_monthly_volumes: { Args: never; Returns: undefined }
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
