import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";

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