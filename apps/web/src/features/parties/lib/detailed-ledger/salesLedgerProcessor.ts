import { parsePaymentTranscript } from "@/features/payments";
import { LedgerTransaction } from "./types";

export function processSalesForLedger(
  sales: any[],
  partyId: string | undefined,
  normSelected: string
): Omit<LedgerTransaction, "runningBalance">[] {
  const transactions: Omit<LedgerTransaction, "runningBalance">[] = [];

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
      transactions.push({
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
      transactions.push({
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
      transactions.push({
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
      transactions.push({
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
            transactions.push({
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
        transactions.push({
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

  return transactions;
}
