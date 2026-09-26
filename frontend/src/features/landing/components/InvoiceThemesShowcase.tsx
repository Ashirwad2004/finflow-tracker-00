import React, { useState } from "react";
import { FileText, Printer, Smartphone, Download, QrCode, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const InvoiceThemesShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<"thermal80" | "a4gst" | "thermal58" | "whatsapp">("thermal80");

  const formats = [
    {
      id: "thermal80" as const,
      icon: Printer,
      name: "3-Inch Thermal Slip (80mm)",
      desc: "For retail counters, supermarkets & restaurants",
    },
    {
      id: "a4gst" as const,
      icon: FileText,
      name: "A4 GST Tax Invoice",
      desc: "For B2B wholesale, corporate & client billing",
    },
    {
      id: "whatsapp" as const,
      icon: Smartphone,
      name: "WhatsApp Digital PDF",
      desc: "Direct paperless dispatch with instant UPI link",
    },
    {
      id: "thermal58" as const,
      icon: Printer,
      name: "2-Inch Portable Slip (58mm)",
      desc: "Compact receipt for Bluetooth mobile printers",
    },
  ];

  return (
    <section id="invoice-themes" className="py-16 sm:py-24 bg-background border-b border-border/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Print &amp; Share in Any Format
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mt-3 mb-4">
            Professional Invoice &amp; Receipt Formats
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Whether you use a desktop laser printer, a counter thermal roll printer, or share bills on WhatsApp, RupeeBill generates pixel-perfect formats formatted for your hardware.
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-card border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20"
                    : "bg-muted/30 border-border hover:bg-muted/70 hover:border-border/80"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground">{fmt.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{fmt.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Live Bill Visualizer */}
        <div className="p-6 sm:p-10 rounded-3xl border border-border/80 bg-muted/20 flex justify-center items-center min-h-[460px]">
          
          {/* 1. THERMAL 80MM */}
          {selectedFormat === "thermal80" && (
            <div className="w-full max-w-sm bg-white text-slate-900 font-mono text-xs p-6 shadow-xl border border-slate-200 rounded-sm space-y-3 transition-all animate-in fade-in duration-200">
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                <div className="font-black text-sm uppercase tracking-wide">SHREE GANESH SUPERMARKET</div>
                <div className="text-[10px] text-slate-600">Station Road, Dadar West, Mumbai - 400028</div>
                <div className="text-[10px] text-slate-600">GSTIN: 27AABCU9603R1ZM • Ph: 9820123456</div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>BILL: #1048</span>
                  <span>26-SEP-2026 05:42 PM</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold pb-1 border-b border-slate-200">
                  <span>ITEM</span>
                  <span>QTY x RATE</span>
                  <span>TOTAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">Organic Honey 500g</span>
                  <span>2 x 240.00</span>
                  <span className="font-bold">₹480.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">Pure Cow Ghee 1L</span>
                  <span>1 x 650.00</span>
                  <span className="font-bold">₹650.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">California Almonds 250g</span>
                  <span>1 x 280.00</span>
                  <span className="font-bold">₹280.00</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span>₹1,250.42</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST 6% + SGST 6%:</span>
                  <span>₹159.58</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-900">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹1,410.00</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold">
                  SETTLED: PAID VIA UPI (REF: 4892019)
                </div>
              </div>

              <div className="text-center pt-1 space-y-1">
                <div className="w-16 h-16 bg-slate-100 border border-slate-300 mx-auto rounded flex items-center justify-center p-1">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div className="text-[9px] text-slate-500">Scan QR to verify bill online</div>
                <div className="font-black text-[10px] tracking-widest text-slate-800 uppercase">
                  THANK YOU • VISIT AGAIN
                </div>
              </div>
            </div>
          )}

          {/* 2. A4 GST TAX INVOICE */}
          {selectedFormat === "a4gst" && (
            <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 text-left transition-all animate-in fade-in duration-200">
              <div className="flex justify-between items-start pb-4 border-b border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    TAX INVOICE (ORIGINAL FOR RECIPIENT)
                  </span>
                  <h3 className="text-xl font-black text-foreground mt-1">Shree Ganesh Enterprises</h3>
                  <p className="text-xs text-muted-foreground">GSTIN: 27AABCU9603R1ZM • Mumbai, Maharashtra</p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-foreground">INV-2026-089</div>
                  <div className="text-muted-foreground">Date: 26 Sep 2026</div>
                  <div className="text-muted-foreground">Due: Immediate (UPI)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 p-3.5 rounded-xl border border-border/80">
                <div>
                  <div className="font-bold text-foreground mb-0.5">Billed To (Customer):</div>
                  <div className="text-foreground font-semibold">Ramesh Trading Co.</div>
                  <div className="text-muted-foreground">GSTIN: 27AABCR4589P1Z2</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground mb-0.5">Place of Supply:</div>
                  <div className="text-muted-foreground">27 - Maharashtra (Intra-State)</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Reverse Charge: No</div>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">HSN</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">GST</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="p-2.5 font-medium">Organic Honey 500g</td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">0409</td>
                      <td className="p-2.5 text-center">2 pcs</td>
                      <td className="p-2.5 text-right">₹406.78</td>
                      <td className="p-2.5 text-right text-muted-foreground">18% (₹73.22)</td>
                      <td className="p-2.5 text-right font-black">₹480.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Pure Cow Ghee 1L</td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">0405</td>
                      <td className="p-2.5 text-center">1 tin</td>
                      <td className="p-2.5 text-right">₹580.36</td>
                      <td className="p-2.5 text-right text-muted-foreground">12% (₹69.64)</td>
                      <td className="p-2.5 text-right font-black">₹650.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">California Almonds 250g</td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">0802</td>
                      <td className="p-2.5 text-center">1 pack</td>
                      <td className="p-2.5 text-right">₹266.67</td>
                      <td className="p-2.5 text-right text-muted-foreground">5% (₹13.33)</td>
                      <td className="p-2.5 text-right font-black">₹280.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <div>Bank: HDFC Bank • A/c: 50200012345678</div>
                  <div>IFSC: HDFC0000128 • UPI: shreeganesh@hdfcbank</div>
                </div>
                <div className="text-right space-y-1 text-xs">
                  <div className="text-muted-foreground">Subtotal: ₹1,250.42</div>
                  <div className="text-muted-foreground">CGST 9% + SGST 9%: ₹159.58</div>
                  <div className="text-base font-black text-foreground">Total: ₹1,410.00</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. WHATSAPP DIGITAL PDF */}
          {selectedFormat === "whatsapp" && (
            <div className="w-full max-w-md bg-[#0b141a] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all animate-in fade-in duration-200">
              <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                    SG
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>Shree Ganesh Supermarket</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] flex items-center justify-center text-white">✓</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Official Business Account</div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-[#0b141a]">
                <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-sm max-w-[95%] space-y-2.5 shadow-md">
                  <p className="text-xs leading-relaxed">
                    Namaste <strong>Ramesh ji</strong>! 🙏 Thank you for shopping with Shree Ganesh Supermarket. Here is your digital tax invoice:
                  </p>

                  <div className="bg-[#025144] p-3 rounded-lg flex items-center justify-between border border-emerald-600/30">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Invoice_INV-089.pdf</div>
                        <div className="text-[10px] text-slate-300">142 KB • PDF Document</div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-300" />
                  </div>

                  <div className="text-xs text-emerald-200 pt-1 border-t border-emerald-600/40 flex justify-between items-center">
                    <span>Total Bill:</span>
                    <span className="text-sm font-black text-white">₹1,410.00</span>
                  </div>

                  <div className="pt-1">
                    <div className="w-full py-2 bg-[#202c33] text-emerald-400 rounded-lg text-center font-bold text-xs border border-slate-700">
                      Paid via UPI • GPay / PhonePe
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-300 text-right">05:42 PM ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {/* 4. THERMAL 58MM */}
          {selectedFormat === "thermal58" && (
            <div className="w-full max-w-xs bg-white text-slate-900 font-mono text-[11px] p-4 shadow-xl border border-slate-200 rounded-sm space-y-2 text-center transition-all animate-in fade-in duration-200">
              <div className="pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-xs uppercase">SHREE GANESH STORE</div>
                <div className="text-[9px] text-slate-600">Mumbai - 400028 • Ph: 9820123456</div>
                <div className="text-[9px] text-slate-600">GST: 27AABCU9603R1ZM</div>
              </div>

              <div className="space-y-1 text-left text-[10px] py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>Honey 500g (2x)</span>
                  <span className="font-bold">₹480.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Cow Ghee 1L (1x)</span>
                  <span className="font-bold">₹650.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Almonds 250g (1x)</span>
                  <span className="font-bold">₹280.00</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-xs py-1 border-b border-dashed border-slate-400">
                <span>TOTAL:</span>
                <span>₹1,410.00</span>
              </div>

              <div className="text-[9px] text-slate-500 pt-1">
                PAID VIA UPI • THANK YOU!
              </div>
            </div>
          )}

        </div>

        {/* Quick CTA */}
        <div className="text-center mt-8">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="font-bold shadow-md shadow-primary/20 px-8 text-sm h-12 bg-primary text-primary-foreground"
          >
            Start Printing Bills in Your Format <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

      </div>
    </section>
  );
};
