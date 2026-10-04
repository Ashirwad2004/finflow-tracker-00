import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShekharSignature } from "./ShekharSignature";

export const RealA4ModernBlue: React.FC = () => {
  const upiUri = "upi://pay?pa=8102545007@ybl&pn=Satyam%20Hardware%20%26%20material&am=3411.92&cu=INR&tn=INV-00202609218";

  return (
    <div className="bg-white text-slate-900 border-2 border-black font-sans text-xs w-full max-w-[680px] shadow-2xl rounded-sm select-none overflow-hidden transition-all duration-300">
      {/* 1. Company Information Header */}
      <div className="p-3.5 border-b border-black text-[11px] leading-snug">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-xs text-black">Company Name:</span>
          <span className="font-extrabold text-sm text-black tracking-wide">
            Satyam Hardware &amp; material
          </span>
        </div>
        <div className="pt-0.5">
          <span className="font-bold text-black">Address:</span>{" "}
          <span className="font-medium text-slate-800">jmm</span>
        </div>
        <div className="grid grid-cols-2 pt-0.5">
          <div>
            <span className="font-bold text-black">Phone No.:</span>{" "}
            <span className="font-medium text-slate-800">7011988701</span>
          </div>
          <div>
            <span className="font-bold text-black">Email ID:</span>{" "}
            <span className="text-slate-600">-</span>
          </div>
        </div>
        <div className="grid grid-cols-2 pt-0.5">
          <div>
            <span className="font-bold text-black">GSTIN No.:</span>{" "}
            <span className="font-bold font-mono text-black">09AAACH7409R1ZZ</span>
          </div>
          <div>
            <span className="font-bold text-black">State:</span>{" "}
            <span className="font-medium text-slate-800">State</span>
          </div>
        </div>
      </div>

      {/* 2. Light Blue Ribbon: TAX INVOICE */}
      <div className="bg-[#b8dbfd] border-b border-black text-center py-1.5 font-black text-xs sm:text-sm tracking-wider uppercase text-black">
        TAX INVOICE
      </div>

      {/* 3. Bill Details & Invoice Details Split Box */}
      <div className="grid grid-cols-12 border-b border-black text-[10px]">
        {/* Left 7 cols: Bill Details */}
        <div className="col-span-7 p-2.5 border-r border-black space-y-1">
          <span className="font-black text-[11px] block text-black">Bill Details</span>
          <div>
            <span className="font-bold text-black">Party Name:</span>{" "}
            <span className="font-bold text-black">test pending balance</span>
          </div>
          <div>
            <span className="font-bold text-black">Address:</span>{" "}
            <span className="text-slate-600">-</span>
          </div>
          <div className="grid grid-cols-2 pt-0.5">
            <div>
              <span className="font-bold text-black">Phone No.:</span>{" "}
              <span className="text-slate-600">-</span>
            </div>
            <div>
              <span className="font-bold text-black">Email ID:</span>{" "}
              <span className="text-slate-600">-</span>
            </div>
          </div>
          <div className="grid grid-cols-2 pt-0.5">
            <div>
              <span className="font-bold text-black">GSTIN No.:</span>{" "}
              <span className="text-slate-600">-</span>
            </div>
            <div>
              <span className="font-bold text-black">State:</span>{" "}
              <span className="font-medium text-slate-800">State</span>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Invoice Details */}
        <div className="col-span-5 p-2.5 space-y-1">
          <span className="font-black text-[11px] block text-black">Invoice Details</span>
          <div>
            <span className="font-bold text-black">Invoice No.:</span>{" "}
            <span className="font-bold font-mono text-black">INV-00202609218</span>
          </div>
          <div>
            <span className="font-bold text-black">Invoice Date:</span>{" "}
            <span className="font-medium text-slate-900">29 Sep 2026</span>
          </div>
          <div>
            <span className="font-bold text-black">Time:</span>{" "}
            <span className="font-medium text-slate-800">09:16 AM</span>
          </div>
          <div>
            <span className="font-bold text-black">Place of Supply:</span>{" "}
            <span className="font-medium text-slate-800">State</span>
          </div>
          <div>
            <span className="font-bold text-black">PO Date:</span>{" "}
            <span className="text-slate-600">-</span>
          </div>
        </div>
      </div>

      {/* 4. Complete Itemized Table */}
      <div className="border-b border-black overflow-x-auto">
        <table className="w-full text-[9px] text-center border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-black font-bold text-black">
              <th className="border-r border-black p-1 w-7">Sl.<br/>No.</th>
              <th className="border-r border-black p-1 text-left min-w-[90px]">Item Name</th>
              <th className="border-r border-black p-1 w-12">HSN/SAC</th>
              <th className="border-r border-black p-1 w-10">Batch<br/>No.</th>
              <th className="border-r border-black p-1 w-10">Exp.<br/>Date</th>
              <th className="border-r border-black p-1 w-12">MRP</th>
              <th className="border-r border-black p-1 w-8">QTY</th>
              <th className="border-r border-black p-1 w-8">Unit</th>
              <th className="border-r border-black p-1 w-14">Price/Unit</th>
              <th className="border-r border-black p-1 w-8">Disc</th>
              <th className="border-r border-black p-1 w-10">GST<br/>Rate</th>
              <th className="border-r border-black p-1 w-12">GST<br/>Amt</th>
              <th className="p-1 w-14 text-right pr-1.5">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/80 font-medium">
            <tr>
              <td className="border-r border-black p-1">1</td>
              <td className="border-r border-black p-1 text-left font-bold text-black">11111</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">80.00</td>
              <td className="border-r border-black p-1 font-bold">1</td>
              <td className="border-r border-black p-1 text-slate-700">pc</td>
              <td className="border-r border-black p-1">80.00</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">0%</td>
              <td className="border-r border-black p-1">0.00</td>
              <td className="p-1 text-right pr-1.5 font-bold">80.00</td>
            </tr>
            <tr>
              <td className="border-r border-black p-1">2</td>
              <td className="border-r border-black p-1 text-left font-bold text-black">343</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">2222.00</td>
              <td className="border-r border-black p-1 font-bold">1</td>
              <td className="border-r border-black p-1 text-slate-700">pc</td>
              <td className="border-r border-black p-1">2222.00</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">0%</td>
              <td className="border-r border-black p-1">0.00</td>
              <td className="p-1 text-right pr-1.5 font-bold">2222.00</td>
            </tr>
            <tr>
              <td className="border-r border-black p-1">3</td>
              <td className="border-r border-black p-1 text-left font-bold text-black">4343434</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">1109.92</td>
              <td className="border-r border-black p-1 font-bold">1</td>
              <td className="border-r border-black p-1 text-slate-700">pc</td>
              <td className="border-r border-black p-1">1109.92</td>
              <td className="border-r border-black p-1 text-slate-500">-</td>
              <td className="border-r border-black p-1">0%</td>
              <td className="border-r border-black p-1">0.00</td>
              <td className="p-1 text-right pr-1.5 font-bold">1109.92</td>
            </tr>
            {/* Total Row */}
            <tr className="border-t-2 border-black font-black text-black bg-slate-50/50">
              <td className="border-r border-black p-1" colSpan={6}>
                <span className="font-extrabold text-[10px] pl-2 text-left block">Total</span>
              </td>
              <td className="border-r border-black p-1 font-black text-[10px]">3</td>
              <td className="border-r border-black p-1" colSpan={3}></td>
              <td className="border-r border-black p-1 font-bold">0.00</td>
              <td className="p-1 text-right pr-1.5 font-black text-[10px]">3411.92</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Section: Details & Totals Breakdown */}
      <div className="grid grid-cols-12 text-[10px]">
        {/* Left Column: Description, Words, Terms, QR */}
        <div className="col-span-7 border-r border-black flex flex-col justify-between">
          <div className="p-2 border-b border-black">
            <span className="font-bold text-black">Description:</span>{" "}
            <span className="text-slate-800">Goods once sold will not be taken back.</span>
          </div>

          <div className="p-2 border-b border-black">
            <span className="font-bold text-[9px] text-slate-700 block uppercase">Invoice Amount In Words:</span>
            <strong className="block font-black text-[10.5px] text-black mt-0.5 leading-snug">
              INR Three Thousand Four Hundred Eleven Rupees and Ninety Two Paise Only
            </strong>
          </div>

          <div className="p-2 space-y-1">
            <span className="font-bold text-[9.5px] text-black block">Terms and Conditions:</span>
            <p className="text-[8.5px] text-slate-700 leading-tight">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
          </div>

          <div className="p-2 border-t border-black flex items-center justify-between bg-slate-50/40">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-600 block">Instant Payment via UPI</span>
              <span className="text-[10px] font-mono font-bold text-black block">
                UPI: 8102545007@ybl
              </span>
            </div>
            <div className="p-1 bg-white border border-slate-300 rounded shadow-xs">
              <QRCodeSVG value={upiUri} size={46} level="M" />
            </div>
          </div>
        </div>

        {/* Right Column: Calculation & Signature */}
        <div className="col-span-5 flex flex-col justify-between">
          <div className="p-2.5 space-y-1 text-[10px]">
            <div className="flex justify-between py-0.5">
              <span className="font-medium text-slate-700">Sub Total</span>
              <span className="font-semibold text-black">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-0.5 border-t border-black/10">
              <span className="font-black text-black text-[11px]">Total Amount</span>
              <span className="font-black text-black text-[11px]">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Received</span>
              <span>Rs. 0.00</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-black/40 pb-1">
              <span className="font-semibold text-black">Balance Amount:</span>
              <span className="font-semibold text-black">Rs. 3,411.92</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600 pt-1">
              <span>Previous Pending:</span>
              <span>Rs. 0.00</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="font-black text-black">Pending Balance:</span>
              <span className="font-black text-black">Rs. 3,411.92</span>
            </div>
          </div>

          <div className="p-2.5 border-t border-black flex flex-col items-center justify-center text-center bg-slate-50/20">
            <ShekharSignature className="h-9 w-24 text-slate-900" />
            <div className="w-24 border-t border-black pt-0.5">
              <span className="text-[8.5px] font-bold text-slate-800 uppercase block tracking-tight">
                Company Seal &amp; Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
