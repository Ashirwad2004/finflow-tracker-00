export interface CustomerPartyItem {
  id: string;
  name: string;
  type?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  gstin?: string;
  opening_balance?: number;
  opening_balance_type?: "to_receive" | "to_pay";
}

export interface CustomerSectionProps {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerGstin: string;
  placeOfSupply: string;
  onCustomerNameChange: (val: string) => void;
  onCustomerPhoneChange: (val: string) => void;
  onCustomerEmailChange: (val: string) => void;
  onCustomerGstinChange: (val: string) => void;
  onPlaceOfSupplyChange: (val: string) => void;
  parties: CustomerPartyItem[];
  userId?: string;
  error?: string;
  onPartySelected?: (party: CustomerPartyItem) => void;
}
