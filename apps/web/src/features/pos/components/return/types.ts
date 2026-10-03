export interface POSReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShiftId?: string | null;
  onReturnSuccess?: (result: any) => void;
}

export interface SaleItemLine {
  id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  unit?: string;
  hsn_code?: string;
  // State for return
  return_quantity: number;
  restock_inventory: boolean;
  is_selected: boolean;
}

export interface SaleRecord {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_phone?: string;
  party_id?: string;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  items: any[];
}
