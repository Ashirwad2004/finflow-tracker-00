import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle2, Printer, Smartphone, ArrowRight, Scan, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BillingFeature: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"invoice" | "receipt">("invoice");

  return (
    <section id="billing" className="py-20 sm:py-28 bg-background border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" /> Invoicing &amp; Point of Sale
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.2]">
              Professional invoices and lightning-fast checkout in seconds
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed">
              Whether you are an agency sending formal corporate invoices or a busy storefront ringing up hundreds of walk-in customers daily, RupeeBill handles both with supreme ease.
            </p>

            <ul className="space-y-3.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Branded Invoices &amp; Estimates:</strong> Create sleek, professional invoices and quotes with your logo, business details, tax calculations, and payment terms.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>High-Speed Barcode Checkout:</strong> Plug in any USB or wireless barcode scanner to look up products and print thermal receipts in under 2 seconds.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Flexible Payment Options:</strong> Accept cash, cards, bank transfers, UPI QR, or record credit balances on customer accounts with split-payment support.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Print or Dispatch via WhatsApp &amp; Email:</strong> Print full A4/A5 bills, compact thermal slips, or send a PDF straight to your customer&apos;s phone in one click.
                </span>
              </li>
            </ul>

            <div className="pt-4 flex items-center gap-4">
              <Button
                onClick={() => navigate("/auth")}
                className="font-semibold shadow-sm"
              >
                Create Your First Invoice Free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Column: Interactive Dual Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
              {/* Toggle Buttons */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setViewMode("invoice")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                      viewMode === "invoice"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>A4 Tax Invoice</span>
                  </button>
                  <button
                    onClick={() => setViewMode("receipt")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                      viewMode === "receipt"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5 text-blue-500" />
                    <span>Thermal POS Slip</span>
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Instant Preview</span>
              </div>

              {/* View 1: A4 Professional Invoice */}
              {viewMode === "invoice" ? (
                <div className="bg-background border border-border/80 rounded-xl p-5 text-xs space-y-4 shadow-inner">
                  <div className="flex justify-between items-start border-b border-border pb-4">
                    <div>
                      <div className="font-bold text-base text-foreground">Acme Global Solutions</div>
                      <div className="text-muted-foreground text-[11px]">104 Commerce Tower, Tech City</div>
                      <div className="text-muted-foreground text-[11px]">Tax ID: 27AABCR1234F1Z5 · billing@acmeglobal.com</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[11px] mb-1">
                        TAX INVOICE
                      </span>
                      <div className="font-mono text-muted-foreground text-[11px]">#INV-2026-0842</div>
                      <div className="text-muted-foreground text-[11px]">Date: 26 Sep 2026</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] pb-2 border-b border-border/50">
                    <div>
                      <span className="text-muted-foreground uppercase font-bold text-[10px]">Billed To:</span>
                      <div className="font-semibold text-foreground mt-0.5">Nexus Media Group</div>
                      <div className="text-muted-foreground">GSTIN: 29AABCN9876C1ZT</div>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground uppercase font-bold text-[10px]">Payment Terms:</span>
                      <div className="font-semibold text-foreground mt-0.5">Net 15 Days</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium">Bank / UPI / Card</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 font-bold text-muted-foreground text-[10px] pb-1 border-b border-border">
                      <span className="col-span-6">DESCRIPTION</span>
                      <span className="col-span-2 text-center">QTY</span>
                      <span className="col-span-2 text-right">RATE</span>
                      <span className="col-span-2 text-right">AMOUNT</span>
                    </div>
                    <div className="grid grid-cols-12 py-1 text-foreground">
                      <span className="col-span-6 font-medium">Enterprise Software Subscription</span>
                      <span className="col-span-2 text-center">1</span>
                      <span className="col-span-2 text-right font-mono">₹24,000</span>
                      <span className="col-span-2 text-right font-mono font-semibold">₹24,000.00</span>
                    </div>
                    <div className="grid grid-cols-12 py-1 text-foreground">
                      <span className="col-span-6 font-medium">Implementation &amp; Onboarding</span>
                      <span className="col-span-2 text-center">1</span>
                      <span className="col-span-2 text-right font-mono">₹8,000</span>
                      <span className="col-span-2 text-right font-mono font-semibold">₹8,000.00</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-1 text-right text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-mono">₹32,000.00</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST / Tax (18%):</span>
                      <span className="font-mono">₹5,760.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                      <span>Total Due:</span>
                      <span className="font-mono text-primary text-base">₹37,760.00</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* View 2: Compact Thermal POS Slip */
                <div className="bg-muted/30 border border-border/70 rounded-xl p-5 font-mono text-xs space-y-3">
                  <div className="text-center border-b border-dashed border-border pb-3">
                    <div className="font-bold text-sm text-foreground">EVERGREEN STORE</div>
                    <div className="text-muted-foreground text-[11px]">Main Market · Ph: 9876543210</div>
                    <div className="text-muted-foreground text-[10px] mt-1">POS Slip #B-1049</div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between font-bold text-foreground">
                      <span>ITEM</span>
                      <span>QTY × RATE</span>
                      <span>TOTAL</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="truncate max-w-[140px]">Organic Honey 500g</span>
                      <span>2 × ₹240</span>
                      <span className="font-semibold text-foreground">₹480.00</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="truncate max-w-[140px]">Basmati Rice 5kg</span>
                      <span>1 × ₹480</span>
                      <span className="font-semibold text-foreground">₹480.00</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="truncate max-w-[140px]">Pure Cow Ghee 1L</span>
                      <span>1 × ₹650</span>
                      <span className="font-semibold text-foreground">₹650.00</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-border pt-2 space-y-1 text-right">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>₹1,364.41</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (18%):</span>
                      <span>₹245.59</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/50">
                      <span>Grand Total:</span>
                      <span className="text-primary">₹1,610.00</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[10px] text-muted-foreground border-t border-dashed border-border">
                    Thank You! Visit Again · Instant WhatsApp Copy Sent
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/50">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-500" /> Share via WhatsApp, Email, or Print
                </span>
                <span className="font-semibold text-foreground">Instant Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
