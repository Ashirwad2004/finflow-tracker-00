import { Sale } from "../../types";

export type FilterStatus = "all" | "paid" | "pending" | "overdue" | "draft" | "partial";
export type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface SalesTableProps {
  invoices: Sale[];
  isLoading: boolean;
  searchTerm: string;
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  onEdit: (invoice: Sale) => void;
  onPrint: (invoice: Sale) => void;
  onPreview: (invoice: Sale) => void;
  onDownload: (invoice: Sale) => void;
  onShare: (invoice: Sale) => void;
  onWhatsApp: (invoice: Sale) => void;
  onGenerateEInvoice: (invoice: Sale) => void;
  onDelete: (invoice: Sale) => void;
  onOpenRecordPayment: (invoice: Sale) => void;
  onOpenTranscript: (invoice: Sale) => void;
}
