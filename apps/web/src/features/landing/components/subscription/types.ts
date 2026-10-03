export type PlanId = "starter" | "pro" | "business";
export type BillingCycle = "monthly" | "annual";
export type PaymentMethodType = "upi" | "card" | "netbanking";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPricePerMonth: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: "pro",
    name: "RupeeBill Pro (All-in-One)",
    monthlyPrice: 299,
    annualPricePerMonth: 299,
    description: "Complete, unlimited access to all billing, storefront, offline sync, and financial tools.",
    features: [
      "Unlimited Expenses, Sales & Purchases",
      "Digital Storefront & Real-time Order Sync",
      "Offline Host-Disk Persistence (OPFS)",
      "AI Receipt OCR & Smart Categorization",
      "Customer & Vendor Parties Ledgers",
      "GSTR-1 & Financial Reports Export",
      "Print Studio for Thermal & A4 Invoices",
      "Multi-device & Priority Cloud Sync",
    ],
    recommended: true,
  },
];
