import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface WhatsAppDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

export const WhatsAppDisconnectDialog: React.FC<WhatsAppDisconnectDialogProps> = ({
  open,
  onOpenChange,
  onDisconnect,
  isDisconnecting,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Disconnect WhatsApp?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to unlink your WhatsApp device? Automated and manual invoice
            dispatch via WhatsApp will stop working until you reconnect.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Keep Connected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="text-xs font-semibold gap-1.5"
          >
            {isDisconnecting ? "Disconnecting..." : "Yes, Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
