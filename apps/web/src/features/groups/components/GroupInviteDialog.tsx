import React from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode?: string;
  copied: boolean;
  onCopy: () => void;
}

export function GroupInviteDialog({
  open,
  onOpenChange,
  inviteCode,
  copied,
  onCopy,
}: GroupInviteDialogProps) {
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode || ""}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={inviteUrl} readOnly />
          <Button onClick={onCopy} aria-label={copied ? "Copied" : "Copy invite link"}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
