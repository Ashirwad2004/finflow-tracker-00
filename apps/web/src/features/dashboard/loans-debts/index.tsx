import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HandCoins, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { LoansDebtsOverviewProps } from "./types";
import { useLoansDebtsMutations } from "./useLoansDebtsMutations";
import { LentLoansList } from "./LentLoansList";
import { BorrowedDebtsList } from "./BorrowedDebtsList";

export const LoansDebtsOverview = ({
  lentMoney,
  borrowedMoney,
  userId,
  onLendClick,
  onBorrowClick,
}: LoansDebtsOverviewProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lent");

  // Filter pending (active) items
  const pendingLent = lentMoney.filter((l) => l.status === "pending");
  const pendingBorrowed = borrowedMoney.filter((b) => b.status === "pending");

  const { settleLoan, settleDebt } = useLoansDebtsMutations(userId);

  return (
    <Card className="bg-card rounded-2xl border shadow-sm p-6 overflow-hidden relative group">
      {/* Top indicator stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-rose-500" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-indigo-500" />
          Loans & Debts Hub
        </h3>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          Accounts
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        Track money lent to friends or outstanding bills/debts you owe.
      </p>

      <Tabs defaultValue="lent" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <TabsTrigger
            value="lent"
            className="rounded-lg text-xs font-bold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
          >
            Lent ({pendingLent.length})
          </TabsTrigger>
          <TabsTrigger
            value="borrowed"
            className="rounded-lg text-xs font-bold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm"
          >
            Borrowed ({pendingBorrowed.length})
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="lent" className="m-0 focus-visible:outline-none animate-fade-in">
            <LentLoansList
              pendingLent={pendingLent}
              onLendClick={onLendClick}
              onSettleLoan={(id) => settleLoan.mutate(id)}
              isSettlePending={settleLoan.isPending}
              onViewAll={() => navigate("/lent-money")}
            />
          </TabsContent>

          <TabsContent value="borrowed" className="m-0 focus-visible:outline-none animate-fade-in">
            <BorrowedDebtsList
              pendingBorrowed={pendingBorrowed}
              onBorrowClick={onBorrowClick}
              onSettleDebt={(id) => settleDebt.mutate(id)}
              isSettlePending={settleDebt.isPending}
              onViewAll={() => navigate("/borrowed-money")}
            />
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Footer navigation shortcut */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <button
          onClick={() => navigate(activeTab === "lent" ? "/lent-money" : "/borrowed-money")}
          className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View Full Ledger <ArrowRight className="w-3 h-3" />
        </button>
        <div className="flex gap-1.5">
          <Button
            onClick={onLendClick}
            size="xs"
            variant="ghost"
            className="h-6 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5"
          >
            + Lend
          </Button>
          <Button
            onClick={onBorrowClick}
            size="xs"
            variant="ghost"
            className="h-6 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/5"
          >
            + Borrow
          </Button>
        </div>
      </div>
    </Card>
  );
};
