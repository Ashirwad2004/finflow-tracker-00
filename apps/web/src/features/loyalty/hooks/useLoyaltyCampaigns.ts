import { useState, useMemo } from "react";
import { Coins, Gift, Award } from "lucide-react";
import { toast } from "sonner";
import { LoyaltyConfig, CustomerLoyaltyData, CampaignTemplate } from "../types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UseLoyaltyCampaignsProps {
  profile: any;
  config: LoyaltyConfig;
  filteredCustomers: CustomerLoyaltyData[];
  selectedIds: Set<string>;
  formatCurrency: (amount: number) => string;
}

export function useLoyaltyCampaigns({
  profile,
  config,
  filteredCustomers,
  selectedIds,
  formatCurrency,
}: UseLoyaltyCampaignsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [customPromoCode, setCustomPromoCode] = useState("RUPEEBILL10");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });

  const storeLink = useMemo(() => {
    return profile?.business_name
      ? `${window.location.origin}/store/${profile.business_name.toLowerCase().replace(/\s+/g, "-")}`
      : `${window.location.origin}/storefront`;
  }, [profile?.business_name]);

  const campaignTemplates: CampaignTemplate[] = useMemo(
    () => [
      {
        title: "Reward point balance reminder",
        icon: Coins,
        getBody: (name: string, points: number = 0, value: number = 0) =>
          `Hey ${name}! You have accumulated ${points} reward points (valued at ${formatCurrency(value)}) in your loyalty wallet at ${
            profile?.business_name || "our shop"
          }. Redeem them on your next visit or check our storefront: ${storeLink}`,
      },
      {
        title: "We miss you — retention offer",
        icon: Gift,
        getBody: (name: string) =>
          `Hello ${name}! We haven't seen you in a while at ${
            profile?.business_name || "our shop"
          }. Enjoy 10% off your next purchase with code ${customPromoCode}. Browse our catalog online: ${storeLink}`,
      },
      {
        title: "Exclusive VIP reward invite",
        icon: Award,
        getBody: (name: string, points: number = 0, value: number = 0) =>
          `Dear ${name}, as one of our valued VIP Gold members at ${
            profile?.business_name || "our shop"
          }, enjoy early access to our premium items. You have ${points} points (${formatCurrency(value)}) ready to redeem. Order here: ${storeLink}`,
      },
    ],
    [profile?.business_name, formatCurrency, customPromoCode, storeLink]
  );

  const buildWhatsAppUrl = (customerName: string, phone: string, points: number) => {
    const value = points * config.pointValue;
    const message = campaignTemplates[selectedTemplate].getBody(customerName, points, value);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleSendWhatsApp = (customerName: string, phone: string, points: number) => {
    if (!phone) {
      toast.error("This customer doesn't have a phone number configured.");
      return;
    }
    window.open(buildWhatsAppUrl(customerName, phone, points), "_blank");
    toast.success(`WhatsApp compose opened for ${customerName}`);
  };

  const handleBulkSend = async () => {
    const targets = filteredCustomers.filter((c) => selectedIds.has(c.id) && c.phone);
    const skipped = filteredCustomers.filter((c) => selectedIds.has(c.id) && !c.phone).length;

    if (targets.length === 0) {
      toast.error("None of the selected customers have a phone number on file.");
      return;
    }

    setBulkSending(true);
    setBulkProgress({ sent: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      window.open(buildWhatsAppUrl(c.name, c.phone as string, c.points), "_blank");
      setBulkProgress({ sent: i + 1, total: targets.length });
      if (i < targets.length - 1) await sleep(900);
    }

    setBulkSending(false);
    toast.success(
      `Opened WhatsApp for ${targets.length} customer${targets.length === 1 ? "" : "s"}${
        skipped ? ` — skipped ${skipped} without a phone number` : ""
      }`
    );
  };

  return {
    selectedTemplate,
    setSelectedTemplate,
    customPromoCode,
    setCustomPromoCode,
    campaignTemplates,
    bulkSending,
    bulkProgress,
    buildWhatsAppUrl,
    handleSendWhatsApp,
    handleBulkSend,
  };
}
