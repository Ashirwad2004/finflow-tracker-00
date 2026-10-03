import {
  exportPartiesToExcel,
  exportPartiesToPDF,
  exportPartyStatementToExcel,
  exportPartyStatementToPDF,
} from "@/utils/exportParties";
import { Party } from "../../types";

export function exportPartiesExcelAction(
  parties: Party[],
  filteredParties: Party[],
  partyLedgerMap: Map<string, any>,
  profile: any,
  filterType: string,
  toast: any
) {
  try {
    const listToExport = filteredParties.length > 0 ? filteredParties : parties;
    if (listToExport.length === 0) {
      toast({
        title: "No Parties",
        description: "There are no parties available to export.",
        variant: "destructive",
      });
      return;
    }
    exportPartiesToExcel(
      listToExport,
      partyLedgerMap,
      profile
        ? {
            name: (profile as any).business_name || (profile as any).display_name,
            address: (profile as any).business_address,
            phone: (profile as any).business_phone || (profile as any).phone,
            gst: (profile as any).gst_number,
          }
        : undefined,
      filterType !== "All Types" ? filterType : undefined
    );
    toast({
      title: "Excel Export Complete",
      description: `Exported ${listToExport.length} parties to Excel.`,
    });
  } catch (err: any) {
    console.error("Failed to export parties to Excel:", err);
    toast({
      title: "Export Failed",
      description: err.message || "Failed to export Excel file.",
      variant: "destructive",
    });
  }
}

export function exportPartiesPdfAction(
  parties: Party[],
  filteredParties: Party[],
  partyLedgerMap: Map<string, any>,
  profile: any,
  filterType: string,
  toast: any
) {
  try {
    const listToExport = filteredParties.length > 0 ? filteredParties : parties;
    if (listToExport.length === 0) {
      toast({
        title: "No Parties",
        description: "There are no parties available to export.",
        variant: "destructive",
      });
      return;
    }
    exportPartiesToPDF(
      listToExport,
      partyLedgerMap,
      profile
        ? {
            name: (profile as any).business_name || (profile as any).display_name,
            address: (profile as any).business_address,
            phone: (profile as any).business_phone || (profile as any).phone,
            gst: (profile as any).gst_number,
          }
        : undefined,
      filterType !== "All Types" ? filterType : undefined
    );
    toast({
      title: "PDF Export Complete",
      description: `Exported ${listToExport.length} parties to PDF.`,
    });
  } catch (err: any) {
    console.error("Failed to export parties to PDF:", err);
    toast({
      title: "Export Failed",
      description: err.message || "Failed to export PDF file.",
      variant: "destructive",
    });
  }
}

export function exportSinglePartyExcelAction(
  party: Party,
  partyLedgerMap: Map<string, any>,
  profile: any,
  toast: any
) {
  try {
    const metrics = partyLedgerMap.get(party.id);
    if (!metrics) {
      toast({
        title: "No Data",
        description: "Party transaction metrics not found.",
        variant: "destructive",
      });
      return;
    }
    exportPartyStatementToExcel(
      party,
      metrics,
      profile
        ? {
            name: (profile as any).business_name || (profile as any).display_name,
            address: (profile as any).business_address,
            phone: (profile as any).business_phone || (profile as any).phone,
            gst: (profile as any).gst_number,
          }
        : undefined
    );
    toast({
      title: "Statement Exported",
      description: `Exported ${party.name}'s statement to Excel.`,
    });
  } catch (err: any) {
    console.error("Failed to export party statement to Excel:", err);
    toast({
      title: "Export Failed",
      description: err.message || "Failed to export statement.",
      variant: "destructive",
    });
  }
}

export function exportSinglePartyPdfAction(
  party: Party,
  partyLedgerMap: Map<string, any>,
  profile: any,
  toast: any
) {
  try {
    const metrics = partyLedgerMap.get(party.id);
    if (!metrics) {
      toast({
        title: "No Data",
        description: "Party transaction metrics not found.",
        variant: "destructive",
      });
      return;
    }
    exportPartyStatementToPDF(
      party,
      metrics,
      profile
        ? {
            name: (profile as any).business_name || (profile as any).display_name,
            address: (profile as any).business_address,
            phone: (profile as any).business_phone || (profile as any).phone,
            gst: (profile as any).gst_number,
          }
        : undefined
    );
    toast({
      title: "Statement Exported",
      description: `Exported ${party.name}'s statement to PDF.`,
    });
  } catch (err: any) {
    console.error("Failed to export party statement to PDF:", err);
    toast({
      title: "Export Failed",
      description: err.message || "Failed to export statement.",
      variant: "destructive",
    });
  }
}
