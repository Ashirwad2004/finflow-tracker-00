
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { useCurrency, CURRENCIES } from "@/contexts/CurrencyContext";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/contexts/BusinessContext";
import { BusinessDetailsDialog } from "./BusinessDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ... inside SettingsDialog ...

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
    const { currency, setCurrency } = useCurrency();
    const { isBusinessMode, toggleBusinessMode } = useBusiness();
    const { user } = useAuth();

    const [localCurrencyCode, setLocalCurrencyCode] = useState(currency.code);
    const [showBusinessDialog, setShowBusinessDialog] = useState(false);

    // Sync local state... (existing useEffect)
    useEffect(() => {
        if (open) {
            setLocalCurrencyCode(currency.code);
        }
    }, [open, currency.code]);

    const handleBusinessToggle = async (checked: boolean) => {
        console.log("Toggle clicked. Checked:", checked);
        if (checked) {
            // Check if business details exist
            const { data, error } = await supabase
                .from("profiles")
                .select("business_name")
                .eq("user_id", user?.id)
                .single();

            console.log("Profile Data:", data);
            console.log("Profile Error:", error);

            const hasDetails = (data as any)?.business_name;
            console.log("Has Details:", hasDetails);

            if (!hasDetails) {
                console.log("Opening Business Dialog...");
                // Open setup dialog
                setShowBusinessDialog(true);
            } else {
                console.log("Already has details. Enabling mode.");
                // Already setup, just toggle
                toggleBusinessMode(true);
            }
        } else {
            toggleBusinessMode(false);
        }
    };

    const handleSave = () => {
        // ... existing save logic ...
        const selected = CURRENCIES.find((c) => c.code === localCurrencyCode);
        if (selected) {
            setCurrency(selected);
            onOpenChange(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        {/* Currency Selector */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="currency" className="text-right">
                                Currency
                            </Label>
                            <Select
                                value={localCurrencyCode}
                                onValueChange={setLocalCurrencyCode}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.name} ({c.symbol})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Business Mode Toggle */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="business-mode" className="text-right">
                                Business Mode
                            </Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="business-mode"
                                    checked={isBusinessMode}
                                    onCheckedChange={handleBusinessToggle}
                                />
                                <Label htmlFor="business-mode" className="font-normal text-muted-foreground text-xs">
                                    Enable invoicing & business dashboard
                                </Label>
                            </div>
                        </div>

                        {isBusinessMode && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-start-2 col-span-3">
                                    <Button variant="outline" size="sm" onClick={() => setShowBusinessDialog(true)} className="w-full">
                                        Edit Business Details
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <BusinessDetailsDialog
                open={showBusinessDialog}
                onOpenChange={setShowBusinessDialog}
                onSuccess={() => toggleBusinessMode(true)}
            />
        </>
    );
};
