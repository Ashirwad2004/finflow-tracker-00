import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HandCoins, RefreshCcw, Receipt } from "lucide-react";
import { usePersonalReportsData } from "./usePersonalReportsData";
import { PersonalReportsMetrics } from "./PersonalReportsMetrics";
import {
  PartyWiseReportTable,
  LentReportTable,
  BorrowedReportTable,
  ExpensesRecapTable,
  GroupReportTable,
} from "./PersonalReportsTables";

export default function PersonalReports() {
  const [activeTab, setActiveTab] = useState("party-wise");
  const {
    lentMoney,
    borrowedMoney,
    expenses,
    parties,
    groupReports,
    totalLent,
    totalBorrowed,
    totalExpenses,
    isLoading,
    formatDateSafe,
  } = usePersonalReportsData();

  return (
    <AppLayout>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col mb-8 gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Personal Reports</h2>
          <p className="text-muted-foreground text-sm">
            Comprehensive overview of your personal financial interactions
          </p>
        </div>

        <PersonalReportsMetrics
          totalLent={totalLent}
          totalBorrowed={totalBorrowed}
          totalExpenses={totalExpenses}
          lentMoney={lentMoney}
          borrowedMoney={borrowedMoney}
          expensesCount={expenses.length}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full lg:w-fit grid-cols-2 lg:grid-cols-5 bg-muted/50 p-1 rounded-xl mb-8">
            <TabsTrigger value="party-wise" className="rounded-lg gap-2 text-sm">
              <Users className="w-4 h-4" /> Party-wise Net
            </TabsTrigger>
            <TabsTrigger value="lent" className="rounded-lg gap-2 text-sm">
              <HandCoins className="w-4 h-4" /> Lent Ledger
            </TabsTrigger>
            <TabsTrigger value="borrowed" className="rounded-lg gap-2 text-sm">
              <RefreshCcw className="w-4 h-4" /> Borrowed Ledger
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg gap-2 text-sm">
              <Receipt className="w-4 h-4" /> Expenses Recap
            </TabsTrigger>
            <TabsTrigger value="group-report" className="rounded-lg gap-2 text-sm">
              <Users className="w-4 h-4" /> Group Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="party-wise" className="m-0 mt-4 outline-none">
            <PartyWiseReportTable isLoading={isLoading} parties={parties} />
          </TabsContent>

          <TabsContent value="lent" className="m-0 mt-4 outline-none">
            <LentReportTable isLoading={isLoading} lentMoney={lentMoney} formatDateSafe={formatDateSafe} />
          </TabsContent>

          <TabsContent value="borrowed" className="m-0 mt-4 outline-none">
            <BorrowedReportTable
              isLoading={isLoading}
              borrowedMoney={borrowedMoney}
              formatDateSafe={formatDateSafe}
            />
          </TabsContent>

          <TabsContent value="expenses" className="m-0 mt-4 outline-none">
            <ExpensesRecapTable isLoading={isLoading} expenses={expenses} formatDateSafe={formatDateSafe} />
          </TabsContent>

          <TabsContent value="group-report" className="m-0 mt-4 outline-none">
            <GroupReportTable isLoading={isLoading} groupReports={groupReports} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
