import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar, ShoppingBag, UserCheck, AlertCircle, Clock, Truck, Check } from "lucide-react";
import { toast } from "sonner";
import { SaleOrder, SaleOrderItem } from "../../types/orders";
import { useUpsertSaleOrder } from "../../hooks/useOrders";

interface CreateSaleOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrderToEdit?: SaleOrder | null;
    parties?: any[];
    products?: any[];
    userId: string;
}

export const CreateSaleOrderDialog: React.FC<CreateSaleOrderDialogProps> = ({
    open,
    onOpenChange,
    saleOrderToEdit,
    parties: partiesProp = [],
    products: productsProp = [],
    userId,
}) => {
    const upsertMutation = useUpsertSaleOrder(userId);

    // Reliable fallback queries for parties and products
    const { data: dbParties = [] } = useQuery({
        queryKey: ["parties", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("parties")
                    .select("*")
                    .eq("user_id", userId)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (e) {
                console.warn("[CreateSaleOrderDialog] Parties fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("parties", userId)) || [];
        },
        enabled: !!userId && open,
    });

    const { data: dbProducts = [] } = useQuery({
        queryKey: ["products", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("products")
                    .select("*")
                    .eq("user_id", userId)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (e) {
                console.warn("[CreateSaleOrderDialog] Products fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("products", userId)) || [];
        },
        enabled: !!userId && open,
    });

    const parties = partiesProp && partiesProp.length > 0 ? partiesProp : dbParties;
    const products = productsProp && productsProp.length > 0 ? productsProp : dbProducts;

    const [orderNumber, setOrderNumber] = useState("");
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerGstin, setCustomerGstin] = useState("");
    const [billingAddress, setBillingAddress] = useState("");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [advancePaid, setAdvancePaid] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [termsConditions, setTermsConditions] = useState("");

    // Customer suggestion dropdown state
    const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
    const partyDropdownRef = useRef<HTMLDivElement>(null);

    // Line item product dropdown state
    const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null);
    const productDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const [items, setItems] = useState<SaleOrderItem[]>([
        {
            id: crypto.randomUUID(),
            name: "",
            quantity: 1,
            price: 0,
            tax_rate: 0,
            unit: "pcs",
            delivered_qty: 0,
            purchased_qty: 0,
        },
    ]);

    // Handle click outside for party dropdown & product dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
                setIsPartyDropdownOpen(false);
            }
            if (activeProductIdx !== null) {
                const container = productDropdownRefs.current[activeProductIdx];
                if (container && !container.contains(event.target as Node)) {
                    setActiveProductIdx(null);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeProductIdx]);

    // Initialize or reset form
    useEffect(() => {
        if (saleOrderToEdit) {
            setOrderNumber(saleOrderToEdit.order_number);
            setSelectedPartyId(saleOrderToEdit.party_id || null);
            setCustomerName(saleOrderToEdit.customer_name);
            setCustomerPhone(saleOrderToEdit.customer_phone || "");
            setCustomerEmail(saleOrderToEdit.customer_email || "");
            setCustomerGstin(saleOrderToEdit.customer_gstin || "");
            setBillingAddress(saleOrderToEdit.billing_address || "");
            setOrderDate(saleOrderToEdit.order_date || new Date().toISOString().split("T")[0]);
            setExpectedDeliveryDate(saleOrderToEdit.expected_delivery_date || "");
            setDiscountAmount(Number(saleOrderToEdit.discount_amount) || 0);
            setAdvancePaid(Number(saleOrderToEdit.advance_paid) || 0);
            setNotes(saleOrderToEdit.notes || "");
            setTermsConditions(saleOrderToEdit.terms_conditions || "");
            setItems(
                saleOrderToEdit.items && saleOrderToEdit.items.length > 0
                    ? saleOrderToEdit.items.map((it) => ({
                          ...it,
                          id: it.id || crypto.randomUUID(),
                          product_id: it.product_id || undefined,
                          delivered_qty: Number(it.delivered_qty) || 0,
                          purchased_qty: Number(it.purchased_qty) || 0,
                      }))
                    : [{ id: crypto.randomUUID(), name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs", delivered_qty: 0, purchased_qty: 0 }]
            );
        } else {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            setOrderNumber(`SO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`);
            setSelectedPartyId(null);
            setCustomerName("");
            setCustomerPhone("");
            setCustomerEmail("");
            setCustomerGstin("");
            setBillingAddress("");
            setOrderDate(new Date().toISOString().split("T")[0]);
            setExpectedDeliveryDate("");
            setDiscountAmount(0);
            setAdvancePaid(0);
            setNotes("");
            setTermsConditions("Delivery within agreed timeline. 100% replacement warranty for transit damages.");
            setItems([{ id: crypto.randomUUID(), name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs", delivered_qty: 0, purchased_qty: 0 }]);
        }
    }, [saleOrderToEdit, open]);

    // Party suggestions filtering
    const filteredParties = useMemo(() => {
        if (!customerName.trim()) return parties;
        const q = customerName.toLowerCase().trim();
        return parties.filter((p) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.phone && p.phone.includes(q)) ||
            (p.gstin && p.gstin.toLowerCase().includes(q))
        );
    }, [parties, customerName]);

    const handleSelectParty = (selected: any) => {
        setSelectedPartyId(selected.id || null);
        setCustomerName(selected.name || "");
        setCustomerPhone(selected.phone || "");
        setCustomerEmail(selected.email || "");
        setCustomerGstin(selected.gstin || "");
        setBillingAddress(selected.billing_address || selected.address || "");
        setIsPartyDropdownOpen(false);
    };

    // Item changes
    const updateItem = (index: number, field: keyof SaleOrderItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const getFilteredProducts = (query: string) => {
        if (!query.trim()) return products;
        const q = query.toLowerCase().trim();
        return products.filter((p) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.hsn_code && p.hsn_code.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
        );
    };

    const handleSelectProduct = (index: number, matchedProduct: any) => {
        const newItems = [...items];
        const selPrice = Number(matchedProduct.price ?? matchedProduct.sale_price ?? 0);
        newItems[index] = {
            ...newItems[index],
            product_id: matchedProduct.id,
            name: matchedProduct.name,
            price: selPrice,
            unit: matchedProduct.unit || "pcs",
            hsn_code: matchedProduct.hsn_code || "",
            tax_rate: Number(matchedProduct.tax_rate) || 0,
        };
        setItems(newItems);
        setActiveProductIdx(null);
    };

    const handleProductInputChange = (index: number, productName: string) => {
        const matched = products.find((p) => p.name?.toLowerCase().trim() === productName.toLowerCase().trim());
        if (matched) {
            handleSelectProduct(index, matched);
        } else {
            updateItem(index, "name", productName);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                name: "",
                quantity: 1,
                price: 0,
                tax_rate: 0,
                unit: "pcs",
                delivered_qty: 0,
                purchased_qty: 0,
            },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            toast.error("Sale order must contain at least 1 item");
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    // Quick Delivery Preset Helper
    const setPresetDeliveryDays = (days: number) => {
        const baseDate = orderDate ? new Date(orderDate) : new Date();
        const futureDate = new Date(baseDate);
        futureDate.setDate(futureDate.getDate() + days);
        setExpectedDeliveryDate(futureDate.toISOString().split("T")[0]);
    };

    const deliveryGapDays = useMemo(() => {
        if (!orderDate || !expectedDeliveryDate) return null;
        const start = new Date(orderDate).getTime();
        const end = new Date(expectedDeliveryDate).getTime();
        if (isNaN(start) || isNaN(end)) return null;
        return Math.round((end - start) / (1000 * 3600 * 24));
    }, [orderDate, expectedDeliveryDate]);

    // Calculation
    const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
    const taxTotal = items.reduce((acc, it) => {
        const itemSub = (Number(it.quantity) || 0) * (Number(it.price) || 0);
        return acc + (itemSub * (Number(it.tax_rate) || 0)) / 100;
    }, 0);
    const netTotal = Math.max(0, subtotal + taxTotal - Number(discountAmount || 0));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customerName.trim()) {
            toast.error("Please specify a customer name");
            return;
        }

        const validItems = items.filter((it) => it.name.trim() && Number(it.quantity) > 0);
        if (validItems.length === 0) {
            toast.error("Please add at least one item with valid name and quantity");
            return;
        }

        const matchedParty = parties.find(
            (p) => p.name?.toLowerCase().trim() === customerName.toLowerCase().trim()
        );
        const finalPartyId = selectedPartyId || matchedParty?.id || saleOrderToEdit?.party_id || null;

        try {
            await upsertMutation.mutateAsync({
                id: saleOrderToEdit?.id,
                order_number: orderNumber,
                party_id: finalPartyId,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail,
                customer_gstin: customerGstin,
                billing_address: billingAddress,
                order_date: orderDate,
                expected_delivery_date: expectedDeliveryDate || null,
                items: validItems.map((it) => ({
                    id: it.id || crypto.randomUUID(),
                    product_id: it.product_id || undefined,
                    name: it.name,
                    description: it.description || it.name,
                    quantity: Number(it.quantity),
                    price: Number(it.price),
                    tax_rate: Number(it.tax_rate || 0),
                    tax_amount: ((Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100),
                    total: (Number(it.quantity) * Number(it.price)) + ((Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100),
                    delivered_qty: Number(it.delivered_qty) || 0,
                    purchased_qty: Number(it.purchased_qty) || 0,
                    unit: it.unit || "pcs",
                    hsn_code: it.hsn_code || "",
                })),
                subtotal,
                tax_amount: taxTotal,
                discount_amount: Number(discountAmount || 0),
                total_amount: netTotal,
                advance_paid: Number(advancePaid || 0),
                notes,
                terms_conditions: termsConditions,
                status: saleOrderToEdit?.status || "confirmed",
            });

            toast.success(saleOrderToEdit ? "Sale Order updated successfully!" : "Sale Order booked successfully!");
            onOpenChange(false);
        } catch (err: any) {
            console.error("Failed to save Sale Order:", err);
            toast.error(err.message || "Failed to save Sale Order");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                        {saleOrderToEdit ? "Edit Sale Order" : "New Customer Sale Order"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Book advance order, reserve stock, and convert to GST Tax Invoice upon fulfillment.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order No.</span>
                                <Input
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-36 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* CA Stock Accounting Notice */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Inventory & Tax Invariant:</strong> Saving this Sale Order books a customer commitment and reserves stock. It does <em>not</em> deduct warehouse physical inventory or generate tax liability until converted to a Sale Invoice.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Customer & Party Details Section */}
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Searchable Customer Name Input */}
                                <div className="relative space-y-1.5 md:col-span-1" ref={partyDropdownRef}>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Customer Name <span className="text-rose-500">*</span>
                                        </Label>
                                        {parties.length > 0 && (
                                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                                {parties.length} parties
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            placeholder="Type or click to select party..."
                                            value={customerName}
                                            onChange={(e) => {
                                                setCustomerName(e.target.value);
                                                setIsPartyDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsPartyDropdownOpen(true)}
                                            className="h-9 text-xs pr-8 font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            required
                                        />
                                        <UserCheck className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                    </div>

                                    {/* Party Suggestions Dropdown */}
                                    {isPartyDropdownOpen && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredParties.length > 0 ? (
                                                filteredParties.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => handleSelectParty(p)}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                                {p.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                                {p.phone && <span>Ph: {p.phone}</span>}
                                                                {p.gstin && <span>GST: {p.gstin}</span>}
                                                                {p.type && (
                                                                    <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                                                                        {p.type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {customerName.trim().toLowerCase() === (p.name || "").trim().toLowerCase() && (
                                                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-xs text-slate-400">
                                                    No matching parties. New party "{customerName}" will be used.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</Label>
                                    <Input
                                        placeholder="Customer phone number"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customer GSTIN</Label>
                                    <Input
                                        placeholder="GSTIN (Optional)"
                                        value={customerGstin}
                                        onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                                        className="h-9 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Order & Expected Delivery Dates Section */}
                        <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                        Order & Expected Delivery Timeline
                                    </h4>
                                </div>
                                {deliveryGapDays !== null && (
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                        deliveryGapDays < 0
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                            : deliveryGapDays === 0
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300"
                                    }`}>
                                        {deliveryGapDays < 0
                                            ? "⚠️ Delivery before Order Date"
                                            : deliveryGapDays === 0
                                            ? "⚡ Same Day Delivery"
                                            : `⏱️ ${deliveryGapDays} Day${deliveryGapDays > 1 ? "s" : ""} Delivery Lead Time`}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Order Booking Date</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        className="h-9 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Expected Delivery Date</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={expectedDeliveryDate}
                                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                        className="h-9 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1 shrink-0">
                                    Quick Presets:
                                </span>
                                {[
                                    { label: "Today", days: 0 },
                                    { label: "+3 Days", days: 3 },
                                    { label: "+7 Days", days: 7 },
                                    { label: "+14 Days", days: 14 },
                                    { label: "+30 Days", days: 30 },
                                ].map((preset) => (
                                    <button
                                        key={preset.days}
                                        type="button"
                                        onClick={() => setPresetDeliveryDays(preset.days)}
                                        className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 transition-all text-slate-600 dark:text-slate-300 shadow-xs shrink-0"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Items Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>Ordered Products & Services</span>
                                    <span className="text-xs font-normal text-slate-400">({items.length} items)</span>
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="h-8 text-xs gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Line Item
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible shadow-sm bg-white dark:bg-slate-900">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 w-6 text-center">#</th>
                                            <th className="p-3">Item / Inventory Product Name</th>
                                            <th className="p-3 w-24 text-right">Qty</th>
                                            <th className="p-3 w-20 text-center">Unit</th>
                                            <th className="p-3 w-28 text-right">Rate (₹)</th>
                                            <th className="p-3 w-24 text-center">GST %</th>
                                            <th className="p-3 w-28 text-right">Total (₹)</th>
                                            <th className="p-3 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.map((item, idx) => {
                                            const lineSub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                                            const lineTax = (lineSub * (Number(item.tax_rate) || 0)) / 100;
                                            const lineTot = lineSub + lineTax;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                    
                                                    {/* Interactive Product Search Dropdown Cell */}
                                                    <td className="p-2 relative">
                                                        <div
                                                            ref={(el) => { productDropdownRefs.current[idx] = el; }}
                                                            className="relative"
                                                        >
                                                            <Input
                                                                placeholder="Type or select inventory product..."
                                                                value={item.name}
                                                                onChange={(e) => {
                                                                    handleProductInputChange(idx, e.target.value);
                                                                    setActiveProductIdx(idx);
                                                                }}
                                                                onFocus={() => setActiveProductIdx(idx)}
                                                                className="h-8 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                                required
                                                            />

                                                            {/* Product Suggestions Menu */}
                                                            {activeProductIdx === idx && (
                                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800 min-w-[260px]">
                                                                    {getFilteredProducts(item.name).length > 0 ? (
                                                                        getFilteredProducts(item.name).map((prod) => (
                                                                            <button
                                                                                key={prod.id}
                                                                                type="button"
                                                                                onClick={() => handleSelectProduct(idx, prod)}
                                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                                                                            >
                                                                                <div>
                                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                                                        {prod.name}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                                                        <span>Stock: {prod.stock_quantity ?? prod.stock ?? 0} {prod.unit || "pcs"}</span>
                                                                                        {prod.hsn_code && <span>HSN: {prod.hsn_code}</span>}
                                                                                        {prod.tax_rate != null && <span>GST: {prod.tax_rate}%</span>}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        ₹{Number(prod.price ?? prod.sale_price ?? 0).toLocaleString("en-IN")}
                                                                                    </div>
                                                                                    <div className="text-[9px] text-slate-400">per {prod.unit || "pcs"}</div>
                                                                                </div>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="p-3 text-center text-xs text-slate-400">
                                                                            {products.length === 0 ? "No inventory products found." : `No products matching "${item.name}"`}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-xs text-right font-medium"
                                                            required
                                                        />
                                                    </td>

                                                    <td className="p-2">
                                                        <select
                                                            value={item.unit || "pcs"}
                                                            onChange={(e) => updateItem(idx, "unit", e.target.value)}
                                                            className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                        >
                                                            <option value="pcs">pcs</option>
                                                            <option value="box">box</option>
                                                            <option value="kg">kg</option>
                                                            <option value="mtr">mtr</option>
                                                            <option value="lit">lit</option>
                                                            <option value="set">set</option>
                                                        </select>
                                                    </td>

                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-xs text-right font-mono"
                                                            required
                                                        />
                                                    </td>

                                                    <td className="p-2">
                                                        <select
                                                            value={item.tax_rate ?? 0}
                                                            onChange={(e) => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)}
                                                            className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center"
                                                        >
                                                            <option value={0}>0%</option>
                                                            <option value={5}>5%</option>
                                                            <option value={12}>12%</option>
                                                            <option value={18}>18%</option>
                                                            <option value={28}>28%</option>
                                                        </select>
                                                    </td>

                                                    <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                        ₹{lineTot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>

                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary and Payment Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notes / Remarks</Label>
                                    <Textarea
                                        placeholder="Special handling instructions, customer notes..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="h-16 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Terms & Conditions</Label>
                                    <Textarea
                                        value={termsConditions}
                                        onChange={(e) => setTermsConditions(e.target.value)}
                                        className="h-16 text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal (Excl. Tax):</span>
                                    <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Total GST:</span>
                                    <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
                                    <span>Discount (₹):</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-28 text-right text-xs font-mono"
                                    />
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                                    <span>Total Order Value:</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                        ₹{netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span>Advance Token Received (₹):</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={advancePaid}
                                        onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                    <span>Balance Due on Delivery:</span>
                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                        ₹{Math.max(0, netTotal - advancePaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={upsertMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 shadow-md shadow-indigo-500/20"
                        >
                            {upsertMutation.isPending ? "Saving Order..." : saleOrderToEdit ? "Update Sale Order" : "Confirm & Save Order"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
