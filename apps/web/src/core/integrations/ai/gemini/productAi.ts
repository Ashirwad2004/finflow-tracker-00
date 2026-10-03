import { callGeminiJson } from "./client";

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
