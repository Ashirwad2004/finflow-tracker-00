import { useEffect, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

type ThemeToggleProps = {
  className?: string;
};

export const getPreferredTheme = (): Theme => {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  // Default is ALWAYS dark mode
  return "dark";
};

export const applyThemeClass = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.remove(theme === "dark" ? "light" : "dark");
  root.classList.add(theme);
};

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const [theme, setTheme] = useState<Theme>("dark"); // default local state

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyThemeClass(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyThemeClass(next);
    localStorage.setItem("theme", next);
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggle}
      className={`shadow-elevated bg-card/85 backdrop-blur hover:shadow-md ${className ?? ""}`.trim()}
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
};

// Ensures stored theme is applied on initial load (even when toggle UI isn't rendered)
export const ThemeInitializer = () => {
  useLayoutEffect(() => {
    const initial = getPreferredTheme();
    applyThemeClass(initial);
  }, []);
  return null;
};
