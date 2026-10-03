export interface StoreProfile {
    user_id: string;
    display_name: string | null;
    store_slug: string | null;
    is_store_active: boolean;
    business_name: string | null;
    business_logo: string | null;
    delivery_charge: number;
    free_delivery_min_amount: number;
}

export interface StoreBrandingData {
    business_name: string | null;
    business_logo: string | null;
    delivery_charge: number | null;
    free_delivery_min_amount: number | null;
    upi_id: string | null;
    online_payment_enabled: boolean | null;
}
