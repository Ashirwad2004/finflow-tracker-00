import { Party } from "../types";

export interface PartyLedgerMetrics {
    partySales: any[];
    partyPurchases: any[];
    totalSalesAmount: number;
    totalSalesPaid: number;
    salesBalanceDue: number;
    totalPurchasesAmount: number;
    totalPurchasesPaid: number;
    purchasesBalanceDue: number;
    receivable: number;
    payable: number;
    totalRecords: number;
}

export interface DirectorySummary {
    totalParties: number;
    totalReceivables: number;
    totalPayables: number;
    settledCount: number;
}

export interface PartyTransactionRow {
    id: string;
    docType: 'sale' | 'purchase' | 'receipt' | 'payment' | 'opening_balance';
    docNumber: string;
    date: string;
    total: number;
    paid: number;
    balanceDue: number;
    status: string;
    isReceivable?: boolean;
    raw: any;
}

/**
 * Calculates metrics for each party with O(N + S + P) linear pre-indexed lookups
 */
export function computePartyLedgerMap(
    parties: Party[],
    sales: any[],
    purchases: any[]
): Map<string, PartyLedgerMetrics> {
    const map = new Map<string, PartyLedgerMetrics>();

    // 1. Pre-index sales by party_id and lower-cased customer_name (O(S) linear pass)
    const salesByPartyId = new Map<string, any[]>();
    const salesByCustName = new Map<string, any[]>();
    for (let i = 0; i < sales.length; i++) {
        const s = sales[i];
        if (s.party_id) {
            let list = salesByPartyId.get(s.party_id);
            if (!list) {
                list = [];
                salesByPartyId.set(s.party_id, list);
            }
            list.push(s);
        }
        if (s.customer_name) {
            const normName = s.customer_name.trim().toLowerCase();
            if (normName) {
                let list = salesByCustName.get(normName);
                if (!list) {
                    list = [];
                    salesByCustName.set(normName, list);
                }
                list.push(s);
            }
        }
    }

    // 2. Pre-index purchases by party_id and lower-cased vendor_name (O(P) linear pass)
    const purchasesByPartyId = new Map<string, any[]>();
    const purchasesByVendName = new Map<string, any[]>();
    for (let i = 0; i < purchases.length; i++) {
        const p = purchases[i];
        if (p.party_id) {
            let list = purchasesByPartyId.get(p.party_id);
            if (!list) {
                list = [];
                purchasesByPartyId.set(p.party_id, list);
            }
            list.push(p);
        }
        if (p.vendor_name) {
            const normName = p.vendor_name.trim().toLowerCase();
            if (normName) {
                let list = purchasesByVendName.get(normName);
                if (!list) {
                    list = [];
                    purchasesByVendName.set(normName, list);
                }
                list.push(p);
            }
        }
    }

    // 3. Process parties with O(1) hash map lookups (O(N) total)
    for (let i = 0; i < parties.length; i++) {
        const party = parties[i];
        const pName = (party.name || "").trim().toLowerCase();

        // Fast O(1) sales retrieval with deduplication
        const salesById = salesByPartyId.get(party.id) || [];
        const salesByName = pName ? (salesByCustName.get(pName) || []) : [];
        let partySales: any[];
        if (salesById.length === 0) {
            partySales = salesByName;
        } else if (salesByName.length === 0) {
            partySales = salesById;
        } else {
            const seenSales = new Set(salesById);
            partySales = [...salesById];
            for (let j = 0; j < salesByName.length; j++) {
                if (!seenSales.has(salesByName[j])) {
                    partySales.push(salesByName[j]);
                }
            }
        }

        // Fast O(1) purchases retrieval with deduplication
        const purchasesById = purchasesByPartyId.get(party.id) || [];
        const purchasesByName = pName ? (purchasesByVendName.get(pName) || []) : [];
        let partyPurchases: any[];
        if (purchasesById.length === 0) {
            partyPurchases = purchasesByName;
        } else if (purchasesByName.length === 0) {
            partyPurchases = purchasesById;
        } else {
            const seenPurchases = new Set(purchasesById);
            partyPurchases = [...purchasesById];
            for (let j = 0; j < purchasesByName.length; j++) {
                if (!seenPurchases.has(purchasesByName[j])) {
                    partyPurchases.push(purchasesByName[j]);
                }
            }
        }

        let totalSalesAmount = 0;
        let totalSalesPaid = 0;
        let salesBalanceDue = 0;

        partySales.forEach((s: any) => {
            const total = Number(s.total_amount) || 0;
            const paid = Number(s.amount_paid != null ? s.amount_paid : (s.status === 'paid' ? total : 0));
            const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, total - paid));
            const docType = (s.document_type || 'invoice').toLowerCase();

            if (docType === 'receipt') {
                salesBalanceDue = Math.max(0, salesBalanceDue - (total || paid));
            } else if (docType === 'credit_note') {
                salesBalanceDue = Math.max(0, salesBalanceDue - total);
            } else if (docType === 'debit_note') {
                totalSalesAmount += total;
                salesBalanceDue += total;
            } else {
                totalSalesAmount += total;
                totalSalesPaid += paid;
                salesBalanceDue += due;
            }
        });

        let totalPurchasesAmount = 0;
        let totalPurchasesPaid = 0;
        let purchasesBalanceDue = 0;

        partyPurchases.forEach((p: any) => {
            const total = Number(p.total_amount) || 0;
            const paid = Number(p.amount_paid != null ? p.amount_paid : (p.status === 'paid' ? total : 0));
            const due = Number(p.balance_due != null ? p.balance_due : Math.max(0, total - paid));
            const docType = (p.document_type || 'bill').toLowerCase();

            if (docType === 'payment') {
                purchasesBalanceDue = Math.max(0, purchasesBalanceDue - (total || paid));
            } else if (docType === 'debit_note') {
                purchasesBalanceDue = Math.max(0, purchasesBalanceDue - total);
            } else if (docType === 'credit_note') {
                totalPurchasesAmount += total;
                purchasesBalanceDue += total;
            } else {
                totalPurchasesAmount += total;
                totalPurchasesPaid += paid;
                purchasesBalanceDue += due;
            }
        });

        const openingBal = Number(party.opening_balance) || 0;
        const isOpeningReceivable = party.opening_balance_type
            ? party.opening_balance_type === 'to_receive'
            : party.type !== 'vendor';
        const receivable = salesBalanceDue + (isOpeningReceivable ? openingBal : 0);
        const payable = purchasesBalanceDue + (!isOpeningReceivable ? openingBal : 0);

        map.set(party.id, {
            partySales,
            partyPurchases,
            totalSalesAmount,
            totalSalesPaid,
            salesBalanceDue,
            totalPurchasesAmount,
            totalPurchasesPaid,
            purchasesBalanceDue,
            receivable,
            payable,
            totalRecords: partySales.length + partyPurchases.length + (openingBal > 0 ? 1 : 0),
        });
    }

    return map;
}

