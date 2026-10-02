import { useState, useMemo, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { playAudioBeep } from "../utils/posFeedback";
import { POSProduct, POSCartItem, POSHeldBill } from "../types";

interface UsePOSCartOptions {
  storeId: string;
  cashierId: string;
  formatCurrency: (val: number) => string;
}

export function usePOSCart({ storeId, cashierId, formatCurrency }: UsePOSCartOptions) {
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerPartyId, setCustomerPartyId] = useState<string | undefined>(undefined);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number>(0);
  const [heldBills, setHeldBills] = useState<POSHeldBill[]>([]);

  // Cart Calculations
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    cartItems.forEach((item) => {
      const lineSubtotal = item.quantity * item.price * (1 - item.discount / 100);
      const lineTax = (lineSubtotal * (item.tax_rate || 0)) / 100;
      sub += lineSubtotal;
      tax += lineTax;
    });

    const netTotal = Math.max(0, sub + tax - overallDiscountAmount);
    return {
      subtotal: Math.round(sub * 100) / 100,
      taxAmount: Math.round(tax * 100) / 100,
      totalAmount: Math.round(netTotal * 100) / 100,
    };
  }, [cartItems, overallDiscountAmount]);

  // Add product to cart (or increment quantity if already present)
  const handleAddToCart = useCallback((product: POSProduct) => {
    playAudioBeep(1046.5, 60); // C6 scan chirp
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product_id === product.id || item.id === product.id
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        const existing = next[existingIdx];
        const updatedQty = existing.quantity + 1;
        const lineSubtotal = updatedQty * existing.price * (1 - existing.discount / 100);
        const lineTax = (lineSubtotal * (existing.tax_rate || 0)) / 100;
        next[existingIdx] = {
          ...existing,
          quantity: updatedQty,
          tax_amount: lineTax,
          total: lineSubtotal + lineTax,
        };
        return next;
      }

      const defaultTax = product.tax_rate ?? 0;
      const initialTax = (product.price * defaultTax) / 100;

      const newItem: POSCartItem = {
        id: uuidv4(),
        product_id: product.id,
        name: product.name,
        description: product.description,
        quantity: 1,
        price: product.price,
        mrp: product.mrp || undefined,
        discount: 0,
        tax_rate: defaultTax,
        tax_amount: initialTax,
        total: product.price + initialTax,
        unit: product.unit || "pc",
        hsn_code: product.hsn_code || undefined,
      };
      return [...prev, newItem];
    });
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const handleUpdateQuantity = useCallback(
    (id: string, newQty: number) => {
      if (newQty <= 0) {
        handleRemoveItem(id);
        return;
      }
      setCartItems((prev) =>
        prev.map((it) => {
          if (it.id === id) {
            const lineSub = newQty * it.price * (1 - it.discount / 100);
            const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
            return {
              ...it,
              quantity: newQty,
              tax_amount: lineTax,
              total: lineSub + lineTax,
            };
          }
          return it;
        })
      );
    },
    [handleRemoveItem]
  );

  const handleUpdatePrice = useCallback((id: string, newPrice: number) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const lineSub = it.quantity * Math.max(0, newPrice) * (1 - it.discount / 100);
          const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
          return {
            ...it,
            price: Math.max(0, newPrice),
            tax_amount: lineTax,
            total: lineSub + lineTax,
          };
        }
        return it;
      })
    );
  }, []);

  const handleUpdateDiscount = useCallback((id: string, newDisc: number) => {
    const clampedDisc = Math.min(100, Math.max(0, newDisc));
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const lineSub = it.quantity * it.price * (1 - clampedDisc / 100);
          const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
          return {
            ...it,
            discount: clampedDisc,
            tax_amount: lineTax,
            total: lineSub + lineTax,
          };
        }
        return it;
      })
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setOverallDiscountAmount(0);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setCustomerPartyId(undefined);
  }, []);

  // Hold current cart
  const handleHoldBill = useCallback(() => {
    if (cartItems.length === 0) {
      toast.info("Cart is empty; nothing to hold.");
      return;
    }

    const heldBill: POSHeldBill = {
      id: uuidv4(),
      store_id: storeId,
      cashier_id: cashierId,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      party_id: customerPartyId || null,
      items: [...cartItems],
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      discount_amount: overallDiscountAmount,
      created_at: new Date().toISOString(),
    };

    setHeldBills((prev) => [heldBill, ...prev]);
    toast.success(`Bill for ${customerName} parked (Total ${formatCurrency(totalAmount)})`);
    handleClearCart();
  }, [
    cartItems,
    storeId,
    cashierId,
    customerName,
    customerPhone,
    customerPartyId,
    subtotal,
    taxAmount,
    totalAmount,
    overallDiscountAmount,
    formatCurrency,
    handleClearCart,
  ]);

  // Resume held cart
  const handleResumeBill = useCallback(
    (bill: POSHeldBill, onResumed?: () => void) => {
      if (cartItems.length > 0) {
        const confirmReplace = window.confirm(
          "You have items in your current cart. Resuming this bill will replace the current cart. Continue?"
        );
        if (!confirmReplace) return;
      }

      setCartItems(bill.items);
      setCustomerName(bill.customer_name);
      setCustomerPhone(bill.customer_phone || "");
      setCustomerPartyId(bill.party_id || undefined);
      setOverallDiscountAmount(bill.discount_amount || 0);

      setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
      if (onResumed) onResumed();
      toast.success(`Resumed bill for ${bill.customer_name}`);
    },
    [cartItems]
  );

  const handleDeleteHeldBill = useCallback((id: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== id));
    toast.info("Parked bill discarded");
  }, []);

  return {
    cartItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerPartyId,
    setCustomerPartyId,
    overallDiscountAmount,
    setOverallDiscountAmount,
    heldBills,
    subtotal,
    taxAmount,
    totalAmount,
    handleAddToCart,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleUpdateDiscount,
    handleRemoveItem,
    handleClearCart,
    handleHoldBill,
    handleResumeBill,
    handleDeleteHeldBill,
  };
}
