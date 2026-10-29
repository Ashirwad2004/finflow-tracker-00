import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, MessageCircle, Mail, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DUR,
  EASE_DRAW,
  Pull,
  Reveal,
  SetType,
} from "@/features/landing/motion";

interface FinalCTAProps {
  onBookDemo: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return (
    <section className="bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        {/* An inverted panel. After a long light page, flipping to ink makes the
            closing ask feel like a different, more deliberate moment. */}
        <div className="lp-stage relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
            {/* The closing rule, drawn. The page opened with a rule being
                ruled across the hero; it closes the same way, which is what
                makes the two ends of a long page feel like one document. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-[hsl(var(--lp-brass))]"
              initial={reduced ? undefined : { scaleX: 0 }}
              whileInView={reduced ? undefined : { scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: DUR.rule, ease: EASE_DRAW }}
            />

            {/* The light on the dark panel, matched to the hero's. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--lp-brass) / 0.14), transparent 70%)",
              }}
            />

            <div className="relative">
              {/* The last headline on the page sets word by word, the way
                  the first one did. */}
              <SetType
                as="h2"
                delay={0.18}
                className="lp-display mx-auto max-w-[26ch] text-[2.1rem] text-white sm:text-[3rem] lg:text-[3.5rem]"
              >
                Tomorrow&rsquo;s first customer could walk out with a proper GST
                bill
              </SetType>

              <Reveal
                as="p"
                move="set"
                delay={0.62}
                className="lp-prose mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base"
              >
                Set up your shop, import your item list, and print your first
                invoice tonight. Nothing to pay, nothing to cancel.
              </Reveal>

              <Reveal
                move="set"
                delay={0.76}
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Pull className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth?mode=signup")}
                    className="lp-btn-invert h-12 w-full rounded-none px-8 text-base sm:h-[3.25rem] sm:w-auto"
                  >
                    Create your free account
                  </Button>
                </Pull>

                <Pull className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={onBookDemo}
                    className="lp-btn-accent h-12 w-full rounded-none px-7 text-base sm:h-[3.25rem] sm:w-auto"
                  >
                    <PlayCircle className="mr-2 h-[18px] w-[18px]" />
                    Book a live demo
                  </Button>
                </Pull>
              </Reveal>

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
