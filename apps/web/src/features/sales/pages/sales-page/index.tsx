import { AppLayout } from "@/components/layout/AppLayout";
import { PaymentInRegister } from "@/features/payments/components/PaymentInRegister";
import { SalesOrderRegister } from "../../components/SalesOrderRegister";
import { SalesMetricsStrip } from "../../components/SalesMetricsStrip";
import { SalesTable } from "../../components/SalesTable";
import { useSalesPageState } from "./useSalesPageState";
import { SalesPageHeader } from "./SalesPageHeader";
import { SalesPageTabNav } from "./SalesPageTabNav";
import { SalesPageModals } from "./SalesPageModals";

export default function SalesPage() {
  const {
    user,
    navigate,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    isCreateOpen,
    setIsCreateOpen,
    editingInvoice,
    setEditingInvoice,
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSetting,
    resetSettings,
    parties,
    products,
    invoices,
    isLoading,
    outstandingTotal,
    overdueTotal,
    paidThisMonth,
    // Actions & Targets
    paymentTarget,
    setPaymentTarget,
    transcriptTarget,
    setTranscriptTarget,
    isPaymentInOpen,
    setIsPaymentInOpen,
    whatsappInvoice,
    setWhatsappInvoice,
    whatsappPdfBase64,
    isBulkWhatsAppOpen,
    setIsBulkWhatsAppOpen,
    handleOpenRecordPayment,
    handleOpenTranscript,
    handlePreview,
    handlePrint,
    handleDownload,
    handleShare,
    handleOpenWhatsApp,
    handleGenerateEInvoice,
    handleBulkWhatsApp,
    handleBulkEmail,
    handleDelete,
    handleEdit,
  } = useSalesPageState();

  return (
    <AppLayout>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 animate-fade-in text-slate-900 dark:text-slate-100 font-display flex flex-col h-full">
        {/* Header */}
        <SalesPageHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onBulkWhatsApp={handleBulkWhatsApp}
          onBulkEmail={handleBulkEmail}
          onOpenPaymentIn={() => {
            setPaymentTarget(null);
            setIsPaymentInOpen(true);
          }}
          onOpenCreateInvoice={() => {
            setEditingInvoice(null);
            setIsCreateOpen(true);
          }}
        />

        {/* Tab Switcher */}
        <SalesPageTabNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          invoices={invoices}
        />

        {/* Tab Content */}
        {activeTab === "sales-order" ? (
          <SalesOrderRegister
            userId={user?.id || ""}
            parties={parties}
            products={products}
          />
        ) : activeTab === "payment-in" ? (
          <PaymentInRegister
            sales={invoices}
            parties={parties}
            onOpenRecordPaymentIn={() => {
              setPaymentTarget(null);
              setIsPaymentInOpen(true);
            }}
            onOpenTranscript={handleOpenTranscript}
            onPreviewInvoice={handlePreview}
          />
        ) : (
          <>
            <SalesMetricsStrip
              outstandingTotal={outstandingTotal}
              overdueTotal={overdueTotal}
              paidThisMonth={paidThisMonth}
            />

            <SalesTable
              invoices={invoices}
              isLoading={isLoading}
              searchTerm={searchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onEdit={handleEdit}
              onPrint={handlePrint}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onShare={handleShare}
              onWhatsApp={handleOpenWhatsApp}
              onGenerateEInvoice={handleGenerateEInvoice}
              onDelete={handleDelete}
              onOpenRecordPayment={handleOpenRecordPayment}
              onOpenTranscript={handleOpenTranscript}
            />
          </>
        )}

        {/* Sales Dialogs & Modals */}
        <SalesPageModals
          isCreateOpen={isCreateOpen}
          setIsCreateOpen={setIsCreateOpen}
          editingInvoice={editingInvoice}
          setEditingInvoice={setEditingInvoice}
          settings={settings}
          updateSetting={updateSetting}
          resetSettings={resetSettings}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          isPaymentInOpen={isPaymentInOpen}
          setIsPaymentInOpen={setIsPaymentInOpen}
          paymentTarget={paymentTarget}
          setPaymentTarget={setPaymentTarget}
          transcriptTarget={transcriptTarget}
          setTranscriptTarget={setTranscriptTarget}
          whatsappInvoice={whatsappInvoice}
          setWhatsappInvoice={setWhatsappInvoice}
          whatsappPdfBase64={whatsappPdfBase64 || undefined}
          isBulkWhatsAppOpen={isBulkWhatsAppOpen}
          setIsBulkWhatsAppOpen={setIsBulkWhatsAppOpen}
          invoices={invoices}
          navigate={navigate}
        />
      </div>
    </AppLayout>
  );
}
