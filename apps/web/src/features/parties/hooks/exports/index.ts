import { Party } from "../../types";
import { UsePartyExportsProps } from "./types";
import {
  downloadPartyInvoicePdf,
  previewPartyInvoicePdf,
} from "./partyInvoicePdfActions";
import {
  downloadPartyPurchasePdf,
  previewPartyPurchasePdf,
} from "./partyPurchasePdfActions";
import {
  exportPartiesExcelAction,
  exportPartiesPdfAction,
  exportSinglePartyExcelAction,
  exportSinglePartyPdfAction,
} from "./partyStatementExportActions";

export * from "./types";
export * from "./partyInvoicePdfActions";
export * from "./partyPurchasePdfActions";
export * from "./partyStatementExportActions";

export function usePartyExports({
  activeParty,
  parties,
  filteredParties,
  partyLedgerMap,
  profile,
  filterType,
  toast,
}: UsePartyExportsProps) {
  const handleDownloadInvoicePDF = (invoice: any) => {
    downloadPartyInvoicePdf(invoice, activeParty, parties, partyLedgerMap, profile);
  };

  const handlePreviewInvoicePDF = (invoice: any) => {
    return previewPartyInvoicePdf(invoice, activeParty, parties, partyLedgerMap, profile);
  };

  const handleDownloadPurchasePDF = (purchase: any) => {
    downloadPartyPurchasePdf(purchase, activeParty, profile);
  };

  const handlePreviewPurchasePDF = (purchase: any) => {
    return previewPartyPurchasePdf(purchase, activeParty, profile);
  };

  const handleExportPartiesExcel = () => {
    exportPartiesExcelAction(
      parties,
      filteredParties,
      partyLedgerMap,
      profile,
      filterType,
      toast
    );
  };

  const handleExportPartiesPDF = () => {
    exportPartiesPdfAction(
      parties,
      filteredParties,
      partyLedgerMap,
      profile,
      filterType,
      toast
    );
  };

  const handleExportSinglePartyExcel = (party: Party) => {
    exportSinglePartyExcelAction(party, partyLedgerMap, profile, toast);
  };

  const handleExportSinglePartyPDF = (party: Party) => {
    exportSinglePartyPdfAction(party, partyLedgerMap, profile, toast);
  };

  return {
    handleDownloadInvoicePDF,
    handlePreviewInvoicePDF,
    handleDownloadPurchasePDF,
    handlePreviewPurchasePDF,
    handleExportPartiesExcel,
    handleExportPartiesPDF,
    handleExportSinglePartyExcel,
    handleExportSinglePartyPDF,
  };
}
