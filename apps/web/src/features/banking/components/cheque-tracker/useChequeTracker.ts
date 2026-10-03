import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BankAccount, ChequeRecord } from "../types";
import { ChequeTypeFilter } from "./types";

interface UseChequeTrackerOptions {
  accounts: BankAccount[];
  cheques: ChequeRecord[];
  onCreateCheque: (chequeData: Partial<ChequeRecord>) => Promise<void>;
  onUpdateChequeStatus: (
    chequeId: string,
    status: ChequeRecord["status"],
    bounceReason?: string
  ) => Promise<void>;
}

export function useChequeTracker({
  accounts,
  cheques,
  onCreateCheque,
  onUpdateChequeStatus,
}: UseChequeTrackerOptions) {
  const [typeFilter, setTypeFilter] = useState<ChequeTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [chequeType, setChequeType] = useState<"received" | "issued">("received");
  const [chequeNumber, setChequeNumber] = useState("");
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  // Bounce modal
  const [bounceModalCheque, setBounceModalCheque] = useState<ChequeRecord | null>(null);
  const [bounceReason, setBounceReason] = useState("Insufficient Funds");

  // Metrics
  const pendingReceivables = useMemo(() => {
    return cheques
      .filter(
        (c) =>
          c.chequeType === "received" &&
          (c.status === "pending" || c.status === "deposited")
      )
      .reduce((sum, c) => sum + c.amount, 0);
  }, [cheques]);

  const pendingPayables = useMemo(() => {
    return cheques
      .filter((c) => c.chequeType === "issued" && c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0);
  }, [cheques]);

  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (typeFilter !== "all" && c.chequeType !== typeFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNum = c.chequeNumber.toLowerCase().includes(q);
        const matchParty = c.partyName.toLowerCase().includes(q);
        const matchBank = c.bankName?.toLowerCase().includes(q);
        if (!matchNum && !matchParty && !matchBank) return false;
      }

      return true;
    });
  }, [cheques, typeFilter, statusFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      toast.error("Please select a bank account.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!chequeNumber.trim()) {
      toast.error("Please enter a 6-digit CTS cheque number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateCheque({
        accountId,
        chequeType,
        chequeNumber: chequeNumber.trim(),
        partyName: partyName.trim(),
        amount: numAmount,
        issueDate,
        dueDate,
        bankName: bankName.trim() || undefined,
        notes: notes.trim() || undefined,
        status: "pending",
      });
      toast.success(`Cheque #${chequeNumber} registered in tracker!`);
      setIsAddOpen(false);
      setChequeNumber("");
      setPartyName("");
      setAmount("");
      setBankName("");
      setNotes("");
    } catch (err: any) {
      console.error("Failed to create cheque:", err);
      toast.error(err.message || "Failed to record cheque.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBounce = async () => {
    if (!bounceModalCheque) return;
    try {
      await onUpdateChequeStatus(bounceModalCheque.id, "bounced", bounceReason);
      toast.error(
        `Cheque #${bounceModalCheque.chequeNumber} marked as Bounced (${bounceReason}).`
      );
      setBounceModalCheque(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update cheque status.");
    }
  };

  return {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isAddOpen,
    setIsAddOpen,
    isSubmitting,
    accountId,
    setAccountId,
    chequeType,
    setChequeType,
    chequeNumber,
    setChequeNumber,
    partyName,
    setPartyName,
    amount,
    setAmount,
    issueDate,
    setIssueDate,
    dueDate,
    setDueDate,
    bankName,
    setBankName,
    notes,
    setNotes,
    bounceModalCheque,
    setBounceModalCheque,
    bounceReason,
    setBounceReason,
    pendingReceivables,
    pendingPayables,
    filteredCheques,
    handleCreateSubmit,
    handleConfirmBounce,
  };
}
