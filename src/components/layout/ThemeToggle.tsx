import { useEffect, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility, typical in shadcn/ui

type Theme = "light" | "dark";

type ThemeToggleProps = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
};

/* ---------------- LOGIC ---------------- */

export const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;

  // Production best practice: Check system preference if no storage found
  // If you strictly want default dark: return "dark";
  const systemPreference = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return "dark"; // Or return systemPreference;
};

export const applyThemeClass = (theme: Theme) => {
  const root = document.documentElement;
  
  // Disable transitions briefly to prevent layout jank during theme switch
  // if not using View Transitions
  if (!document.startViewTransition) {
      root.classList.add('disable-transitions');
  }

  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme; // Updates scrollbars and form controls

  if (!document.startViewTransition) {
      setTimeout(() => {
          root.classList.remove('disable-transitions');
      }, 0);
  }
};

/* ---------------- COMPONENTS ---------------- */

export const ThemeToggle = ({ className, variant = "secondary" }: ThemeToggleProps) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // 1. Initial Load & Hydration Handling
  useEffect(() => {
    setMounted(true);
    const initial = getPreferredTheme();
    setTheme(initial);
    applyThemeClass(initial);
  }, []);

  // 2. Sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = getPreferredTheme();
      setTheme(newTheme);
      applyThemeClass(newTheme);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";

    // Modern View Transition API (Smooth circular reveal)
    if (!document.startViewTransition) {
      updateThemeState(next);
      return;
    }

    document.startViewTransition(() => {
      updateThemeState(next);
    });
  };

  const updateThemeState = (next: Theme) => {
    setTheme(next);
    applyThemeClass(next);
    localStorage.setItem("theme", next);
  };

  // Prevent hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn("bg-muted/50 opacity-50 cursor-not-allowed", className)}
        aria-hidden="true"
      >
        <span className="sr-only">Loading theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggle}
      className={cn(
        "relative rounded-full shadow-sm hover:shadow-md transition-all duration-300",
        "bg-background/80 backdrop-blur-sm border border-border",
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun Icon: Visible in Light Mode, scales down in Dark */}
      <Sun 
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-300 ease-in-out absolute",
          theme === "dark" ? "rotate-[-90deg] scale-0" : "rotate-0 scale-100 text-orange-500"
        )} 
      />
      
      {/* Moon Icon: Hidden in Light Mode, scales up in Dark */}
      <Moon 
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-300 ease-in-out absolute",
          theme === "dark" ? "rotate-0 scale-100 text-blue-400" : "rotate-90 scale-0"
        )} 
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

// Use this in your root layout file (e.g., App.tsx or layout.tsx)
export const ThemeInitializer = () => {
  useLayoutEffect(() => {
    const initial = getPreferredTheme();
    applyThemeClass(initial);
  }, []);
  return null;
};