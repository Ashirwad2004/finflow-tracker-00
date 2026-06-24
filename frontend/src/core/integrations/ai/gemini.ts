import { supabase } from "@/core/integrations/supabase/client";

const AI_API_BASE = import.meta.env.VITE_AI_API_URL || "/api/v1";

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

async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    return headers;
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${AI_API_BASE}${path}`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let detail = "Failed to communicate with FinFlow AI service.";
        try {
            const errorBody = await response.json();
            detail =
                (typeof errorBody?.detail === "string" && errorBody.detail) ||
                errorBody?.error ||
                errorBody?.message ||
                detail;
        } catch {
            detail = response.statusText || detail;
        }
        throw new Error(detail);
    }

    return response.json() as Promise<T>;
}

export async function callGemini(messages: AiMessage[], options: GeminiOptions = {}) {
    const data = await postAi<{ text: string; choices?: Array<{ message?: { content?: string } }> }>(
        "/ai/completions",
        {
            messages,
            model: options.model || "gemini-2.5-flash",
            temperature: options.temperature ?? 0.2,
            response_format: options.responseFormat,
            maxOutputTokens: options.maxOutputTokens,
        },
    );

    return data.text || data.choices?.[0]?.message?.content || "";
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
    sales?: any[];
    lent?: any[];
    borrowed?: any[];
    lowStockCount?: number;
}) {
    return postAi<FinanceInsight>("/ai/insights/finance", input);
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
    return postAi<ProductSearchPlan>("/ai/products/search", input);
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
    return postAi<ProductContent>("/ai/products/content", input);
}

export type BusinessInsight = {
    headline: string;
    summary: string;
    taxAnalysis: string;
    debtAnalysis: string;
    suggestions: string[];
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
    return postAi<BusinessInsight>("/ai/insights/business", input);
}
