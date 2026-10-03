import { parsePaymentTranscript } from "@/features/payments";
import { LedgerTransaction } from "./types";

export function processPurchasesForLedger(
  purchases: any[],
  partyId: string | undefined,
  normSelected: string
): Omit<LedgerTransaction, "runningBalance">[] {
  const transactions: Omit<LedgerTransaction, "runningBalance">[] = [];

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
      transactions.push({
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
      transactions.push({
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
      transactions.push({
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
      transactions.push({
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
            transactions.push({
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
        transactions.push({
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

  return transactions;
}
