import React from "react";
import { Truck, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface SalesmanHeaderProps {
    salesmanName?: string;
    businessName: string;
    onLogout: () => void;
}

export const SalesmanHeader: React.FC<SalesmanHeaderProps> = ({
    salesmanName,
    businessName,
    onLogout,
}) => {
    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                {/* Left: Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-base tracking-tight leading-none text-slate-900 dark:text-white">RupeeBill Delivery</h1>
                        <p className="text-[10px] text-muted-foreground mt-1">Fulfillment Portal</p>
                    </div>
                </div>

                {/* Middle: Profile Info */}
                <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                        {salesmanName?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{salesmanName}</div>
                        <div className="text-[10px] text-muted-foreground">Salesman @ <span className="font-semibold text-indigo-600 dark:text-indigo-400">{businessName}</span></div>
                    </div>
                    <Badge variant="outline" className="ml-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[9px] uppercase tracking-wider font-bold">
                        Active Session
                    </Badge>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onLogout}
                        className="rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                        title="Log Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Mobile Sub-Header */}
            <div className="md:hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-slate-750 dark:text-slate-355 truncate max-w-[200px]">
                    {salesmanName} @ {businessName}
                </span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[8px] px-1.5 font-black uppercase tracking-wider">
                    Active
                </Badge>
            </div>
        </header>
    );
};
