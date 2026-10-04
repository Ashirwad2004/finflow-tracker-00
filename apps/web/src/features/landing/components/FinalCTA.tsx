import React from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MessageCircle, Mail, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTAProps {
  onBookDemo: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();

  return (
    <section className="bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        {/* An inverted panel. After a long light page, flipping to ink makes the
            closing ask feel like a different, more deliberate moment. */}
        <div className="lp-invert-surface relative overflow-hidden bg-[hsl(222_47%_9%)] px-6 py-14 text-center sm:px-12 sm:py-20">
            {/* A single hairline across the top, so the panel reads as ruled stock. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[hsl(var(--lp-rule-strong))]"
            />

            <div className="relative">
              <h2 className="lp-display mx-auto max-w-[26ch] text-[2.1rem] text-white sm:text-[3rem] lg:text-[3.5rem]">
                Tomorrow&apos;s first customer could walk out with a proper GST
                bill
              </h2>

              <p className="lp-prose mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                Set up your shop, import your item list, and print your first
                invoice tonight. Nothing to pay, nothing to cancel.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth?mode=signup")}
                  className="lp-btn-invert rounded-none h-12 w-full px-8 text-base sm:h-[3.25rem] sm:w-auto"
                >
                  Create your free account
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={onBookDemo}
                  className="lp-btn-accent h-12 w-full rounded-none px-7 text-base sm:h-[3.25rem] sm:w-auto"
                >
                  <PlayCircle className="mr-2 h-[18px] w-[18px]" />
                  Book a live demo
                </Button>
              </div>

              {/* Support, phrased as a person you can reach rather than a badge row. */}
              <div className="mt-12 border-t border-white/10 pt-7">
                <p className="text-xs text-white/50">
                  Prefer to be walked through it? Our team answers in Hindi and
                  English.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold">
                  <a
                    href="tel:8102545007"
                    className="lp-link inline-flex items-center gap-1.5 text-white/85 hover:text-white"
                  >
                    <Phone className="h-3.5 w-3.5" /> +91 81025 45007
                  </a>
                  <a
                    href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-link inline-flex items-center gap-1.5 text-[#25D366] hover:text-[#25D366]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp us
                  </a>
                  <a
                    href="mailto:supportrupeebill@gmail.com"
                    className="lp-link inline-flex items-center gap-1.5 text-white/85 hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5" /> supportrupeebill@gmail.com
                  </a>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
