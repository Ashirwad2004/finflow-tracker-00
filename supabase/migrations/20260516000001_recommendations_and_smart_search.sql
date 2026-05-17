-- ================================================================
-- SMART RECOMMENDATIONS & SEARCH ENGINE
-- ================================================================

-- 1. TABLE: Product Correlations (Frequently Bought Together)
CREATE TABLE IF NOT EXISTS public.product_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    product_a_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_b_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    co_occurrence_count INTEGER DEFAULT 1,
    correlation_score NUMERIC DEFAULT 0, -- 0-1 score
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT product_a_before_b CHECK (product_a_id < product_b_id),
    UNIQUE(store_id, product_a_id, product_b_id)
);

-- 2. TABLE: Product Trending Scores
CREATE TABLE IF NOT EXISTS public.product_trending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sales_count_7d INTEGER DEFAULT 0,
    sales_count_30d INTEGER DEFAULT 0,
    total_revenue_7d NUMERIC DEFAULT 0,
    total_revenue_30d NUMERIC DEFAULT 0,
    trend_score NUMERIC DEFAULT 0, -- Higher = more trending
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(store_id, product_id)
);

-- Enable RLS
ALTER TABLE public.product_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_trending ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access
CREATE POLICY "Public can view product correlations"
ON public.product_correlations FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public can view product trending"
ON public.product_trending FOR SELECT
TO anon
USING (true);

