import { useState, useMemo } from "react";
import { useSmartSearch, useAiProductSearch } from "@/core/hooks/useRecommendations";
import { StoreProduct } from "../ProductCard";

export function useStorefrontSearch(storeId: string | null, products: StoreProduct[]) {
  const [search, setSearch] = useState("");

  const { data: smartSearchResults = [] } = useSmartSearch(search, storeId);
  const { data: aiSearchResult, isFetching: isAiSearching } = useAiProductSearch(search, storeId, products);

  const filteredProducts = useMemo(() => {
    if (search.trim()) {
      if (aiSearchResult?.products?.length) {
        return aiSearchResult.products;
      }
      if (smartSearchResults.length) {
        return smartSearchResults.slice(0, 12);
      }
      const query = search.trim().toLowerCase();
      return products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.category && p.category.toLowerCase().includes(query)) ||
            (p.online_description && p.online_description.toLowerCase().includes(query))
        )
        .slice(0, 12);
    }
    return products;
  }, [search, aiSearchResult, smartSearchResults, products]);

  return {
    search,
    setSearch,
    filteredProducts,
    isAiSearching,
    aiSearchResult,
  };
}
