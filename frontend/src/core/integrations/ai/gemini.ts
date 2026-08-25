import { supabase } from "@/core/integrations/supabase/client";

export type AiMessage = {
    role: "system" | "user" | "assistant";
    content: any;
};

type GeminiOptions = {
    model?: string;
    temperature?: number;
    responseFormat?: any;
    maxOutputTokens?: number;
};

export async function callGemini(messages: AiMessage[], options: GeminiOptions = {}) {
    // 1. Try FastAPI Backend Microservice first
    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/v1/ai/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
                messages,
                model: options.model || "gemini-2.5-flash",
                temperature: options.temperature ?? 0.2,
                maxOutputTokens: options.maxOutputTokens,
                response_format: options.responseFormat,
                stream: false,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            return data?.text || data?.choices?.[0]?.message?.content || "";
        }
    } catch (err) {
        // Backend not reached or offline; gracefully fallback to Edge function
        console.warn("FastAPI backend AI unreachable, falling back to edge proxy:", err);
    }

    // 2. Fallback to Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
            messages,
            model: options.model || "gemini-2.5-flash",
            temperature: options.temperature ?? 0.2,
            response_format: options.responseFormat,
            maxOutputTokens: options.maxOutputTokens,
        },
    });

    if (error) {
        console.error("Gemini Proxy Error:", error);
        let details = "";
        const context = (error as any).context;
        if (context?.json) {
            try {
                const body = await context.json();
                details = body?.details || body?.error || body?.message || "";
            } catch {
                details = "";
            }
        }
        throw new Error(details || error.message || "Failed to communicate with Gemini.");
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data?.text || data?.choices?.[0]?.message?.content || "";
}

export async function callGeminiStream(messages: AiMessage[], options: GeminiOptions = {}) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    // 1. Try FastAPI Backend Microservice first
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/v1/ai/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
                messages,
                model: options.model || "gemini-2.5-flash",
                temperature: options.temperature ?? 0.25,
                maxOutputTokens: options.maxOutputTokens,
                response_format: options.responseFormat,
                stream: true,
            }),
        });

        if (res.ok) {
            return res;
        }
    } catch (err) {
        console.warn("FastAPI stream unreachable, falling back to edge proxy:", err);
    }

    // 2. Fallback to Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
            messages,
            model: options.model || "gemini-2.5-flash",
            temperature: options.temperature ?? 0.25,
            response_format: options.responseFormat,
            maxOutputTokens: options.maxOutputTokens,
            stream: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini stream connection error:", errorText);
        throw new Error(errorText || "Failed to connect to Gemini stream");
    }

    return response;
}

export async function callGeminiJson<T>(messages: AiMessage[], schema: any, options: GeminiOptions = {}): Promise<T> {
    const response = await callGemini(messages, {
        ...options,
        responseFormat: {
            type: "json_schema",
            json_schema: {
                name: "gemini_response",
                strict: true,
                schema,
            },
        },
    });

    return JSON.parse(response) as T;
}

const expenseSummarySchema = {
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

export type ProductSearchPlan = {
    intent: string;
    keywords: string[];
    maxPrice: number | null;
    minPrice: number | null;
    categories: string[];
    rankedProductIds: string[];
    explanation: string;
};

export async function parseProductSearch(input: { query: string; products: any[] }) {
    const products = input.products.slice(0, 80).map((product) => ({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        category: product.category || "",
        description: product.online_description || "",
        stock_quantity: product.stock_quantity,
    }));

    return callGeminiJson<ProductSearchPlan>(
        [
            {
                role: "system",
                content: "Convert natural language shopping queries into product filters and ranked product ids. Prefer in-stock products. Support INR price constraints like under 20000. Return only products present in the input.",
            },
            { role: "user", content: JSON.stringify({ query: input.query, products }) },
        ],
        {
            type: "object",
            properties: {
                intent: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                maxPrice: { type: "number", nullable: true },
                minPrice: { type: "number", nullable: true },
                categories: { type: "array", items: { type: "string" } },
                rankedProductIds: { type: "array", items: { type: "string" } },
                explanation: { type: "string" },
            },
            required: ["intent", "keywords", "maxPrice", "minPrice", "categories", "rankedProductIds", "explanation"],
        },
        { temperature: 0.1, maxOutputTokens: 1200 },
    );
}

export type ProductContent = {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    highlights: string[];
    marketingCopy: string;
};

export async function generateProductContent(input: {
    name: string;
    price: number;
    costPrice?: number;
    unit?: string;
    stockQuantity?: number;
}) {
    return callGeminiJson<ProductContent>(
        [
            {
                role: "system",
                content: "You are an ecommerce merchandising AI. Generate honest, conversion-focused product copy for an Indian online store. Do not claim features that were not provided.",
            },
            { role: "user", content: JSON.stringify(input) },
        ],
        {
            type: "object",
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                seoTitle: { type: "string" },
                seoDescription: { type: "string" },
                highlights: { type: "array", items: { type: "string" } },
                marketingCopy: { type: "string" },
            },
            required: ["title", "description", "seoTitle", "seoDescription", "highlights", "marketingCopy"],
        },
        { temperature: 0.45, maxOutputTokens: 1200 },
    );
}

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

const businessInsightSchema = {
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