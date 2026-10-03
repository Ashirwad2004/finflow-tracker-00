export type ItemType =
  | "expense"
  | "lent_money"
  | "group"
  | "borrowed_money"
  | "party"
  | "product"
  | "sale"
  | "purchase";

export interface BaseDeletedItem {
  id: string;
  type: ItemType;
  deleted_at: string;
}

export interface DeletedExpense extends BaseDeletedItem {
  type: "expense";
  description: string;
  amount: number;
  date: string;
  group_id?: string;
  username?: string;
  categories?: { id: string; name: string; color: string; icon: string };
}

export interface DeletedLentMoney extends BaseDeletedItem {
  type: "lent_money";
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
}

export interface DeletedGroup extends BaseDeletedItem {
  type: "group";
  name: string;
  description: string;
  created_by: string;
}

export interface DeletedBorrowedMoney extends BaseDeletedItem {
  type: "borrowed_money";
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
}

export interface DeletedParty extends BaseDeletedItem {
  type: "party";
  user_id: string;
  name: string;
  party_type: "customer" | "vendor" | "both";
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
}

export interface DeletedProduct extends BaseDeletedItem {
  type: "product";
  user_id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  unit: string;
  is_listed_online?: boolean;
  online_description?: string | null;
  image_url?: string | null;
  mrp?: number | null;
  tax_rate?: number;
  barcode?: string | null;
  barcode_type?: string;
  barcode_source?: string;
  sku?: string | null;
  category?: string | null;
  hsn_code?: string | null;
  rack_location?: string | null;
}

export interface DeletedSale extends BaseDeletedItem {
  type: "sale";
  user_id: string;
  customer_name: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  date: string;
  items: any[];
}

export interface DeletedPurchase extends BaseDeletedItem {
  type: "purchase";
  user_id: string;
  vendor_name: string;
  bill_number: string;
  status: string;
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  discount_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  date: string;
  due_date?: string;
  items: any[];
  notes?: string;
  payment_mode?: string;
  place_of_supply?: string;
  party_id?: string;
  vendor_phone?: string;
  vendor_email?: string;
  vendor_gstin?: string;
  attachment_url?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export type DeletedItem =
  | DeletedExpense
  | DeletedLentMoney
  | DeletedGroup
  | DeletedBorrowedMoney
  | DeletedParty
  | DeletedProduct
  | DeletedSale
  | DeletedPurchase;
