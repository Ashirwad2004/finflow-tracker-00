import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, Phone, Mail, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { EASE_DRAW, Pull } from "@/features/landing/motion";

interface NavbarProps {
  onBookDemo: () => void;
}

// Five links, not eight. A crowded nav makes a product look unsure of its
// own story; the deeper sections are still reachable by scrolling.
const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Bill formats", href: "#invoice-themes" },
  { label: "Why RupeeBill", href: "#comparison" },
  { label: "Reviews", href: "#feedback" },
  { label: "Pricing", href: "#pricing" },
  { label: "Custom software", href: "#custom-work" },
];

export const Navbar: React.FC<NavbarProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [here, setHere] = useState<string | null>(null);
  const reduced = useReducedMotion();

  /** The drawer panel and the button that opens it, for the focus trap. */
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /*
   * Elevated frosted glass header transition: adapts subtle border and shadow
   * when scrolling to provide depth without breaking contrast or color tokens.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * Which section you are in, so the nav can say so. This is the one piece of
   * navigation motion that carries information rather than flourish: the brass
   * rule slides to the link you are currently reading.
   */
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    /*
     * One entry per section is kept rather than trusting the callback's own
     * batch: a callback only carries the sections that *changed*, so reading
     * `isIntersecting` off it alone meant the mark stayed on whichever link was
     * last reported. Scrolling back up to the hero — which is not a nav
     * section — left "Custom software" underlined the whole way.
     */
    const crossing = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => crossing.set(e.target.id, e.isIntersecting));

        // The topmost section currently crossing the band under the header.
        const current = sections.find((s) => crossing.get(s.id));
        setHere(current ? `#${current.id}` : null);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  /*
   * The drawer is hidden by CSS at `lg`, so if the viewport grows past it
   * while the drawer is open the panel disappears but its scroll lock would
   * stay on and the page would look frozen. Close it on the crossing instead.
   */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /*
   * The drawer says `aria-modal="true"`, which is a promise that nothing
   * outside it can be reached while it is open. It was not keeping that
   * promise: focus stayed on the toggle behind the panel, Tab walked straight
   * past the links into the page underneath, and closing the drawer dropped
   * focus back to the top of the document. A keyboard or screen-reader user got
   * a menu they could open and then lose.
   *
   * So: focus moves to the first link on open, Tab and Shift+Tab cycle inside
   * the panel, Escape closes it, and focus returns to the button that opened
   * it — which is where the user left off.
   */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const panel = drawerRef.current;
    const opener = toggleRef.current;

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    // The panel animates in, so the first link only exists to be focused on
    // the frame after the mount.
    const raf = requestAnimationFrame(() => focusables()[0]?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Wrap at both ends, and pull focus back in if it has already escaped.
      if (e.shiftKey && (active === first || !panel?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [mobileMenuOpen]);

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-b border-border/80 bg-background/90 backdrop-blur-xl shadow-sm shadow-black/[0.03] dark:shadow-black/20"
          : "border-b border-border/40 bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform duration-200 hover:scale-[1.02]"
            aria-label="RupeeBill Home"
          >
            <Logo size={32} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden lg:flex items-center gap-1"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => {
              const active = here === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.href);
                  }}
                  className={`relative rounded-full px-3 py-1.5 text-xs xl:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? "text-foreground font-semibold bg-muted/70 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {link.label}

                  {active && (
                    <motion.span
                      layoutId={reduced ? undefined : "lp-nav-active-rule"}
                      className="absolute inset-x-3 -bottom-1 block h-[2px] rounded-full bg-primary"
                      transition={{ duration: 0.35, ease: EASE_DRAW }}
                    />
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Live Support Helpline Badge */}
          <a
            href="tel:8102545007"
            className="hidden xl:inline-flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-full border border-border/60 hover:border-border transition-all duration-200 shadow-sm group"
            title="Direct Support Helpline: +91 8102545007"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
            <span className="font-mono tracking-tight font-medium">8102545007</span>
          </a>

          {/* Theme Switcher */}
          <ThemeToggle
            variant="ghost"
            className="h-9 w-9 rounded-full border border-border/50 bg-background/50 hover:bg-muted/60 text-foreground transition-all duration-200"
          />

          {/* Log In */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-full px-3.5 h-9 transition-colors"
          >
            Log In
          </Button>

          {/* Book a Demo */}
          <Button
            size="sm"
            variant="outline"
            onClick={onBookDemo}
            className="rounded-full border-border/80 hover:border-foreground/30 hover:bg-muted/40 text-xs font-semibold text-foreground px-4 h-9 transition-all shadow-none"
          >
            Book a demo
          </Button>

          {/* Start Free CTA */}
          <Pull travel={3}>
            <Button
              size="sm"
              onClick={() => navigate("/auth?mode=signup")}
              className="rounded-full px-4 sm:px-5 h-9 text-xs sm:text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.98] transition-all duration-200 border-0 flex items-center gap-1.5 group"
            >
              <span>Start free</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Pull>
        </div>

        {/* Compact Header Controls (phones and tablets) */}
        <div className="flex lg:hidden items-center gap-2">
          <a
            href="tel:8102545007"
            aria-label="Call Support"
            className="p-2 rounded-full bg-muted/60 text-emerald-600 dark:text-emerald-400 border border-border/60 hover:bg-muted transition-colors"
          >
            <Phone className="h-4 w-4" />
          </a>
          <ThemeToggle
            variant="ghost"
            className="h-9 w-9 rounded-full border border-border/50 bg-background/50 hover:bg-muted/60"
          />
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="lp-mobile-nav"
            className="h-9 w-9 rounded-full text-foreground hover:bg-muted/60"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={drawerRef}
            id="lp-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col overflow-y-auto border-b border-border bg-background/98 p-6 backdrop-blur-xl lg:hidden"
            initial={reduced ? undefined : { opacity: 0, y: -12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: EASE_DRAW }}
          >
            {/* The links arrive in order */}
            <motion.nav
              className="flex flex-col space-y-2 pt-2 pb-6 border-b border-border/60"
              initial="hidden"
              animate="shown"
              variants={{
                hidden: {},
                shown: { transition: { delayChildren: 0.06, staggerChildren: 0.05 } },
              }}
            >
              {navLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  variants={
                    reduced
                      ? undefined
                      : {
                          hidden: { opacity: 0, x: -14 },
                          shown: { opacity: 1, x: 0 },
                        }
                  }
                  transition={{ duration: 0.4, ease: EASE_DRAW }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.href);
                  }}
                  className="text-base font-medium text-foreground/90 hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {link.label}
                </motion.a>
              ))}
            </motion.nav>

            <div className="flex flex-col gap-3 pt-5">
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/auth?mode=signup");
                }}
                className="h-11 w-full rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20"
              >
                Start billing free
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBookDemo();
                }}
                className="h-11 w-full rounded-xl text-sm font-semibold border-border/80 hover:bg-muted/50 text-foreground"
              >
                Book a live demo
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/auth");
                }}
                className="w-full h-11 rounded-xl text-sm font-medium hover:bg-muted/50 text-foreground/80 hover:text-foreground"
              >
                Log In to Existing Account
              </Button>
            </div>

            {/* Mobile Direct Support Card */}
            <div className="mt-6 p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 text-xs text-left">
              <span className="text-xs font-bold text-foreground block">
                Support Helpline &amp; Queries:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:8102545007"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-background border border-border/70 font-semibold text-foreground text-xs shadow-sm hover:border-border transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 8102545007
                </a>
                <a
                  href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 font-semibold text-[#25D366] text-xs hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
              <a
                href="mailto:supportrupeebill@gmail.com"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> supportrupeebill@gmail.com
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
