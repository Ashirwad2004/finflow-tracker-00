import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";

interface NavbarProps {
  onBookDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The header starts flush with the hero and only gains a border and blur
  // once the page moves — one less line competing with the headline.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Five links, not eight. A crowded nav makes a product look unsure of its
  // own story; the deeper sections are still reachable by scrolling.
  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Bill formats", href: "#invoice-themes" },
    { label: "Why RupeeBill", href: "#comparison" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-[hsl(var(--lp-rule))] bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            aria-label="RupeeBill Home"
          >
            <Logo size={30} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.href);
                }}
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1 py-0.5"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="tel:8102545007"
            className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted/60 hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors"
            title="Support Helpline: +91 8102545007"
          >
            <Phone className="w-3.5 h-3.5 text-[hsl(var(--lp-green))]" />
            <span>8102545007</span>
          </a>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm font-semibold"
          >
            Log In
          </Button>
          {/* One filled button in the header. The demo is a quiet outline so
              the two CTAs don't fight each other for the same click. */}
          <Button
            size="sm"
            variant="outline"
            onClick={onBookDemo}
            className="hidden border-[hsl(var(--lp-rule-strong))] bg-transparent text-xs font-semibold text-foreground hover:bg-muted md:inline-flex"
          >
            Book a demo
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth?mode=signup")}
            className="lp-btn rounded-none text-xs sm:text-sm"
          >
            Start free
          </Button>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <a
            href="tel:8102545007"
            aria-label="Call Support"
            className="p-2 rounded-lg bg-muted text-[hsl(var(--lp-green))] border border-border"
          >
            <Phone className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="h-9 w-9 text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col bg-background/98 backdrop-blur-lg border-b border-border p-6 overflow-y-auto sm:hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <nav className="flex flex-col space-y-4 pt-2 pb-6 border-b border-border">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.href);
                }}
                className="text-base font-medium text-foreground hover:text-primary transition-colors py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth?mode=signup");
              }}
              className="lp-btn rounded-none h-11 w-full text-sm"
            >
              Start billing free
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMobileMenuOpen(false);
                onBookDemo();
              }}
              className="lp-btn-accent h-11 w-full rounded-none text-sm"
            >
              Book a live demo
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth");
              }}
              className="w-full h-11 text-sm font-medium"
            >
              Log In to Existing Account
            </Button>
          </div>

          {/* Mobile Direct Support Card */}
          <div className="mt-6 p-4  bg-muted/60 border border-border/80 space-y-2.5 text-xs text-left">
            <span className="text-xs font-bold text-foreground block">
              Support Helpline &amp; Queries:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:8102545007"
                className="flex items-center justify-center gap-1.5 py-2 px-2  bg-background border border-border font-bold text-foreground text-xs"
              >
                <Phone className="w-3.5 h-3.5 text-[hsl(var(--lp-green))]" /> 8102545007
              </a>
              <a
                href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2  bg-[#25D366]/10 border border-[#25D366]/30 font-bold text-[#25D366] text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
            <a
              href="mailto:supportrupeebill@gmail.com"
              className="flex items-center justify-center gap-1.5  border border-[hsl(var(--lp-rule))] bg-background py-2 text-[11px] font-semibold text-[hsl(var(--lp-ink))]"
            >
              <Mail className="w-3.5 h-3.5" /> supportrupeebill@gmail.com
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
