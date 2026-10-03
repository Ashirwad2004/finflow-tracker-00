import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import {
    PartyReportProps,
    EnrichedPartyItem,
    usePartyReportData,
    PartyReportSummaryCards,
    PartyReportFilterBar,
    PartyReportTable,
} from "./party-report";

export type { PartyReportProps, EnrichedPartyItem };

export const PartyReport = ({ onSelectPartyForLedger }: PartyReportProps) => {
    const {
        formatCurrency,
        currency,
        profile,
        searchTerm,
        setSearchTerm,
        typeFilter,
        setTypeFilter,
        balanceFilter,
        setBalanceFilter,
        activeReminderParty,
        setActiveReminderParty,
        salesLoading,
        purchasesLoading,
        aggregatedData,
        filteredData,
        totalReceivables,
        totalPayables,
        netWorkingCapital,
        totalOverdueDebtors,
        sendWhatsAppReminder,
    } = usePartyReportData();

    return (
        <div className="space-y-6">
            {/* Executive CA Summary Cards */}
            <PartyReportSummaryCards
                totalReceivables={totalReceivables}
                totalPayables={totalPayables}
                netWorkingCapital={netWorkingCapital}
                totalOverdueDebtors={totalOverdueDebtors}
                formatCurrency={formatCurrency}
            />

            {/* Main Party Table Card */}
            <Card className="overflow-hidden">
                <CardHeader className="pb-4 border-b bg-card">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                Party Ledger & Balance Summary
                                <Badge variant="outline" className="text-xs font-semibold">
                                    {filteredData.length} of {aggregatedData.length} parties
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Verified accounts receivable, accounts payable, and net Dr/Cr balances
                            </CardDescription>
                        </div>

                        {/* Search & Quick Filter Controls */}
                        <PartyReportFilterBar
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            typeFilter={typeFilter}
                            setTypeFilter={setTypeFilter}
                            balanceFilter={balanceFilter}
                            setBalanceFilter={setBalanceFilter}
                            filteredData={filteredData}
                            profile={profile}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <PartyReportTable
                        salesLoading={salesLoading}
                        purchasesLoading={purchasesLoading}
                        filteredData={filteredData}
                        formatCurrency={formatCurrency}
                        onSendWhatsAppReminder={sendWhatsAppReminder}
                        onSelectPartyForLedger={onSelectPartyForLedger}
                    />
                </CardContent>
            </Card>

            {activeReminderParty && (
                <SendWhatsAppDialog
                    open={!!activeReminderParty}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) setActiveReminderParty(null);
                    }}
                    messageType="reminder"
                    recipientName={activeReminderParty.name}
                    recipientPhone={activeReminderParty.phone || ""}
                    metadata={{
                        outstanding_amount: activeReminderParty.receivable,
                        currency_symbol: currency?.symbol || "₹",
                    }}
                    defaultMessage={`Dear ${activeReminderParty.name},\n\nThis is a gentle reminder from ${
                        (profile as any)?.business_name || "our accounts department"
                    } regarding your outstanding balance of ${formatCurrency(
                        activeReminderParty.receivable
                    )}.\n\nPlease arrange for payment at your earliest convenience.\n\nThank you!`}
                />
            )}
        </div>
    );
};

export default PartyReport;