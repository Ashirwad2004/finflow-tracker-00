import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTAProps {
  onBookDemo: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden border-b border-border/50">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-14 rounded-3xl border border-border bg-card shadow-lg relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            Ready to Simplify Your Invoicing &amp; Business Operations? 100% Free.
          </h2>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Join thousands of business owners who manage professional invoices, inventory, counter sales, and customer accounts in one place at zero cost. Get started in under 2 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto h-13 px-8 text-base font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all focus-visible:ring-2 focus-visible:ring-primary"
            >
              Start 100% Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              onClick={onBookDemo}
              className="w-full sm:w-auto h-13 px-7 text-base font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 shadow-lg shadow-red-500/25 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Star className="mr-2 h-4 w-4 text-white fill-white" /> Book a Live Demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> 100% Free Everything
            </span>
            <span>·</span>
            <span>No Credit Card Required</span>
            <span>·</span>
            <span>Full Data Export to Excel</span>
          </div>

          {/* Quick Support Contact Row */}
          <div className="mt-8 pt-6 border-t border-border/60 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-muted-foreground font-medium">Have queries or need guided onboarding?</span>
            <a
              href="tel:8102545007"
              className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md border border-border"
            >
              📞 Call: +91 8102545007
            </a>
            <a
              href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#25D366] hover:underline inline-flex items-center gap-1 bg-[#25D366]/10 px-2.5 py-1 rounded-md border border-[#25D366]/20"
            >
              💬 WhatsApp: +91 8102545007
            </a>
            <a
              href="mailto:supportrupeebill@gmail.com"
              className="font-bold text-primary hover:underline inline-flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20"
            >
              ✉️ supportrupeebill@gmail.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
