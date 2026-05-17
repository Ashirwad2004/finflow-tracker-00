import { ReactNode, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { BRAND } from "@/core/constants/brand";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <OfflineBanner />
      <header className="md:hidden flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[82vw] max-w-80 p-0">
              <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{BRAND.name}</span>
        </div>
      </header>
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
