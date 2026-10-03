import { cn } from "@/core/lib/utils";
import {
  AppSidebarProps,
  menuItems,
  businessMenuItems,
  prefetchRoute,
  useAppSidebar,
  SidebarHeader,
  SidebarCollapseToggle,
  SidebarModeToggle,
  SidebarNav,
  SidebarFooter,
} from "./sidebar";

export { menuItems, businessMenuItems, prefetchRoute };
export type { AppSidebarProps };

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const {
    location,
    navigate,
    signOut,
    user,
    profile,
    isBusinessMode,
    isSalesman,
    isPaidSubscriber,
    isTrialActive,
    trialDaysLeft,
    isTrialExpired,
    collapsed,
    setCollapsed,
    isCalculatorOpen,
    setIsCalculatorOpen,
    expandedMenus,
    setExpandedMenus,
    toggleSubmenu,
    navigationRef,
    rememberNavigationScroll,
    handleModeToggle,
    pendingOrderCount,
    currentMenuItems,
  } = useAppSidebar();

  return (
    <aside
      className={cn(
        "relative h-full flex flex-col border-r bg-card transition-all duration-300 shrink-0 w-full md:w-auto",
        collapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo & Brand Header */}
      <SidebarHeader
        collapsed={collapsed}
        isBusinessMode={isBusinessMode}
        isSalesman={isSalesman}
        profile={profile}
        isPaidSubscriber={isPaidSubscriber}
        isTrialActive={isTrialActive}
        trialDaysLeft={trialDaysLeft}
      />

      {/* Collapse Toggle */}
      <SidebarCollapseToggle
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* Mode Toggle / Role Label */}
      <SidebarModeToggle
        collapsed={collapsed}
        isSalesman={isSalesman}
        isBusinessMode={isBusinessMode}
        onModeToggle={handleModeToggle}
      />

      {/* Navigation */}
      <SidebarNav
        navigationRef={navigationRef}
        rememberNavigationScroll={rememberNavigationScroll}
        currentMenuItems={currentMenuItems}
        collapsed={collapsed}
        location={location}
        navigate={navigate}
        expandedMenus={expandedMenus}
        setExpandedMenus={setExpandedMenus}
        toggleSubmenu={toggleSubmenu}
        isBusinessMode={isBusinessMode}
        pendingOrderCount={pendingOrderCount}
        onNavigate={onNavigate}
      />

      {/* Footer Actions & Dialogs */}
      <SidebarFooter
        collapsed={collapsed}
        isSalesman={isSalesman}
        isPaidSubscriber={isPaidSubscriber}
        isTrialActive={isTrialActive}
        trialDaysLeft={trialDaysLeft}
        isTrialExpired={isTrialExpired}
        isCalculatorOpen={isCalculatorOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        userId={user?.id || ""}
        signOut={signOut}
        navigate={navigate}
      />
    </aside>
  );
}

export default AppSidebar;