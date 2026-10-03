import React from "react";
import { User, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StoreProduct } from "../ProductCard";

interface CartCheckoutFormProps {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  paymentMethod: "cod" | "online";
  setPaymentMethod: (v: "cod" | "online") => void;
  onlinePaymentEnabled?: boolean;
  cart: Record<string, number>;
  products: StoreProduct[];
  cartTotal: number;
  deliveryCharge: number;
  baseDeliveryCharge: number;
  formatCurrency: (n: number) => string;
}

export const CartCheckoutForm: React.FC<CartCheckoutFormProps> = ({
  name,
  setName,
  phone,
  setPhone,
  address,
  setAddress,
  paymentMethod,
  setPaymentMethod,
  onlinePaymentEnabled,
  cart,
  products,
  cartTotal,
  deliveryCharge,
  baseDeliveryCharge,
  formatCurrency,
}) => {
  return (
    <div className="p-6 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="sfx_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Full Name <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="sfx_name"
            name="customer_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sfx_phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Phone Number <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="sfx_phone"
            name="customer_phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sfx_addr" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Delivery Address <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <Textarea
            id="sfx_addr"
            name="customer_address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Flat/House no., Street, City, PIN"
            rows={3}
            className="pl-10 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50 resize-none animate-fade-in"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Payment Method
        </Label>
        {onlinePaymentEnabled ? (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPaymentMethod("cod")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === "cod"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              💵 Cash on Delivery
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("online")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === "online"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              💳 Pay Online
            </button>
          </div>
        ) : (
          <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
            💵 Cash on Delivery
            <span className="text-slate-400 font-normal">(Only payment method available)</span>
          </div>
        )}
      </div>

      {/* Order summary condensed */}
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 mt-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Summary</p>
        {Object.entries(cart).map(([pid, qty]) => {
          const p = products.find((x) => x.id === pid);
          if (!p) return null;
          return (
            <div key={pid} className="flex justify-between text-sm">
              <span className="text-slate-600">
                {p.name} × {qty}
              </span>
              <span className="font-bold text-slate-900">{formatCurrency(p.price * qty)}</span>
            </div>
          );
        })}
        {baseDeliveryCharge > 0 && (
          <div className="flex justify-between text-sm pt-2">
            <span className="text-slate-600">Delivery Fee</span>
            {deliveryCharge === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 line-through text-xs">
                  {formatCurrency(baseDeliveryCharge)}
                </span>
                <span className="font-bold text-green-600 uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-green-100 rounded">
                  Free
                </span>
              </div>
            ) : (
              <span className="font-bold text-slate-900">{formatCurrency(deliveryCharge)}</span>
            )}
          </div>
        )}
        <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 mt-1">
          <span className="text-slate-900">Total</span>
          <span style={{ color: "hsl(262 83% 58%)" }}>
            {formatCurrency(cartTotal + deliveryCharge)}
          </span>
        </div>
      </div>
    </div>
  );
};
