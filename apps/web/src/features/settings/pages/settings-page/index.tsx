import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BusinessDetailsDialog } from "../../components/BusinessDetailsDialog";
import { StoreSettings } from "../../components/StoreSettings";
import { NotificationSettings } from "../../components/NotificationSettings";
import { WhatsAppSettings } from "../../components/WhatsAppSettings";
import { RealSubscriptionCheckout } from "@/features/landing/components/RealSubscriptionCheckout";
import { useSettingsData } from "./useSettingsData";
import { SettingsTabsNav } from "./SettingsTabsNav";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { SubscriptionBillingTab } from "./SubscriptionBillingTab";

export const SettingsPage: React.FC = () => {
  const {
    isBusinessMode,
    currency,
    setCurrency,
    activeTab,
    setSearchParams,
    showBusinessDialog,
    setShowBusinessDialog,
    isBackingUp,
    checkoutOpen,
    setCheckoutOpen,
    autoAddParties,
    overdueDays,
    subStatus,
    activePlanName,
    handleOverdueDaysChange,
    handleAutoAddPartiesToggle,
    handleBusinessToggle,
    handleBackup,
    toggleBusinessMode,
  } = useSettingsData();

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={(val) => setSearchParams({ tab: val })}
          className="w-full space-y-4"
        >
          <SettingsTabsNav />

          <TabsContent value="general">
            <GeneralSettingsTab
              isBusinessMode={isBusinessMode}
              onBusinessToggle={handleBusinessToggle}
              autoAddParties={autoAddParties}
              onAutoAddPartiesToggle={handleAutoAddPartiesToggle}
              overdueDays={overdueDays}
              onOverdueDaysChange={handleOverdueDaysChange}
              currency={currency}
              onCurrencyChange={setCurrency}
              isBackingUp={isBackingUp}
              onBackup={handleBackup}
            />
          </TabsContent>

          <TabsContent value="billing">
            <SubscriptionBillingTab
              activePlanName={activePlanName}
              subStatus={subStatus}
              onOpenCheckout={() => setCheckoutOpen(true)}
            />
          </TabsContent>

          <TabsContent value="store" className="outline-none">
            <StoreSettings />
          </TabsContent>

          <TabsContent value="whatsapp" className="outline-none">
            <WhatsAppSettings />
          </TabsContent>

          <TabsContent value="notifications" className="outline-none">
            <NotificationSettings customerId={subStatus?.user_id || ""} />
          </TabsContent>
        </Tabs>
      </div>

      <BusinessDetailsDialog
        open={showBusinessDialog}
        onOpenChange={setShowBusinessDialog}
        onSuccess={() => toggleBusinessMode(true)}
      />

      <RealSubscriptionCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        initialPlanId="pro"
        initialBillingCycle="annual"
      />
    </AppLayout>
  );
};

export default SettingsPage;
export * from "./types";
export * from "./useSettingsData";
