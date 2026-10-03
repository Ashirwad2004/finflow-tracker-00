import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, MessageCircle } from "lucide-react";

export interface InvoiceTotalsFooterProps {
  sendWhatsApp: boolean;
  onSendWhatsAppChange: (val: boolean) => void;
  onCancel: () => void;
  onPreview: () => void;
  isPending: boolean;
  isEditing: boolean;
}

export const InvoiceTotalsFooter: React.FC<InvoiceTotalsFooterProps> = ({
  sendWhatsApp,
  onSendWhatsAppChange,
  onCancel,
  onPreview,
  isPending,
  isEditing,
}) => {
  return (
    <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3 sticky bottom-0 z-20 mt-auto rounded-b-md flex-wrap">
      {/* Auto-WhatsApp on Save Toggle */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
        <input
          type="checkbox"
          checked={sendWhatsApp}
          onChange={(e) => onSendWhatsAppChange(e.target.checked)}
          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
        />
        <MessageCircle className="w-4 h-4 text-emerald-600" />
        <span>Send WhatsApp on Save</span>
      </label>

      <div className="flex items-center gap-2.5 ml-auto">
        <Button
          type="button"
          variant="outline"
          className="min-w-[90px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="outline"
          className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
          onClick={onPreview}
        >
          <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
          Preview
        </Button>

        <Button
          type="submit"
          className="min-w-[130px] bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
          disabled={isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? "Update Invoice" : "Save Invoice"}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceTotalsFooter;
