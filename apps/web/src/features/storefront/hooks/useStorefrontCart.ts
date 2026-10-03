import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/core/hooks/use-toast";
import { StoreProduct } from "../ProductCard";
import { StoreProfile, StoreBrandingData } from "../components/customer";

export function useStorefrontCart(
  products: StoreProduct[],
  storeProfile: StoreProfile | null | undefined,
  brandingData: StoreBrandingData | null | undefined
) {
  const { toast } = useToast();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getStock = (productId: string) => {
    const stock = products.find((p) => p.id === productId)?.stock_quantity;
    return typeof stock === "number" ? Math.max(0, stock) : 0;
  };

  const canAddOne = (id: string) => {
    const stock = getStock(id);
    if (stock <= 0) return false;
    return (cart[id] || 0) < stock;
  };

  // Keep cart in sync when stock drops
  useEffect(() => {
    if (!products.length) return;
    setCart((prev) => {
      let changed = false;
      const next = { ...prev };
      const removed: string[] = [];
      const reduced: string[] = [];

      for (const [id, qty] of Object.entries(prev)) {
        const stock = getStock(id);
        const p = products.find((prod) => prod.id === id);
        const name = p?.name ?? "An item";

        if (stock <= 0) {
          delete next[id];
          removed.push(name);
          changed = true;
        } else if (qty > stock) {
          next[id] = stock;
          reduced.push(`${name} (max ${stock} available)`);
          changed = true;
        }
      }

      if (changed) {
        if (removed.length > 0) {
          toast({
            title: "Item Sold Out",
            description: `${removed.join(", ")} ${
              removed.length === 1 ? "was" : "were"
            } removed from your cart because they sold out.`,
            variant: "destructive",
          });
        }
        if (reduced.length > 0) {
          toast({
            title: "Stock Level Adjusted",
            description: `The quantity of ${reduced.join(
              ", "
            )} was adjusted to match current stock limits.`,
          });
        }
      }

      return changed ? next : prev;
    });
  }, [products, toast]);

  // Cart actions
  const handleAdd = (id: string) => {
    const stock = getStock(id);
    const current = cart[id] || 0;
    if (stock <= 0) {
      toast({
        title: "Out of stock",
        description: "This item is currently unavailable.",
        variant: "destructive",
      });
      return;
    }
    if (current >= stock) {
      toast({
        title: "Maximum quantity reached",
        description: stock === 1 ? "Only 1 left in stock." : `Only ${stock} available.`,
      });
      return;
    }
    setCart((p) => ({ ...p, [id]: current + 1 }));
  };

  const handleRemove = (id: string) =>
    setCart((p) => {
      if ((p[id] || 0) <= 1) {
        const { [id]: _, ...r } = p;
        return r;
      }
      return { ...p, [id]: p[id] - 1 };
    });

  const handleClear = (id: string) =>
    setCart((p) => {
      const { [id]: _, ...r } = p;
      return r;
    });

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce(
        (s, [id, qty]) => s + (products.find((x) => x.id === id)?.price ?? 0) * qty,
        0
      ),
    [cart, products]
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const deliveryChargeRaw = Number(brandingData?.delivery_charge ?? storeProfile?.delivery_charge) || 0;
  const freeDeliveryThreshold =
    Number(brandingData?.free_delivery_min_amount ?? storeProfile?.free_delivery_min_amount) || 0;
  const effectiveDeliveryCharge =
    deliveryChargeRaw > 0 && freeDeliveryThreshold > 0 && cartTotal >= freeDeliveryThreshold
      ? 0
      : deliveryChargeRaw;

  return {
    cart,
    setCart,
    isCartOpen,
    setIsCartOpen,
    handleAdd,
    handleRemove,
    handleClear,
    canAddOne,
    cartTotal,
    cartCount,
    deliveryChargeRaw,
    freeDeliveryThreshold,
    effectiveDeliveryCharge,
  };
}
