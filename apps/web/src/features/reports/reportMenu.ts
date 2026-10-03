import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Scale,
  Building,
  Layers,
  Receipt,
  Users,
  Boxes,
  Wallet,
  ClipboardList,
  ShieldCheck,
  Activity,
  FileText,
  Percent,
  ArrowUpDown,
  ShoppingBag,
} from "lucide-react";

export type FinFlowReportId =
  // 1. Transaction
  | "sale_register"
  | "purchase_register"
  | "day_book"
  | "all_transactions"
  | "bill_profit"
  | "cash_flow"
  // 2. Accounting & CA
  | "pnl"
  | "balance_sheet"
  | "trial_balance"
  // 3. Party
  | "party_statement"
  | "party_outstanding"
  | "sale_aging"
  // 4. GST
  | "gstr1"
  | "gstr2b"
  | "gstr3b"
  | "gstr9"
  | "gst_slabs"
  // 5. Stock & Inventory
  | "stock_summary"
  | "item_pnl"
  // 6. Expenses
  | "expense_register"
  | "expense_category"
  // 7. Orders
  | "sale_orders"
  | "purchase_orders"
  // 8. Business Status
  | "business_health";

export interface ReportMenuItem {
  id: FinFlowReportId;
  label: string;
  category: string;
  tag?: string;
  icon: any;
}

export const FINFLOW_REPORTS_MENU: ReportMenuItem[] = [
  // Transaction Reports
  { id: "sale_register", label: "Sale Register", category: "Transaction Reports", icon: TrendingUp },
  { id: "purchase_register", label: "Purchase Register", category: "Transaction Reports", icon: TrendingDown },
  { id: "day_book", label: "Day Book", category: "Transaction Reports", tag: "Daily", icon: Calendar },
  { id: "all_transactions", label: "All Transactions", category: "Transaction Reports", icon: FileText },
  { id: "bill_profit", label: "Bill-Wise Profit", category: "Transaction Reports", icon: Receipt },
  { id: "cash_flow", label: "Cash Flow Statement", category: "Transaction Reports", tag: "AS-3", icon: ArrowUpDown },

  // Accounting & CA
  { id: "pnl", label: "Profit & Loss Account", category: "Accounting & CA", tag: "P&L", icon: Scale },
  { id: "balance_sheet", label: "Balance Sheet", category: "Accounting & CA", tag: "Sch-III", icon: Building },
  { id: "trial_balance", label: "Trial Balance", category: "Accounting & CA", tag: "Double-Entry", icon: Layers },

  // Party Reports
  { id: "party_statement", label: "Party Statement (Ledger)", category: "Party Reports", icon: Users },
  { id: "party_outstanding", label: "Party Outstanding", category: "Party Reports", icon: Users },
  { id: "sale_aging", label: "Sale Aging Report", category: "Party Reports", tag: "MSME 45D", icon: Clock },

  // GST Reports
  { id: "gstr1", label: "GSTR-1 (Sales Return)", category: "GST Reports", tag: "Portal", icon: ShieldCheck },
  { id: "gstr2b", label: "GSTR-2B (Purchases ITC)", category: "GST Reports", icon: ShieldCheck },
  { id: "gstr3b", label: "GSTR-3B (Monthly Summary)", category: "GST Reports", icon: ShieldCheck },
  { id: "gstr9", label: "GSTR-9 (Annual Return)", category: "GST Reports", tag: "Annual", icon: ShieldCheck },
  { id: "gst_slabs", label: "GST Rate / Slab-Wise", category: "GST Reports", tag: "0-28%", icon: Percent },

  // Stock Reports
  { id: "stock_summary", label: "Stock Valuation Summary", category: "Item & Stock", tag: "Cost", icon: Boxes },
  { id: "item_pnl", label: "Item-Wise Profit & Loss", category: "Item & Stock", icon: TrendingUp },

  // Expenses
  { id: "expense_register", label: "Expense Transaction Register", category: "Expense Reports", icon: Wallet },
  { id: "expense_category", label: "Expense Category Summary", category: "Expense Reports", icon: Wallet },

  // Orders
  { id: "sale_orders", label: "Sale Orders Register", category: "Order Reports", icon: ShoppingBag },
  { id: "purchase_orders", label: "Purchase Orders Register", category: "Order Reports", icon: ClipboardList },

  // Business Status
  { id: "business_health", label: "Business Health & Solvency", category: "Business Status", tag: "Audit", icon: Activity },
];
