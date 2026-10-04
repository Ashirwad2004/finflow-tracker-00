import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RealRupeeBillDashboard } from "@/features/landing/components/RealRupeeBillDashboard";
import { HeroHeader } from "./HeroHeader";
import { HeroPOSMockup } from "./HeroPOSMockup";
import { HeroWhatsAppMockup } from "./HeroWhatsAppMockup";
import { HeroDeviceSwitcher, HeroHardwareStrip } from "./HeroDeviceSwitcher";
import { LaptopFrame } from "./LaptopFrame";
import { Enter } from "../shared/Enter";
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
    <section className="relative overflow-hidden pb-16 pt-10 md:pb-24 md:pt-16">
      {/* Register ruling, the surface a shopkeeper already writes bills on.
          This is the page's one piece of motion nobody asked for: the ruling
          draws itself from the left on load, and the type sets on top of it. */}
      <div
        aria-hidden="true"
        className="lp-ruled lp-rule-draw pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-50"
      />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HeroHeader
          onStartFree={() => navigate("/auth?mode=signup")}
          onBookDemo={onBookDemo}
          onSeeFeatures={() => scrollToSection("features")}
        />

        {/*
          The product shot. Held to a laptop's width rather than the page's, so
          it reads as a machine sitting on the counter instead of a full-bleed
          panel — and so the headline above it stays the first thing you read.
        */}
        <Enter delay={460} className="mx-auto mt-14 max-w-5xl">
          <HeroDeviceSwitcher
            deviceTab={deviceTab}
            onTabChange={setDeviceTab}
            onCompareClick={() => scrollToSection("comparison")}
          />

          <div className="mt-4">
            {/* 1. The real business dashboard, on a laptop at the counter */}
            {deviceTab === "dashboard" && (
              <LaptopFrame
                label="The RupeeBill business dashboard on a laptop"
                className="animate-in fade-in duration-300"
              >
                <RealRupeeBillDashboard />
              </LaptopFrame>
            )}

            {/* 2. The counter POS terminal, same machine */}
            {deviceTab === "pos" && (
              <LaptopFrame
                label="The RupeeBill counter POS screen on a laptop"
                className="animate-in fade-in duration-300"
              >
                <HeroPOSMockup
                  onSavePrint={() => navigate("/auth")}
                  onDispatchWhatsApp={() => setDeviceTab("mobile")}
                />
              </LaptopFrame>
            )}

            {/* 3. What the customer gets, which is a phone and not a laptop */}
            {deviceTab === "mobile" && (
              <div className="mx-auto max-w-sm animate-in fade-in duration-300">
                <HeroWhatsAppMockup />
              </div>
            )}
          </div>

          <HeroHardwareStrip
            onCompareClick={() => scrollToSection("comparison")}
          />
        </Enter>
      </div>
    </section>
  );
};

export default Hero;
