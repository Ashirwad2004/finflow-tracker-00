import { differenceInDays, parseISO } from "date-fns";

export interface AgingPartyRecord {
  partyId: string;
  partyName: string;
  phone: string;
  totalOutstanding: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
  oldestDueDate: string;
  overdueCount: number;
  isMsmeExceeded: boolean; // Over 45 days (Section 43B(h) statutory rule)
}

export interface ReceivablesAgingResult {
  parties: AgingPartyRecord[];
  totalOutstanding: number;
  tot0_30: number;
  tot31_60: number;
  tot61_90: number;
  tot90Plus: number;
  msmeViolationsTotal: number;
}

export function computeReceivablesAging(allSales: any[]): ReceivablesAgingResult {
  const partyMap = new Map<string, AgingPartyRecord>();

  const now = new Date();
  let totalAll = 0;
  let tot0_30 = 0;
  let tot31_60 = 0;
  let tot61_90 = 0;
  let tot90Plus = 0;
  let msmeViolationsTotal = 0;

  allSales.forEach((s: any) => {
    const bal =
      s.balance_due !== undefined && s.balance_due !== null
        ? Number(s.balance_due)
        : Number(s.total_amount || 0) - Number(s.amount_paid || 0);

    if (bal <= 0) return;

    const pId = s.party_id || s.customer_name || "Direct Customer";
    const pName = s.customer_name || "Direct Customer";
    const phone = s.customer_phone || "";

    let daysOld = 0;
    const refDateStr = s.due_date || s.date || s.created_at;
    if (refDateStr) {
      try {
        daysOld = differenceInDays(now, parseISO(refDateStr.slice(0, 10)));
      } catch {
        daysOld = 15;
      }
    }

    if (!partyMap.has(pId)) {
      partyMap.set(pId, {
        partyId: pId,
        partyName: pName,
        phone,
        totalOutstanding: 0,
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90Plus: 0,
        oldestDueDate: refDateStr || "",
        overdueCount: 0,
        isMsmeExceeded: false,
      });
    }

    const rec = partyMap.get(pId)!;
    rec.totalOutstanding += bal;
    totalAll += bal;

    if (daysOld <= 30) {
      rec.bucket0_30 += bal;
      tot0_30 += bal;
    } else if (daysOld <= 60) {
      rec.bucket31_60 += bal;
      tot31_60 += bal;
    } else if (daysOld <= 90) {
      rec.bucket61_90 += bal;
      tot61_90 += bal;
    } else {
      rec.bucket90Plus += bal;
      tot90Plus += bal;
    }

    if (daysOld > 45) {
      rec.isMsmeExceeded = true;
      msmeViolationsTotal += bal;
    }
    if (daysOld > 0) rec.overdueCount++;
  });

  return {
    parties: Array.from(partyMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding),
    totalOutstanding: totalAll,
    tot0_30,
    tot31_60,
    tot61_90,
    tot90Plus,
    msmeViolationsTotal,
  };
}
