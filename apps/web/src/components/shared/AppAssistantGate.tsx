import { useLocation } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { AIAssistantChat } from "@/components/shared/AIAssistantChat";

const DASHBOARD_ROUTES = new Set(["/", "/dashboard", "/business-dashboard"]);

/**
 * Scopes RupayBill CFO exclusively to the Dashboard page corner.
 * Completely absent and unmounted on Invoices, POS, Inventory, Purchases, Parties, Reports, and Settings.
 */
export function AppAssistantGate() {
    const { user } = useAuth();
    const { pathname } = useLocation();

    if (!user) return null;
    if (!DASHBOARD_ROUTES.has(pathname)) return null;

    return <AIAssistantChat />;
}

