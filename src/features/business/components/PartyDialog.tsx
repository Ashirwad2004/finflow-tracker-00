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

    useEffect(() => {
        if (open) {
            if (party && isEditing) {
                setName(party.name || "");
                setType(party.type || "customer");
                setPhone(party.phone || "");
                setEmail(party.email || "");
                setAddress(party.address || "");
                setGstNumber(party.gst_number || "");
            } else {
                setName("");
                setType("customer");
                setPhone("");
                setEmail("");
                setAddress("");
                setGstNumber("");
            }
        }
    }, [open, party, isEditing]);

    const handleSave = () => {
        if (!name.trim()) return;

        onSave({
            name: name.trim(),
            type,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            gst_number: gstNumber.trim() || null,
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
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
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
