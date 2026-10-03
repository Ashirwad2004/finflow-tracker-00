export interface PartySummary {
  name: string;
  lent: number;
  borrowed: number;
  net: number;
  hasPending: boolean;
}

export interface GroupReportItem {
  id: string;
  name: string;
  members: number;
  totalSpent: number;
  balance: number;
  status: string;
}

export interface LentMoneyItem {
  id: string;
  person_name: string;
  amount: number | string;
  purpose?: string;
  status: string;
  created_at?: string;
  user_id?: string;
}

export interface BorrowedMoneyItem {
  id: string;
  person_name: string;
  amount: number | string;
  purpose?: string;
  status: string;
  created_at?: string;
  user_id?: string;
}
