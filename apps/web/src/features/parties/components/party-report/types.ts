import { PartyReportItem } from "@/utils/exportPartyReportPDF";

export interface EnrichedPartyItem extends PartyReportItem {
    receivable: number;
    payable: number;
    phone?: string;
    type?: "customer" | "vendor" | "both";
    overdueDaysMax: number;
    ageCategory: "current" | "31-60" | "61-90" | "90+";
}

export interface PartyReportProps {
    onSelectPartyForLedger?: (partyName: string) => void;
}
