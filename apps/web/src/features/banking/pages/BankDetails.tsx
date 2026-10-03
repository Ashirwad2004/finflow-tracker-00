import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/core/lib/auth";

// Banking Modular Components
import {
  BankAccount,
  BankKPIHeader,
  BankAccountsGrid,
  BankAccountModal,
  RecordTransactionModal,
  ContraTransferModal,
  StatementImportModal,
  BankReconciliationWorkspace,
  BankLedgerPassbook,
  ChequeTrackerTab,
  BankAnalyticsTab,
  MerchantUpiBanner,
} from "../components";

// Hooks
import {
  useBankingData,
  useBankingActions,
  useReconciliationChequeActions,
} from "../hooks";

const BankDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<string>("accounts");

  // Modal Visibility States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<"deposit" | "withdrawal">("deposit");
  const [txModalAccountId, setTxModalAccountId] = useState<string | undefined>(undefined);

  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [isStatementImportOpen, setIsStatementImportOpen] = useState(false);
  const [reconcileSelectedAccountId, setReconcileSelectedAccountId] = useState<string>("all");

  // 1. Data Hook
  const {
    accounts,
    transactions,
    statementLines,
    cheques,
    upiId,
    isEditingUpi,
    setIsEditingUpi,
    upiInputVal,
    setUpiInputVal,
    handleSaveUpi,
    accountBalances,
    totalLiquidAssets,
    stats30Days,
    pendingCheques,
    unreconciledStatementLinesCount,
  } = useBankingData(userId);

  // 2. Account & Transaction Actions Hook
  const {
    handleSaveAccount,
    handleDeleteAccount,
    handleSetDefault,
    handleRecordTransaction,
    handleContraTransfer,
    handleDeleteTransaction,
    handleToggleReconciliation,
  } = useBankingActions({
    userId,
    accounts,
    editingAccount,
  });

  // 3. Reconciliation & Cheques Hook
  const {
    handleImportStatement,
    handleApplyAutoMatches,
    handleCreateTxFromStatementLine,
    handleGenerateSampleFeed,
    handleClearStatementFeeds,
    handleCreateCheque,
    handleUpdateChequeStatus,
    handleClearCheque,
  } = useReconciliationChequeActions({
    userId,
    accounts,
    transactions,
    reconcileSelectedAccountId,
    setActiveTab,
  });

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 animate-fade-in pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
              <Landmark className="w-6 h-6 text-primary" />
              Business Banking & Treasury Hub
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Double-entry general ledger, multi-bank passbooks, CTS-2010 cheque clearance, and real statement reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsContraModalOpen(true)}
              variant="outline"
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
              Contra Transfer (F4)
            </Button>

            <Button
              onClick={() => {
                setTxModalType("deposit");
                setTxModalAccountId(undefined);
                setIsTxModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Receive (Credit)
            </Button>

            <Button
              onClick={() => {
                setTxModalType("withdrawal");
                setTxModalAccountId(undefined);
                setIsTxModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Pay (Debit)
            </Button>

            <Button
              onClick={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Top KPI Header */}
        <BankKPIHeader
          totalLiquidAssets={totalLiquidAssets}
          inflow30Days={stats30Days.inbound}
          outflow30Days={stats30Days.outbound}
          pendingChequesCount={pendingCheques.count}
          pendingChequesAmount={pendingCheques.amount}
          unreconciledCount={unreconciledStatementLinesCount}
          onGoToReconciliation={() => setActiveTab("reconcile")}
          onGoToCheques={() => setActiveTab("cheques")}
        />

        {/* Main Content Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="bg-muted p-1 rounded-xl w-full max-w-2xl grid grid-cols-5">
            <TabsTrigger value="accounts" className="rounded-lg text-xs py-1.5 font-semibold">
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-lg text-xs py-1.5 font-semibold">
              Passbook Ledger
            </TabsTrigger>
            <TabsTrigger value="reconcile" className="rounded-lg text-xs py-1.5 font-semibold">
              Reconcile (BRS)
            </TabsTrigger>
            <TabsTrigger value="cheques" className="rounded-lg text-xs py-1.5 font-semibold">
              Cheques & PDCs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs py-1.5 font-semibold">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ACCOUNTS REGISTER */}
          <TabsContent value="accounts" className="space-y-4 outline-none">
            {/* UPI Payment Configuration Banner */}
            <MerchantUpiBanner
              upiId={upiId}
              isEditingUpi={isEditingUpi}
              onStartEdit={() => {
                setUpiInputVal(upiId);
                setIsEditingUpi(true);
              }}
              onCancelEdit={() => setIsEditingUpi(false)}
              upiInputVal={upiInputVal}
              onUpiInputChange={setUpiInputVal}
              onSaveUpi={handleSaveUpi}
            />

            {/* Visual Bank Accounts Grid */}
            <BankAccountsGrid
              accounts={accounts}
              balances={accountBalances}
              onAddAccount={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              onEditAccount={(acc) => {
                setEditingAccount(acc);
                setIsAccountModalOpen(true);
              }}
              onDeleteAccount={handleDeleteAccount}
              onSetDefault={handleSetDefault}
              onDeposit={(accId) => {
                setTxModalType("deposit");
                setTxModalAccountId(accId);
                setIsTxModalOpen(true);
              }}
              onWithdraw={(accId) => {
                setTxModalType("withdrawal");
                setTxModalAccountId(accId);
                setIsTxModalOpen(true);
              }}
            />
          </TabsContent>

          {/* TAB 2: PASSBOOK LEDGER */}
          <TabsContent value="ledger" className="space-y-4 outline-none">
            <BankLedgerPassbook
              accounts={accounts}
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onToggleReconciliation={handleToggleReconciliation}
            />
          </TabsContent>

          {/* TAB 3: RECONCILIATION WORKSPACE (BRS) */}
          <TabsContent value="reconcile" className="space-y-4 outline-none">
            <BankReconciliationWorkspace
              accounts={accounts}
              transactions={transactions}
              statementLines={statementLines}
              selectedAccountId={reconcileSelectedAccountId}
              onSelectAccount={setReconcileSelectedAccountId}
              onOpenImportModal={() => setIsStatementImportOpen(true)}
              onToggleReconciliation={handleToggleReconciliation}
              onApplyAutoMatches={handleApplyAutoMatches}
              onCreateTxFromStatementLine={handleCreateTxFromStatementLine}
              onGenerateSampleFeed={handleGenerateSampleFeed}
              onClearStatementFeeds={handleClearStatementFeeds}
            />
          </TabsContent>

          {/* TAB 4: CHEQUES & PDCs */}
          <TabsContent value="cheques" className="space-y-4 outline-none">
            <ChequeTrackerTab
              accounts={accounts}
              cheques={cheques}
              onCreateCheque={handleCreateCheque}
              onUpdateChequeStatus={handleUpdateChequeStatus}
              onClearCheque={handleClearCheque}
            />
          </TabsContent>

          {/* TAB 5: ANALYTICS & LIQUIDITY */}
          <TabsContent value="analytics" className="space-y-4 outline-none">
            <BankAnalyticsTab
              accounts={accounts}
              transactions={transactions}
              balances={accountBalances}
            />
          </TabsContent>
        </Tabs>

        {/* MODAL: ADD / EDIT BANK ACCOUNT */}
        <BankAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
          editingAccount={editingAccount}
        />

        {/* MODAL: RECORD INWARD / OUTWARD TRANSACTION */}
        <RecordTransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleRecordTransaction}
          accounts={accounts}
          initialType={txModalType}
          initialAccountId={txModalAccountId}
        />

        {/* MODAL: CONTRA TRANSFER (F4) */}
        <ContraTransferModal
          isOpen={isContraModalOpen}
          onClose={() => setIsContraModalOpen(false)}
          onTransfer={handleContraTransfer}
          accounts={accounts}
          balances={accountBalances}
        />

        {/* MODAL: IMPORT REAL STATEMENT (EXCEL / CSV) */}
        <StatementImportModal
          isOpen={isStatementImportOpen}
          onClose={() => setIsStatementImportOpen(false)}
          accounts={accounts}
          onImportSuccess={handleImportStatement}
        />
      </div>
    </AppLayout>
  );
};

export default BankDetailsPage;