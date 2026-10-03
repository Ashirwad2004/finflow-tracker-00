import React from "react";
import { ArrowRight, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroHeaderProps {
  onStartFree: () => void;
  onBookDemo: () => void;
  onSeeFeatures: () => void;
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  onStartFree,
  onBookDemo,
  onSeeFeatures,
}) => {
  return (
    <>
      {/* Top Trust Pill Banner */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs">
          <span className="text-sm">🇮🇳</span>
          <span>India's Most Practical GST Billing, POS &amp; Inventory Software</span>
          <span className="text-border mx-0.5">•</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-300">
            100% Free Forever
          </span>
        </div>
      </div>

      {/* Main Headline (All Types of Businesses) */}
      <div className="text-center max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
          GST Billing Software, Invoicing &amp; Inventory App for All Types of Businesses
        </h1>
        <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
          Built for retail counters, wholesale distributors, manufacturers, supermarkets &amp; service enterprises. Create GST-compliant bills in 5 seconds, print on any 2" &amp; 3" thermal printer, track multi-godown stock, and collect payments faster with UPI QR codes on WhatsApp. Works 100% offline without internet.
        </p>
      </div>

      {/* Download & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-2xl mx-auto mb-8">
        <Button
          size="lg"
          onClick={onStartFree}
          className="w-full sm:w-auto h-12 sm:h-14 px-8 text-base font-bold shadow-lg shadow-orange-500/25 hover:scale-[1.01] transition-transform bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white border-0"
        >
          Start Free Billing <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Button
          size="lg"
          onClick={onBookDemo}
          className="w-full sm:w-auto h-12 sm:h-14 px-7 text-base font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 shadow-lg shadow-red-500/25 hover:scale-[1.01] transition-transform"
        >
          <Star className="mr-2 h-4 w-4 fill-white text-white" /> Book Free Live Demo
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={onSeeFeatures}
          className="w-full sm:w-auto h-12 sm:h-14 px-6 text-base font-semibold border-border hover:bg-muted text-foreground"
        >
          See All Features ↓
        </Button>
      </div>

      {/* Merchant Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground pb-10 border-b border-border/50 max-w-4xl mx-auto">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span><strong>15,000+</strong> Indian Retailers &amp; Wholesalers</span>
        </span>
        <span className="text-border hidden sm:inline">•</span>
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Works 100% Offline (Zero Downtime)</span>
        </span>
        <span className="text-border hidden sm:inline">•</span>
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Thermal 2" &amp; 3" USB/Bluetooth Ready</span>
        </span>
        <span className="text-border hidden sm:inline">•</span>
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>1-Click GSTR-1 &amp; Tally/Excel Export</span>
        </span>
      </div>
    </>
  );
};
