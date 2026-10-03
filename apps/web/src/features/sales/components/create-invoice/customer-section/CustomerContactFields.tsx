import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Phone, Mail } from "lucide-react";

interface CustomerContactFieldsProps {
  customerPhone: string;
  customerEmail: string;
  onCustomerPhoneChange: (val: string) => void;
  onCustomerEmailChange: (val: string) => void;
}

export function CustomerContactFields({
  customerPhone,
  customerEmail,
  onCustomerPhoneChange,
  onCustomerEmailChange,
}: CustomerContactFieldsProps) {
  return (
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
  );
}
