import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sliders, CreditCard, Building2, MessageCircle, Bell } from "lucide-react";

export const SettingsTabsNav: React.FC = () => {
  return (
    <TabsList className="grid grid-cols-5 w-full bg-slate-100/50 p-1 rounded-lg border">
      <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs font-semibold">
        <Sliders className="w-3.5 h-3.5" />
        General
      </TabsTrigger>
      <TabsTrigger value="billing" className="flex items-center gap-1.5 text-xs font-semibold">
        <CreditCard className="w-3.5 h-3.5" />
        Subscription
      </TabsTrigger>
      <TabsTrigger value="store" className="flex items-center gap-1.5 text-xs font-semibold">
        <Building2 className="w-3.5 h-3.5" />
        Store
      </TabsTrigger>
      <TabsTrigger value="whatsapp" className="flex items-center gap-1.5 text-xs font-semibold">
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
        WhatsApp
      </TabsTrigger>
      <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs font-semibold">
        <Bell className="w-3.5 h-3.5" />
        Notifications
      </TabsTrigger>
    </TabsList>
  );
};
