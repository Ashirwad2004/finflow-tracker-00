import { useState, useRef, useEffect } from "react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Search, 
    Plus, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    Check, 
    X, 
    AlertCircle, 
    Wallet 
} from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { PartyDialog } from "@/features/business/components/PartyDialog";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/core/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface CustomerPartyItem {
    id: string;
    name: string;
    type?: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_number?: string;
    gstin?: string;
    opening_balance?: number;
    opening_balance_type?: "to_receive" | "to_pay";
}

interface CustomerSectionProps {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerGstin: string;
    placeOfSupply: string;
    onCustomerNameChange: (val: string) => void;
    onCustomerPhoneChange: (val: string) => void;
    onCustomerEmailChange: (val: string) => void;
    onCustomerGstinChange: (val: string) => void;
    onPlaceOfSupplyChange: (val: string) => void;
    parties: CustomerPartyItem[];
    userId?: string;
    error?: string;
    onPartySelected?: (party: CustomerPartyItem) => void;
}

export const CustomerSection = ({
    customerName,
    customerPhone,
    customerEmail,
    customerGstin,
    placeOfSupply,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onCustomerEmailChange,
    onCustomerGstinChange,
    onPlaceOfSupplyChange,
    parties = [],
    userId,
    error,
    onPartySelected,
}: CustomerSectionProps) => {
    const { formatCurrency } = useCurrency();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter parties for customers or both
    const customerParties = parties.filter(
        (p) => p.type === "customer" || p.type === "both" || !p.type
    );

    const filteredParties = customerName.trim()
        ? customerParties.filter((p) =>
              p.name.toLowerCase().includes(customerName.toLowerCase().trim()) ||
              (p.phone && p.phone.includes(customerName.trim())) ||
              ((p.gst_number || p.gstin) && 
                (p.gst_number || p.gstin)?.toLowerCase().includes(customerName.toLowerCase().trim()))
          )
        : customerParties.slice(0, 10);

    const matchedParty = customerParties.find(
        (p) => p.name.toLowerCase() === customerName.trim().toLowerCase()
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectParty = (party: CustomerPartyItem) => {
        onCustomerNameChange(party.name);
        if (party.phone) {
            onCustomerPhoneChange(party.phone);
        }
        if (party.email) {
            onCustomerEmailChange(party.email);
        }
        const gst = party.gst_number || party.gstin;
        if (gst) {
            onCustomerGstinChange(gst.toUpperCase());
            if (gst.length >= 2 && !placeOfSupply) {
                onPlaceOfSupplyChange(gst.substring(0, 2));
            }
        }
        if (party.address && !placeOfSupply) {
            onPlaceOfSupplyChange(party.address);
        }

        if (onPartySelected) {
            onPartySelected(party);
        }

        setIsDropdownOpen(false);
    };

    const handleQuickAddParty = async (newPartyData: any) => {
        if (!userId) return;
        setIsSavingParty(true);
        const partyId = uuidv4();

        try {
            const payload = {
                id: partyId,
                user_id: userId,
                name: newPartyData.name,
                type: newPartyData.type || "customer",
                phone: newPartyData.phone || null,
                email: newPartyData.email || null,
                address: newPartyData.address || null,
                gst_number: newPartyData.gst_number || null,
                opening_balance: Number(newPartyData.opening_balance) || 0,
                opening_balance_type: newPartyData.opening_balance_type || "to_receive",
            };

            await offlineMutate({
                table: "parties",
                action: "insert",
                recordId: partyId,
                payload,
                userId,
            });

            // Optimistically update parties query
            queryClient.setQueryData(["parties", userId], (old: any) => {
                return old ? [payload, ...old] : [payload];
            });
            queryClient.setQueryData(["invoice-parties"], (old: any) => {
                return old ? [payload, ...old] : [payload];
            });

            toast({
                title: "Customer Created",
                description: `${payload.name} added to party directory.`,
            });

            // Automatically select the new party
            handleSelectParty(payload);
            setIsPartyDialogOpen(false);
        } catch (err: any) {
            toast({
                title: "Failed to create customer",
                description: err.message || "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsSavingParty(false);
        }
    };

    const isValidGstin = (gst: string) => {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.trim().toUpperCase());
    };

    return (
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-xs space-y-4">
            {/* Header: Title + Quick Add Button */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Customer / Bill To Information
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Select an existing registered party or enter new customer details
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPartyDialogOpen(true)}
                    className="h-7 text-xs font-semibold gap-1.5 border-dashed hover:border-primary hover:text-primary transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Customer</span>
                </Button>
            </div>

            {/* Main Row: Searchable Customer Name Combobox + GSTIN + Place of Supply */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Customer Name (Combobox) */}
                <div ref={containerRef} className="md:col-span-6 relative">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
                        <span>
                            Customer Name <span className="text-destructive">*</span>
                        </span>
                        {matchedParty && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Registered Customer
                            </span>
                        )}
                    </Label>

                    <div className="relative flex items-center">
                        <Input
                            ref={inputRef}
                            type="text"
                            value={customerName}
                            onChange={(e) => {
                                onCustomerNameChange(e.target.value);
                                if (!isDropdownOpen) setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Type customer name or select..."
                            className={`h-9 text-xs pr-8 bg-background ${
                                error ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                        />
                        {customerName ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onCustomerNameChange("");
                                    onCustomerGstinChange("");
                                    onCustomerPhoneChange("");
                                    onCustomerEmailChange("");
                                    inputRef.current?.focus();
                                }}
                                className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <Search className="w-3.5 h-3.5 absolute right-2.5 text-muted-foreground pointer-events-none opacity-50" />
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive text-[11px] mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {error}
                        </p>
                    )}

                    {/* Autocomplete Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                            <div className="px-3 py-1.5 bg-muted/70 border-b border-border/60 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>Existing Parties ({filteredParties.length})</span>
                                <span className="text-[9px] font-normal text-muted-foreground lowercase">
                                    click to auto-fill
                                </span>
                            </div>

                            <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
                                {filteredParties.length > 0 ? (
                                    filteredParties.map((party, idx) => {
                                        const isSelected = matchedParty?.id === party.id;
                                        const isHighlighted = highlightedIndex === idx;
                                        const partyGst = party.gst_number || party.gstin;

                                        return (
                                            <div
                                                key={party.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelectParty(party);
                                                }}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                                    isHighlighted
                                                        ? "bg-accent text-accent-foreground font-medium"
                                                        : "hover:bg-muted/60"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                                                            <span>{party.name}</span>
                                                            {isSelected && (
                                                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                            {party.phone && <span>📞 {party.phone}</span>}
                                                            {partyGst && <span>• GSTIN: {partyGst}</span>}
                                                            {party.address && <span>• {party.address}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end shrink-0 gap-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] px-1.5 py-0 h-4 border uppercase tracking-wider font-semibold"
                                                    >
                                                        {party.type || "customer"}
                                                    </Badge>
                                                    {party.opening_balance ? (
                                                        <span className={cn(
                                                            "text-[10px] font-bold font-mono",
                                                            party.opening_balance_type === "to_receive"
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : "text-rose-600 dark:text-rose-400"
                                                        )}>
                                                            {party.opening_balance_type === "to_receive" ? "+" : "-"}
                                                            {formatCurrency(party.opening_balance)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        <p className="font-semibold text-foreground">
                                            No registered customer found matching "{customerName}"
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            You can continue typing to save an unregistered walk-in customer, or click below to register.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Quick Create Action */}
                            <div className="p-2 bg-muted/40 border-t border-border/60">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsPartyDialogOpen(true);
                                    }}
                                    className="w-full h-8 text-xs font-semibold justify-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add "{customerName.trim() || 'New Customer'}" to Customers</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer GSTIN */}
                <div className="md:col-span-4">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
                        <span>GSTIN (B2B Tax Invoice)</span>
                        {customerGstin.trim() && (
                            <span
                                className={`text-[10px] font-bold ${
                                    isValidGstin(customerGstin)
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-500"
                                }`}
                            >
                                {isValidGstin(customerGstin) ? "✓ Valid GSTIN" : "15 chars required"}
                            </span>
                        )}
                    </Label>
                    <Input
                        type="text"
                        value={customerGstin}
                        maxLength={15}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                            onCustomerGstinChange(val);
                            if (val.length >= 2 && !placeOfSupply) {
                                onPlaceOfSupplyChange(val.substring(0, 2));
                            }
                        }}
                        placeholder="e.g. 29ABCDE1234F1Z5 (optional)"
                        className="h-9 text-xs font-mono uppercase bg-background"
                    />
                </div>

                {/* Place of Supply */}
                <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                        Place of Supply
                    </Label>
                    <Input
                        type="text"
                        value={placeOfSupply}
                        maxLength={2}
                        onChange={(e) => onPlaceOfSupplyChange(e.target.value.toUpperCase())}
                        placeholder="State Code (e.g. 27)"
                        className="h-9 text-xs font-mono uppercase bg-background"
                    />
                </div>
            </div>

            {/* Secondary Row: Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                <div>
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <Phone className="w-3 h-3" />
                        <span>Phone / WhatsApp</span>
                    </Label>
                    <Input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => onCustomerPhoneChange(e.target.value)}
                        placeholder="Customer mobile number"
                        className="h-8 text-xs bg-background"
                    />
                </div>
                <div>
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <Mail className="w-3 h-3" />
                        <span>Email Address</span>
                    </Label>
                    <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => onCustomerEmailChange(e.target.value)}
                        placeholder="customer@example.com"
                        className="h-8 text-xs bg-background"
                    />
                </div>
            </div>

            {/* Quick Party Creation Dialog Modal */}
            {isPartyDialogOpen && (
                <PartyDialog
                    open={isPartyDialogOpen}
                    onOpenChange={setIsPartyDialogOpen}
                    onSave={handleQuickAddParty}
                    isSaving={isSavingParty}
                />
            )}
        </div>
    );
};
