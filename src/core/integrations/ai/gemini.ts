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
    },
    required: ["headline", "summary", "topCategories", "suggestedAction", "predictions", "risks"],
};

export type FinanceInsight = {
    headline: string;
    summary: string;
    topCategories: { name: string; amount: number; reason: string }[];
    suggestedAction: string;
    predictions: string[];
    risks: string[];
};

export async function generateFinanceInsight(input: {
    mode: "dashboard" | "explain-expenses" | "losing-money" | "tax-summary" | "spending-prediction";
    expenses: any[];
    categories: any[];
    currency?: string;
}) {
    const compactExpenses = input.expenses.slice(0, 120).map((expense) => ({
        amount: Number(expense.amount),
        description: expense.description,
        date: expense.date,
        category: expense.categories?.name || input.categories.find((cat) => cat.id === expense.category_id)?.name || "Uncategorized",
    }));

    return callGeminiJson<FinanceInsight>(
        [
            {
                role: "system",
                content: "You are FinFlow Gemini AI, an enterprise finance analyst for Indian small businesses and personal finance users. Be precise, practical, and concise. Never invent transactions. Use the supplied data only.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    task: input.mode,
                    today: new Date().toISOString().slice(0, 10),
                    currency: input.currency || "INR",
                    expenses: compactExpenses,
                }),
            },
        ],
        expenseSummarySchema,
        { temperature: 0.15, maxOutputTokens: 1600 },
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
                maxPrice: { type: ["number", "null"] },
                minPrice: { type: ["number", "null"] },
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
