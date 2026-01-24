import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile specific check removed to unify layout and prevent double headers.
  // The pages (like Dashboard) now handle their own headers/menus.

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}


