import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/core/api/reports";

export function useAuthoritativeProfitAndLoss(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api-reports-profit-loss", startDate, endDate],
    queryFn: () => reportsApi.getProfitAndLoss({ start_date: startDate, end_date: endDate }),
    staleTime: 60000,
  });
}

export function useAuthoritativeTrialBalance(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api-reports-trial-balance", startDate, endDate],
    queryFn: () => reportsApi.getTrialBalance({ start_date: startDate, end_date: endDate }),
    staleTime: 60000,
  });
}

export function useAuthoritativeBalanceSheet() {
  return useQuery({
    queryKey: ["api-reports-balance-sheet"],
    queryFn: () => reportsApi.getBalanceSheet(),
    staleTime: 60000,
  });
}

export function useAuthoritativeReceivablesAging(refDate?: string) {
  return useQuery({
    queryKey: ["api-reports-receivables-aging", refDate],
    queryFn: () => reportsApi.getReceivablesAging(refDate),
    staleTime: 60000,
  });
}

export function useAuthoritativeSalesReport(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api-reports-sales", startDate, endDate],
    queryFn: () => reportsApi.getSalesReport({ start_date: startDate, end_date: endDate }),
    staleTime: 30000,
  });
}

export function useAuthoritativePurchasesReport(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api-reports-purchases", startDate, endDate],
    queryFn: () => reportsApi.getPurchasesReport({ start_date: startDate, end_date: endDate }),
    staleTime: 30000,
  });
}

export function useAuthoritativePartyLedger(partyId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api-reports-ledger", partyId, startDate, endDate],
    queryFn: () => reportsApi.getPartyLedger(partyId, { start_date: startDate, end_date: endDate }),
    enabled: !!partyId,
    staleTime: 30000,
  });
}
