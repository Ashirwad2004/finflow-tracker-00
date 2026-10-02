import React from "react";
import { Loader2, Truck, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SalesmanLoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-sm font-medium animate-pulse">
                Loading salesman portal...
            </p>
        </div>
    );
};

interface SalesmanGateScreenProps {
    onLogout: () => void;
}

export const SalesmanSuspendedScreen: React.FC<SalesmanGateScreenProps> = ({ onLogout }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white">RupeeBill Delivery</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onLogout}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Access Suspended</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Your salesman account access has been suspended by the store owner. Please contact them to restore access.
                </p>
            </main>
        </div>
    );
};

export const SalesmanNoPermissionsScreen: React.FC<SalesmanGateScreenProps> = ({ onLogout }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white">RupeeBill Delivery</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onLogout}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Permissions Revoked</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                    The store owner has disabled all feature access permissions for your account. Please contact them to restore access.
                </p>
            </main>
        </div>
    );
};
