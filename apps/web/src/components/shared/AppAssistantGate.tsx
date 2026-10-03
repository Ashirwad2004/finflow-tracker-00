import { useLocation } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { AIAssistantChat } from "@/components/shared/AIAssistantChat";

const HIDDEN_PREFIXES = ["/auth", "/store/"];

/** Show AI assistant only for signed-in app users (not landing, auth, or public storefront). */
export function AppAssistantGate() {
    const { user } = useAuth();
    const { pathname } = useLocation();

    if (!user) return null;
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

    return <AIAssistantChat />;
}
