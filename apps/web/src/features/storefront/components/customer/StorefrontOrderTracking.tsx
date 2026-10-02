import React from "react";
import { Loader2, PackageOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { isOrderDeclined } from "@/core/hooks/useStorefrontOrdersRealtime";

interface StorefrontOrderTrackingProps {
    orderStatus: string;
    submittedName: string;
    onClose: () => void;
}

export const StorefrontOrderTracking: React.FC<StorefrontOrderTrackingProps> = ({
    orderStatus,
    submittedName,
    onClose,
}) => {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{
                background: "linear-gradient(160deg, hsl(262 30% 97%) 0%, white 60%)",
            }}
        >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 max-w-sm w-full text-center">
                <div className="relative mx-auto w-24 h-24 mb-6">
                    {orderStatus === "pending" && (
                        <>
                            <div
                                className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40"
                                style={{ animationDuration: "2s" }}
                            />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                            </div>
                        </>
                    )}
                    {orderStatus === "accepted" && (
                        <>
                            <div
                                className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-40"
                                style={{ animationDuration: "2s" }}
                            />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                <PackageOpen className="w-12 h-12 text-white" />
                            </div>
                        </>
                    )}
                    {orderStatus === "completed" && (
                        <>
                            <div
                                className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40"
                                style={{ animationDuration: "2s" }}
                            />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                        </>
                    )}
                    {isOrderDeclined(orderStatus) && (
                        <div className="relative w-24 h-24 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                            <AlertCircle className="w-12 h-12 text-white" />
                        </div>
                    )}
                </div>

                <h1 className="text-2xl font-black text-slate-900 mb-2">
                    {orderStatus === "pending" && "Order Placed!"}
                    {orderStatus === "accepted" && "Order Accepted!"}
                    {orderStatus === "completed" && "Order Completed!"}
                    {isOrderDeclined(orderStatus) && "Order Rejected"}
                </h1>

                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    {orderStatus === "pending" &&
                        `Thank you, ${submittedName}! Waiting for the store to accept your order...`}
                    {orderStatus === "accepted" &&
                        "The store is now preparing your order. It will be on its way soon!"}
                    {orderStatus === "completed" &&
                        "Your order has been successfully completed. Enjoy!"}
                    {isOrderDeclined(orderStatus) &&
                        "Unfortunately, your order could not be fulfilled at this time."}
                </p>

                {/* Live Tracker UI */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                        Live Status
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                                Order Placed
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                                    orderStatus === "accepted" || orderStatus === "completed"
                                        ? "bg-orange-500"
                                        : "bg-slate-200"
                                }`}
                            >
                                {(orderStatus === "accepted" || orderStatus === "completed") && (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                )}
                            </div>
                            <span
                                className={`text-sm font-semibold ${
                                    orderStatus === "accepted" || orderStatus === "completed"
                                        ? "text-slate-900"
                                        : "text-slate-400"
                                }`}
                            >
                                Accepted
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                                    orderStatus === "completed" ? "bg-green-500" : "bg-slate-200"
                                }`}
                            >
                                {orderStatus === "completed" && (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                )}
                            </div>
                            <span
                                className={`text-sm font-semibold ${
                                    orderStatus === "completed"
                                        ? "text-slate-900"
                                        : "text-slate-400"
                                }`}
                            >
                                Completed
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    className="w-full h-13 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm flex items-center justify-center transition-all active:scale-[0.98]"
                    style={{ height: 52 }}
                    onClick={onClose}
                >
                    Close Tracking
                </button>
            </div>
        </div>
    );
};
