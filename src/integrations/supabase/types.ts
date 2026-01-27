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
      parties: {
        Row: {
          id: string
          user_id: string
          name: string
          type: "customer" | "vendor" | "both"
          phone: string | null
          email: string | null
          address: string | null
          gst_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: "customer" | "vendor" | "both"
          phone?: string | null
          email?: string | null
          address?: string | null
          gst_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: "customer" | "vendor" | "both"
          phone?: string | null
          email?: string | null
          address?: string | null
          gst_number?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          user_id: string
          invoice_number: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          date: string
          items: Json
          subtotal: number
          tax_amount: number
          total_amount: number
          status: string
          payment_method: string
          created_at: string
          party_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          date?: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          payment_method?: string
          created_at?: string
          party_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          date?: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          payment_method?: string
          created_at?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_party_id_fkey"
            columns: ["party_id"]
            referencedRelation: "parties"
            referencedColumns: ["id"]
          }
        ]
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          bill_number: string | null
          vendor_name: string | null
          date: string
          items: Json
          subtotal: number
          tax_amount: number
          total_amount: number
          status: string
          created_at: string
          party_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bill_number?: string | null
          vendor_name?: string | null
          date?: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          created_at?: string
          party_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bill_number?: string | null
          vendor_name?: string | null
          date?: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          created_at?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_party_id_fkey"
            columns: ["party_id"]
            referencedRelation: "parties"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          username: string | null
          display_name: string | null
          updated_at: string | null
          avatar_url: string | null
          business_name: string | null
          gst_number: string | null
          business_address: string | null
          business_phone: string | null
          is_business_mode: boolean | null
          signature_url: string | null
        }
        Insert: {
          id?: string
          user_id: string
          username?: string | null
          display_name?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          business_name?: string | null
          gst_number?: string | null
          business_address?: string | null
          business_phone?: string | null
          is_business_mode?: boolean | null
          signature_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          username?: string | null
          display_name?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          business_name?: string | null
          gst_number?: string | null
          business_address?: string | null
          business_phone?: string | null
          is_business_mode?: boolean | null
          signature_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          color: string | null
          icon: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          icon?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          icon?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          stock_quantity: number
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          price?: number
          stock_quantity?: number
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          stock_quantity?: number
          user_id?: string | null
        }
        Relationships: []
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
