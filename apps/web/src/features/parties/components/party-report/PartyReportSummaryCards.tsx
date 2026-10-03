import { ArrowUpRight, ArrowDownRight, Scale, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PartyReportSummaryCardsProps {
    totalReceivables: number;
    totalPayables: number;
    netWorkingCapital: number;
    totalOverdueDebtors: number;
    formatCurrency: (amount: number) => string;
}

export const PartyReportSummaryCards = ({
    totalReceivables,
    totalPayables,
    netWorkingCapital,
    totalOverdueDebtors,
    formatCurrency,
}: PartyReportSummaryCardsProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-600">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                            Accounts Receivable (Debtors)
                        </p>
                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                        {formatCurrency(totalReceivables)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Money to collect from customers
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                            Accounts Payable (Creditors)
                        </p>
                        <ArrowDownRight className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                        {formatCurrency(totalPayables)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Money to pay to vendors / suppliers
                    </p>
                </CardContent>
            </Card>

            <Card
                className={`border-l-4 ${
                    netWorkingCapital >= 0 ? "border-l-emerald-600" : "border-l-rose-500"
                }`}
            >
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                            Net Working Position
                        </p>
                        <Scale
                            className={`w-4 h-4 ${
                                netWorkingCapital >= 0 ? "text-emerald-600" : "text-rose-500"
                            }`}
                        />
                    </div>
                    <p
                        className={`text-2xl font-bold mt-1 ${
                            netWorkingCapital >= 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-700 dark:text-rose-300"
                        }`}
                    >
                        {formatCurrency(Math.abs(netWorkingCapital))}{" "}
                        {netWorkingCapital >= 0 ? "(Surplus)" : "(Deficit)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {netWorkingCapital >= 0
                            ? "Receivables exceed payables"
                            : "Payables exceed receivables"}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                            Overdue Debtors (&gt;30 Days)
                        </p>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                        {totalOverdueDebtors} Parties
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Requires follow-up / collection
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
