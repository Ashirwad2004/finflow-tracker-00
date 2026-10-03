import { useEffect } from "react";
import { toast } from "sonner";

interface UsePOSShortcutsOptions {
  onCustomerShortcut: () => void;
  onPaymentShortcut: () => void;
  onHoldShortcut: () => void;
  onClearCartShortcut: () => void;
  onReturnShortcut: () => void;
  hasCartItems: boolean;
}

export function usePOSShortcuts({
  onCustomerShortcut,
  onPaymentShortcut,
  onHoldShortcut,
  onClearCartShortcut,
  onReturnShortcut,
  hasCartItems,
}: UsePOSShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        onCustomerShortcut();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (hasCartItems) {
          onPaymentShortcut();
        } else {
          toast.warning("Cart is empty! Add products to proceed to payment.");
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        onHoldShortcut();
      } else if (e.key === "F9") {
        e.preventDefault();
        onClearCartShortcut();
        toast.info("Started new sale");
      } else if (e.key === "F10") {
        e.preventDefault();
        onReturnShortcut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onCustomerShortcut,
    onPaymentShortcut,
    onHoldShortcut,
    onClearCartShortcut,
    onReturnShortcut,
    hasCartItems,
  ]);
}
