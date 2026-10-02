import { format, startOfDay, endOfDay } from "date-fns";
import { parsePaymentTranscript } from "@/features/payments";

export interface LedgerTransaction {
  id: string;
  date: string;
  type:
    | "sale"
    | "purchase"
    | "payment_received"
    | "payment_made"
    | "credit_note"
    | "debit_note"
    | "opening_balance";
  amount: number;
  amount_paid?: number;
  balance_due?: number;
  status?: string;
  ref: string;
  debit: number;
  credit: number;
  runningBalance: number;
  notes?: string;
  payment_method?: string;
  voucher_number?: string;
}

export const parseSafeDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
  if (typeof d === "string") {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, day] = s.split("-").map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
      const [day, m, y] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    }
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

export interface ComputeDetailedPartyLedgerParams {
  selectedParty: string;
  activePartyRecord: any;
  partiesDirectory: any[];
  sales: any[];
  purchases: any[];
  dateRange: { from?: Date; to?: Date };
}

export interface DetailedPartyLedgerResult {
  fullLedger: LedgerTransaction[];
  closingBalance: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  hasBroughtForward: boolean;
  initialBroughtForward: number;
}

export function computeDetailedPartyLedger({
  selectedParty,
  activePartyRecord,
  partiesDirectory,
  sales,
  purchases,
  dateRange,
}: ComputeDetailedPartyLedgerParams): DetailedPartyLedgerResult {
  if (!selectedParty || selectedParty === "all") {
    return {
      fullLedger: [],
      closingBalance: 0,
      totalPeriodDebit: 0,
      totalPeriodCredit: 0,
      hasBroughtForward: false,
      initialBroughtForward: 0,
    };
  }

  const normSelected = selectedParty.trim().toLowerCase();
  const partyId = activePartyRecord?.id;
  const rawTransactions: Omit<LedgerTransaction, "runningBalance">[] = [];

  // 1. OPENING BALANCE (Recorded in Parties Directory)
  const masterParty = partiesDirectory.find(
    (p: any) =>
      (partyId && p.id === partyId) ||
      (p.name && p.name.trim().toLowerCase() === normSelected)
  );

  if (masterParty && Number(masterParty.opening_balance) > 0) {
    const openBal = Number(masterParty.opening_balance);
    const isReceivable = masterParty.opening_balance_type
      ? masterParty.opening_balance_type === "to_receive"
      : masterParty.type !== "vendor";

    rawTransactions.push({
      id: `open-bal-${masterParty.id}`,
      date: masterParty.created_at || "2020-01-01T00:00:00.000Z",
      type: "opening_balance",
      amount: openBal,
      amount_paid: 0,
      balance_due: openBal,
      status: isReceivable ? "to_receive" : "to_pay",
      ref: "Opening Balance (Master Record)",
      debit: isReceivable ? openBal : 0,
      credit: !isReceivable ? openBal : 0,
      voucher_number: "OPENING",
    });
  }

  // 2. PROCESS SALES (Receivables & Collections)
  sales.forEach((sale: any) => {
    const custName = (sale.customer_name || "").trim().toLowerCase();
    const isMatch =
      (partyId && sale.party_id && sale.party_id === partyId) ||
      custName === normSelected;
    if (!isMatch) return;

    const txDate = sale.date || sale.created_at || new Date().toISOString();
    const total = Number(sale.total_amount) || 0;
    const paid =
      sale.amount_paid != null
        ? Number(sale.amount_paid)
        : sale.status === "paid"
        ? total
        : 0;
    const due =
      sale.balance_due != null
        ? Number(sale.balance_due)
        : Math.max(0, total - paid);
    const docType = (sale.document_type || "invoice").toLowerCase();

    if (docType === "receipt") {
      // Standalone Receipt (Payment In without bill)
      rawTransactions.push({
        id: `sale-rcpt-standalone-${sale.id}`,
        date: txDate,
        type: "payment_received",
        amount: total || paid,
        amount_paid: total || paid,
        balance_due: 0,
        status: "paid",
        ref: `Payment In / Receipt #${sale.invoice_number || "REC"} (${
          sale.payment_method || "Cash/Bank"
        })`,
        debit: 0,
        credit: total || paid,
        notes: sale.notes,
        payment_method: sale.payment_method,
        voucher_number: sale.invoice_number,
      });
    } else if (docType === "credit_note") {
      // Customer Return / Credit Note (Reduces customer debt -> Credit)
      rawTransactions.push({
        id: `sale-cn-${sale.id}`,
        date: txDate,
        type: "credit_note",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: sale.status,
        ref: `Sales Credit Note #${sale.invoice_number || "CN"}`,
        debit: 0,
        credit: total,
        notes: sale.notes,
        voucher_number: sale.invoice_number,
      });
    } else if (docType === "debit_note") {
      // Customer Debit Note (Increases customer debt -> Debit)
      rawTransactions.push({
        id: `sale-dn-${sale.id}`,
        date: txDate,
        type: "debit_note",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: sale.status,
        ref: `Sales Debit Note #${sale.invoice_number || "DN"}`,
        debit: total,
        credit: 0,
        notes: sale.notes,
        voucher_number: sale.invoice_number,
      });
    } else {
      // Standard Sales Invoice: DEBIT to Customer
      rawTransactions.push({
        id: `sale-inv-${sale.id}`,
        date: txDate,
        type: "sale",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: sale.status,
        ref: `Sales Invoice #${sale.invoice_number || "INV"}`,
        debit: total,
        credit: 0,
        notes: sale.notes,
        payment_method: sale.payment_method,
        voucher_number: sale.invoice_number,
      });

      // Extract payment transcript vouchers if any
      const { payments } = parsePaymentTranscript(sale.notes, {
        total_amount: total,
        amount_paid: paid,
        balance_due: due,
        status: sale.status,
        payment_method: sale.payment_method,
        date: sale.date,
        type: "sale",
      });

      let totalVoucherAmount = 0;
      if (payments && payments.length > 0) {
        payments.forEach((voucher: any, idx: number) => {
          const vDate = voucher.date || txDate;
          const vAmount = Number(voucher.amount) || 0;
          if (vAmount > 0) {
            totalVoucherAmount += vAmount;
            const method = (
              voucher.payment_method ||
              sale.payment_method ||
              "Cash"
            ).toUpperCase();
            const refInfo = voucher.reference_number
              ? ` (Ref: ${voucher.reference_number})`
              : "";
            rawTransactions.push({
              id: `sale-pmt-vch-${sale.id}-${voucher.id || idx}`,
              date: vDate,
              type: "payment_received",
              amount: vAmount,
              amount_paid: vAmount,
              balance_due: 0,
              status: "paid",
              ref: `Receipt #${voucher.voucher_number || sale.invoice_number} against #${
                sale.invoice_number || "INV"
              } [${method}${refInfo}]`,
              debit: 0,
              credit: vAmount,
              notes: voucher.notes,
              payment_method: voucher.payment_method,
              voucher_number: voucher.voucher_number,
            });
          }
        });
      }

      const unvoucheredPaid = Math.max(0, paid - totalVoucherAmount);
      if (unvoucheredPaid > 0) {
        rawTransactions.push({
          id: `sale-pmt-init-${sale.id}`,
          date: txDate,
          type: "payment_received",
          amount: unvoucheredPaid,
          amount_paid: unvoucheredPaid,
          balance_due: 0,
          status: "paid",
          ref: `Receipt against #${sale.invoice_number || "INV"} (${
            sale.payment_method || "Cash/Bank"
          })`,
          debit: 0,
          credit: unvoucheredPaid,
          payment_method: sale.payment_method,
          voucher_number: sale.invoice_number,
        });
      }
    }
  });

  // 3. PROCESS PURCHASES (Payables & Disbursements)
  purchases.forEach((purchase: any) => {
    const vendName = (purchase.vendor_name || "").trim().toLowerCase();
    const isMatch =
      (partyId && purchase.party_id && purchase.party_id === partyId) ||
      vendName === normSelected;
    if (!isMatch) return;

    const txDate =
      purchase.date || purchase.created_at || new Date().toISOString();
    const total = Number(purchase.total_amount) || 0;
    const paid =
      purchase.amount_paid != null
        ? Number(purchase.amount_paid)
        : purchase.status === "paid"
        ? total
        : 0;
    const due =
      purchase.balance_due != null
        ? Number(purchase.balance_due)
        : Math.max(0, total - paid);
    const docType = (purchase.document_type || "bill").toLowerCase();

    if (docType === "payment") {
      // Standalone Payment Out (reduces payable)
      rawTransactions.push({
        id: `pur-pmt-standalone-${purchase.id}`,
        date: txDate,
        type: "payment_made",
        amount: total || paid,
        amount_paid: total || paid,
        balance_due: 0,
        status: "paid",
        ref: `Payment Out #${purchase.bill_number || "PAY"} (${
          purchase.payment_method || "Cash/Bank"
        })`,
        debit: total || paid,
        credit: 0,
        notes: purchase.notes,
        payment_method: purchase.payment_method,
        voucher_number: purchase.bill_number,
      });
    } else if (docType === "debit_note") {
      // Purchase Debit Note: Return to vendor, decreases payable -> Debit
      rawTransactions.push({
        id: `pur-dn-${purchase.id}`,
        date: txDate,
        type: "debit_note",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: purchase.status,
        ref: `Purchase Debit Note #${purchase.bill_number || "DN"}`,
        debit: total,
        credit: 0,
        notes: purchase.notes,
        voucher_number: purchase.bill_number,
      });
    } else if (docType === "credit_note") {
      // Purchase Credit Note: increases payable -> Credit
      rawTransactions.push({
        id: `pur-cn-${purchase.id}`,
        date: txDate,
        type: "credit_note",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: purchase.status,
        ref: `Purchase Credit Note #${purchase.bill_number || "CN"}`,
        debit: 0,
        credit: total,
        notes: purchase.notes,
        voucher_number: purchase.bill_number,
      });
    } else {
      // Standard Purchase Bill: CREDIT to Supplier
      rawTransactions.push({
        id: `pur-bill-${purchase.id}`,
        date: txDate,
        type: "purchase",
        amount: total,
        amount_paid: paid,
        balance_due: due,
        status: purchase.status,
        ref: `Purchase Bill #${purchase.bill_number || "BILL"}`,
        debit: 0,
        credit: total,
        notes: purchase.notes,
        payment_method: purchase.payment_method,
        voucher_number: purchase.bill_number,
      });

      // Extract payment transcript vouchers if any
      const { payments } = parsePaymentTranscript(purchase.notes, {
        total_amount: total,
        amount_paid: paid,
        balance_due: due,
        status: purchase.status,
        payment_method: purchase.payment_method,
        date: purchase.date,
        type: "purchase",
      });

      let totalVoucherAmount = 0;
      if (payments && payments.length > 0) {
        payments.forEach((voucher: any, idx: number) => {
          const vDate = voucher.date || txDate;
          const vAmount = Number(voucher.amount) || 0;
          if (vAmount > 0) {
            totalVoucherAmount += vAmount;
            const method = (
              voucher.payment_method ||
              purchase.payment_method ||
              "Cash"
            ).toUpperCase();
            const refInfo = voucher.reference_number
              ? ` (Ref: ${voucher.reference_number})`
              : "";
            rawTransactions.push({
              id: `pur-pmt-vch-${purchase.id}-${voucher.id || idx}`,
              date: vDate,
              type: "payment_made",
              amount: vAmount,
              amount_paid: vAmount,
              balance_due: 0,
              status: "paid",
              ref: `Payment #${voucher.voucher_number || purchase.bill_number} against Bill #${
                purchase.bill_number || "BILL"
              } [${method}${refInfo}]`,
              debit: vAmount,
              credit: 0,
              notes: voucher.notes,
              payment_method: voucher.payment_method,
              voucher_number: voucher.voucher_number,
            });
          }
        });
      }

      const unvoucheredPaid = Math.max(0, paid - totalVoucherAmount);
      if (unvoucheredPaid > 0) {
        rawTransactions.push({
          id: `pur-pmt-init-${purchase.id}`,
          date: txDate,
          type: "payment_made",
          amount: unvoucheredPaid,
          amount_paid: unvoucheredPaid,
          balance_due: 0,
          status: "paid",
          ref: `Payment against Bill #${purchase.bill_number || "BILL"} (${
            purchase.payment_method || "Cash/Bank"
          })`,
          debit: unvoucheredPaid,
          credit: 0,
          payment_method: purchase.payment_method,
          voucher_number: purchase.bill_number,
        });
      }
    }
  });

  // 4. CHRONOLOGICAL SORTING
  rawTransactions.sort((a, b) => {
    const timeA = parseSafeDate(a.date).getTime();
    const timeB = parseSafeDate(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const priority = (t: string) => {
      if (t === "opening_balance") return 0;
      if (t === "sale" || t === "purchase") return 1;
      if (t === "debit_note" || t === "credit_note") return 2;
      return 3;
    };
    return priority(a.type) - priority(b.type);
  });

  // 5. DATE RANGE FILTER WITH BALANCE BROUGHT FORWARD (b/f)
  let initialBroughtForward = 0;
  let filteredRaw: Omit<LedgerTransaction, "runningBalance">[] = [];
  let hasBF = false;

  if (dateRange.from) {
    hasBF = true;
    const startPeriod = startOfDay(dateRange.from).getTime();
    const endPeriod = dateRange.to
      ? endOfDay(dateRange.to).getTime()
      : Infinity;

    rawTransactions.forEach((tx) => {
      const txTime = parseSafeDate(tx.date).getTime();
      if (txTime < startPeriod) {
        initialBroughtForward += tx.debit - tx.credit;
      } else if (txTime <= endPeriod) {
        filteredRaw.push(tx);
      }
    });
  } else if (dateRange.to) {
    const endPeriod = endOfDay(dateRange.to).getTime();
    rawTransactions.forEach((tx) => {
      const txTime = parseSafeDate(tx.date).getTime();
      if (txTime <= endPeriod) {
        filteredRaw.push(tx);
      }
    });
  } else {
    filteredRaw = [...rawTransactions];
  }

  // 6. ACCUMULATE RUNNING BALANCE
  const ledgerList: LedgerTransaction[] = [];
  let currentBalance = 0;
  let periodDr = 0;
  let periodCr = 0;

  if (dateRange.from) {
    currentBalance = initialBroughtForward;
    ledgerList.push({
      id: "opening-balance-bfwd",
      date: format(dateRange.from, "yyyy-MM-dd"),
      type: "opening_balance",
      amount: Math.abs(initialBroughtForward),
      ref: "Opening Balance b/f (Prior Period)",
      debit: initialBroughtForward > 0 ? initialBroughtForward : 0,
      credit: initialBroughtForward < 0 ? Math.abs(initialBroughtForward) : 0,
      runningBalance: initialBroughtForward,
      status: "cleared",
      voucher_number: "B/FWD",
    });
  }

  filteredRaw.forEach((tx) => {
    currentBalance += tx.debit - tx.credit;
    periodDr += tx.debit;
    periodCr += tx.credit;
    ledgerList.push({
      ...tx,
      runningBalance: currentBalance,
    });
  });

  return {
    fullLedger: ledgerList,
    closingBalance: currentBalance,
    totalPeriodDebit: periodDr,
    totalPeriodCredit: periodCr,
    hasBroughtForward: hasBF,
    initialBroughtForward,
  };
}
