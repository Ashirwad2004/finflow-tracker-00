import { ReactNode, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile specific check removed to unify layout and prevent double headers.
  // The pages (like Dashboard) now handle their own headers/menus.

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <OfflineBanner />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:block h-full shrink-0">
          <AppSidebar />
        </div>
        <main className="flex-1 h-full overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}