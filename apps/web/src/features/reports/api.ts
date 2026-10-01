import { useQuery } from "@tanstack/react-query";
import { reportsApi, ProfitAndLossReport, TrialBalanceReport, BalanceSheetReport, ReceivablesAgingReport, SalesSummaryReport, PurchasesSummaryReport } from "@/core/api/reports";
import { useAuth } from "@/core/lib/auth";

export const reportKeys = {
  all: ["reports"] as const,
  pnl: (startDate?: string, endDate?: string) => [...reportKeys.all, "pnl", startDate, endDate] as const,
  trialBalance: (startDate?: string, endDate?: string) => [...reportKeys.all, "trial-balance", startDate, endDate] as const,
  balanceSheet: () => [...reportKeys.all, "balance-sheet"] as const,
  aging: (refDate?: string) => [...reportKeys.all, "receivables-aging", refDate] as const,
  sales: (startDate?: string, endDate?: string) => [...reportKeys.all, "sales", startDate, endDate] as const,
  purchases: (startDate?: string, endDate?: string) => [...reportKeys.all, "purchases", startDate, endDate] as const,
  partyLedger: (partyId: string, startDate?: string, endDate?: string) =>
    [...reportKeys.all, "ledger", partyId, startDate, endDate] as const,
};

export function useProfitAndLossQuery(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery<ProfitAndLossReport>({
    queryKey: reportKeys.pnl(startDate, endDate),
    queryFn: () => reportsApi.getProfitAndLoss({ start_date: startDate, end_date: endDate }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrialBalanceQuery(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery<TrialBalanceReport>({
    queryKey: reportKeys.trialBalance(startDate, endDate),
    queryFn: () => reportsApi.getTrialBalance({ start_date: startDate, end_date: endDate }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBalanceSheetQuery() {
  const { user } = useAuth();
  return useQuery<BalanceSheetReport>({
    queryKey: reportKeys.balanceSheet(),
    queryFn: () => reportsApi.getBalanceSheet(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReceivablesAgingQuery(refDate?: string) {
  const { user } = useAuth();
  return useQuery<ReceivablesAgingReport>({
    queryKey: reportKeys.aging(refDate),
    queryFn: () => reportsApi.getReceivablesAging(refDate),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesSummaryQuery(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery<SalesSummaryReport>({
    queryKey: reportKeys.sales(startDate, endDate),
    queryFn: () => reportsApi.getSalesReport({ start_date: startDate, end_date: endDate }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchasesSummaryQuery(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery<PurchasesSummaryReport>({
    queryKey: reportKeys.purchases(startDate, endDate),
    queryFn: () => reportsApi.getPurchasesReport({ start_date: startDate, end_date: endDate }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
