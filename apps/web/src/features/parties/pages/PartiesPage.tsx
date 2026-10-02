import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Party } from "../types";
import {
  usePartyData,
  usePartyMutations,
  usePartySettlement,
  usePartyExports,
} from "../hooks";
import {
  PartyMasterSidebar,
  PartyDetailHeader,
  PartyTransactionsLedger,
  PartyTopBar,
  PartyDialogs,
} from "../components";

const PartiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"All Types" | "Customer" | "Vendor" | "Both">("All Types");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "sales" | "purchases">("all");

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Invoice / Purchase Creation for Party
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [partyForNewInvoice, setPartyForNewInvoice] = useState<Party | null>(null);
  const [isRecordPurchaseOpen, setIsRecordPurchaseOpen] = useState(false);
  const [partyForNewPurchase, setPartyForNewPurchase] = useState<Party | null>(null);

  // Deletion States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

  // 1. Data Hook
  const {
    profile,
    parties,
    isLoadingParties,
    partyLedgerMap,
    directorySummary,
    filteredParties,
    activeParty,
    activePartyMetrics,
    activePartyTransactions,
  } = usePartyData({
    user,
    searchTerm,
    filterType,
    selectedPartyId,
    setSelectedPartyId,
    activeTab,
  });

  // 2. Mutations Hook
  const {
    createMutation,
    updateMutation,
    deleteMutation,
    handleSaveParty,
    confirmDelete,
  } = usePartyMutations({
    user,
    parties,
    selectedParty,
    selectedPartyId,
    setSelectedPartyId,
    partyToDelete,
    setIsDialogOpen,
    setIsDeleteDialogOpen,
  });

  // 3. Settlement & Payments Hook
  const {
    settlementTarget,
    setSettlementTarget,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    paymentNotes,
    setPaymentNotes,
    isSubmittingPayment,
    isUniversalPaymentOpen,
    setIsUniversalPaymentOpen,
    universalPaymentType,
    universalPaymentBillId,
    selectedVoucherForView,
    isViewVoucherOpen,
    setIsViewVoucherOpen,
    handleOpenUniversalPayment,
    handleViewPartyVoucher,
    handleOpenSettlement,
    handleQuickPartyPayment,
    handleSaveSettlement,
  } = usePartySettlement({
    user,
    profile,
    activeParty,
    activePartyMetrics,
    formatCurrency,
  });

  // 4. PDF & Excel Exports Hook
  const {
    handleDownloadInvoicePDF,
    handlePreviewInvoicePDF,
    handleDownloadPurchasePDF,
    handlePreviewPurchasePDF,
    handleExportPartiesExcel,
    handleExportPartiesPDF,
    handleExportSinglePartyExcel,
    handleExportSinglePartyPDF,
  } = usePartyExports({
    activeParty,
    parties,
    filteredParties,
    partyLedgerMap,
    profile,
    filterType,
    toast: (msg: any) => msg,
  });

  // Action Triggers
  const handleAddClick = () => {
    setSelectedParty(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEditClick = (party: Party) => {
    setSelectedParty(party);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (party: Party) => {
    setPartyToDelete(party);
    setIsDeleteDialogOpen(true);
  };

  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    setShowMobileDetail(true);
  };

  const handleCreateInvoiceForParty = (party: Party) => {
    setPartyForNewInvoice(party);
    setIsCreateInvoiceOpen(true);
  };

  const handleCreatePurchaseForParty = (party: Party) => {
    setPartyForNewPurchase(party);
    setIsRecordPurchaseOpen(true);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-2.5 sm:p-3 md:p-4 text-slate-900 dark:text-slate-100 font-display overflow-hidden">
        {/* Top Control Bar & KPI Strip */}
        <PartyTopBar
          directorySummary={directorySummary}
          formatCurrency={formatCurrency}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          onExportPartiesExcel={handleExportPartiesExcel}
          onExportPartiesPDF={handleExportPartiesPDF}
          onAddClick={handleAddClick}
        />

        {/* Main Master-Detail Split Screen Container */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 pt-3 overflow-hidden">
          {/* LEFT PANEL: Master Directory List */}
          <PartyMasterSidebar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={(val) => setFilterType(val as any)}
            isLoading={isLoadingParties}
            filteredParties={filteredParties}
            selectedPartyId={selectedPartyId}
            partyLedgerMap={partyLedgerMap}
            onPartySelect={handlePartySelect}
            onAddClick={handleAddClick}
            onOpenImportExport={() => setIsImportExportOpen(true)}
            formatCurrency={formatCurrency}
            showMobileDetail={showMobileDetail}
          />

          {/* RIGHT PANEL: Master-Detail Active Party View & Statement */}
          <div
            className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0 ${
              showMobileDetail ? "flex" : "hidden md:flex"
            }`}
          >
            {activeParty && activePartyMetrics ? (
              <>
                <PartyDetailHeader
                  activeParty={activeParty}
                  activePartyMetrics={activePartyMetrics}
                  onBackToList={() => setShowMobileDetail(false)}
                  onOpenPayment={handleQuickPartyPayment}
                  onCreateInvoice={handleCreateInvoiceForParty}
                  onCreatePurchase={handleCreatePurchaseForParty}
                  onExportExcelStatement={handleExportSinglePartyExcel}
                  onExportPDFStatement={handleExportSinglePartyPDF}
                  onNavigateLedger={(partyName) =>
                    navigate(`/reports?tab=ledger&party=${encodeURIComponent(partyName)}`)
                  }
                  onEditParty={handleEditClick}
                  onDeleteParty={handleDeleteClick}
                  formatCurrency={formatCurrency}
                />
                <PartyTransactionsLedger
                  activeParty={activeParty}
                  activePartyMetrics={activePartyMetrics}
                  activePartyTransactions={activePartyTransactions}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  formatCurrency={formatCurrency}
                  onCreateInvoiceForParty={handleCreateInvoiceForParty}
                  onEditClick={handleEditClick}
                  onOpenUniversalPayment={handleOpenUniversalPayment}
                  onViewPartyVoucher={handleViewPartyVoucher}
                  onPreviewInvoicePDF={handlePreviewInvoicePDF}
                  onDownloadInvoicePDF={handleDownloadInvoicePDF}
                  onPreviewPurchasePDF={handlePreviewPurchasePDF}
                  onDownloadPurchasePDF={handleDownloadPurchasePDF}
                />
              </>
            ) : (
              <PartyTransactionsLedger
                activeParty={null}
                activePartyMetrics={{
                  partySales: [],
                  partyPurchases: [],
                  totalSalesAmount: 0,
                  totalSalesPaid: 0,
                  salesBalanceDue: 0,
                  totalPurchasesAmount: 0,
                  totalPurchasesPaid: 0,
                  purchasesBalanceDue: 0,
                  receivable: 0,
                  payable: 0,
                  totalRecords: 0,
                }}
                activePartyTransactions={[]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                formatCurrency={formatCurrency}
                onCreateInvoiceForParty={handleCreateInvoiceForParty}
                onEditClick={handleEditClick}
                onOpenUniversalPayment={handleOpenUniversalPayment}
                onViewPartyVoucher={handleViewPartyVoucher}
                onPreviewInvoicePDF={handlePreviewInvoicePDF}
                onDownloadInvoicePDF={handleDownloadInvoicePDF}
                onPreviewPurchasePDF={handlePreviewPurchasePDF}
                onDownloadPurchasePDF={handleDownloadPurchasePDF}
              />
            )}
          </div>
        </div>

        {/* Dialogs Coordinator */}
        <PartyDialogs
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          selectedParty={selectedParty}
          isEditing={isEditing}
          isSavingParty={createMutation.isPending || updateMutation.isPending}
          onSaveParty={(data) => handleSaveParty(data, isEditing)}
          isCreateInvoiceOpen={isCreateInvoiceOpen}
          setIsCreateInvoiceOpen={setIsCreateInvoiceOpen}
          partyForNewInvoice={partyForNewInvoice}
          isRecordPurchaseOpen={isRecordPurchaseOpen}
          setIsRecordPurchaseOpen={setIsRecordPurchaseOpen}
          partyForNewPurchase={partyForNewPurchase}
          isImportExportOpen={isImportExportOpen}
          setIsImportExportOpen={setIsImportExportOpen}
          userId={user?.id || ""}
          parties={parties}
          partyLedgerMap={partyLedgerMap}
          profile={profile}
          settlementTarget={settlementTarget}
          onCloseSettlement={() => setSettlementTarget(null)}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentDate={paymentDate}
          setPaymentDate={setPaymentDate}
          paymentNotes={paymentNotes}
          setPaymentNotes={setPaymentNotes}
          isSubmittingPayment={isSubmittingPayment}
          onSaveSettlement={handleSaveSettlement}
          formatCurrency={formatCurrency}
          isUniversalPaymentOpen={isUniversalPaymentOpen}
          setIsUniversalPaymentOpen={setIsUniversalPaymentOpen}
          universalPaymentType={universalPaymentType}
          activePartyId={activeParty?.id}
          universalPaymentBillId={universalPaymentBillId}
          onUniversalPaymentSuccess={() => {
            if (user?.id) {
              queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
              queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
              queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
            }
          }}
          isViewVoucherOpen={isViewVoucherOpen}
          setIsViewVoucherOpen={setIsViewVoucherOpen}
          selectedVoucherForView={selectedVoucherForView}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          partyToDelete={partyToDelete}
          onConfirmDelete={confirmDelete}
          isDeletingParty={deleteMutation.isPending}
        />
      </div>
    </AppLayout>
  );
};

export default PartiesPage;