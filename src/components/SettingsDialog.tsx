
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

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
    const { currency, setCurrency } = useCurrency();
    const [localCurrencyCode, setLocalCurrencyCode] = useState(currency.code);

    // Sync local state when dialog opens or global currency changes (initial load)
    useEffect(() => {
        if (open) {
            setLocalCurrencyCode(currency.code);
        }
    }, [open, currency.code]);

    const handleSave = () => {
        const selected = CURRENCIES.find((c) => c.code === localCurrencyCode);
        if (selected) {
            setCurrency(selected);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
    );
};
