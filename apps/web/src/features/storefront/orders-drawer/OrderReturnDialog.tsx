import React from "react";
import { ArrowRightLeft, Camera, Upload, Image, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface OrderReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnReason: string;
  setReturnReason: (reason: string) => void;
  returnPreview: string | null;
  setReturnFile: (file: File | null) => void;
  setReturnPreview: (preview: string | null) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const OrderReturnDialog: React.FC<OrderReturnDialogProps> = ({
  open,
  onOpenChange,
  returnReason,
  setReturnReason,
  returnPreview,
  setReturnFile,
  setReturnPreview,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            Request Order Return
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Please describe why you are returning this product and upload a photo of the product as proof.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider block">
              Reason for Return
            </label>
            <textarea
              id="return_reason"
              name="return_reason"
              placeholder="E.g., Product arrived damaged, wrong size, or parts missing."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full min-h-[80px] rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider block">
              Photo Proof (Required)
            </label>
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="return-image-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setReturnFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setReturnPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {!returnPreview ? (
                <div
                  onClick={() => document.getElementById("return-image-input")?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/30"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-700 block">Take Photo or Upload</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center group">
                  <img src={returnPreview} alt="Preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById("return-image-input")?.click()}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Upload className="w-3.5 h-3.5" /> Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnFile(null);
                        setReturnPreview(null);
                      }}
                      className="p-1.5 bg-rose-500 text-white rounded-lg shadow hover:bg-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !returnReason.trim() || !returnPreview}
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
