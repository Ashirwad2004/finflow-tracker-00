import React from "react";
import { Truck, Shield, Star, Zap } from "lucide-react";

export const StorefrontTrustPills: React.FC = () => {
    const pills = [
        { icon: <Truck className="w-3.5 h-3.5 text-blue-500" />, label: "Fast Delivery" },
        { icon: <Shield className="w-3.5 h-3.5 text-green-500" />, label: "Secure Checkout" },
        { icon: <Star className="w-3.5 h-3.5 text-yellow-500" />, label: "Quality Guaranteed" },
        { icon: <Zap className="w-3.5 h-3.5 text-violet-500" />, label: "Easy Ordering" },
    ];

    return (
        <div className="flex flex-wrap gap-3 mb-8">
            {pills.map((pill) => (
                <div
                    key={pill.label}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-600 shadow-sm"
                >
                    {pill.icon} {pill.label}
                </div>
            ))}
        </div>
    );
};
