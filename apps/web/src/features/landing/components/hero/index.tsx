import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { RealRupeeBillDashboard } from "@/features/landing/components/RealRupeeBillDashboard";
import { HeroHeader } from "./HeroHeader";
import { HeroPOSMockup } from "./HeroPOSMockup";
import { HeroWhatsAppMockup } from "./HeroWhatsAppMockup";
import { HeroDeviceSwitcher, HeroHardwareStrip } from "./HeroDeviceSwitcher";
import { LaptopFrame } from "./LaptopFrame";
import { Lift } from "@/features/landing/motion";
import { HeroProps, DeviceTab } from "./types";

export type { HeroProps };

export const Hero: React.FC<HeroProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const [deviceTab, setDeviceTab] = useState<DeviceTab>("dashboard");
  const reduced = useReducedMotion();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    /*
     * The stage.
     *
     * The page is a long light document, and the hero is the one place on it
     * that is deep ink. Two reasons, and neither is "dark looks premium":
     * a product shot can only throw real light against a dark ground, which is
     * what makes the laptop read as a machine sitting on a counter rather than
     * an image pasted onto paper; and a page that opens dark and then turns to
     * paper tells you where the marketing stops and the ledger begins.
     *
     * `.lp-stage` flips the `.lp` tokens, so every utility already written
     * inside this section lands on the right colour with no rewrite.
     */
    <section className="lp-stage relative overflow-hidden pb-16 pt-10 md:pb-24 md:pt-16">
      {/*
        The register, alive. Ruled lines drifting by exactly one line height,
        crossed by column rules — the surface a shopkeeper already writes bills
        on, except it is being ruled while you look at it. Masked out well
        before the content so it never competes with type.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/*
          Two layers, not one element with two classes. Both rulings are
          declared as `background-image`, so stacking the classes on one node
          means the later rule simply replaces the earlier one and the drifting
          horizontal rules vanish. They also need different behaviour: the
          horizontal ruling drifts, the column rules are fixed, and
          `background-position` cannot animate one layer of a multi-layer
          background without moving the other.
        */}
        <div
          className="absolute inset-x-0 top-0 h-[860px]"
          style={{
            maskImage:
              "radial-gradient(120% 70% at 50% 0%, #000 0%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(120% 70% at 50% 0%, #000 0%, transparent 72%)",
          }}
        >
          {/* The class stays on unconditionally: the stylesheet's
              reduced-motion block stops the drift and leaves the ruling
              printed, which is what it should look like anyway. */}
          <div className="lp-ruling-live absolute inset-0" />
          <div className="lp-columns-live absolute inset-0" />
        </div>

        {/*
          One light source, up and to the right, where a shop's tube light
          would be. It is what the brass in the palette is reflecting, and it
          is the only soft shape on an otherwise ruled page — so it is allowed
          to be a glow rather than a line.
        */}
        <motion.div
          className="absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--lp-brass) / 0.17), transparent 68%)",
          }}
          initial={reduced ? undefined : { opacity: 0, scale: 0.86 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* The paper edge: where the stage stops and the ledger starts. */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-[hsl(var(--lp-rule-strong))]" />
      </div>

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

          `Lift` gives it the one thing a flat screenshot cannot have: it tips a
          degree or two under the pointer and travels against the scroll, which
          is what makes it read as an object in the room.
        */}
        <div className="mx-auto mt-14 max-w-5xl">
          <HeroDeviceSwitcher deviceTab={deviceTab} onTabChange={setDeviceTab} />

          {/* The switcher's three buttons are `role="tab"`, so the thing they
              swap has to identify itself as their panel. One panel node for
              all three views, named by whichever tab is selected. */}
          <div
            className="mt-4"
            role="tabpanel"
            id="lp-device-panel"
            aria-labelledby={`lp-device-tab-${deviceTab}`}
          >
            {/* 1. The real business dashboard, on a laptop at the counter */}
            {deviceTab === "dashboard" && (
              <Lift>
                <LaptopFrame
                  label="The RupeeBill business dashboard on a laptop"
                  className={reduced ? "" : "animate-in fade-in duration-300"}
                >
                  <RealRupeeBillDashboard />
                </LaptopFrame>
              </Lift>
            )}

            {/* 2. The counter POS terminal, same machine */}
            {deviceTab === "pos" && (
              <Lift>
                <LaptopFrame
                  label="The RupeeBill counter POS screen on a laptop"
                  className={reduced ? "" : "animate-in fade-in duration-300"}
                >
                  <HeroPOSMockup
                    onSavePrint={() => navigate("/auth")}
                    onDispatchWhatsApp={() => setDeviceTab("mobile")}
                  />
                </LaptopFrame>
              </Lift>
            )}

            {/* 3. What the customer gets, which is a phone and not a laptop */}
            {deviceTab === "mobile" && (
              <Lift tilt={3.4} parallax={18} className="mx-auto max-w-sm">
                <HeroWhatsAppMockup />
              </Lift>
            )}
          </div>

          <HeroHardwareStrip
            onCompareClick={() => scrollToSection("comparison")}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
