import { callGeminiJson } from "./client";

export const expenseSummarySchema = {
    type: "object",
    properties: {
        headline: { type: "string" },
        summary: { type: "string" },
        topCategories: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    amount: { type: "number" },
                    reason: { type: "string" },
                },
                required: ["name", "amount", "reason"],
            },
        },
        suggestedAction: { type: "string" },
        predictions: {
            type: "array",
            items: { type: "string" },
        },
        risks: {
            type: "array",
            items: { type: "string" },
        },
        confidenceScore: { type: "string" },
        financialImpact: { type: "string" },
        predictedOutcome: { type: "string" }
    },
    required: ["headline", "summary", "topCategories", "suggestedAction", "predictions", "risks", "confidenceScore", "financialImpact", "predictedOutcome"],
};

export type FinanceInsight = {
    headline: string;
    summary: string;
    topCategories: { name: string; amount: number; reason: string }[];
    suggestedAction: string;
    predictions: string[];
    risks: string[];
    confidenceScore?: string;
    financialImpact?: string;
    predictedOutcome?: string;
};

export async function generateFinanceInsight(input: {
    mode: "dashboard" | "explain-expenses" | "losing-money" | "tax-summary" | "spending-prediction";
    expenses: any[];
    categories: any[];
    currency?: string;
    sales?: any[];
    lent?: any[];
    borrowed?: any[];
    lowStockCount?: number;
}) {
    const compactExpenses = input.expenses.slice(0, 30).map((expense) => ({
        amount: Number(expense.amount),
        description: expense.description,
        date: expense.date,
        category: expense.categories?.name || input.categories.find((cat) => cat.id === expense.category_id)?.name || "Uncategorized",
    }));

    const totalExpenses = input.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalSales = input.sales?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) || 0;
    
    const totalLent = input.lent?.filter(l => l.status !== "paid").reduce((sum, l) => sum + Number(l.amount || 0), 0) || 0;
    const totalBorrowed = input.borrowed?.filter(b => b.status !== "paid").reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0;

    const summaryData = {
        task: input.mode,
        today: new Date().toISOString().slice(0, 10),
        currency: input.currency || "INR",
        financials: {
            salesTotal: totalSales,
            expensesTotal: totalExpenses,
            netBalance: totalSales - totalExpenses,
            debtsOwedToUser: totalLent,
            debtsUserOwesOthers: totalBorrowed,
            lowStockItemsCount: input.lowStockCount || 0
        },
        recentExpenses: compactExpenses
    };

    return callGeminiJson<FinanceInsight>(
        [
            {
                role: "system",
                content: `You are RupeeBill Gemini AI, a World-Class Virtual CFO and expert corporate finance strategist.
Provide an advanced, analytical, and highly structured CFO analysis. Your responses must cover:
1. Executive Summary: Core current status.
2. Supporting Evidence: Explicit metrics, percentages, and values from the data.
3. Root Cause Analysis: Pinpoint anomalies, category momentum, and seasonal patterns.
4. Financial Impact: Quantified cost/revenue impact.
5. Confidence Score: Confidence percentage (e.g. 95%) with a brief data coverage explanation.
6. Recommended Actions: High-impact cost optimizations or inventory adjustments.
7. Predicted Outcome: Forecast if recommendations are executed vs. ignored.
8. Follow-up Suggestions: Next questions/steps.

Ensure all outputs are detailed, professional, and backed strictly by data in the user ledger. Avoid generic advice like 'save money'.`,
            },
            {
                role: "user",
                content: JSON.stringify(summaryData),
            },
        ],
        expenseSummarySchema,
        { temperature: 0.15, maxOutputTokens: 2048 },
    );
}
