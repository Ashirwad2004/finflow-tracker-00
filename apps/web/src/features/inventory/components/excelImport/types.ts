export interface Product {
    id: string;
    user_id: string;
    name: string;
    price: number;
    cost_price: number | null;
    stock_quantity: number;
    unit: string;
    hsn_code?: string | null;
    created_at: string;
    updated_at?: string;
    is_listed_online?: boolean;
    online_description?: string | null;
    image_url?: string | null;
    rack_location?: string | null;
}

export interface ParsedProduct {
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    hsn_code: string;
    is_listed_online: boolean;
    online_description: string;
    rack_location: string;
    status: "ready" | "duplicate" | "error";
    errorDetails?: string;
}

export interface ExcelImportDialogProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    existingProducts: Product[];
}
