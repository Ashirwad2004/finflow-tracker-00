import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Party } from "../pages/Parties";

interface PartyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (party: Partial<Party>) => void;
    party?: Party | null;
    isEditing?: boolean;
    isSaving?: boolean;
}

export const PartyDialog = ({ open, onOpenChange, onSave, party, isEditing, isSaving = false }: PartyDialogProps) => {
    const [name, setName] = useState("");
    const [type, setType] = useState<"customer" | "vendor" | "both">("customer");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [openingBalance, setOpeningBalance] = useState<string>("0");
    const [openingBalanceType, setOpeningBalanceType] = useState<"to_receive" | "to_pay">("to_receive");

    useEffect(() => {
        if (open) {
            if (party && isEditing) {
                setName(party.name || "");
                setType(party.type || "customer");
                setPhone(party.phone || "");
                setEmail(party.email || "");
                setAddress(party.address || "");
                setGstNumber(party.gst_number || "");
                setOpeningBalance(String((party as any).opening_balance || 0));
                setOpeningBalanceType((party as any).opening_balance_type || (party.type === "vendor" ? "to_pay" : "to_receive"));
            } else {
                setName("");
                setType("customer");
                setPhone("");
                setEmail("");
                setAddress("");
                setGstNumber("");
                setOpeningBalance("0");
                setOpeningBalanceType("to_receive");
            }
        }
    }, [open, party, isEditing]);

    const handleTypeChange = (val: "customer" | "vendor" | "both") => {
        setType(val);
        if (!isEditing || !(party as any)?.opening_balance_type) {
            setOpeningBalanceType(val === "vendor" ? "to_pay" : "to_receive");
        }
    };

    const handleSave = () => {
        if (!name.trim()) return;

        onSave({
            name: name.trim(),
            type,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            gst_number: gstNumber.trim() || null,
            opening_balance: Number(openingBalance) || 0,
            opening_balance_type: openingBalanceType,
        } as any);
        // Do not close dialog here, wait for mutation success
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Party" : "Add New Party"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Modify the details of this business contact." : "Add a new customer or vendor to your directory."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right font-medium">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="Business or Person Name"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right font-medium">Type</Label>
                        <Select value={type} onValueChange={(val: any) => handleTypeChange(val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="vendor">Vendor</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right font-medium">Phone</Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="col-span-3"
                            placeholder="+91 9876543210"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right font-medium">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="contact@business.com"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="address" className="text-right font-medium pt-2">Address</Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="col-span-3"
                            placeholder="123 Commerce St..."
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gst" className="text-right font-medium">GSTIN</Label>
                        <Input
                            id="gst"
                            value={gstNumber}
                            onChange={(e) => setGstNumber(e.target.value)}
                            className="col-span-3 font-mono text-sm"
                            placeholder="22AAAAA0000A1Z5"
                        />
                    </div>

                    {/* Financial Opening Balance: Amount + Receivable (To Receive) vs Payable (To Pay) */}
                    <div className="grid grid-cols-4 items-start gap-4 pt-1">
                        <Label htmlFor="opening_balance" className="text-right font-medium pt-2 text-xs sm:text-sm">
                            Opening Bal
                        </Label>
                        <div className="col-span-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                    <Input
                                        id="opening_balance"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={openingBalance}
                                        onChange={(e) => setOpeningBalance(e.target.value)}
                                        className="pl-6 font-semibold h-9 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <Select value={openingBalanceType} onValueChange={(val: "to_receive" | "to_pay") => setOpeningBalanceType(val)}>
                                    <SelectTrigger className={`w-[135px] h-9 font-bold text-xs shrink-0 ${
                                        openingBalanceType === "to_receive" 
                                            ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" 
                                            : "text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                                    }`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="to_receive" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                <span>To Receive (Dr)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="to_pay" className="text-xs font-bold text-rose-700 dark:text-rose-400">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                <span>To Pay (Cr)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {Number(openingBalance) > 0 && (
                                <p className={`text-[11px] font-medium leading-tight ${
                                    openingBalanceType === "to_receive" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}>
                                    {openingBalanceType === "to_receive" 
                                        ? `Party owes you ₹${Number(openingBalance).toLocaleString('en-IN')} (Receivable)`
                                        : `You owe party ₹${Number(openingBalance).toLocaleString('en-IN')} (Payable)`
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
                        {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Party"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
