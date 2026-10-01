import { useState, useEffect } from "react";
import { supabase } from "@/core/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellRing, Loader2, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NOTIFICATIONS = [
  { key: "invoice_created",        label: "Invoice created",        desc: "Sent when a new invoice is generated",          section: "Invoice" },
  { key: "invoice_due_soon",       label: "Payment due soon",       desc: "Reminder before payment deadline",              section: "Invoice" },
  { key: "invoice_overdue",        label: "Payment overdue",        desc: "Alert when payment is past due date",           section: "Invoice" },
  { key: "payment_received",       label: "Payment received",       desc: "Confirmation when payment is successful",       section: "Payment" },
  { key: "payment_failed",         label: "Payment failed",         desc: "Alert with retry link when payment fails",      section: "Payment" },
  { key: "refund_issued",          label: "Refund issued",          desc: "Notify when a refund has been processed",       section: "Payment" },
  { key: "subscription_expiring",  label: "Subscription expiring",  desc: "Reminder before subscription ends",            section: "Subscription" },
  { key: "subscription_renewed",   label: "Subscription renewed",   desc: "Confirm when subscription auto-renews",        section: "Subscription" },
  { key: "subscription_cancelled", label: "Subscription cancelled", desc: "Alert when a subscription is cancelled",       section: "Subscription" },
];

interface Settings {
  master: boolean;
  email: string;
  dnd_start: string;
  dnd_end: string;
  [key: string]: boolean | string;
}

const DEFAULT_SETTINGS: Settings = {
  master: true,
  email: "",
  dnd_start: "21:00",
  dnd_end: "09:00",
  invoice_created: true,
  invoice_due_soon: true,
  invoice_overdue: true,
  payment_received: true,
  payment_failed: true,
  refund_issued: false,
  subscription_expiring: true,
  subscription_renewed: false,
  subscription_cancelled: false,
};

export function NotificationSettings({ customerId }: { customerId: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);



  useEffect(() => {
    if (!customerId) return;
    
    (supabase as any)
      .from("notification_settings")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading notification settings:", error);
        } else if (data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        }
        setLoading(false);
      });
  }, [customerId]);

  const toggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await (supabase as any)
        .from("notification_settings")
        .upsert({
          customer_id: customerId,
          ...settings,
        });

      if (error) throw error;

      setSaved(true);
      toast.success("Notification settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const sections = ["Invoice", "Payment", "Subscription"];

  if (loading) {
    return (
      <Card className="rounded-md">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Email Notifications</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Configure automated billing updates sent directly to customers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-6">
        {/* Email Settings Config */}
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-primary" />
              Reply-To Email Address
            </Label>
            <p className="text-xs text-muted-foreground">
              Configure where customer replies will be routed.
            </p>
          </div>
          
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="billing@yourbusiness.com"
              value={settings.email || ""}
              onChange={(e) => setSettings((p) => ({ ...p, email: e.target.value }))}
              disabled={!settings.master}
              className="h-9 text-xs bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Leave blank to use the default system billing email.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/40 border">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-primary" />
              Enable Alerts
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Master switch overrides all options below.
            </p>
          </div>
          <Switch
            checked={settings.master}
            onCheckedChange={() => toggle("master")}
            className="scale-90"
          />
        </div>

        <div className="rounded-lg border bg-accent/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            Invoice emails are sent automatically to the customer's email address specified on each invoice.
          </p>
        </div>

        {/* Event toggles */}
        {sections.map((section) => (
          <div key={section} className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">
              {section} Events
            </h4>
            <div className="space-y-3">
              {NOTIFICATIONS.filter((n) => n.section === section).map((n) => (
                <div key={n.key} className="flex items-start justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">{n.label}</Label>
                    <p className="text-[10px] text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch
                    checked={!!settings[n.key]}
                    onCheckedChange={() => toggle(n.key)}
                    disabled={!settings.master}
                    className="scale-75 origin-top-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 h-9 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Saving Settings...
            </>
          ) : saved ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Saved!
            </>
          ) : (
            "Save Notification Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}