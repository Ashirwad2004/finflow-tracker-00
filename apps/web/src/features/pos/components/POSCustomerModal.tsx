import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

interface POSCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  onApplyCustomer: (name: string, phone: string) => void;
}

export const POSCustomerModal: React.FC<POSCustomerModalProps> = ({
  open,
  onOpenChange,
  customerName,
  customerPhone,
  onApplyCustomer,
}) => {
  const [tempName, setTempName] = useState(customerName);
  const [tempPhone, setTempPhone] = useState(customerPhone);

  useEffect(() => {
    if (open) {
      setTempName(customerName);
      setTempPhone(customerPhone);
    }
  }, [open, customerName, customerPhone]);

  const handleApply = () => {
    onApplyCustomer(
      tempName.trim() || "Walk-in Customer",
      tempPhone.trim()
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Customer Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Customer Name
            </Label>
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Walk-in Customer"
              className="bg-card border-border text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Mobile / WhatsApp Number
            </Label>
            <Input
              value={tempPhone}
              onChange={(e) => setTempPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="bg-card border-border text-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Apply Customer (F2)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