-- ================================================================
-- RPC FUNCTION 1: Get Frequently Bought Together Products
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_frequently_bought_together(
    p_product_id UUID,
    p_store_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_image_url TEXT,
    product_unit TEXT,
    correlation_score NUMERIC,
    co_occurrence_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN pc.product_a_id = p_product_id THEN pc.product_b_id
            ELSE pc.product_a_id
        END as product_id,
        p.name,
        p.price,
        p.image_url,
        p.unit,
        pc.correlation_score,
        pc.co_occurrence_count
    FROM public.product_correlations pc
    JOIN public.products p ON p.id = (
        CASE 
            WHEN pc.product_a_id = p_product_id THEN pc.product_b_id
            ELSE pc.product_a_id
        END
    )
    WHERE (pc.product_a_id = p_product_id OR pc.product_b_id = p_product_id)
      AND pc.store_id = p_store_id
      AND p.is_listed_online = true
    ORDER BY pc.correlation_score DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_frequently_bought_together(UUID, UUID, INT) TO anon;

-- ================================================================
-- RPC FUNCTION 2: Get Trending Products
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_trending_products(
    p_store_id UUID,
    p_limit INT DEFAULT 8,
    p_time_period TEXT DEFAULT '7d'
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_image_url TEXT,
    product_unit TEXT,
    sales_count INTEGER,
    trend_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sales_col TEXT;
BEGIN
    v_sales_col := CASE 
        WHEN p_time_period = '30d' THEN 'sales_count_30d'
        ELSE 'sales_count_7d'
    END;
    
    RETURN QUERY EXECUTE format(
        'SELECT 
            pt.product_id,
            p.name,
            p.price,
            p.image_url,
            p.unit,
            %I::INTEGER,
            pt.trend_score
        FROM public.product_trending pt
        JOIN public.products p ON p.id = pt.product_id
        WHERE pt.store_id = $1
          AND p.is_listed_online = true
        ORDER BY pt.trend_score DESC, %I DESC
        LIMIT $2',
        v_sales_col,
        v_sales_col
    ) USING p_store_id, p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_products(UUID, INT, TEXT) TO anon;

-- ================================================================
-- RPC FUNCTION 3: Get Personalized Recommendations
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
    p_phone TEXT,
    p_store_id UUID,
    p_limit INT DEFAULT 6
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_image_url TEXT,
    product_unit TEXT,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        p.name,
        p.price,
        p.image_url,
        p.unit,
        'Based on your purchases'::TEXT
    FROM public.products p
    WHERE p.store_id = p_store_id
      AND p.is_listed_online = true
      AND p.id IN (
          -- Get frequently bought products with items from customer's history
          SELECT DISTINCT corr_prod
          FROM (
              SELECT 
                  CASE 
                      WHEN pc.product_a_id = prev_prod THEN pc.product_b_id
                      ELSE pc.product_a_id
                  END as corr_prod
              FROM public.product_correlations pc
              JOIN (
                  SELECT DISTINCT oi.product_id as prev_prod
                  FROM public.online_order_items oi
                  JOIN public.online_orders o ON o.id = oi.order_id
                  WHERE o.customer_phone = p_phone
                    AND o.store_id = p_store_id
              ) prev ON (
                  pc.product_a_id = prev.prev_prod 
                  OR pc.product_b_id = prev.prev_prod
              )
              WHERE pc.store_id = p_store_id
          ) as recs
      )
    ORDER BY p.price DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_personalized_recommendations(TEXT, UUID, INT) TO anon;

-- ================================================================
-- RPC FUNCTION 4: Smart Search with Typo Correction
-- ================================================================
CREATE OR REPLACE FUNCTION public.smart_search_products(
    p_query TEXT,
    p_store_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_image_url TEXT,
    product_unit TEXT,
    match_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        p.unit,
        CASE
            -- Exact match (highest score)
            WHEN LOWER(p.name) = LOWER(p_query) THEN 100
            -- Starts with query (high score)
            WHEN LOWER(p.name) LIKE LOWER(p_query) || '%' THEN 90
            -- Contains query (medium-high score)
            WHEN LOWER(p.name) LIKE '%' || LOWER(p_query) || '%' THEN 75
            -- Levenshtein distance (fuzzy match for typos) - score based on similarity
            ELSE (
                100 * (1 - (LEAST(
                    LEVENSHTEIN(LOWER(p.name), LOWER(p_query)),
                    LEVENSHTEIN(LOWER(p.unit), LOWER(p_query))
                )::NUMERIC / GREATEST(
                    LENGTH(p.name),
                    LENGTH(p_query),
                    1
                )::NUMERIC))
            )
        END::NUMERIC as match_score
    FROM public.products p
    WHERE p.store_id = p_store_id
      AND p.is_listed_online = true
      AND (
          LOWER(p.name) ILIKE '%' || LOWER(p_query) || '%'
          OR LOWER(p.unit) ILIKE '%' || LOWER(p_query) || '%'
          OR LEVENSHTEIN(LOWER(p.name), LOWER(p_query)) <= 2
      )
    ORDER BY match_score DESC, p.name ASC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.smart_search_products(TEXT, UUID, INT) TO anon;

-- ================================================================
-- HELPER FUNCTION: Update Trending Scores (run daily)
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Calculate 7-day trending
    INSERT INTO public.product_trending (store_id, product_id, sales_count_7d, total_revenue_7d, trend_score)
    SELECT 
        o.store_id,
        oi.product_id,
        COUNT(oi.id)::INTEGER as sales_7d,
        SUM(oi.price_at_time * oi.quantity)::NUMERIC as revenue_7d,
        COUNT(oi.id)::NUMERIC * 0.7 as trend_score
    FROM public.online_orders o
    JOIN public.online_order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= now() - interval '7 days'
      AND o.status IN ('completed', 'accepted')
    GROUP BY o.store_id, oi.product_id
    ON CONFLICT (store_id, product_id) DO UPDATE SET
        sales_count_7d = EXCLUDED.sales_count_7d,
        total_revenue_7d = EXCLUDED.total_revenue_7d,
        trend_score = EXCLUDED.trend_score,
        last_updated = now();

    -- Calculate 30-day trending
    INSERT INTO public.product_trending (store_id, product_id, sales_count_30d, total_revenue_30d)
    SELECT 
        o.store_id,
        oi.product_id,
        COUNT(oi.id)::INTEGER as sales_30d,
        SUM(oi.price_at_time * oi.quantity)::NUMERIC as revenue_30d
    FROM public.online_orders o
    JOIN public.online_order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= now() - interval '30 days'
      AND o.status IN ('completed', 'accepted')
    GROUP BY o.store_id, oi.product_id
    ON CONFLICT (store_id, product_id) DO UPDATE SET
        sales_count_30d = EXCLUDED.sales_count_30d,
        total_revenue_30d = EXCLUDED.total_revenue_30d,
        last_updated = now();
END;
$$;

-- ================================================================
-- HELPER FUNCTION: Update Product Correlations (run after each order)
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_product_correlations(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_products UUID[];
    v_i INT;
    v_j INT;
BEGIN
    -- Get store ID and product list for this order
    SELECT o.store_id, ARRAY_AGG(oi.product_id)
    INTO v_store_id, v_products
    FROM public.online_orders o
    LEFT JOIN public.online_order_items oi ON oi.order_id = o.id
    WHERE o.id = p_order_id;

    IF v_products IS NULL OR array_length(v_products, 1) <= 1 THEN
        RETURN;
    END IF;

    -- Create correlations for all product pairs
    FOR v_i IN 1 .. array_length(v_products, 1) LOOP
        FOR v_j IN (v_i + 1) .. array_length(v_products, 1) LOOP
            INSERT INTO public.product_correlations 
            (store_id, product_a_id, product_b_id, co_occurrence_count, correlation_score)
            VALUES (
                v_store_id,
                LEAST(v_products[v_i], v_products[v_j]),
                GREATEST(v_products[v_i], v_products[v_j]),
                1,
                0.5
            )
            ON CONFLICT (store_id, product_a_id, product_b_id) DO UPDATE SET
                co_occurrence_count = product_correlations.co_occurrence_count + 1,
                correlation_score = LEAST(1.0, product_correlations.co_occurrence_count::NUMERIC / 100),
                last_updated = now();
        END LOOP;
    END LOOP;
END;
$$;

-- Trigger to update correlations after order is placed
CREATE OR REPLACE FUNCTION public.trigger_update_correlations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' OR NEW.status = 'completed' THEN
        PERFORM public.update_product_correlations(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_correlations_trigger ON public.online_orders;
CREATE TRIGGER order_correlations_trigger
AFTER UPDATE OF status ON public.online_orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_correlations();
