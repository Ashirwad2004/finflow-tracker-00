import React from "react";
import { FileText, Download } from "lucide-react";

export const HeroWhatsAppMockup: React.FC = () => {
  return (
    <div className="max-w-md mx-auto rounded-3xl border-4 border-slate-800 bg-[#0b141a] text-slate-100 shadow-2xl overflow-hidden transition-all animate-in fade-in duration-200">
      {/* Android Phone Top Status */}
      <div className="bg-[#202c33] px-4 py-2 flex justify-between items-center text-[10px] text-slate-300 font-mono">
        <span>05:42 PM</span>
        <span className="flex items-center gap-1.5">
          <span>5G 📶</span>
          <span>🔋 94%</span>
        </span>
      </div>

      {/* WhatsApp Chat Bar */}
      <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
            SG
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>Shree Ganesh Supermarket</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] flex items-center justify-center text-white">
                ✓
              </span>
            </div>
            <div className="text-[10px] text-emerald-400">
              Verified WhatsApp Business Account
            </div>
          </div>
        </div>
      </div>

      {/* Chat Message Bubble */}
      <div className="p-4 space-y-3 bg-[#0b141a] min-h-[380px] flex flex-col justify-end">
        <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-sm max-w-[95%] space-y-2.5 shadow-md">
          <p className="text-xs leading-relaxed">
            Namaste <strong>Ramesh ji</strong>! 🙏 Thank you for shopping at Shree
            Ganesh Supermarket. Here is your digital tax invoice:
          </p>

          {/* PDF File Tile */}
          <div className="bg-[#025144] p-3 rounded-lg flex items-center justify-between border border-emerald-600/40">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">
                  Invoice_INV-1048.pdf
                </div>
                <div className="text-[10px] text-slate-300">
                  142 KB • GST Tax Invoice
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-emerald-300" />
          </div>

          <div className="text-xs text-emerald-200 pt-1 border-t border-emerald-600/40 flex justify-between items-center">
            <span>Grand Total:</span>
            <span className="text-base font-black text-white">₹1,410.00</span>
          </div>

          {/* WhatsApp Interactive UPI Link Button */}
          <div className="pt-1">
            <div className="w-full py-2 bg-[#202c33] text-emerald-400 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700">
              <span>Pay via UPI (GPay / PhonePe / Paytm)</span>
            </div>
          </div>

          <div className="text-[9px] text-slate-300 text-right">05:42 PM ✓✓</div>
        </div>
      </div>
    </div>
  );
};
