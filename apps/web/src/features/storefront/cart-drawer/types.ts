import { StoreProduct } from "../ProductCard";

export interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: Record<string, number>;
  products: StoreProduct[];
  cartTotal: number;
  cartCount: number;
  deliveryCharge: number;
  baseDeliveryCharge: number;
  freeDeliveryThreshold: number;
  formatCurrency: (n: number) => string;
  onRemoveOne: (id: string) => void;
  onAddOne: (id: string) => void;
  canAddOne: (id: string) => boolean;
  onClearItem: (id: string) => void;
  onSubmit: (name: string, phone: string, address: string, paymentMethod: "cod" | "online") => Promise<void>;
  isSubmitting: boolean;
  onlinePaymentEnabled?: boolean;
}
