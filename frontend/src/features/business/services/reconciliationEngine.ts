/**
 * Bank Reconciliation (BRS) Matching Engine
 * Compares general ledger transactions against imported bank statement feeds.
 */

import { differenceInDays, parseISO } from "date-fns";

export interface ReconcileCandidateTx {
    id: string;
    accountId: string;
    date: string;
    type: "deposit" | "withdrawal";
    amount: number;
    referenceNo: string;
    description: string;
    isReconciled: boolean;
    matchedStatementLineId?: string;
}

export interface ReconcileCandidateStmtLine {
    id: string;
    importId: string;
    accountId: string;
    date: string;
    narration: string;
    referenceNo: string;
    withdrawal: number;
    deposit: number;
    balance?: number;
    status: "unmatched" | "matched" | "created_in_ledger" | "ignored";
    matchedTxId?: string;
}

export interface MatchResult {
    txId: string;
    stmtLineId: string;
    confidence: number; // 0 to 100
    matchReason: "EXACT_REFERENCE" | "AMOUNT_AND_DATE_WINDOW";
}

/**
 * Clean reference / UTR strings for robust matching (removes prefixes, punctuation, spaces)
 */
function cleanRef(ref?: string): string {
    if (!ref) return "";
    return ref.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

/**
 * Runs intelligent matching between unreconciled ledger transactions and unmatched statement lines
 */
export function computeAutoMatches(
    unreconciledTxs: ReconcileCandidateTx[],
    unmatchedLines: ReconcileCandidateStmtLine[]
): MatchResult[] {
    const matches: MatchResult[] = [];
    const usedTxIds = new Set<string>();
    const usedLineIds = new Set<string>();

    // Pass 1: High Confidence Match on Reference / UTR Number
    for (const line of unmatchedLines) {
        if (usedLineIds.has(line.id)) continue;
        const lineRef = cleanRef(line.referenceNo);
        if (!lineRef || lineRef.length < 5) continue;

        const lineAmount = line.deposit > 0 ? line.deposit : line.withdrawal;
        const lineType = line.deposit > 0 ? "deposit" : "withdrawal";

        const matchingTx = unreconciledTxs.find(tx => {
            if (usedTxIds.has(tx.id)) return false;
            if (tx.type !== lineType) return false;
            if (Math.abs(tx.amount - lineAmount) > 0.01) return false;

            const txRef = cleanRef(tx.referenceNo);
            if (!txRef) return false;

            // Direct equal or substring match if long enough
            return txRef === lineRef || (lineRef.length >= 8 && txRef.includes(lineRef)) || (txRef.length >= 8 && lineRef.includes(txRef));
        });

        if (matchingTx) {
            matches.push({
                txId: matchingTx.id,
                stmtLineId: line.id,
                confidence: 100,
                matchReason: "EXACT_REFERENCE"
            });
            usedTxIds.add(matchingTx.id);
            usedLineIds.add(line.id);
        }
    }

    // Pass 2: Fuzzy Match on Exact Amount + Direction + Date window within +/- 3 days
    for (const line of unmatchedLines) {
        if (usedLineIds.has(line.id)) continue;

        const lineAmount = line.deposit > 0 ? line.deposit : line.withdrawal;
        const lineType = line.deposit > 0 ? "deposit" : "withdrawal";

        let bestTx: ReconcileCandidateTx | null = null;
        let smallestDayDiff = 999;

        for (const tx of unreconciledTxs) {
            if (usedTxIds.has(tx.id)) continue;
            if (tx.type !== lineType) return false;
            if (Math.abs(tx.amount - lineAmount) > 0.01) continue;

            try {
                const dayDiff = Math.abs(differenceInDays(parseISO(tx.date), parseISO(line.date)));
                if (dayDiff <= 3 && dayDiff < smallestDayDiff) {
                    smallestDayDiff = dayDiff;
                    bestTx = tx;
                }
            } catch {}
        }

        if (bestTx) {
            matches.push({
                txId: bestTx.id,
                stmtLineId: line.id,
                confidence: smallestDayDiff === 0 ? 90 : 80,
                matchReason: "AMOUNT_AND_DATE_WINDOW"
            });
            usedTxIds.add(bestTx.id);
            usedLineIds.add(line.id);
        }
    }

    return matches;
}

/**
 * Predict transaction category from bank statement narration
 */
export function guessCategoryFromNarration(narration: string, isDeposit: boolean): string {
    const s = narration.toLowerCase();
    if (s.includes("chg") || s.includes("charge") || s.includes("fee") || s.includes("sms") || s.includes("annual fee")) {
        return "Bank Charges";
    }
    if (s.includes("int.pd") || s.includes("interest") || s.includes("int rebate")) {
        return "Interest";
    }
    if (s.includes("salary") || s.includes("salaries") || s.includes("payroll") || s.includes("wages")) {
        return "Salary";
    }
    if (s.includes("rent") || s.includes("lease")) {
        return "Rent";
    }
    if (s.includes("tax") || s.includes("gst") || s.includes("tds") || s.includes("challan")) {
        return "Tax";
    }
    if (s.includes("electricity") || s.includes("power") || s.includes("bescom") || s.includes("water") || s.includes("broadband") || s.includes("airtel") || s.includes("jio")) {
        return "Utilities";
    }
    if (s.includes("contra") || s.includes("trf to") || s.includes("trf from") || s.includes("self transfer")) {
        return "Transfer";
    }
    return isDeposit ? "Sales Revenue" : "Vendor Payment";
}
