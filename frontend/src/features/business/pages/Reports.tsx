import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyReport } from "@/features/business/components/PartyReport";
import { DetailedPartyReport } from "@/features/business/components/DetailedPartyReport";
import { GstReportsHub } from "@/features/business/components/GstReportsHub";
import { OnlineStoreReport } from "@/features/business/components/OnlineStoreReport";
import { BusinessAiInsights } from "@/features/business/components/BusinessAiInsights";
import { FileBarChart, ShieldCheck, Users, BookOpen, ShoppingBag, Sparkles } from "lucide-react";

const ReportsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Tab and selected party state
    const urlTab = searchParams.get("tab") || "party-report";
    const urlParty = searchParams.get("party") || null;

    const [activeTab, setActiveTab] = useState<string>(urlTab);
    const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<string | null>(urlParty);

    // Sync state if URL changes externally
    useEffect(() => {
        const tab = searchParams.get("tab");
        const party = searchParams.get("party");
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
        if (party && party !== selectedPartyForLedger) {
            setSelectedPartyForLedger(party);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set("tab", newTab);
            return next;
        }, { replace: true });
    };

    const handleSelectPartyForLedger = (partyName: string) => {
        setSelectedPartyForLedger(partyName);
        setActiveTab("detailed-ledger");
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set("tab", "detailed-ledger");
            next.set("party", partyName);
            return next;
        }, { replace: true });
    };

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6 animate-fade-in">
                {/* Clean Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
                            <FileBarChart className="w-7 h-7 text-primary" />
                            Business Reports
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Party ledgers, statement of accounts, and unified statutory GST compliance
                        </p>
                    </div>
                </div>

                {/* Clean, Simple Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <div className="bg-card w-full sm:w-auto inline-block p-1 rounded-xl border shadow-xs">
                        <TabsList className="flex flex-wrap sm:flex-nowrap h-auto p-0 bg-transparent gap-1">
                            <TabsTrigger
                                value="party-report"
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Party Balances
                            </TabsTrigger>
                            <TabsTrigger
                                value="detailed-ledger"
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Detailed Ledger
                            </TabsTrigger>
                            <TabsTrigger
                                value="gst-hub"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                GST Returns Hub
                            </TabsTrigger>
                            <TabsTrigger
                                value="online-store"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Online Store
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai-audit"
                                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Audit
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="party-report" className="mt-0 outline-none">
                        <PartyReport onSelectPartyForLedger={handleSelectPartyForLedger} />
                    </TabsContent>

                    <TabsContent value="detailed-ledger" className="mt-0 outline-none">
                        <DetailedPartyReport initialPartyName={selectedPartyForLedger} />
                    </TabsContent>

                    <TabsContent value="gst-hub" className="mt-0 outline-none">
                        <GstReportsHub />
                    </TabsContent>

                    <TabsContent value="online-store" className="mt-0 outline-none">
                        <OnlineStoreReport />
                    </TabsContent>

                    <TabsContent value="ai-audit" className="mt-0 outline-none">
                        <BusinessAiInsights />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default ReportsPage;