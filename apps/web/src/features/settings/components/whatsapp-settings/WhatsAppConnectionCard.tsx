import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Loader2,
  RefreshCw,
  LogOut,
  Send,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";

interface WhatsAppConnectionCardProps {
  currentStatus: string;
  statusLoading: boolean;
  rawQr?: string | null;
  qrLoading: boolean;
  connStatus: any;
  connectPending: boolean;
  onConnect: () => void;
  onDisconnectClick: () => void;
  onOpenTestModal: () => void;
  onRefetchQR: () => void;
  onRefetchStatus: () => void;
  onCancelConnecting: () => void;
}

export const WhatsAppConnectionCard: React.FC<WhatsAppConnectionCardProps> = ({
  currentStatus,
  statusLoading,
  rawQr,
  qrLoading,
  connStatus,
  connectPending,
  onConnect,
  onDisconnectClick,
  onOpenTestModal,
  onRefetchQR,
  onRefetchStatus,
  onCancelConnecting,
}) => {
  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageCircle className="w-5 h-5 fill-emerald-500/20" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                WhatsApp Business Gateway
                {currentStatus === "connected" && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Connect your business WhatsApp through self-hosted OpenWA gateway for direct billing communication.
              </CardDescription>
            </div>
          </div>

          {/* Status Indicator Badge */}
          <div>
            {statusLoading ? (
              <Badge variant="outline" className="text-xs gap-1.5 py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking...
              </Badge>
            ) : currentStatus === "connected" ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1.5 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp Connected
              </Badge>
            ) : currentStatus === "qr_required" ? (
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-semibold gap-1.5 py-1 animate-pulse">
                <QrCode className="w-3.5 h-3.5" /> Scan QR Code
              </Badge>
            ) : currentStatus === "connecting" ? (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold gap-1.5 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...
              </Badge>
            ) : currentStatus === "error" ? (
              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-xs font-semibold gap-1.5 py-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Connection Error
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 border-slate-300 text-xs py-1">
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* STATE 1: DISCONNECTED */}
        {currentStatus === "disconnected" && !rawQr && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Why connect WhatsApp to FinFlow?
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Send invoices & PDF receipts instantly on billing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Automated payment reminders for pending party balances</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Zero per-message fees via your self-hosted OpenWA gateway</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Complete customer delivery audit trail</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" /> Ready to link device
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Click below to generate a secure QR code. Open WhatsApp on your business phone,
                    navigate to <span className="font-semibold text-slate-800 dark:text-slate-200">Linked Devices</span>, and scan.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={onConnect}
                    disabled={connectPending}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-sm"
                  >
                    {connectPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initializing OpenWA...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        Connect WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: CONNECTING / GENERATING QR */}
        {currentStatus === "connecting" && !rawQr && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Connecting to WhatsApp Gateway...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Starting your store session on the OpenWA server and preparing authentication QR code.
              </p>
            </div>
          </div>
        )}

        {/* STATE 3: QR CODE REQUIRED */}
        {(currentStatus === "qr_required" ||
          (Boolean(rawQr) && currentStatus !== "connected")) && (
          <div className="flex flex-col md:flex-row items-center gap-8 py-4">
            <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              {rawQr ? (
                rawQr.startsWith("data:image") ? (
                  <img src={rawQr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
                ) : (
                  <div className="p-3 bg-white rounded-lg">
                    <QRCodeSVG value={rawQr} size={220} level="M" />
                  </div>
                )
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">Fetching QR code...</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Waiting for phone to scan...
              </p>
            </div>

            <div className="flex-1 space-y-4 text-left">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Scan QR Code from WhatsApp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Follow these simple steps on your business phone:
                </p>
              </div>

              <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  Open WhatsApp on your phone
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  Tap <span className="font-semibold text-slate-900 dark:text-white">Settings</span> (or three dots) →{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">Linked Devices</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  Tap <span className="font-semibold text-slate-900 dark:text-white">Link a Device</span> and point camera at the QR code
                </li>
              </ol>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onRefetchQR();
                    onRefetchStatus();
                  }}
                  disabled={qrLoading}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? "animate-spin" : ""}`} />
                  Refresh QR Code
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelConnecting}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: CONNECTED */}
        {currentStatus === "connected" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Connected Number
                </p>
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {connStatus?.phone_number || "Verified WhatsApp Device"}
                </p>
                {connStatus?.display_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{connStatus.display_name}</p>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Gateway Provider
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  OpenWA Gateway
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0">
                    Self-Hosted
                  </Badge>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Session: {connStatus?.provider_session_id}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Connected Since
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {connStatus?.last_connected_at
                    ? format(new Date(connStatus.last_connected_at), "dd MMM yyyy, hh:mm a")
                    : "Active"}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  🟢 Ready to send messages
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={onOpenTestModal}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Test Message
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnectClick}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect WhatsApp
              </Button>
            </div>
          </div>
        )}

        {/* STATE 5: ERROR */}
        {currentStatus === "error" && (
          <div className="p-6 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-500/5 dark:bg-red-950/20 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                  Unable to connect to WhatsApp Gateway
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {connStatus?.error_message ||
                    "FinFlow could not communicate with the OpenWA server. Please ensure the OpenWA service is running at OPENWA_BASE_URL."}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={onConnect}
                disabled={connectPending}
                size="sm"
                variant="outline"
                className="text-xs font-semibold gap-1.5 border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-950/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
