import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, ArrowRight, Star, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FAQProps {
  onBookDemo: () => void;
}

export const FAQ: React.FC<FAQProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();

  const faqs = [
    {
      id: "faq-1",
      question: "What is RupeeBill and what can it do for my business?",
      answer:
        "RupeeBill is an all-in-one business management platform combining professional invoicing, rapid point-of-sale checkout, real-time inventory tracking, customer & supplier ledgers, and an online storefront. It is built for retail stores, wholesale distributors, service agencies, and digital sellers who want a fast, reliable system to manage daily operations.",
    },
    {
      id: "faq-2",
      question: "What happens if our internet connection drops?",
      answer:
        "Your business never stops! You can continue creating invoices, ringing up counter sales, and printing receipts even when your Wi-Fi or mobile data cuts off. All records are saved securely on your local device. The moment connectivity is restored, all data automatically syncs to the cloud without any manual action.",
    },
    {
      id: "faq-3",
      question: "What printers and hardware scanners are supported?",
      answer:
        "RupeeBill supports standard desktop A4/A5 printers for professional tax invoices, as well as 2-inch (58mm) and 3-inch (80mm) thermal receipt printers (USB and Bluetooth). It also seamlessly connects with any USB or wireless handheld barcode scanner gun with plug-and-play simplicity.",
    },
    {
      id: "faq-4",
      question: "How do tax calculations and accountant reports work?",
      answer:
        "RupeeBill calculates tax brackets automatically based on your item or service tax rates. You can issue compliant tax invoices with your business tax ID, customer tax numbers, and item codes. At the end of the month, simply download a formatted Excel summary to share directly with your accountant.",
    },
    {
      id: "faq-5",
      question: "How does customer credit and balance tracking work?",
      answer:
        "When a client purchases on credit, record it to their account with one click. Their profile automatically updates with the outstanding balance, payment due date, and history. You can dispatch polite payment reminders with your payment link directly via WhatsApp or email whenever balances are due.",
    },
    {
      id: "faq-6",
      question: "Can I import my existing product catalog or client list from Excel?",
      answer:
        "Yes, in seconds! We provide a simple spreadsheet template. Just paste your existing items, purchase costs, selling prices, and current stock, and upload it. Your entire catalog and customer records will be ready immediately without tedious manual entry.",
    },
    {
      id: "faq-7",
      question: "Can I access RupeeBill on multiple devices?",
      answer:
        "Yes! RupeeBill runs on Windows, Mac, iPad, Android tablets, and mobile smartphones. You can have staff handling checkout at the front counter while you review sales, stock, and reports from home on your laptop or phone.",
    },
    {
      id: "faq-8",
      question: "Is RupeeBill really free to use and are there any hidden fees?",
      answer:
        "Yes, 100%! All core business tools — including professional invoicing, POS counter billing, barcode generator, real-time inventory tracking, customer ledgers, and online storefront — are completely free to use with zero hidden fees, zero commission on transactions, and no credit card required. Your data belongs 100% to you and can be exported to Excel at any time. For merchants needing official commercial software license certificates, AI receipt OCR, and priority backup, we offer a transparent Business license (₹299 for 6 months) with all terms detailed on our Pricing page.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Everything you need to know about RupeeBill
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Clear, honest answers on how RupeeBill works for your invoicing, stock, accounts, and sales operations.
          </p>
        </div>

        {/* Accordion Component */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border border-border/60 rounded-xl px-4 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-bold text-sm sm:text-base py-4 hover:no-underline text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4 pt-1">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Support & Query Contact Box */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h3 className="font-bold text-foreground text-base sm:text-lg">
                Have Any Query or Need Setup Support?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Our support team is available via Phone, WhatsApp, and Email to assist you with installation, billing, and custom workflows.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <Button
                size="sm"
                onClick={onBookDemo}
                className="flex-1 sm:flex-none text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 shadow-sm transition-all hover:scale-105"
              >
                <Star className="mr-1.5 h-3.5 w-3.5 fill-white text-white" /> Book a Demo
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="flex-1 sm:flex-none text-xs font-semibold shadow-sm"
              >
                Start 100% Free <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Direct Support Contact Chips */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <a
              href="tel:8102545007"
              className="p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/80 flex items-center gap-3 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Call Helpline</span>
                <span className="font-bold text-foreground">+91 8102545007</span>
              </div>
            </a>

            <a
              href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query%20about%20the%20application"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#25D366]/5 hover:bg-[#25D366]/10 border border-[#25D366]/20 flex items-center gap-3 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">WhatsApp Chat</span>
                <span className="font-bold text-[#25D366]">+91 8102545007</span>
              </div>
            </a>

            <a
              href="mailto:supportrupeebill@gmail.com"
              className="p-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 flex items-center gap-3 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground block">Email Support</span>
                <span className="font-bold text-primary truncate block text-[11px]">supportrupeebill@gmail.com</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
