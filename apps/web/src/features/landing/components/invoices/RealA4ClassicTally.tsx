import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShekharSignature } from "./ShekharSignature";

export const RealA4ClassicTally: React.FC = () => {
  const upiUri = "upi://pay?pa=8102545007@ybl&pn=Satyam%20Hardware%20%26%20material&am=3411.92&cu=INR&tn=INV-00202609218";

  return (
    <div className="bg-white text-black border-2 border-black font-sans text-xs w-full max-w-[680px] shadow-2xl rounded-sm select-none overflow-hidden transition-all duration-300">
      {/* 1. Centered Title Box */}
      <div className="border-b border-black text-center py-1.5 font-black text-xs sm:text-sm uppercase tracking-widest text-black">
        TAX INVOICE
      </div>

      {/* 2. Upper Split Quadrant: Sender vs Invoice Metadata */}
      <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
        {/* Left Column: Sender Details */}
        <div className="p-3 border-r border-black space-y-0.5">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
            Sender / Company Details:
          </span>
          <h3 className="font-black text-sm text-black tracking-tight leading-snug">
            Satyam Hardware &amp; material
          </h3>
          <p className="text-slate-800 text-[10px]">jmm</p>
          <p className="text-slate-800 text-[10px]">Phone: 7011988701</p>
          <p className="text-black font-semibold text-[10px]">
            GSTIN/UIN: <span className="font-mono font-bold">09AAACH7409R1ZZ</span>
          </p>
        </div>

        {/* Right Column: Invoice Metadata */}
        <div className="p-3 space-y-1.5 text-[10px]">
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-600">Invoice No:</span>
            <span className="font-black font-mono text-xs text-black">INV-00202609218</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-600">Dated:</span>
            <span className="font-bold text-black">29 Sep 2026</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-600">Delivery Note / Due:</span>
            <span className="font-medium text-slate-800">Direct Delivery</span>
          </div>
          <div className="flex justify-between items-baseline pt-0.5">
            <span className="font-medium text-slate-600">Mode/Terms:</span>
            <span className="font-black uppercase tracking-wider text-rose-600">
              PENDING
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Split Quadrant: Buyer (Bill to) vs Consignee (Ship to) */}
      <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
        <div className="p-3 border-r border-black">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
            Buyer (Bill to):
          </span>
          <p className="font-bold text-xs text-black mt-1">test pending balance</p>
        </div>
        <div className="p-3">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
            Consignee (Ship to):
          </span>
          <p className="font-bold text-xs text-black mt-1">test pending balance</p>
          <p className="text-[9.5px] text-slate-500 italic mt-0.5">Same as billing address</p>
        </div>
      </div>

      {/* 4. Table with continuous vertical grid lines */}
      <div className="border-b border-black">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b border-black font-bold text-black bg-slate-50">
              <th className="border-r border-black p-1.5 w-10 text-center">S.No</th>
              <th className="border-r border-black p-1.5 min-w-[140px]">Description of Goods</th>
              <th className="border-r border-black p-1.5 w-12 text-center">Qty</th>
              <th className="border-r border-black p-1.5 w-20 text-right pr-2">Rate</th>
              <th className="border-r border-black p-1.5 w-14 text-center">per</th>
              <th className="p-1.5 w-24 text-right pr-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 font-medium">
            <tr>
              <td className="border-r border-black p-1.5 text-center">1</td>
              <td className="border-r border-black p-1.5 font-bold text-black">11111</td>
              <td className="border-r border-black p-1.5 text-center font-bold">1</td>
              <td className="border-r border-black p-1.5 text-right pr-2">80.00</td>
              <td className="border-r border-black p-1.5 text-center text-slate-700">pc</td>
              <td className="p-1.5 text-right pr-3 font-bold">80.00</td>
            </tr>
            <tr>
              <td className="border-r border-black p-1.5 text-center">2</td>
              <td className="border-r border-black p-1.5 font-bold text-black">343</td>
              <td className="border-r border-black p-1.5 text-center font-bold">1</td>
              <td className="border-r border-black p-1.5 text-right pr-2">2,222.00</td>
              <td className="border-r border-black p-1.5 text-center text-slate-700">pc</td>
              <td className="p-1.5 text-right pr-3 font-bold">2,222.00</td>
            </tr>
            <tr>
              <td className="border-r border-black p-1.5 text-center">3</td>
              <td className="border-r border-black p-1.5 font-bold text-black">4343434</td>
              <td className="border-r border-black p-1.5 text-center font-bold">1</td>
              <td className="border-r border-black p-1.5 text-right pr-2">1,109.92</td>
              <td className="border-r border-black p-1.5 text-center text-slate-700">pc</td>
              <td className="p-1.5 text-right pr-3 font-bold">1,109.92</td>
            </tr>
            {/* Authentic Tally vertical continuation space */}
            <tr className="h-16 text-transparent select-none">
              <td className="border-r border-black p-1.5">.</td>
              <td className="border-r border-black p-1.5">.</td>
              <td className="border-r border-black p-1.5">.</td>
              <td className="border-r border-black p-1.5">.</td>
              <td className="border-r border-black p-1.5">.</td>
              <td className="p-1.5">.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Lower Section: Words, UPI QR, Calculations & Signatures */}
      <div className="grid grid-cols-12 text-[10px]">
        {/* Left Column: Words, UPI block & Declaration */}
        <div className="col-span-7 border-r border-black p-3 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase">
              Amount Chargeable (in words):
            </span>
            <strong className="block font-black text-[11px] text-black mt-0.5 leading-snug">
              INR Three Thousand Four Hundred Eleven Rupees and Ninety Two Paise Only
            </strong>
          </div>

          {/* Instant UPI Payment Box */}
          <div className="border border-black p-2.5 rounded bg-slate-50/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-black text-[9.5px] uppercase tracking-wider block text-black">
                Instant Payment via UPI:
              </span>
              <p className="text-[9px] text-slate-800">
                UPI ID / VPA : <strong className="font-mono text-black">8102545007@ybl</strong>
              </p>
              <p className="text-[9px] text-slate-800">
                Payee Name : <span className="font-medium">Satyam Hardware &amp; material</span>
              </p>
              <p className="text-[9px] text-slate-800">
                Amount : <strong className="text-black">Rs. 3,411.92</strong>
              </p>
            </div>
            <div className="flex flex-col items-center pl-2">
              <div className="p-1 bg-white border border-black rounded">
                <QRCodeSVG value={upiUri} size={48} level="M" />
              </div>
              <span className="text-[7.5px] font-black uppercase text-slate-800 mt-0.5 tracking-tight">
                SCAN TO PAY (UPI)
              </span>
            </div>
          </div>

          <div>
            <span className="font-bold text-[9px] block text-black uppercase">Declaration:</span>
            <p className="text-[8px] text-slate-600 leading-tight">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
          </div>

          <div className="pt-2 text-[9px] text-slate-500">
            <span>Customer&apos;s Seal and Signature</span>
          </div>
        </div>

        {/* Right Column: Ledger Totals & Signatory */}
        <div className="col-span-5 flex flex-col justify-between">
          <div className="p-3 space-y-1.5 text-[10.5px]">
            <div className="flex justify-between py-0.5">
              <span className="font-semibold text-slate-700">Subtotal:</span>
              <span className="font-bold text-black">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-1 border-y-2 border-black">
              <span className="font-black text-sm text-black">Grand Total:</span>
              <span className="font-black text-sm text-black">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Amount Paid:</span>
              <span className="font-semibold text-black">Rs. 0.00</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="font-bold text-slate-800">Balance Due:</span>
              <span className="font-black text-rose-600">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600 border-t border-black/10 pt-1">
              <span>Previous Pending (Dr):</span>
              <span className="font-medium">Rs. 0.00</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="font-bold text-slate-900">Current Pending Balance:</span>
              <span className="font-black text-rose-600">Rs. 3,411.92 Dr</span>
            </div>
          </div>

          {/* Signatory Area */}
          <div className="p-3 border-t border-black text-center flex flex-col items-center bg-slate-50/20">
            <span className="text-[8.5px] font-black uppercase text-black block tracking-wider">
              for SATYAM HARDWARE &amp; MATERIAL
            </span>
            <ShekharSignature className="h-10 w-28 my-1 text-slate-900" />
            <div className="w-28 border-t border-black pt-0.5">
              <span className="text-[8.5px] font-bold text-slate-700 uppercase block tracking-tight">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
