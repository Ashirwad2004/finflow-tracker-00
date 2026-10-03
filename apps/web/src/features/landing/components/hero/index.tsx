import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RealRupeeBillDashboard } from "@/features/landing/components/RealRupeeBillDashboard";
import { HeroHeader } from "./HeroHeader";
import { HeroPOSMockup } from "./HeroPOSMockup";
import { HeroWhatsAppMockup } from "./HeroWhatsAppMockup";
import { HeroDeviceSwitcher, HeroHardwareStrip } from "./HeroDeviceSwitcher";
import { HeroProps, DeviceTab } from "./types";

export type { HeroProps };

export const Hero: React.FC<HeroProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const [deviceTab, setDeviceTab] = useState<DeviceTab>("dashboard");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-background via-muted/15 to-background border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HeroHeader
          onStartFree={() => navigate("/auth?mode=signup")}
          onBookDemo={onBookDemo}
          onSeeFeatures={() => scrollToSection("features")}
        />

        {/* Real Software Product Showcase (Dual-Device View) */}
        <div className="mt-10 max-w-6xl mx-auto">
          <HeroDeviceSwitcher
            deviceTab={deviceTab}
            onTabChange={setDeviceTab}
            onCompareClick={() => scrollToSection("comparison")}
          />

          {/* 1. Real RupeeBill Dashboard */}
          {deviceTab === "dashboard" && (
            <div className="transition-all animate-in fade-in duration-200">
              <RealRupeeBillDashboard />
            </div>
          )}

          {/* 2. Retail POS Counter Terminal Mockup */}
          {deviceTab === "pos" && (
            <HeroPOSMockup
              onSavePrint={() => navigate("/auth")}
              onDispatchWhatsApp={() => setDeviceTab("mobile")}
            />
          )}

          {/* 3. Mobile WhatsApp View */}
          {deviceTab === "mobile" && <HeroWhatsAppMockup />}

          {/* Hardware & Printer Compatibility Strip */}
          <HeroHardwareStrip
            onCompareClick={() => scrollToSection("comparison")}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
