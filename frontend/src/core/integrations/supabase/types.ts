export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          business_name: string | null;
          gst_number: string | null;
          business_phone: string | null;
          business_address: string | null;
          is_business_mode: boolean | null;
          store_slug: string | null;
          is_store_active: boolean | null;
          business_logo: string | null;
          signature_url: string | null;
          created_at: string;
          updated_at: string;
          upi_id: string | null;
          payment_gateway: string | null;
          razorpay_key_id: string | null;
          stripe_publishable_key: string | null;
          online_payment_enabled: boolean | null;
          delivery_charge: number | null;
          free_delivery_min_amount: number | null;
          phone: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          month: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budgets"]["Row"]> & { user_id: string; month: string };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          color: string;
          icon: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          description: string;
          date: string;
          bill_url: string | null;
          tax_amount: number | null;
          invoice_number: string | null;
          vendor_name: string | null;
          is_reimbursable: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & { user_id: string; amount: number; description: string; date: string };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          invite_code: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["groups"]["Row"]> & { name: string; created_by: string };
        Update: Partial<Database["public"]["Tables"]["groups"]["Row"]>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          username: string;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_members"]["Row"]> & { group_id: string; user_id: string; username: string };
        Update: Partial<Database["public"]["Tables"]["group_members"]["Row"]>;
      };
      group_expenses: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          username: string;
          amount: number;
          description: string;
          date: string;
          category_id: string | null;
          split_data: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_expenses"]["Row"]> & { group_id: string; user_id: string; username: string; amount: number; description: string; date: string };
        Update: Partial<Database["public"]["Tables"]["group_expenses"]["Row"]>;
      };
      lent_money: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          person_name: string;
          description: string | null;
          due_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lent_money"]["Row"]> & { user_id: string; amount: number; person_name: string };
        Update: Partial<Database["public"]["Tables"]["lent_money"]["Row"]>;
      };
      borrowed_money: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          person_name: string;
          description: string | null;
          due_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["borrowed_money"]["Row"]> & { user_id: string; amount: number; person_name: string };
        Update: Partial<Database["public"]["Tables"]["borrowed_money"]["Row"]>;
      };
      sales: {
        Row: {
          id: string;
          user_id: string;
          invoice_number: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          customer_gstin: string | null;
          items: any;
          subtotal: number;
          discount_amount: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sales"]["Row"]> & { user_id: string; total_amount: number };
        Update: Partial<Database["public"]["Tables"]["sales"]["Row"]>;
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          invoice_number: string | null;
          supplier_name: string | null;
          supplier_phone: string | null;
          items: any;
          total_amount: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["purchases"]["Row"]> & { user_id: string; total_amount: number };
        Update: Partial<Database["public"]["Tables"]["purchases"]["Row"]>;
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          price: number;
          unit: string;
          image_url: string | null;
          online_description: string | null;
          stock_quantity: number;
          hsn_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & { user_id: string; name: string; price: number; unit: string; stock_quantity: number };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      parties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          gstin: string | null;
          type: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parties"]["Row"]> & { user_id: string; name: string; type: string };
        Update: Partial<Database["public"]["Tables"]["parties"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          type: string;
          is_read: boolean;
          reference_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & { user_id: string; message: string; type: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      online_orders: {
        Row: {
          id: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          total_amount: number;
          delivery_charge: number;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["online_orders"]["Row"]> & { store_id: string; customer_name: string; customer_phone: string; customer_address: string; total_amount: number };
        Update: Partial<Database["public"]["Tables"]["online_orders"]["Row"]>;
      };
      online_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_time: number;
          created_at: string;
          products: {
            name: string;
          } | null;
        };
        Insert: Partial<Database["public"]["Tables"]["online_order_items"]["Row"]> & { order_id: string; product_id: string; quantity: number; price_at_time: number };
        Update: Partial<Database["public"]["Tables"]["online_order_items"]["Row"]>;
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: string | null;
          currency: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["user_settings"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
      };
      onboarding_status: {
        Row: {
          user_id: string;
          completed: boolean;
          step: string;
        };
        Insert: Partial<Database["public"]["Tables"]["onboarding_status"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["onboarding_status"]["Row"]>;
      };
      subscription_status: {
        Row: {
          user_id: string;
          status: string;
          plan: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscription_status"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["subscription_status"]["Row"]>;
      };
      order_status_events: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_status_events"]["Row"]> & { order_id: string; status: string };
        Update: Partial<Database["public"]["Tables"]["order_status_events"]["Row"]>;
      };
      product_correlations: {
        Row: {
          id: string;
          product_id_a: string;
          product_id_b: string;
          score: number;
        };
        Insert: Partial<Database["public"]["Tables"]["product_correlations"]["Row"]> & { product_id_a: string; product_id_b: string; score: number };
        Update: Partial<Database["public"]["Tables"]["product_correlations"]["Row"]>;
      };
      product_trending: {
        Row: {
          product_id: string;
          score: number;
        };
        Insert: Partial<Database["public"]["Tables"]["product_trending"]["Row"]> & { product_id: string; score: number };
        Update: Partial<Database["public"]["Tables"]["product_trending"]["Row"]>;
      };
      payments: {
        Row: {
          id: string;
          order_id: string | null;
          invoice_id: string | null;
          amount: number;
          status: string;
          payment_method: string | null;
          gateway_payment_id: string | null;
          gateway_order_id: string | null;
          created_at: string;
          updated_at: string;
          online_orders: {
            customer_name: string;
            customer_phone: string;
            customer_address: string;
            delivery_charge: number;
            online_order_items: {
              products: {
                name: string;
              } | null;
              quantity: number;
              price_at_time: number;
            }[];
          } | null;
          invoices: {
            invoice_number: string;
          }[];
          refunds: {
            gateway_refund_id: string | null;
            reason: string | null;
            created_at: string;
          }[];
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & { amount: number; status: string };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          amount: number;
          gateway_refund_id: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["refunds"]["Row"]> & { payment_id: string; amount: number };
        Update: Partial<Database["public"]["Tables"]["refunds"]["Row"]>;
      };
      payment_audit_logs: {
        Row: {
          id: string;
          payment_id: string | null;
          action: string;
          ip_address: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_audit_logs"]["Row"]> & { action: string };
        Update: Partial<Database["public"]["Tables"]["payment_audit_logs"]["Row"]>;
      };
      invoices: {
        Row: {
          id: string;
          sale_id: string | null;
          invoice_number: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & { invoice_number: string };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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