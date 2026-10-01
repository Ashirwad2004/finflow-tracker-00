import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Flashlight, RefreshCw, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CameraScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  open,
  onOpenChange,
  onScan,
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "pos-camera-scanner-viewport";

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    setErrorMsg(null);
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 4)}` }));
          setCameras(list);
          // Prefer back-facing camera
          const backCam = list.find((c) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment"));
          setSelectedCameraId(backCam ? backCam.id : list[0].id);
        } else {
          setErrorMsg("No camera devices detected on this device.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[CameraScanner] Camera permission or enumeration error:", err);
        setErrorMsg("Camera permission denied or camera unavailable. Please grant camera access in browser settings.");
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [open]);

  useEffect(() => {
    if (open && selectedCameraId) {
      startScanner(selectedCameraId);
    }
  }, [open, selectedCameraId]);

  const startScanner = async (cameraId: string) => {
    await stopScanner();

    try {
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          if (decodedText) {
            // Beep tone
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.value = 1800;
              osc.type = "sine";
              gain.gain.value = 0.15;
              osc.start();
              setTimeout(() => {
                osc.stop();
                audioCtx.close();
              }, 90);
            } catch {
              // Audio context not allowed or unsupported
            }

            toast.success(`Scanned: ${decodedText}`);
            onScan(decodedText);
            onOpenChange(false);
          }
        },
        () => {
          // Frame rejected (no barcode found in frame)
        }
      );

      setIsScanning(true);

      // Check torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ((capabilities as any)?.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn("[CameraScanner] Failed to start camera:", err);
      setErrorMsg(err?.message || "Failed to start camera feed. Please check device permissions.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn("[CameraScanner] Error stopping scanner:", e);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }] as any,
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIdx = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIdx].id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card text-foreground border-border rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Scan Barcode</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Align the product barcode within the viewfinder
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px]">
          {errorMsg ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-foreground max-w-xs">{errorMsg}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                className="border-border text-foreground hover:bg-muted font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Camera
              </Button>
            </div>
          ) : (
            <div className="w-full relative">
              <div id={containerId} className="w-full h-full min-h-[280px]" />
              {/* Overlay styling for viewfinder */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-primary/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary" />
                  <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action controls */}
        <div className="p-3.5 bg-muted/20 border-t border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Switch Camera
              </Button>
            )}
            {hasTorch && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTorch}
                className={`h-8 text-xs border-border ${
                  torchOn ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50" : "text-foreground hover:bg-muted"
                }`}
              >
                <Flashlight className="w-3.5 h-3.5 mr-1.5" /> {torchOn ? "Torch On" : "Torch Off"}
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
