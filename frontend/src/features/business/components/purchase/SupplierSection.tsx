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

export interface PartyItem {
    id: string;
    name: string;
    type?: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_number?: string;
    opening_balance?: number;
    opening_balance_type?: "to_receive" | "to_pay";
}

interface SupplierSectionProps {
    vendorName: string;
    vendorGstin: string;
    vendorPhone: string;
    placeOfSupply: string;
    onVendorNameChange: (val: string) => void;
    onVendorGstinChange: (val: string) => void;
    onVendorPhoneChange: (val: string) => void;
    onPlaceOfSupplyChange: (val: string) => void;
    parties: PartyItem[];
    userId?: string;
    error?: string;
}

export const SupplierSection = ({
    vendorName,
    vendorGstin,
    vendorPhone,
    placeOfSupply,
    onVendorNameChange,
    onVendorGstinChange,
    onVendorPhoneChange,
    onPlaceOfSupplyChange,
    parties = [],
    userId,
    error,
}: SupplierSectionProps) => {
    const { formatCurrency } = useCurrency();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const vendorParties = parties.filter(
        (p) => p.type === "vendor" || p.type === "both" || !p.type
    );

    const filteredParties = vendorName.trim()
        ? vendorParties.filter((p) =>
              p.name.toLowerCase().includes(vendorName.toLowerCase().trim()) ||
              (p.phone && p.phone.includes(vendorName.trim())) ||
              (p.gst_number && p.gst_number.toLowerCase().includes(vendorName.toLowerCase().trim()))
          )
        : vendorParties.slice(0, 8);

    const matchedParty = vendorParties.find(
        (p) => p.name.toLowerCase() === vendorName.trim().toLowerCase()
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

    const handleSelectParty = (party: PartyItem) => {
        onVendorNameChange(party.name);
        if (party.gst_number) {
            onVendorGstinChange(party.gst_number);
            if (party.gst_number.length >= 2 && !placeOfSupply) {
                onPlaceOfSupplyChange(party.gst_number.substring(0, 2));
            }
        }
        if (party.phone) {
            onVendorPhoneChange(party.phone);
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
                type: newPartyData.type || "vendor",
                phone: newPartyData.phone || null,
                email: newPartyData.email || null,
                address: newPartyData.address || null,
                gst_number: newPartyData.gst_number || null,
                opening_balance: Number(newPartyData.opening_balance) || 0,
                opening_balance_type: newPartyData.opening_balance_type || "to_pay",
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

            toast({
                title: "Supplier Created",
                description: `${payload.name} added to party directory.`,
            });

            // Automatically select the new party
            handleSelectParty(payload);
            setIsPartyDialogOpen(false);
        } catch (err: any) {
            toast({
                title: "Failed to create supplier",
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
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm space-y-4">
            {/* Header: Title + Quick Add Button */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Supplier / Party Information
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Select an existing vendor or quickly record a new party
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
                    <span>New Supplier</span>
                </Button>
            </div>

            {/* Main Row: Searchable Name input + GSTIN + Place of Supply */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Supplier Name (Combobox) */}
                <div ref={containerRef} className="md:col-span-6 relative">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
                        <span>
                            Supplier Name <span className="text-destructive">*</span>
                        </span>
                        {matchedParty && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Registered Party
                            </span>
                        )}
                    </Label>

                    <div className="relative flex items-center">
                        <Input
                            ref={inputRef}
                            type="text"
                            value={vendorName}
                            onChange={(e) => {
                                onVendorNameChange(e.target.value);
                                if (!isDropdownOpen) setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Type supplier name or select..."
                            className={`h-9 text-xs pr-8 bg-background ${
                                error ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                        />
                        {vendorName ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onVendorNameChange("");
                                    onVendorGstinChange("");
                                    onVendorPhoneChange("");
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
                        <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {error}
                        </p>
                    )}

                    {/* Autocomplete Dropdown */}
                    {isDropdownOpen && (
                        <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                            <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                                {filteredParties.length > 0 ? (
                                    filteredParties.map((party, idx) => {
                                        const isSelected = matchedParty?.id === party.id;
                                        const isHighlighted = highlightedIndex === idx;

                                        return (
                                            <div
                                                key={party.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelectParty(party);
                                                }}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                                    isHighlighted
                                                        ? "bg-accent text-accent-foreground font-medium"
                                                        : "hover:bg-muted/60"
                                                }`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                                        <span>{party.name}</span>
                                                        {isSelected && (
                                                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                        {party.phone && (
                                                            <span className="flex items-center gap-0.5">
                                                                <Phone className="w-2.5 h-2.5" /> {party.phone}
                                                            </span>
                                                        )}
                                                        {party.gst_number && (
                                                            <span className="font-mono">
                                                                GST: {party.gst_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {party.opening_balance !== undefined && Number(party.opening_balance) !== 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[9px] shrink-0 font-mono px-1.5 py-0 h-4 border",
                                                            party.opening_balance_type === "to_receive"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400"
                                                        )}
                                                    >
                                                        {party.opening_balance_type === "to_receive" ? "Rec: " : "Pay: "}
                                                        {formatCurrency(Number(party.opening_balance))}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 text-center text-xs text-muted-foreground">
                                        <p className="font-medium text-foreground">
                                            No matching suppliers found
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            "{vendorName}" will be auto-saved as a new vendor on bill submit.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsPartyDialogOpen(true);
                                    setIsDropdownOpen(false);
                                }}
                                className="bg-muted/50 p-2 text-[11px] text-primary flex items-center gap-1.5 font-semibold border-t cursor-pointer hover:bg-muted"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add "{vendorName || "New Party"}" with full details</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vendor GSTIN */}
                <div className="md:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                            Supplier GSTIN
                        </Label>
                        {vendorGstin ? (
                            isValidGstin(vendorGstin) ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                    ✓ B2B ITC Eligible
                                </span>
                            ) : (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                    {vendorGstin.length}/15 chars
                                </span>
                            )
                        ) : (
                            <span className="text-[10px] text-muted-foreground">
                                Optional / B2C
                            </span>
                        )}
                    </div>

                    <Input
                        type="text"
                        value={vendorGstin}
                        maxLength={15}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                            onVendorGstinChange(val);
                            if (val.length >= 2 && !placeOfSupply) {
                                onPlaceOfSupplyChange(val.substring(0, 2));
                            }
                        }}
                        placeholder="15-digit GSTIN (e.g. 27ABCDE1234F1Z5)"
                        className="h-9 text-xs uppercase font-mono tracking-wider bg-background"
                    />
                </div>

                {/* Place of Supply (State Code) */}
                <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                        Place of Supply
                    </Label>
                    <Input
                        type="text"
                        value={placeOfSupply}
                        maxLength={2}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            onPlaceOfSupplyChange(val);
                        }}
                        placeholder="State Code (27)"
                        className="h-9 text-xs text-center font-mono font-bold bg-background"
                    />
                </div>
            </div>

            {/* Quick Party Add Dialog */}
            <PartyDialog
                open={isPartyDialogOpen}
                onOpenChange={setIsPartyDialogOpen}
                onSave={handleQuickAddParty}
                isSaving={isSavingParty}
                party={{
                    id: "",
                    user_id: userId || "",
                    name: vendorName.trim(),
                    type: "vendor",
                    phone: vendorPhone || null,
                    email: null,
                    address: null,
                    gst_number: vendorGstin || null,
                    opening_balance: 0,
                    opening_balance_type: "to_pay",
                    created_at: new Date().toISOString(),
                }}
            />
        </div>
    );
};
