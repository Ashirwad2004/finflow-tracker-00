import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyReport } from "@/features/business/PartyReport";
import { DetailedPartyReport } from "@/features/business/DetailedPartyReport";
import { GSTR1Report } from "@/features/business/GSTR1Report";
import { FileBarChart, ShieldCheck } from "lucide-react";

const ReportsPage = () => {
    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8 animate-fade-in relative max-w-7xl">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                            <FileBarChart className="w-8 h-8 text-primary" />
                            Business Reports
                        </h1>
                        <p className="text-muted-foreground">Comprehensive analytics, ledgers, and GST returns for your business</p>
                    </div>
                </div>

                <Tabs defaultValue="party-report" className="space-y-6">
                    <div className="bg-card w-full sm:w-auto inline-block p-1 rounded-lg border">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto p-0 bg-transparent gap-1">
                            <TabsTrigger
                                value="party-report"
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-6 rounded-md shadow-sm transition-all"
                            >
                                Party Report
                            </TabsTrigger>
                            <TabsTrigger
                                value="detailed-ledger"
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-6 rounded-md shadow-sm transition-all"
                            >
                                Detailed Ledger
                            </TabsTrigger>
                            <TabsTrigger
                                value="gstr1"
                                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2.5 px-6 rounded-md shadow-sm transition-all flex items-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                GSTR-1
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="party-report" className="mt-0 outline-none">
                        <PartyReport />
                    </TabsContent>

                    <TabsContent value="detailed-ledger" className="mt-0 outline-none">
                        <DetailedPartyReport />
                    </TabsContent>

                    <TabsContent value="gstr1" className="mt-0 outline-none">
                        <GSTR1Report />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default ReportsPage;