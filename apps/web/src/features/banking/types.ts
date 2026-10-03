export * from "./components/types";

export interface BankStatsSummary {
  totalLiquidBalance: number;
  totalUnreconciledEntries: number;
  totalUnclearedCheques: number;
  activeAccountsCount: number;
}
