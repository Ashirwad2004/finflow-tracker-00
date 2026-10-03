import { Purchase } from "../../types";

export type PurchaseFilterStatus = "all" | "paid" | "partial" | "pending" | "overdue";
export type PurchaseSortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface PurchasesTableProps {
  purchases: Purchase[];
  isLoading: boolean;
  searchTerm: string;
  filterStatus: PurchaseFilterStatus;
  setFilterStatus: (status: PurchaseFilterStatus) => void;
  sortBy: PurchaseSortOption;
  setSortBy: (sort: PurchaseSortOption) => void;
  onEdit: (purchase: Purchase) => void;
  onPrint: (purchase: Purchase) => void;
  onPreview: (purchase: Purchase) => void;
  onDownload: (purchase: Purchase) => void;
  onShare: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onOpenRecordPayment: (purchase: Purchase) => void;
  onOpenTranscript: (purchase: Purchase) => void;
}
