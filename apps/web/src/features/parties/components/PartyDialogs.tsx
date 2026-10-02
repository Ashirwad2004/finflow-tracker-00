import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateInvoiceDialog } from "@/features/sales/components/CreateInvoiceDialog";
import { RecordPurchaseDialog } from "@/features/purchases/components/RecordPurchaseDialog";
import { UniversalPaymentDialog } from "@/features/payments/components/UniversalPaymentDialog";
import { PaymentReceiptModal, PaymentReceiptDetails } from "@/features/payments/components/PaymentReceiptModal";
import { PartyDialog } from "./PartyDialog";
import { PartySettlementDialog } from "./PartySettlementDialog";
import { PartyImportExportDialog } from "./PartyImportExportDialog";
import { Party, SettlementTarget } from "../types";

interface PartyDialogsProps {
  // Create / Edit Party
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  selectedParty: Party | null;
  isEditing: boolean;
  isSavingParty: boolean;
  onSaveParty: (partyData: Partial<Party>) => void;

  // Invoice / Purchase
  isCreateInvoiceOpen: boolean;
  setIsCreateInvoiceOpen: (open: boolean) => void;
  partyForNewInvoice: Party | null;
  isRecordPurchaseOpen: boolean;
  setIsRecordPurchaseOpen: (open: boolean) => void;
  partyForNewPurchase: Party | null;

  // Import / Export
  isImportExportOpen: boolean;
  setIsImportExportOpen: (open: boolean) => void;
  userId: string;
  parties: Party[];
  partyLedgerMap: Map<string, any>;
  profile: any;

  // Settlement
  settlementTarget: SettlementTarget | null;
  onCloseSettlement: () => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentDate: string;
  setPaymentDate: (date: string) => void;
  paymentNotes: string;
  setPaymentNotes: (notes: string) => void;
  isSubmittingPayment: boolean;
  onSaveSettlement: () => void;
  formatCurrency: (amount: number) => string;

  // Universal Payment
  isUniversalPaymentOpen: boolean;
  setIsUniversalPaymentOpen: (open: boolean) => void;
  universalPaymentType: "in" | "out";
  activePartyId?: string;
  universalPaymentBillId?: string;
  onUniversalPaymentSuccess: () => void;

  // View Voucher Modal
  isViewVoucherOpen: boolean;
  setIsViewVoucherOpen: (open: boolean) => void;
  selectedVoucherForView: PaymentReceiptDetails | null;

  // Delete Alert
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  partyToDelete: Party | null;
  onConfirmDelete: () => void;
  isDeletingParty: boolean;
}

export const PartyDialogs: React.FC<PartyDialogsProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  selectedParty,
  isEditing,
  isSavingParty,
  onSaveParty,
  isCreateInvoiceOpen,
  setIsCreateInvoiceOpen,
  partyForNewInvoice,
  isRecordPurchaseOpen,
  setIsRecordPurchaseOpen,
  partyForNewPurchase,
  isImportExportOpen,
  setIsImportExportOpen,
  userId,
  parties,
  partyLedgerMap,
  profile,
  settlementTarget,
  onCloseSettlement,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentDate,
  setPaymentDate,
  paymentNotes,
  setPaymentNotes,
  isSubmittingPayment,
  onSaveSettlement,
  formatCurrency,
  isUniversalPaymentOpen,
  setIsUniversalPaymentOpen,
  universalPaymentType,
  activePartyId,
  universalPaymentBillId,
  onUniversalPaymentSuccess,
  isViewVoucherOpen,
  setIsViewVoucherOpen,
  selectedVoucherForView,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  partyToDelete,
  onConfirmDelete,
  isDeletingParty,
}) => {
  return (
    <>
      {/* Create / Edit Party Dialog */}
      <PartyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={onSaveParty}
        party={selectedParty}
        isEditing={isEditing}
        isSaving={isSavingParty}
      />

      {/* Create Invoice Dialog (Pre-populated for Party) */}
      <CreateInvoiceDialog
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        initialParty={partyForNewInvoice}
      />

      {/* Create Purchase Dialog (Pre-populated for Party) */}
      <RecordPurchaseDialog
        open={isRecordPurchaseOpen}
        onOpenChange={setIsRecordPurchaseOpen}
        initialParty={partyForNewPurchase}
      />

      {/* Party Import / Export Dialog */}
      <PartyImportExportDialog
        open={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        userId={userId}
        existingParties={parties}
        partyLedgerMap={partyLedgerMap}
        profile={profile}
      />

      {/* Quick Settlement Dialog */}
      <PartySettlementDialog
        settlementTarget={settlementTarget}
        onClose={onCloseSettlement}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        isSubmittingPayment={isSubmittingPayment}
        onSaveSettlement={onSaveSettlement}
        formatCurrency={formatCurrency}
      />

      {/* Enterprise Multi-Bill Settlement & Advance Voucher Dialog */}
      <UniversalPaymentDialog
        open={isUniversalPaymentOpen}
        onOpenChange={setIsUniversalPaymentOpen}
        mode={universalPaymentType === "in" ? "payment_in" : "payment_out"}
        initialType={universalPaymentType}
        initialPartyId={activePartyId}
        initialBillId={universalPaymentBillId}
        onSuccess={onUniversalPaymentSuccess}
      />

      {/* View Voucher / Receipt Details Modal */}
      <PaymentReceiptModal
        open={isViewVoucherOpen}
        onOpenChange={setIsViewVoucherOpen}
        receiptData={selectedVoucherForView}
        voucher={selectedVoucherForView}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to completely delete{" "}
              <strong>{partyToDelete?.name}</strong> from your directory? This directory action will{" "}
              <strong className="text-foreground">not</strong> delete your underlying sales or
              purchase invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeletingParty ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
