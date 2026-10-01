import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Save } from "lucide-react";
import { useLoanSettings } from "@/core/hooks/use-loan-settings";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";

interface LoanSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoanSettingsDialog = ({ open, onOpenChange }: LoanSettingsDialogProps) => {
  const { user } = useAuth();
  const { settings, updateSetting } = useLoanSettings(user?.id);
  const [defaultDueDateDays, setDefaultDueDateDays] = useState(settings.defaultDueDateDays.toString());

  useEffect(() => {
    if (open) {
      setDefaultDueDateDays(settings.defaultDueDateDays.toString());
    }
  }, [open, settings.defaultDueDateDays]);

  const handleSave = () => {
    const parsed = parseInt(defaultDueDateDays, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid number of days (0 or greater).");
      return;
    }
    updateSetting("defaultDueDateDays", parsed);
    toast.success("Loan settings saved successfully.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Loan Settings
          </DialogTitle>
          <DialogDescription>
            Configure default preferences for lent and borrowed money.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultDueDateDays">Default Due Date (Days)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="defaultDueDateDays"
                type="number"
                min="0"
                value={defaultDueDateDays}
                onChange={(e) => setDefaultDueDateDays(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days from today</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Set to 0 if you do not want a default due date to be applied automatically.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
