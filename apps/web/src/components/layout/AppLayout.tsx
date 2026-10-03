import { ReactNode, useState, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Menu, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { SyncStatusBadge } from "@/components/shared/SyncStatusBadge";
import { Logo } from "@/components/shared/Logo";
import { openAIAssistant } from "@/components/shared/AIAssistantChat";

export const AppLayoutContext = createContext<boolean>(false);

export function useIsInsideAppLayout() {
  return useContext(AppLayoutContext);
}

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isNested = useContext(AppLayoutContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If already enclosed by an outer persistent AppLayout shell, render children directly
  // to avoid duplicate sidebar mounting and unnecessary DOM rebuilding.
  if (isNested) {
    return <>{children}</>;
  }

  return (
    <AppLayoutContext.Provider value={true}>
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
            <Logo size={28} showText={true} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={openAIAssistant}
              className="text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 h-8 w-8"
              title="Open RupayBill CFO"
              aria-label="Open RupayBill CFO"
            >
              <Bot className="h-4.5 w-4.5" />
            </Button>
            <SyncStatusBadge />
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:block h-full shrink-0">
            <AppSidebar />
          </div>
          <main className="flex-1 h-full overflow-y-auto relative">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </AppLayoutContext.Provider>
  );
}

