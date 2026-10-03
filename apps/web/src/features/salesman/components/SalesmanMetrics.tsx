import React from "react";
import { Clock, Truck, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SalesmanStats } from "./types";

interface SalesmanMetricsProps {
    stats: SalesmanStats;
}

export const SalesmanMetrics: React.FC<SalesmanMetricsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Pending Orders</p>
                        <h3 className="text-2xl font-black text-amber-500">{stats.pending}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Active Deliveries</p>
                        <h3 className="text-2xl font-black text-blue-500">{stats.active}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Completed</p>
                        <h3 className="text-2xl font-black text-green-500">{stats.completed}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Pending Returns</p>
                        <h3 className="text-2xl font-black text-rose-500">{stats.returns}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
