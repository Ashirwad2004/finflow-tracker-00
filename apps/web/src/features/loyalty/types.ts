export interface Party {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  date: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  party_id: string;
  type: "manual_add" | "manual_deduct" | "redeem";
  points: number;
  reason: string | null;
  created_at: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerUnit: number; // e.g. 1 point per 100 currency units spent
  pointValue: number; // e.g. 1 point = ₹1 discount
  vipThreshold: number; // e.g. ₹5,000 spent for VIP tier
  pointsExpiryDays: number; // 0 = never expire
}

export type Tier = "Bronze" | "Silver" | "Gold";
export type Segment = "all" | "slipping" | "vip" | "new";
export type SortKey = "name" | "points" | "totalSpent" | "lastPurchase";
export type SortDir = "asc" | "desc";

export interface CustomerLoyaltyData extends Party {
  totalSpent: number;
  visitCount: number;
  points: number;
  lastPurchaseDate: Date | null;
  tier: Tier;
  tierProgress: number;
  nextThreshold: number | null;
}

export interface MonthlyTrendItem {
  key: string;
  label: string;
  spend: number;
}

export interface CampaignTemplate {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  getBody: (name: string, points?: number, value?: number) => string;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerUnit: 100,
  pointValue: 1,
  vipThreshold: 5000,
  pointsExpiryDays: 0,
};

export const LOYALTY_PAGE_SIZE = 10;
