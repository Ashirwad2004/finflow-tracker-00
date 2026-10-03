import React from "react";
import { format } from "date-fns";
import { resolveDocumentDescriptor } from "@/utils/generateInvoicePDF";
import { InvoiceMockPreviewProps } from "../../types";
import { SaleInvoicePreview } from "./SaleInvoicePreview";
import { TallyAccountingPreview } from "./TallyAccountingPreview";
import { StandardGradientPreview } from "./StandardGradientPreview";

export const InvoiceMockPreview: React.FC<InvoiceMockPreviewProps> = ({
  sale,
  profile,
  theme,
  formatCurrency,
  pageSize,
  customTerms,
  printBankDetails,
  bankAccount,
  printUpiQr,
  upiId,
  showItemTaxRate,
  showPartyPreviousBalance,
  showPartyPendingBalance,
  documentType = "invoice",
}) => {
  const descriptor = resolveDocumentDescriptor(documentType, undefined, sale?.invoice_number);
  const bizName = profile?.business_name || profile?.display_name || "RupeeBill Ventures";
  const dateToParse = sale.date || sale.created_at;
  const parsedDate = dateToParse ? new Date(dateToParse) : new Date();
  const dateFormatted = isNaN(parsedDate.getTime())
    ? format(new Date(), "dd MMM yyyy")
    : format(parsedDate, "dd MMM yyyy");

  const items = sale.items || [];
  const taxAmount = sale.tax_amount || 0;
  const discount = sale.discount_amount || 0;
  const subtotal = sale.subtotal || sale.total_amount;
  const totalAmount = sale.total_amount;

  const isPaid =
    sale.status === "paid" ||
    (sale.balance_due !== undefined && Number(sale.balance_due) <= 0 && sale.status !== "pending");
  const amountPaid =
    sale.amount_paid !== undefined ? Number(sale.amount_paid) : isPaid ? totalAmount : 0;
  const balanceDue =
    sale.balance_due !== undefined ? Number(sale.balance_due) : Math.max(0, totalAmount - amountPaid);
  const isPartial = sale.status === "partial" || (amountPaid > 0 && balanceDue > 0);

  const isPartyBalEnabled =
    showPartyPendingBalance !== undefined
      ? showPartyPendingBalance
      : (showPartyPreviousBalance ?? true);
  const isCashCustomer = ["cash customer", "cash sale", "walk-in", "cash"].includes(
    (sale.customer_name || "").trim().toLowerCase()
  );
  const shouldRenderPartyBal = isPartyBalEnabled && !isCashCustomer;

  const partyPrevBal =
    sale.previous_balance !== undefined && sale.previous_balance !== null
      ? Number(sale.previous_balance)
      : sale.customer_name && !isCashCustomer
      ? 8500
      : 0;
  const partyClosingDue =
    sale.party_pending_balance !== undefined && sale.party_pending_balance !== null
      ? Number(sale.party_pending_balance)
      : sale.total_due_balance !== undefined && sale.total_due_balance !== null
      ? Number(sale.total_due_balance)
      : partyPrevBal + balanceDue;

  const effectiveUpi = (upiId || profile?.upi_id || localStorage.getItem("rupeebill_upi_id") || "").trim();
  const amountToPay = balanceDue > 0 ? balanceDue : totalAmount;
  const upiUri = effectiveUpi
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
        bizName.slice(0, 50)
      )}&am=${amountToPay.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        descriptor.title
      )}-${encodeURIComponent(sale.invoice_number || "DOC")}`
    : "";

  let taxRate = Number(sale.tax_rate) || 0;
  if (taxRate === 0 && taxAmount > 0) {
    const taxableAmount = Math.max(1, Number(subtotal || 0) - Number(discount || 0));
    taxRate = Math.round((Number(taxAmount) / taxableAmount) * 100);
  }
  if (taxRate === 0 && items.length > 0 && items[0].tax_rate) {
    taxRate = Number(items[0].tax_rate) || 0;
  }

  const cgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";
  const sgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";

  if (theme === "sale-invoice") {
    return (
      <SaleInvoicePreview
        pageSize={pageSize}
        bizName={bizName}
        profile={profile}
        sale={sale}
        dateFormatted={dateFormatted}
        descriptor={descriptor}
        items={items}
        taxRate={taxRate}
        cgst={cgst}
        sgst={sgst}
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        balanceDue={balanceDue}
        isPaid={isPaid}
        isPartial={isPartial}
        shouldRenderPartyBal={shouldRenderPartyBal}
        partyPrevBal={partyPrevBal}
        partyClosingDue={partyClosingDue}
        printBankDetails={printBankDetails}
        bankAccount={bankAccount}
        printUpiQr={printUpiQr}
        effectiveUpi={effectiveUpi}
        upiUri={upiUri}
        customTerms={customTerms}
        formatCurrency={formatCurrency}
      />
    );
  }

  if (theme === "tally-accounting") {
    return (
      <TallyAccountingPreview
        pageSize={pageSize}
        bizName={bizName}
        profile={profile}
        sale={sale}
        dateFormatted={dateFormatted}
        descriptor={descriptor}
        items={items}
        taxRate={taxRate}
        cgst={cgst}
        sgst={sgst}
        taxAmount={taxAmount}
        discount={discount}
        subtotal={subtotal}
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        balanceDue={balanceDue}
        isPaid={isPaid}
        isPartial={isPartial}
        shouldRenderPartyBal={shouldRenderPartyBal}
        partyPrevBal={partyPrevBal}
        partyClosingDue={partyClosingDue}
        printBankDetails={printBankDetails}
        bankAccount={bankAccount}
        printUpiQr={printUpiQr}
        effectiveUpi={effectiveUpi}
        upiUri={upiUri}
        showItemTaxRate={showItemTaxRate}
        customTerms={customTerms}
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <StandardGradientPreview
      theme={theme}
      pageSize={pageSize}
      bizName={bizName}
      profile={profile}
      sale={sale}
      dateFormatted={dateFormatted}
      descriptor={descriptor}
      items={items}
      taxRate={taxRate}
      cgst={cgst}
      sgst={sgst}
      taxAmount={taxAmount}
      discount={discount}
      subtotal={subtotal}
      totalAmount={totalAmount}
      amountPaid={amountPaid}
      balanceDue={balanceDue}
      isPaid={isPaid}
      isPartial={isPartial}
      shouldRenderPartyBal={shouldRenderPartyBal}
      partyPrevBal={partyPrevBal}
      partyClosingDue={partyClosingDue}
      printBankDetails={printBankDetails}
      bankAccount={bankAccount}
      printUpiQr={printUpiQr}
      effectiveUpi={effectiveUpi}
      upiUri={upiUri}
      showItemTaxRate={showItemTaxRate}
      customTerms={customTerms}
      formatCurrency={formatCurrency}
    />
  );
};
