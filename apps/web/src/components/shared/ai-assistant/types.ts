export interface ChatMessage {
    id: string;
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ActionPayload {
    type: "add_expense" | "lent_money" | "borrowed_money";
    data: {
        amount: number;
        description: string;
        categoryName?: string;
        person_name?: string;
    };
}

export interface SuggestionItem {
    label: string;
    text: string;
    icon: string;
}

export const SUGGESTIONS: SuggestionItem[] = [
    { label: "CFO Cash Flow", text: "Provide a CFO cash flow and profitability analysis", icon: "📊" },
    { label: "Tax Liability", text: "Estimate my GST tax liability and GSTR-1 parameters", icon: "🛡️" },
    { label: "Receivables Risk", text: "Analyze peer debt receivables risk and cash recovery", icon: "🤝" },
    { label: "Optimize Budget", text: "Identify expense velocity anomalies and cost cuts", icon: "💡" },
];
