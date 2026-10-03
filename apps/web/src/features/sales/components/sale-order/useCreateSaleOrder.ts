import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { toast } from "sonner";
import { SaleOrderItem } from "../../types/orders";
import { useUpsertSaleOrder } from "../../hooks/useOrders";
import { CreateSaleOrderDialogProps } from "./types";

export function useCreateSaleOrder({
    open,
    onOpenChange,
    saleOrderToEdit,
    parties: partiesProp = [],
    products: productsProp = [],
    userId,
}: CreateSaleOrderDialogProps) {
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

    return {
        parties,
        products,
        orderNumber,
        setOrderNumber,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerEmail,
        setCustomerEmail,
        customerGstin,
        setCustomerGstin,
        billingAddress,
        setBillingAddress,
        orderDate,
        setOrderDate,
        expectedDeliveryDate,
        setExpectedDeliveryDate,
        discountAmount,
        setDiscountAmount,
        advancePaid,
        setAdvancePaid,
        notes,
        setNotes,
        termsConditions,
        setTermsConditions,
        isPartyDropdownOpen,
        setIsPartyDropdownOpen,
        partyDropdownRef,
        activeProductIdx,
        setActiveProductIdx,
        productDropdownRefs,
        items,
        filteredParties,
        handleSelectParty,
        updateItem,
        getFilteredProducts,
        handleSelectProduct,
        handleProductInputChange,
        addItem,
        removeItem,
        setPresetDeliveryDays,
        deliveryGapDays,
        subtotal,
        taxTotal,
        netTotal,
        handleSubmit,
        isPending: upsertMutation.isPending,
    };
}
