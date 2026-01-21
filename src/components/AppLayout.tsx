import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <AppSidebar />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-lg">ExpenseTracker</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Mobile Content */}
        <main className="p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
