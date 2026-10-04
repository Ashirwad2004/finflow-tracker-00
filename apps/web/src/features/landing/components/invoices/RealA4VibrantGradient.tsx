import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShekharSignature } from "./ShekharSignature";
import { RipeMediaLogo } from "./RipeMediaLogo";

export const RealA4VibrantGradient: React.FC = () => {
  const upiUri = "upi://pay?pa=8102545007@ybl&pn=Satyam%20Hardware%20%26%20material&am=3411.92&cu=INR&tn=INV-00202609218";

  return (
    <div className="bg-white text-slate-900 border border-slate-200 font-sans text-xs w-full max-w-[680px] shadow-2xl rounded-sm select-none overflow-hidden transition-all duration-300">
      {/* 1. Vibrant Purple & Magenta Gradient Header */}
      <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#c026d3] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Brand Logo & Company Info */}
        <div className="flex items-center gap-3.5">
          <RipeMediaLogo />
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              Satyam Hardware &amp; material
            </h2>
            <p className="text-xs text-white/90 font-medium">jmm</p>
            <p className="text-[11px] text-white/80 font-medium mt-0.5">
              Phone: 7011988701 <span className="mx-1">|</span> GSTIN: <span className="font-mono font-bold">09AAACH7409R1ZZ</span>
            </p>
          </div>
        </div>

        {/* Right: Tax Invoice Title & Metadata */}
        <div className="text-left sm:text-right space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white drop-shadow-xs">
            TAX INVOICE
          </h1>
          <p className="text-xs text-white/90 font-medium">
            Invoice No <span className="font-mono font-bold">INV-00202609218</span>
          </p>
          <p className="text-xs text-white/90 font-medium">
            Dated: <span className="font-semibold">29 Sep 2026</span>
          </p>
          <div className="pt-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f43f5e] bg-white/15 px-2.5 py-0.5 rounded-full inline-block border border-white/20">
              STATUS: PENDING
            </span>
          </div>
        </div>
      </div>

      {/* 2. Buyer (Bill To) Section */}
      <div className="p-5 pb-3">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider border-b-2 border-[#4f46e5] pb-0.5 inline-block">
          BUYER (BILL TO)
        </span>
        <h3 className="text-sm font-bold text-slate-900 mt-1.5 tracking-tight">
          test pending balance
        </h3>
      </div>

      {/* 3. Deep Indigo Table */}
      <div className="px-5">
        <table className="w-full text-xs text-left border-collapse overflow-hidden rounded-t-lg">
          <thead>
            <tr className="bg-[#4338ca] text-white font-bold">
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3 text-right w-28">Price</th>
              <th className="py-2.5 px-3 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-900">11111</td>
              <td className="py-3 px-3 text-center font-bold">1</td>
              <td className="py-3 px-3 text-right text-slate-700">Rs. 80.00</td>
              <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. 80.00</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-900">343</td>
              <td className="py-3 px-3 text-center font-bold">1</td>
              <td className="py-3 px-3 text-right text-slate-700">Rs. 2,222.00</td>
              <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. 2,222.00</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-900">4343434</td>
              <td className="py-3 px-3 text-center font-bold">1</td>
              <td className="py-3 px-3 text-right text-slate-700">Rs. 1,109.92</td>
              <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. 1,109.92</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Lower UPI QR & Colored Summary Pills */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-6">
        {/* Left: Scan & Pay via UPI */}
        <div className="sm:col-span-6 flex items-start gap-3.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
          <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs shrink-0">
            <QRCodeSVG value={upiUri} size={64} level="M" />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-xs font-bold text-[#4338ca] block">
              Scan &amp; Pay via UPI
            </span>
            <span className="text-[9.5px] text-slate-500 block font-medium">
              GPay • PhonePe • Paytm • BHIM
            </span>
            <span className="text-[10.5px] font-mono font-bold text-slate-900 block pt-0.5">
              UPI: 8102545007@ybl
            </span>
            <span className="text-[10px] text-slate-600 block">
              Amount: <strong className="text-slate-900">Rs. 3,411.92</strong>
            </span>
          </div>
        </div>

        {/* Right: Rounded Colored Pills Summary */}
        <div className="sm:col-span-6 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600 px-2">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-900">Rs. 3,411.92</span>
          </div>

          {/* Grand Total Pill (Pink Border) */}
          <div className="flex justify-between items-center px-3.5 py-1.5 rounded-xl border-2 border-pink-400 bg-pink-50/20 text-pink-600 font-bold">
            <span className="font-extrabold text-[12.5px]">Grand Total:</span>
            <span className="font-extrabold text-[12.5px]">Rs. 3,411.92</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 px-2 text-[11px]">
            <span>Amount Paid:</span>
            <span className="font-bold text-emerald-600">Rs. 0.00</span>
          </div>

          {/* Balance Due Pill (Red Border) */}
          <div className="flex justify-between items-center px-3.5 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-50/20 text-rose-600 font-bold">
            <span className="font-extrabold text-[12px]">Balance Due (Pending):</span>
            <span className="font-extrabold text-[12px]">Rs. 3,411.92</span>
          </div>

          <div className="flex justify-between items-center text-slate-500 px-2 text-[11px]">
            <span>Previous Pending (Dr):</span>
            <span className="font-medium">Rs. 0.00</span>
          </div>

          {/* Current Pending Balance Pill (Deep Red Border) */}
          <div className="flex justify-between items-center px-3.5 py-1.5 rounded-xl border-2 border-rose-600 text-rose-600 font-bold bg-white">
            <span className="font-extrabold text-[12px]">Current Pending Balance:</span>
            <span className="font-extrabold text-[12px]">Rs. 3,411.92 Dr</span>
          </div>
        </div>
      </div>

      {/* 5. Footer: Authorized Signatory & Legal Declaration */}
      <div className="px-5 pb-5 pt-2 flex flex-col items-end">
        <div className="text-center w-36">
          <ShekharSignature className="h-10 w-28 mx-auto text-slate-900" />
          <div className="w-full border-t border-slate-900 pt-0.5">
            <span className="text-[9px] font-bold text-slate-800 uppercase block tracking-tight">
              Authorized Signatory
            </span>
          </div>
        </div>

        <div className="w-full text-center pt-4 border-t border-slate-100 mt-3">
          <p className="text-[9px] text-slate-500 italic">
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          </p>
        </div>
      </div>
    </div>
  );
};