/**
 * Top Summary Statistics across the party directory
 */
export function computeDirectorySummary(
    parties: Party[],
    partyLedgerMap: Map<string, PartyLedgerMetrics>
): DirectorySummary {
    let totalReceivables = 0;
    let totalPayables = 0;
    let settledCount = 0;

    for (const party of parties) {
        const metrics = partyLedgerMap.get(party.id);
        if (!metrics) continue;

        totalReceivables += metrics.receivable;
        totalPayables += metrics.payable;

        if (metrics.receivable === 0 && metrics.payable === 0) {
            settledCount++;
        }
    }

    return {
        totalParties: parties.length,
        totalReceivables,
        totalPayables,
        settledCount,
    };
}

/**
 * Unified sorted transaction ledger for the active party
 */
export function computeActivePartyTransactions(
    activeParty: Party | null,
    activePartyMetrics: PartyLedgerMetrics | null,
    activeTab: "all" | "sales" | "purchases"
): PartyTransactionRow[] {
    if (!activePartyMetrics || !activeParty) return [];
    const list: PartyTransactionRow[] = [];

    activePartyMetrics.partySales.forEach((s: any) => {
        const currentPaid = Number(s.amount_paid || (s.status === 'paid' ? s.total_amount : 0));
        const balDue = Number(
            s.balance_due != null
                ? s.balance_due
                : (s.status === 'paid' ? 0 : Math.max(0, (Number(s.total_amount) || 0) - currentPaid))
        );
        const isReceiptDoc = (s.document_type || '').toLowerCase() === 'receipt';
        list.push({
            id: s.id,
            docType: isReceiptDoc ? 'receipt' : 'sale',
            docNumber: s.invoice_number || (isReceiptDoc ? 'REC' : 'INV'),
            date: s.date || s.created_at,
            total: Number(s.total_amount) || 0,
            paid: isReceiptDoc ? Number(s.total_amount) : currentPaid,
            balanceDue: isReceiptDoc ? 0 : balDue,
            status: isReceiptDoc ? 'paid' : s.status,
            raw: s,
        });
    });

    activePartyMetrics.partyPurchases.forEach((p: any) => {
        const currentPaid = Number(p.amount_paid || (p.status === 'paid' ? p.total_amount : 0));
        const balDue = Number(
            p.balance_due != null
                ? p.balance_due
                : (p.status === 'paid' ? 0 : Math.max(0, (Number(p.total_amount) || 0) - currentPaid))
        );
        const isPaymentDoc = (p.document_type || '').toLowerCase() === 'payment';
        list.push({
            id: p.id,
            docType: isPaymentDoc ? 'payment' : 'purchase',
            docNumber: p.bill_number || (isPaymentDoc ? 'PMT' : 'BILL'),
            date: p.date || p.created_at,
            total: Number(p.total_amount) || 0,
            paid: isPaymentDoc ? Number(p.total_amount) : currentPaid,
            balanceDue: isPaymentDoc ? 0 : balDue,
            status: isPaymentDoc ? 'paid' : p.status,
            raw: p,
        });
    });

    const openBal = Number(activeParty.opening_balance) || 0;
    if (openBal > 0) {
        const isOpeningReceivable = activeParty.opening_balance_type
            ? activeParty.opening_balance_type === 'to_receive'
            : activeParty.type !== 'vendor';
        list.push({
            id: 'opening-balance-' + activeParty.id,
            docType: 'opening_balance',
            docNumber: 'OPENING',
            date: activeParty.created_at || new Date().toISOString(),
            total: openBal,
            paid: 0,
            balanceDue: openBal,
            status: isOpeningReceivable ? 'to_receive' : 'to_pay',
            isReceivable: isOpeningReceivable,
            raw: null,
        });
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activeTab === "sales") {
        return list.filter(
            (t) => t.docType === 'sale' || t.docType === 'receipt' || (t.docType === 'opening_balance' && t.isReceivable)
        );
    }
    if (activeTab === "purchases") {
        return list.filter(
            (t) => t.docType === 'purchase' || t.docType === 'payment' || (t.docType === 'opening_balance' && !t.isReceivable)
        );
    }
    return list;
}
