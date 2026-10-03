import { BusinessDetailsInfo, exportPartiesToExcel, exportPartiesToPDF } from "@/utils/exportParties";
import { Party } from "../../types";

export function formatBusinessDetails(profile?: any): BusinessDetailsInfo {
  return {
    name: profile?.business_name || profile?.display_name || "BUSINESS DIRECTORY",
    address: profile?.business_address,
    phone: profile?.business_phone || profile?.phone,
    gst: profile?.gst_number,
    logo_url: profile?.business_logo,
  };
}

export function filterPartiesForExport(
  parties: Party[],
  filter: "all" | "customer" | "vendor" | "both"
): Party[] {
  if (filter === "customer") return parties.filter((p) => p.type === "customer");
  if (filter === "vendor") return parties.filter((p) => p.type === "vendor");
  if (filter === "both") return parties.filter((p) => p.type === "both");
  return parties;
}

export function performExcelExport(
  parties: Party[],
  ledgerMap: Map<string, any>,
  businessDetails: BusinessDetailsInfo,
  filter: "all" | "customer" | "vendor" | "both"
): void {
  exportPartiesToExcel(
    parties,
    ledgerMap,
    businessDetails,
    filter !== "all" ? filter.toUpperCase() : undefined
  );
}

export function performPdfExport(
  parties: Party[],
  ledgerMap: Map<string, any>,
  businessDetails: BusinessDetailsInfo,
  filter: "all" | "customer" | "vendor" | "both"
): void {
  exportPartiesToPDF(
    parties,
    ledgerMap,
    businessDetails,
    filter !== "all" ? filter.toUpperCase() : undefined
  );
}
