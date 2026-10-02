import React, { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { businessMenuItems } from "@/components/layout/AppSidebar";

const BusinessDashboard = lazy(() => import("../BusinessDashboard"));

interface BusinessModeViewProps {
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    onSignOut: () => void;
}

export function BusinessModeView({
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    onSignOut,
}: BusinessModeViewProps) {
    const navigate = useNavigate();

    return (
        <AppLayout>
            {/* Mobile Header - Hidden on Desktop */}
            <div className="md:hidden border-b bg-card shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2" aria-label="Open menu">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85vw] p-0 overflow-y-auto">
                            <SheetHeader className="p-4 border-b text-left">
                                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                                    <Logo size={28} showText={true} />
                                </SheetTitle>
                            </SheetHeader>
                            <div className="py-2">
                                {businessMenuItems.map((item) => (
                                    <Button
                                        key={item.path}
                                        variant="ghost"
                                        className="w-full justify-start gap-4 px-6 py-4 h-auto text-base"
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                    >
                                        <item.icon className="w-5 h-5 text-muted-foreground" />
                                        <div className="text-left">
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-xs text-muted-foreground font-normal">{item.description}</div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <h1 className="font-bold text-lg">RupeeBill Business</h1>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center p-20" aria-busy="true" aria-live="polite">
                    <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <BusinessDashboard />
            </Suspense>
        </AppLayout>
    );
}
