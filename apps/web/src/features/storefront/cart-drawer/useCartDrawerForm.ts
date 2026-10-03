import { useState, useEffect } from "react";

interface UseCartDrawerFormProps {
  open: boolean;
  onlinePaymentEnabled?: boolean;
  onSubmit: (name: string, phone: string, address: string, paymentMethod: "cod" | "online") => Promise<void>;
}

export function useCartDrawerForm({
  open,
  onlinePaymentEnabled = false,
  onSubmit,
}: UseCartDrawerFormProps) {
  const [step, setStep] = useState<"cart" | "form">("cart");
  const [name, setName] = useState(() => localStorage.getItem("storefront_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("storefront_phone") || "");
  const [address, setAddress] = useState(() => localStorage.getItem("storefront_address") || "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");

  // Save details to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("storefront_name", name);
    localStorage.setItem("storefront_phone", phone);
    localStorage.setItem("storefront_address", address);
  }, [name, phone, address]);

  // Reset to cart view whenever drawer opens
  useEffect(() => {
    if (open) {
      setStep("cart");
      setPaymentMethod("cod");
    }
  }, [open, onlinePaymentEnabled]);

  const handleSubmit = async () => {
    await onSubmit(name, phone, address, paymentMethod);
    setStep("cart");
  };

  const formValid = Boolean(name.trim() && phone.trim() && address.trim());

  return {
    step,
    setStep,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    paymentMethod,
    setPaymentMethod,
    formValid,
    handleSubmit,
  };
}
