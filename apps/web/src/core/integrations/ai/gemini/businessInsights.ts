import { callGeminiJson } from "./client";

export type BusinessInsight = {
    headline: string;
    summary: string;
    taxAnalysis: string;
    debtAnalysis: string;
    suggestions: string[];
    confidenceScore?: string;
    financialImpact?: string;
    predictedOutcome?: string;
};

export const businessInsightSchema = {
    type: "object",
    properties: {
        headline: { type: "string" },
        summary: { type: "string" },
        taxAnalysis: { type: "string" },
        debtAnalysis: { type: "string" },
        suggestions: {
            type: "array",
            items: { type: "string" }
        },
        confidenceScore: { type: "string" },
        financialImpact: { type: "string" },
        predictedOutcome: { type: "string" }
    },
    required: ["headline", "summary", "taxAnalysis", "debtAnalysis", "suggestions", "confidenceScore", "financialImpact", "predictedOutcome"]
};

export async function generateBusinessInsight(input: {
    sales: any[];
    purchases: any[];
    expenses: any[];
    lent: any[];
    borrowed: any[];
    products: any[];
    currency?: string;
    onlineStore?: any[];
}) {
    const totalSales = input.sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalPurchases = input.purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalExpenses = input.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalLent = input.lent.filter(l => l.status !== "paid").reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalBorrowed = input.borrowed.filter(b => b.status !== "paid").reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const lowStockCount = input.products.filter(p => Number(p.stock_quantity ?? p.stock ?? 0) <= 5).length;

    const businessMetrics = {
        salesCount: input.sales.length,
        totalSales,
        totalPurchases,
        totalExpenses,
        receivables: totalLent,
        payables: totalBorrowed,
        lowStockItems: lowStockCount,
        productsCount: input.products.length,
        currency: input.currency || "INR",
        today: new Date().toISOString().split('T')[0]
    };

    return callGeminiJson<BusinessInsight>(
        [
            {
                role: "system",
                content: `You are RupeeBill AI, an expert enterprise Chartered Accountant, Business Auditor, and virtual CFO.
Analyze the business metrics and provide a comprehensive operational audit. Structurally fill the fields:
1. headline: High-impact diagnostic summary.
2. summary: Deep cash flow audit, margin health review, and root causes of margin shifts.
3. taxAnalysis: Detailed GST/GSTR-1 liability estimates (assume general 18% if unspecified) and input tax credit (ITC) optimizations.
4. debtAnalysis: Receivable aging risk analysis and concrete collection strategies.
5. suggestions: 3-4 specific operational recommendations.
6. confidenceScore: Audit confidence percentage with a note on data density.
7. financialImpact: Calculated monetary impact of auditing recommendations.
8. predictedOutcome: Outcome of implementing vs. ignoring recommendations.

Keep descriptions professional, precise, and financially actionable.`,
            },
            {
                role: "user",
                content: JSON.stringify(businessMetrics),
            },
        ],
        businessInsightSchema,
        { temperature: 0.15, maxOutputTokens: 2048 }
    );
}
