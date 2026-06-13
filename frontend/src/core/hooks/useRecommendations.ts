import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { parseProductSearch } from "@/core/integrations/ai/gemini";

interface TrendingProduct {
    product_id: string;
    product_name: string;
    product_price: number;
    product_image_url: string | null;
    product_unit: string;
    sales_count: number;
    trend_score: number;
}

interface RecommendedProduct {
    product_id: string;
    product_name: string;
    product_price: number;
    product_image_url: string | null;
    product_unit: string;
    reason: string;
}

interface FrequentlyBoughtProduct {
    product_id: string;
    product_name: string;
    product_price: number;
    product_image_url: string | null;
    product_unit: string;
    correlation_score: number;
    co_occurrence_count: number;
}

export function useTrendingProducts(storeId: string | null, timePeriod = "7d") {
    return useQuery({
        queryKey: ["trendingProducts", storeId, timePeriod],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await (supabase as any).rpc("get_trending_products", {
                p_store_id: storeId,
                p_limit: 8,
                p_time_period: timePeriod,
            });
            if (error) {
                console.error("Error fetching trending products:", error);
                return [];
            }
            return (data || []) as TrendingProduct[];
        },
        enabled: !!storeId,
        staleTime: 60000, // 1 minute
    });
}

export function usePersonalizedRecommendations(
    phone: string,
    storeId: string | null
) {
    return useQuery({
        queryKey: ["personalizedRecommendations", phone, storeId],
        queryFn: async () => {
            if (!phone || !storeId) return [];
            const { data, error } = await (supabase as any).rpc(
                "get_personalized_recommendations",
                {
                    p_phone: phone.trim(),
                    p_store_id: storeId,
                    p_limit: 6,
                }
            );
            if (error) {
                console.error("Error fetching personalized recommendations:", error);
                return [];
            }
            return (data || []) as RecommendedProduct[];
        },
        enabled: !!phone && !!storeId,
        staleTime: 300000, // 5 minutes
    });
}

export function useFrequentlyBoughtTogether(
    productId: string,
    storeId: string | null
) {
    return useQuery({
        queryKey: ["frequentlyBoughtTogether", productId, storeId],
        queryFn: async () => {
            if (!productId || !storeId) return [];
            const { data, error } = await (supabase as any).rpc(
                "get_frequently_bought_together",
                {
                    p_product_id: productId,
                    p_store_id: storeId,
                    p_limit: 5,
                }
            );
            if (error) {
                console.error("Error fetching frequently bought together:", error);
                return [];
            }
            return (data || []) as FrequentlyBoughtProduct[];
        },
        enabled: !!productId && !!storeId,
        staleTime: 600000, // 10 minutes
    });
}

export function useSmartSearch(query: string, storeId: string | null) {
    return useQuery({
        queryKey: ["smartSearch", query, storeId],
        queryFn: async () => {
            if (!query.trim() || !storeId) return [];
            
            // Demo store doesn't have database RPC, return empty to use AI search or no results
            if (storeId === "demo-user-id") {
                return [];
            }
            
            const { data, error } = await (supabase as any).rpc(
                "smart_search_products",
                {
                    p_query: query.trim(),
                    p_store_id: storeId,
                    p_limit: 12,
                }
            );
            if (error) {
                console.error("Error performing smart search:", error);
                return [];
            }
            return (data || []) as TrendingProduct[];
        },
        enabled: !!query.trim() && !!storeId,
        staleTime: 0, // Don't cache - always fresh search
    });
}

export function useAiProductSearch(query: string, storeId: string | null, products: any[]) {
    return useQuery({
        queryKey: ["aiProductSearch", storeId, query, products.length],
        queryFn: async () => {
            if (!query.trim() || !storeId || products.length === 0) {
                return { products: [], explanation: "" };
            }

            // Demo store: use client-side search
            if (storeId === "demo-user-id") {
                const searchQuery = query.trim().toLowerCase();
                const results = products.filter(p =>
                    p.name?.toLowerCase().includes(searchQuery) ||
                    p.category?.toLowerCase().includes(searchQuery) ||
                    p.online_description?.toLowerCase().includes(searchQuery)
                ).slice(0, 12);
                return { 
                    products: results, 
                    explanation: `Found ${results.length} product${results.length !== 1 ? 's' : ''} matching "${query}"` 
                };
            }

            try {
                const plan = await parseProductSearch({ query: query.trim(), products });
                const byId = new Map(products.map((product) => [product.id, product]));
                const ranked = plan.rankedProductIds
                    .map((id) => byId.get(id))
                    .filter(Boolean);

                const rankedIds = new Set(plan.rankedProductIds);
                const fallbackMatches = products.filter((product) => {
                    if (rankedIds.has(product.id)) return false;
                    const price = Number(product.price || 0);
                    if (plan.maxPrice !== null && price > plan.maxPrice) return false;
                    if (plan.minPrice !== null && price < plan.minPrice) return false;
                    const searchable = `${product.name} ${product.category || ""} ${product.online_description || ""}`.toLowerCase();
                    return [...plan.keywords, ...plan.categories].some((term) => searchable.includes(term.toLowerCase()));
                });

                return {
                    products: [...ranked, ...fallbackMatches].slice(0, 12),
                    explanation: plan.explanation,
                };
            } catch (error) {
                console.error("AI search failed, falling back to basic search:", error);
                // Fallback to empty if AI fails - client-side search in Storefront will handle it
                return { products: [], explanation: "" };
            }
        },
        enabled: !!query.trim() && !!storeId && products.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
}
