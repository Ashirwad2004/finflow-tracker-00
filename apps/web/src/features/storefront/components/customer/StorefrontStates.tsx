import React from "react";
import { Store, AlertCircle } from "lucide-react";

export const StorefrontLoadingState: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center space-y-5">
                <div className="relative mx-auto w-20 h-20">
                    <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
                        style={{ background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)" }}
                    >
                        <Store className="w-10 h-10 text-white" />
                    </div>
                    <div
                        className="absolute -inset-3 rounded-[2rem] opacity-20 animate-ping"
                        style={{ background: "hsl(262 83% 58%)", animationDuration: "1.5s" }}
                    />
                </div>
                <div>
                    <p className="font-black text-slate-900 text-xl">Opening Store</p>
                    <p className="text-slate-400 text-sm mt-1">Please wait…</p>
                </div>
                <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-2 h-2 rounded-full block animate-bounce"
                            style={{ background: "hsl(262 83% 58%)", animationDelay: `${i * 0.12}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

interface StorefrontNotFoundProps {
    error: any;
}

export const StorefrontNotFound: React.FC<StorefrontNotFoundProps> = ({ error }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-sm w-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Store Not Found</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                    {error
                        ? String(error)
                        : "This store link is invalid, not active yet, or offline. Please verify the URL or ensure you have saved your Online Store settings."}
                </p>
            </div>
        </div>
    );
};
