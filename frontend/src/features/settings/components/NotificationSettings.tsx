import { useState, useEffect } from "react";
import { supabase } from "@/core/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, Check, BellRing } from "lucide-react";
import { toast } from "sonner";

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
  phone: string;
  dnd_start: string;
  dnd_end: string;
  [key: string]: boolean | string;
}

const DEFAULT_SETTINGS: Settings = {
  master: true,
  phone: "",
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

  const [wsConnected, setWsConnected] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrTimestamp, setQrTimestamp] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Clean up Object URL when component unmounts or qrCodeUrl changes
  useEffect(() => {
    return () => {
      if (qrCodeUrl && qrCodeUrl.startsWith("blob:")) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [qrCodeUrl]);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWsConnected(!!data.authenticated);
        if (data.authenticated) {
          setShowQr(false);
        }
      }
    } catch (err) {
      console.error("Failed to check status", err);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQr = async () => {
    setQrLoading(true);
    setQrError("");
    setShowQr(true);
    setQrTimestamp(Date.now());
    
    try {
      const res = await fetch(`/api/v1/whatsapp/qr?t=${Date.now()}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.authenticated) {
            setWsConnected(true);
            setShowQr(false);
            toast.success("WhatsApp is already connected!");
          }
        } else {
          // Response is PNG bytes, convert to blob URL
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setQrCodeUrl(url);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setQrError(data.detail || "Failed to load QR code.");
      }
    } catch (err) {
      setQrError("Failed to fetch QR code.");
    } finally {
      setQrLoading(false);
    }
  };

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
          <MessageSquare className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">WhatsApp Notifications</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Configure automated billing updates sent directly to customers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-6">
        {/* WhatsApp Connection Status Card */}
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                WhatsApp Link Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Connect your WhatsApp account to enable automated messaging.
              </p>
            </div>
            {wsConnected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                Disconnected
              </span>
            )}
          </div>

          {!wsConnected && (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-6 bg-accent/10 space-y-4">
              {showQr ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-2 bg-white rounded-lg border">
                    {qrError ? (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-center text-xs text-destructive p-4">
                        <p>{qrError}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 text-[10px]"
                          onClick={fetchQr}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : qrLoading ? (
                      <div className="w-48 h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <img 
                        src={qrCodeUrl} 
                        alt="WhatsApp QR Code" 
                        className="w-48 h-48 object-contain"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                    Scan this QR code using WhatsApp on your phone (Linked Devices &gt; Link a Device) to link your account.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowQr(false)} 
                      className="text-xs h-7"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchQr} 
                      className="text-xs h-7"
                    >
                      Refresh QR
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To start sending messages, scan the QR code using your WhatsApp app.
                  </p>
                  <Button 
                    onClick={fetchQr}
                    size="sm"
                    className="text-xs"
                  >
                    Link WhatsApp Account
                  </Button>
                </div>
              )}
            </div>
          )}
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
            Invoice messages are sent to the customer phone number saved on each invoice. Include the country code when creating invoices.
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

        {/* DND Quiet Hours */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Do Not Disturb (Quiet Hours)
          </h4>
          <div className="flex items-center justify-between p-3 rounded-lg border text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-xs">DND Active Period</p>
              <p className="text-[10px] text-muted-foreground">No alerts will be sent during this window</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={settings.dnd_start}
                onValueChange={(val) => setSettings((p) => ({ ...p, dnd_start: val }))}
                disabled={!settings.master}
              >
                <SelectTrigger className="h-7 text-xs w-[76px] bg-background">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {["20:00", "21:00", "22:00", "23:00"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-[10px]">to</span>
              <Select
                value={settings.dnd_end}
                onValueChange={(val) => setSettings((p) => ({ ...p, dnd_end: val }))}
                disabled={!settings.master}
              >
                <SelectTrigger className="h-7 text-xs w-[76px] bg-background">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {["07:00", "08:00", "09:00", "10:00"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

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
