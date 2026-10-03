export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  user_id: string;
  username: string;
  category_id?: string;
  split_data?: string[] | null; // Array of user_ids involved
  categories?: { name: string; color: string; icon: string };
}

export interface Member {
  user_id: string;
  username: string;
  joined_at: string;
  balance?: number;
}

export interface SettlementRecord {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: "paid" | "cancelled";
  paid_by: string;
  created_at: string;
}

export interface SettlementItem {
  from: string;
  to: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  username: string | null;
}

export type SortKey = "name" | "members";
