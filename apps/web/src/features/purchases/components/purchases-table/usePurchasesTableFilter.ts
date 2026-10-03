import { useMemo, RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { isRecordOverdue } from "@/core/utils/overdue";
import { Purchase } from "../../types";
import { PurchaseFilterStatus, PurchaseSortOption } from "./types";

interface UsePurchasesTableFilterProps {
  purchases: Purchase[];
  searchTerm: string;
  filterStatus: PurchaseFilterStatus;
  sortBy: PurchaseSortOption;
  tableContainerRef: RefObject<HTMLDivElement | null>;
}

export function usePurchasesTableFilter({
  purchases,
  searchTerm,
  filterStatus,
  sortBy,
  tableContainerRef,
}: UsePurchasesTableFilterProps) {
  const sortedAndFilteredPurchases = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    const result = purchases.filter((purchase) => {
      const matchesSearch =
        !lowerSearch ||
        (purchase.vendor_name && purchase.vendor_name.toLowerCase().includes(lowerSearch)) ||
        (purchase.bill_number && purchase.bill_number.toLowerCase().includes(lowerSearch));

      let matchesFilter = filterStatus === "all";
      const amtPaid = Number(purchase.amount_paid || 0);
      const balDue = Number(
        purchase.balance_due != null
          ? purchase.balance_due
          : Math.max(0, purchase.total_amount - amtPaid)
      );
      const isSettled = balDue <= 0.001 && purchase.total_amount > 0;
      const isOverdue = isRecordOverdue(purchase);

      if (filterStatus === "paid") matchesFilter = isSettled || purchase.status === "paid";
      if (filterStatus === "partial")
        matchesFilter = (amtPaid > 0 && balDue > 0) || purchase.status === "partial";
      if (filterStatus === "overdue") matchesFilter = isOverdue && balDue > 0;
      if (filterStatus === "pending") matchesFilter = balDue > 0 && !isOverdue && amtPaid === 0;

      return matchesFilter && matchesSearch;
    });

    return result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      if (sortBy === "amount-desc") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (sortBy === "amount-asc") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      return 0;
    });
  }, [purchases, searchTerm, filterStatus, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: sortedAndFilteredPurchases.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 65,
    overscan: 10,
  });

  return {
    sortedAndFilteredPurchases,
    rowVirtualizer,
  };
}
