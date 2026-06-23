import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/core/integrations/supabase/client";
import { PackageOpen, X, Loader2, AlertCircle, CreditCard, Download, ArrowRightLeft, Camera, Upload, Image } from "lucide-react";
import { isOrderDeclined } from "@/core/hooks/useStorefrontOrdersRealtime";

import { generateInvoicePDF } from "@/core/utils/invoiceGenerator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

interface OrdersDrawerProps {
    open: boolean;
    onClose: () => void;
    formatCurrency: (n: number) => string;
    storeId: string | null;
    savedOrderIds: string[];
    onPayOrder?: (order: any) => void;
}

export function OrdersDrawer({
    open,
    onClose,
    formatCurrency,
    storeId,
    savedOrderIds,
    onPayOrder,
}: OrdersDrawerProps) {
    const queryClient = useQueryClient();
    const savedOrderIdsKey = savedOrderIds.join(",");

    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [returnOrder, setReturnOrder] = useState<any | null>(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnFile, setReturnFile] = useState<File | null>(null);
    const [returnPreview, setReturnPreview] = useState<string | null>(null);
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

    // Re-read phone when drawer opens or when order list changes
    const savedPhone = useMemo(() => {
        try {
            return localStorage.getItem("storefront_phone") || "";
        } catch {
            return "";
        }
    }, [open, savedOrderIdsKey]);

    const isWithin24Hours = (dateStr: string): boolean => {
        if (!dateStr) return false;
        try {
            const orderTime = new Date(dateStr).getTime();
            const nowTime = new Date().getTime();
            const hoursDiff = (nowTime - orderTime) / (1000 * 60 * 60);
            return hoursDiff <= 24;
        } catch {
            return false;
        }
    };

    // Primary: Fetch by phone (works across browsers/devices)
    // Fallback: Fetch by order IDs (legacy support)
    const { data: orders, isLoading, error: queryError } = useQuery({
        queryKey: ["orderHistory", savedPhone, savedOrderIdsKey, storeId],
        queryFn: async () => {
            let fetchedOrders = [];
            // Try phone-based lookup first (cross-device support)
            if (savedPhone && savedPhone.trim()) {
                const { data, error } = await (supabase as any).rpc("get_orders_by_phone", {
                    p_phone: savedPhone.trim(),
                    p_store_id: storeId || null,
                });
                if (error) {
                    console.error("RPC error fetching orders by phone:", error);
                } else if (data && data.length > 0) {
                    fetchedOrders = data;
                }
            }

            if (fetchedOrders.length === 0 && savedOrderIds.length > 0) {
                // Fallback: Fetch by order IDs
                const { data, error } = await (supabase as any).rpc("get_customer_orders", {
                    p_order_ids: savedOrderIds,
                });
                if (error) {
                    console.error("RPC error fetching orders by ID:", error);
                    throw error;
                }
                fetchedOrders = data || [];
            }

            if (fetchedOrders.length === 0) return [];

            // Query payment records for these orders
            const orderIds = fetchedOrders.map((o: any) => o.id);
            const { data: payments } = await supabase
                .from("payments")
                .select("*, invoices(invoice_number)")
                .in("order_id", orderIds);

            const paymentsMap = new Map();
            if (payments) {
                payments.forEach((p: any) => {
                    paymentsMap.set(p.order_id, p);
                });
            }

            // Query return records for these orders
            const returnsMap = new Map();
            try {
                const { data: returns, error: returnsError } = await supabase
                    .from("order_returns")
                    .select("*")
                    .in("order_id", orderIds);
                if (returnsError) {
                    console.error("Error fetching returns for drawer:", returnsError);
                } else if (returns) {
                    returns.forEach((r: any) => {
                        returnsMap.set(r.order_id, r);
                    });
                }
            } catch (err) {
                console.error("Failed to query order returns", err);
            }

            return fetchedOrders.map((o: any) => ({
                ...o,
                payment: paymentsMap.get(o.id) || null,
                returnRequest: returnsMap.get(o.id) || null
            }));
        },
        enabled: !!(open && (savedPhone.trim() || savedOrderIds.length > 0)),
        retry: 2,
        retryDelay: 1000,
        staleTime: 0,
        refetchInterval: open ? 10_000 : false,
    });

    return (
        <DialogPrimitive.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-300 data-[state=open]:duration-500">
                    <DialogPrimitive.Title className="sr-only">My Orders</DialogPrimitive.Title>

                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <PackageOpen className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-900">My Orders</h2>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                        {!savedPhone && !savedOrderIds.length ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                    <PackageOpen className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="font-semibold text-slate-400 text-sm">No orders yet</p>
                                <p className="text-xs text-slate-300 text-center">Place an order to get started. Your order history will appear here and be accessible from any device using the same phone number.</p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                <p className="text-xs text-slate-400">Loading your orders...</p>
                            </div>
                        ) : queryError ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
                                    <AlertCircle className="w-10 h-10 text-red-300" />
                                </div>
                                <p className="font-semibold text-red-600 text-sm">Could not load orders</p>
                                <p className="text-xs text-slate-400 text-center">{String(queryError) || 'Please try again later.'}</p>
                            </div>
                        ) : !orders || orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                    <PackageOpen className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="font-semibold text-slate-400 text-sm">No orders found</p>
                                <p className="text-xs text-slate-300 text-center">Your order history will show here. Orders are linked to your phone number, so you can see them from any device.</p>
                            </div>
                        ) : (
                            orders.map((order: any) => {
                                // Parse items if it's a string, otherwise use as-is
                                let orderItems = [];
                                try {
                                    if (typeof order.items === 'string') {
                                        orderItems = JSON.parse(order.items);
                                    } else if (Array.isArray(order.items)) {
                                        orderItems = order.items;
                                    }
                                } catch (e) {
                                    console.error('Error parsing items for order', order.id, e);
                                    orderItems = [];
                                }

                                return (
                                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-all">
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 mb-1">
                                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                                <p className="font-black text-slate-900">{formatCurrency(order.total_amount)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    order.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                    order.status === 'accepted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                    isOrderDeclined(order.status) ? 'bg-red-50 text-red-700 border border-red-200' :
                                                    'bg-amber-50 text-amber-750 border border-amber-250'
                                                }`}>
                                                    {isOrderDeclined(order.status) ? 'rejected' : order.status}
                                                </span>
                                                
                                                {/* Payment Status Badge */}
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    order.payment?.status === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                    order.payment?.status === 'refunded' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                    order.payment?.status === 'failed' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                    'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}>
                                                    {order.payment ? order.payment.status : 'unpaid'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {orderItems && orderItems.length > 0 ? (
                                                orderItems.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span className="text-slate-600 flex items-center gap-2">
                                                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">{item.quantity}x</span>
                                                            {item.product_name || 'Unknown Product'}
                                                        </span>
                                                        <span className="font-bold text-slate-900">{formatCurrency((item.price_at_time || 0) * (item.quantity || 1))}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No items in this order</p>
                                            )}
                                        </div>
                                        {order.delivery_charge > 0 && (
                                            <div className="flex justify-between text-xs pt-2 border-t border-slate-50">
                                                <span className="text-slate-400">Delivery Fee</span>
                                                <span className="font-semibold text-slate-600">{formatCurrency(order.delivery_charge)}</span>
                                            </div>
                                        )}

                                        {/* Action buttons (Download invoice / Pay Online / Return) */}
                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                            {order.returnRequest && (
                                                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-slate-500">Return Status</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            order.returnRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                            order.returnRequest.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                            'bg-amber-100 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {order.returnRequest.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 leading-normal">
                                                        <span className="font-semibold text-slate-500">Reason:</span> {order.returnRequest.reason}
                                                    </p>
                                                    {order.returnRequest.image_url && (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 mt-1 bg-white">
                                                            <img 
                                                                src={order.returnRequest.image_url} 
                                                                alt="Returned product" 
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {order.payment?.status === 'success' && (
                                                    <button
                                                        onClick={() => {
                                                            const invoiceNo = order.payment.invoices?.[0]?.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                                                            generateInvoicePDF({
                                                                invoiceNumber: invoiceNo,
                                                                date: new Date(order.payment.created_at).toLocaleDateString(),
                                                                storeName: "FinFlow Storefront",
                                                                customerName: order.customer_name,
                                                                customerPhone: order.customer_phone,
                                                                customerAddress: order.customer_address,
                                                                items: orderItems.map((it: any) => ({
                                                                    name: it.product_name || "Product Item",
                                                                    quantity: it.quantity || 1,
                                                                    price: Number(it.price_at_time || 0)
                                                                })),
                                                                subtotal: Number(order.total_amount) - Number(order.delivery_charge || 0),
                                                                deliveryCharge: Number(order.delivery_charge || 0),
                                                                totalAmount: Number(order.total_amount),
                                                                paymentMethod: order.payment.payment_method || "online",
                                                                status: order.payment.status
                                                            });
                                                        }}
                                                        className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 text-primary text-xs font-bold hover:bg-primary/5 active:scale-[0.98] transition-all"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        Invoice
                                                    </button>
                                                )}

                                                {order.status === 'completed' && !order.returnRequest && (
                                                    isWithin24Hours(order.created_at) ? (
                                                        <button
                                                            onClick={() => {
                                                                setReturnOrder(order);
                                                                setReturnReason("");
                                                                setReturnFile(null);
                                                                setReturnPreview(null);
                                                                setIsReturnDialogOpen(true);
                                                            }}
                                                            className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-rose-250 text-rose-650 text-xs font-bold hover:bg-rose-50 active:scale-[0.98] transition-all"
                                                        >
                                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                                            Return Order
                                                        </button>
                                                    ) : (
                                                        <span className="flex-1 text-center py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] text-slate-400 font-bold tracking-tight">
                                                            Return Window Expired (24h limit)
                                                        </span>
                                                    )
                                                )}

                                                {order.payment?.status !== 'success' && order.payment?.status !== 'refunded' && order.status !== 'completed' && onPayOrder && (
                                                    <button
                                                        onClick={() => onPayOrder(order)}
                                                        className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-black active:scale-[0.98] transition-all shadow-md"
                                                        style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        Pay Online
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>

            {/* ── Return Request Dialog ── */}
            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                            Request Order Return
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                            Please describe why you are returning this product and upload a photo of the product as proof.
                        </DialogDescription>
                    </DialogHeader>
                    <form 
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!returnOrder || !returnReason.trim() || !returnFile) return;

                            setIsSubmittingReturn(true);
                            try {
                                // 1. Upload to Supabase return-images bucket
                                const fileExt = returnFile.name.split('.').pop();
                                const fileName = `${returnOrder.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                                
                                const { error: uploadError } = await supabase.storage
                                    .from('return-images')
                                    .upload(fileName, returnFile);
                                    
                                if (uploadError) throw uploadError;

                                // 2. Get Public URL
                                const { data: { publicUrl } } = supabase.storage
                                    .from('return-images')
                                    .getPublicUrl(fileName);

                                // 3. Insert into order_returns
                                const { error: insertError } = await supabase
                                    .from('order_returns')
                                    .insert({
                                        order_id: returnOrder.id,
                                        reason: returnReason.trim(),
                                        image_url: publicUrl,
                                        status: 'pending'
                                    });

                                if (insertError) throw insertError;

                                // Success!
                                setIsReturnDialogOpen(false);
                                setReturnOrder(null);
                                setReturnReason("");
                                setReturnFile(null);
                                setReturnPreview(null);
                                
                                // Refetch orders list to display return status
                                queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
                            } catch (err) {
                                console.error("Failed to submit return request:", err);
                                alert("Error submitting return. Please try again.");
                            } finally {
                                setIsSubmittingReturn(false);
                            }
                        }} 
                        className="space-y-4 pt-4"
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider block">
                                Reason for Return
                            </label>
                            <textarea
                                placeholder="E.g., Product arrived damaged, wrong size, or parts missing."
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                className="w-full min-h-[80px] rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider block">
                                Upload Product Image
                            </label>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-250 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setReturnFile(file);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setReturnPreview(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    required
                                />
                                {returnPreview ? (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                        <img src={returnPreview} alt="Preview" className="object-cover w-full h-full" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-slate-500">
                                        <Camera className="w-6 h-6 text-slate-450" />
                                        <span className="text-xs font-bold">Choose a file or drop here</span>
                                        <span className="text-[10px]">JPEG, PNG, WEBP (Max 5MB)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsReturnDialogOpen(false)}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="h-10 px-4 rounded-xl text-white text-xs font-black active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5"
                                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                                disabled={isSubmittingReturn}
                            >
                                {isSubmittingReturn ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Return Request"
                                )}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DialogPrimitive.Root>
    );
}
