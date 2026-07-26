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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      borrowed_money: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          person_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          person_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          person_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          month: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          month: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          month?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          name: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          bill_id: string | null
          content: string
          created_at: string
          customer_id: string
          id: string
          is_from_customer: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          bill_id?: string | null
          content: string
          created_at?: string
          customer_id: string
          id?: string
          is_from_customer?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          bill_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_from_customer?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          last_updated: string | null
          latitude: number
          longitude: number
          order_id: string
        }
        Insert: {
          last_updated?: string | null
          latitude: number
          longitude: number
          order_id: string
        }
        Update: {
          last_updated?: string | null
          latitude?: number
          longitude?: number
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_cooldowns: {
        Row: {
          last_at: string
          phone: string
        }
        Insert: {
          last_at?: string
          phone: string
        }
        Update: {
          last_at?: string
          phone?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          id: string
          ip_hash: string | null
          name: string | null
          notes: string | null
          phone: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_queue: {
        Row: {
          created_at: string | null
          error_log: string | null
          event_type: string
          id: string
          payload: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          bill_url: string | null
          category_id: string | null
          created_at: string
          date: string | null
          description: string
          id: string
          invoice_number: string | null
          is_reimbursable: boolean | null
          payment_method: string | null
          tax_amount: number | null
          updated_at: string
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          bill_url?: string | null
          category_id?: string | null
          created_at?: string
          date?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          is_reimbursable?: boolean | null
          payment_method?: string | null
          tax_amount?: number | null
          updated_at?: string
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          bill_url?: string | null
          category_id?: string | null
          created_at?: string
          date?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          is_reimbursable?: boolean | null
          payment_method?: string | null
          tax_amount?: number | null
          updated_at?: string
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          description: string
          id: string
          notes: string | null
          status: string
          submitted_at: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          description: string
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          group_id: string
          id: string
          split_data: Json | null
          split_type: string | null
          user_id: string
          username: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          group_id: string
          id?: string
          split_data?: Json | null
          split_type?: string | null
          user_id: string
          username?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          group_id?: string
          id?: string
          split_data?: Json | null
          split_type?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
          username: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
          username: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string | null
          discount: number | null
          hsn_code: string | null
          id: string
          invoice_id: string | null
          price: number | null
          quantity: number | null
          tax_rate: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          description?: string | null
          discount?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id?: string | null
          price?: number | null
          quantity?: number | null
          tax_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          description?: string | null
          discount?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id?: string | null
          price?: number | null
          quantity?: number | null
          tax_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          invoice_number: string
          payment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number: string
          payment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          description: string | null
          direction: string | null
          entry_date: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          direction?: string | null
          entry_date?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_id?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          direction?: string | null
          entry_date?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lent_money: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          person_name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          person_name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          person_name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string | null
          customer_id: string
          event_type: string
          id: string
          message_id: string | null
          skip_reason: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          event_type: string
          id?: string
          message_id?: string | null
          skip_reason?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          event_type?: string
          id?: string
          message_id?: string | null
          skip_reason?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          customer_id: string
          dnd_end: string | null
          dnd_start: string | null
          email: string | null
          id: string
          invoice_created: boolean | null
          invoice_due_soon: boolean | null
          invoice_overdue: boolean | null
          master: boolean | null
          payment_failed: boolean | null
          payment_received: boolean | null
          phone: string | null
          refund_issued: boolean | null
          subscription_cancelled: boolean | null
          subscription_expiring: boolean | null
          subscription_renewed: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          dnd_end?: string | null
          dnd_start?: string | null
          email?: string | null
          id?: string
          invoice_created?: boolean | null
          invoice_due_soon?: boolean | null
          invoice_overdue?: boolean | null
          master?: boolean | null
          payment_failed?: boolean | null
          payment_received?: boolean | null
          phone?: string | null
          refund_issued?: boolean | null
          subscription_cancelled?: boolean | null
          subscription_expiring?: boolean | null
          subscription_renewed?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          dnd_end?: string | null
          dnd_start?: string | null
          email?: string | null
          id?: string
          invoice_created?: boolean | null
          invoice_due_soon?: boolean | null
          invoice_overdue?: boolean | null
          master?: boolean | null
          payment_failed?: boolean | null
          payment_received?: boolean | null
          phone?: string | null
          refund_issued?: boolean | null
          subscription_cancelled?: boolean | null
          subscription_expiring?: boolean | null
          subscription_renewed?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_status: {
        Row: {
          created_at: string
          has_completed_profile: boolean | null
          has_created_first_expense: boolean | null
          has_seen_tutorial: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_completed_profile?: boolean | null
          has_created_first_expense?: boolean | null
          has_seen_tutorial?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_completed_profile?: boolean | null
          has_created_first_expense?: boolean | null
          has_seen_tutorial?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      online_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_time: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_time?: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_time?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_boy_name: string | null
          delivery_boy_phone: string | null
          delivery_charge: number | null
          id: string
          status: string
          stock_reserved: boolean
          store_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_boy_name?: string | null
          delivery_boy_phone?: string | null
          delivery_charge?: number | null
          id?: string
          status?: string
          stock_reserved?: boolean
          store_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_boy_name?: string | null
          delivery_boy_phone?: string | null
          delivery_charge?: number | null
          id?: string
          status?: string
          stock_reserved?: boolean
          store_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_returns: {
        Row: {
          created_at: string
          id: string
          image_url: string
          order_id: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          order_id: string
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          order_id?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          phone: string | null
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          phone?: string | null
          type: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          payment_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          idempotency_key: string | null
          order_id: string
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          order_id: string
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          order_id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string
          description: string | null
          hsn_code: string | null
          id: string
          image_url: string | null
          is_listed_online: boolean | null
          min_stock_level: number | null
          name: string
          online_description: string | null
          price: number
          rack_location: string | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_listed_online?: boolean | null
          min_stock_level?: number | null
          name: string
          online_description?: string | null
          price?: number
          rack_location?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_listed_online?: boolean | null
          min_stock_level?: number | null
          name?: string
          online_description?: string | null
          price?: number
          rack_location?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_address: string | null
          business_logo: string | null
          business_name: string | null
          business_phone: string | null
          delivery_charge: number | null
          display_name: string | null
          email: string | null
          free_delivery_min_amount: number | null
          full_name: string | null
          gst_number: string | null
          id: string
          is_admin: boolean | null
          is_business_mode: boolean | null
          is_ca: boolean | null
          is_store_active: boolean | null
          online_payment_enabled: boolean | null
          payment_gateway: string | null
          phone: string | null
          razorpay_key_id: string | null
          signature_url: string | null
          store_name: string | null
          store_slug: string | null
          stripe_publishable_key: string | null
          updated_at: string | null
          upi_id: string | null
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_address?: string | null
          business_logo?: string | null
          business_name?: string | null
          business_phone?: string | null
          delivery_charge?: number | null
          display_name?: string | null
          email?: string | null
          free_delivery_min_amount?: number | null
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_admin?: boolean | null
          is_business_mode?: boolean | null
          is_ca?: boolean | null
          is_store_active?: boolean | null
          online_payment_enabled?: boolean | null
          payment_gateway?: string | null
          phone?: string | null
          razorpay_key_id?: string | null
          signature_url?: string | null
          store_name?: string | null
          store_slug?: string | null
          stripe_publishable_key?: string | null
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_address?: string | null
          business_logo?: string | null
          business_name?: string | null
          business_phone?: string | null
          delivery_charge?: number | null
          display_name?: string | null
          email?: string | null
          free_delivery_min_amount?: number | null
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_admin?: boolean | null
          is_business_mode?: boolean | null
          is_ca?: boolean | null
          is_store_active?: boolean | null
          online_payment_enabled?: boolean | null
          payment_gateway?: string | null
          phone?: string | null
          razorpay_key_id?: string | null
          signature_url?: string | null
          store_name?: string | null
          store_slug?: string | null
          stripe_publishable_key?: string | null
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          attachment_url: string | null
          bill_number: string | null
          cgst: number | null
          created_at: string
          date: string | null
          discount_amount: number | null
          id: string
          igst: number | null
          items: Json | null
          party_id: string | null
          place_of_supply: string | null
          sgst: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          user_id: string
          vendor_email: string | null
          vendor_gstin: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }
        Insert: {
          attachment_url?: string | null
          bill_number?: string | null
          cgst?: number | null
          created_at?: string
          date?: string | null
          discount_amount?: number | null
          id?: string
          igst?: number | null
          items?: Json | null
          party_id?: string | null
          place_of_supply?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id: string
          vendor_email?: string | null
          vendor_gstin?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Update: {
          attachment_url?: string | null
          bill_number?: string | null
          cgst?: number | null
          created_at?: string
          date?: string | null
          discount_amount?: number | null
          id?: string
          igst?: number | null
          items?: Json | null
          party_id?: string | null
          place_of_supply?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id?: string
          vendor_email?: string | null
          vendor_gstin?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          gateway_refund_id: string | null
          id: string
          payment_id: string
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          payment_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          payment_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amended_invoice_id: string | null
          bank_details: Json | null
          cgst: number | null
          created_at: string
          customer_email: string | null
          customer_gstin: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string | null
          discount_amount: number | null
          document_type: string | null
          due_date: string | null
          eway_bill_number: string | null
          id: string
          igst: number | null
          invoice_number: string | null
          irn: string | null
          irn_date: string | null
          is_amendment: boolean | null
          is_reverse_charge: boolean | null
          items: Json | null
          original_invoice_id: string | null
          party_id: string | null
          payment_method: string | null
          place_of_supply: string | null
          qr_code: string | null
          sgst: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          theme: string | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          amended_invoice_id?: string | null
          bank_details?: Json | null
          cgst?: number | null
          created_at?: string
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          discount_amount?: number | null
          document_type?: string | null
          due_date?: string | null
          eway_bill_number?: string | null
          id?: string
          igst?: number | null
          invoice_number?: string | null
          irn?: string | null
          irn_date?: string | null
          is_amendment?: boolean | null
          is_reverse_charge?: boolean | null
          items?: Json | null
          original_invoice_id?: string | null
          party_id?: string | null
          payment_method?: string | null
          place_of_supply?: string | null
          qr_code?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          theme?: string | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          amended_invoice_id?: string | null
          bank_details?: Json | null
          cgst?: number | null
          created_at?: string
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          discount_amount?: number | null
          document_type?: string | null
          due_date?: string | null
          eway_bill_number?: string | null
          id?: string
          igst?: number | null
          invoice_number?: string | null
          irn?: string | null
          irn_date?: string | null
          is_amendment?: boolean | null
          is_reverse_charge?: boolean | null
          items?: Json | null
          original_invoice_id?: string | null
          party_id?: string | null
          payment_method?: string | null
          place_of_supply?: string | null
          qr_code?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          theme?: string | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_amended_invoice_id_fkey"
            columns: ["amended_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bill_participants: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_paid: boolean | null
          name: string
          split_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          name: string
          split_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          name?: string
          split_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_bill_participants_split_bill_id_fkey"
            columns: ["split_bill_id"]
            isOneToOne: false
            referencedRelation: "split_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bills: {
        Row: {
          created_at: string
          id: string
          title: string
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          total_amount: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      store_salesmen: {
        Row: {
          can_manage_orders: boolean
          can_manage_returns: boolean
          created_at: string
          id: string
          is_active: boolean
          salesman_email: string
          salesman_name: string
          salesman_password: string
          salesman_phone: string | null
          store_id: string
        }
        Insert: {
          can_manage_orders?: boolean
          can_manage_returns?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          salesman_email: string
          salesman_name: string
          salesman_password?: string
          salesman_phone?: string | null
          store_id: string
        }
        Update: {
          can_manage_orders?: boolean
          can_manage_returns?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          salesman_email?: string
          salesman_name?: string
          salesman_password?: string
          salesman_phone?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_salesmen_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_status: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          plan: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          plan?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          plan?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_periods: {
        Row: {
          id: string
          locked_at: string | null
          month: number
          status: string
          user_id: string | null
          year: number
        }
        Insert: {
          id?: string
          locked_at?: string | null
          month: number
          status?: string
          user_id?: string | null
          year: number
        }
        Update: {
          id?: string
          locked_at?: string | null
          month?: number
          status?: string
          user_id?: string | null
          year?: number
        }
        Relationships: []
      }
      update_schema_borrowed: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          currency: string | null
          language: string | null
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_online_order: { Args: { p_order_id: string }; Returns: undefined }
      create_expense_transaction_v2: { Args: { payload: Json }; Returns: Json }
      create_purchase_transaction: {
        Args: {
          _amount: number
          _attachment_url?: string
          _bill_number: string
          _date: string
          _description: string
          _items: Json
          _status: string
          _vendor_name: string
        }
        Returns: Json
      }
      create_sale_transaction:
        | {
            Args: {
              _amount: number
              _customer_name: string
              _date: string
              _invoice_number: string
              _items: Json
              _payment_method?: string
              _status: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount: number
              _customer_name: string
              _date: string
              _invoice_number: string
              _items: Json
              _status: string
              _workspace_id: string
            }
            Returns: Json
          }
      create_sale_transaction_v2: {
        Args: {
          _amount: number
          _customer_name: string
          _date: string
          _invoice_number: string
          _items: Json
          _payment_method?: string
          _status: string
        }
        Returns: Json
      }
      delivery_complete_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      ensure_default_workspace: { Args: never; Returns: Json }
      generate_gstr1_data: {
        Args: {
          p_biz_state_code: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_gstr2b_data: {
        Args: {
          p_biz_state_code: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_gstr3b_data: {
        Args: {
          p_biz_state_code: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_overdue_notifications: { Args: never; Returns: undefined }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          business_address: string
          business_logo: string
          business_name: string
          business_phone: string
          created_at: string
          email: string
          full_name: string
          gst_number: string
          id: string
          is_admin: boolean
          is_business_mode: boolean
          signature_url: string
          updated_at: string
          user_id: string
        }[]
      }
      get_business_metrics: { Args: never; Returns: Json }
      get_customer_orders: {
        Args: { p_order_ids: string[] }
        Returns: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_boy_name: string
          delivery_boy_phone: string
          delivery_charge: number
          id: string
          items: Json
          status: string
          store_id: string
          store_name: string
          total_amount: number
        }[]
      }
      get_group_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_my_group_ids: {
        Args: never
        Returns: {
          group_id: string
        }[]
      }
      get_orders_by_phone: {
        Args: { p_phone: string; p_store_id?: string }
        Returns: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_charge: number
          id: string
          items: Json
          status: string
          store_id: string
          store_name: string
          total_amount: number
        }[]
      }
      get_public_store: {
        Args: { p_slug: string }
        Returns: {
          business_logo: string
          business_name: string
          delivery_charge: number
          display_name: string
          is_store_active: boolean
          store_slug: string
          user_id: string
        }[]
      }
      get_public_store_products: {
        Args: { p_store_id: string }
        Returns: {
          id: string
          image_url: string
          name: string
          online_description: string
          price: number
          stock_quantity: number
          unit: string
          user_id: string
        }[]
      }
      get_sales_trend: { Args: { p_days?: number }; Returns: Json }
      get_user_default_workspace: { Args: never; Returns: string }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      place_online_order: {
        Args: {
          p_customer_address: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_charge: number
          p_items: Json
          p_status?: string
          p_store_id: string
          p_total_amount: number
        }
        Returns: string
      }
      restore_online_order_stock: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      set_user_admin_status: {
        Args: { make_admin: boolean; target_user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
