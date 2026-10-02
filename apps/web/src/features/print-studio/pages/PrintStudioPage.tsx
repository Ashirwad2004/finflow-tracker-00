import React from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { cn } from "@/core/lib/utils";
import { usePrintStudioData } from "../hooks/usePrintStudioData";
import { usePrintStudioPreferences } from "../hooks/usePrintStudioPreferences";
import { usePrintActions } from "../hooks/usePrintActions";
import {
  ThemeSelectorCard,
  RecentSalesSelectorCard,
  PageLayoutCard,
  BankDetailsPrintCard,
  UpiPaymentQrCard,
  ProductTaxRateCard,
  PartyPendingBalanceCard,
  TermsConditionsCard,
  PreviewToolbar,
  InvoiceMockPreview,
} from "../components";

export function PrintStudioPage() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const {
    profile,
    recentSales,
    isLoadingRecentSales,
    selectedSale,
    setSelectedSale,
    selectedDocType,
    setSelectedDocType,
    getPartyBalanceForSale,
    activeSaleData,
  } = usePrintStudioData(user);

  const {
    selectedTheme,
    handleThemeSelect,
    pageSize,
    handlePageSizeChange,
    fontSizeFactor,
    handleFontSizeChange,
    customTerms,
    handleTermsChange,
    printBankDetails,
    handlePrintBankToggle,
    printUpiQr,
    handlePrintUpiToggle,
    showItemTaxRate,
    handleShowItemTaxToggle,
    showPartyPreviousBalance,
    handleShowPartyPreviousBalanceToggle,
    upiIdInput,
    setUpiIdInput,
    handleSaveUpiId,
    bankAccounts,
    selectedBankId,
    handleBankSelect,
    activeBankAccount,
  } = usePrintStudioPreferences(user, profile);

  const { handlePrintSale, handleDownloadSale, handlePreviewSale } = usePrintActions({
    selectedTheme,
    selectedDocType,
    pageSize,
    customTerms,
    fontSizeFactor,
    printBankDetails,
    activeBankAccount,
    selectedBankId,
    printUpiQr,
    upiIdInput,
    profile,
    showItemTaxRate,
    showPartyPreviousBalance,
    getPartyBalanceForSale,
  });

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-4 md:p-5 animate-fade-in max-w-[1600px] mx-auto w-full overflow-hidden">
        {/* COMPACT HERO HEADER */}
        <div className="flex items-center justify-between p-3 mb-4 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/10 shrink-0">
          <div className="flex items-center gap-3">
            <Printer className="w-5.5 h-5.5 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-base font-black tracking-tight leading-none flex items-center gap-1.5">
                Print Studio
                <Badge
                  variant="outline"
                  className="text-[8px] font-bold px-1.5 py-0 border-primary/20 text-primary bg-primary/5"
                >
                  Designer
                </Badge>
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Select templates, preview layouts, and generate client invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
          {/* LEFT PANEL: SELECTORS (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-4 shrink-0">
            <ThemeSelectorCard
              selectedTheme={selectedTheme}
              onThemeSelect={handleThemeSelect}
            />

            <RecentSalesSelectorCard
              recentSales={recentSales}
              isLoading={isLoadingRecentSales}
              selectedSale={selectedSale}
              onSelectSale={setSelectedSale}
              formatCurrency={formatCurrency}
            />

            <PageLayoutCard
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              fontSizeFactor={fontSizeFactor}
              onFontSizeChange={handleFontSizeChange}
            />

            <BankDetailsPrintCard
              printBankDetails={printBankDetails}
              onTogglePrintBank={handlePrintBankToggle}
              bankAccounts={bankAccounts}
              selectedBankId={selectedBankId}
              onBankSelect={handleBankSelect}
              activeBankAccount={activeBankAccount}
            />

            <UpiPaymentQrCard
              printUpiQr={printUpiQr}
              onTogglePrintUpi={handlePrintUpiToggle}
              upiIdInput={upiIdInput}
              setUpiIdInput={setUpiIdInput}
              onSaveUpiId={handleSaveUpiId}
            />

            <ProductTaxRateCard
              showItemTaxRate={showItemTaxRate}
              onToggleShowItemTax={handleShowItemTaxToggle}
            />

            <PartyPendingBalanceCard
              showPartyPreviousBalance={showPartyPreviousBalance}
              onTogglePartyPendingBalance={handleShowPartyPreviousBalanceToggle}
            />

            <TermsConditionsCard
              customTerms={customTerms}
              onTermsChange={handleTermsChange}
            />
          </div>

          {/* RIGHT PANEL: LIVE PREVIEW & TOOLBAR (col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
            <PreviewToolbar
              selectedDocType={selectedDocType}
              onSelectDocType={(docType) => {
                setSelectedDocType(docType);
                if (docType !== "invoice") {
                  setSelectedSale(null);
                }
              }}
              activeSaleData={activeSaleData}
              selectedTheme={selectedTheme}
              onPrintSale={handlePrintSale}
              onDownloadSale={handleDownloadSale}
              onPreviewSale={() => handlePreviewSale(activeSaleData)}
            />

            {/* Invoice Canvas Sheet Wrapper */}
            <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/60 p-4 border rounded-xl flex justify-center items-start overflow-auto shadow-inner">
              <div
                className={cn(
                  "w-full transition-all duration-300",
                  pageSize === "a5" ? "max-w-[500px]" : "max-w-[680px]"
                )}
              >
                <div className="w-full relative">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                        .invoice-preview-container-wrap {
                            font-size: ${12 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-xs,
                        .invoice-preview-container-wrap td,
                        .invoice-preview-container-wrap th {
                            font-size: ${12 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-sm {
                            font-size: ${14 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-base {
                            font-size: ${16 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-lg {
                            font-size: ${18 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-xl {
                            font-size: ${20 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-2xl {
                            font-size: ${24 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-[8px] {
                            font-size: ${8 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-[9px] {
                            font-size: ${9 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-[10px] {
                            font-size: ${10 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                        .invoice-preview-container-wrap .text-[11px] {
                            font-size: ${11 * fontSizeFactor * (pageSize === "a5" ? 0.75 : 1.0)}px !important;
                        }
                      `,
                    }}
                  />
                  <div className="invoice-preview-container-wrap w-full">
                    <InvoiceMockPreview
                      sale={activeSaleData}
                      profile={profile}
                      theme={selectedTheme}
                      formatCurrency={formatCurrency}
                      pageSize={pageSize}
                      customTerms={customTerms}
                      printBankDetails={printBankDetails}
                      bankAccount={activeBankAccount}
                      printUpiQr={printUpiQr}
                      upiId={upiIdInput || profile?.upi_id}
                      showItemTaxRate={showItemTaxRate}
                      showPartyPreviousBalance={showPartyPreviousBalance}
                      showPartyPendingBalance={showPartyPreviousBalance}
                      documentType={selectedDocType}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default PrintStudioPage;