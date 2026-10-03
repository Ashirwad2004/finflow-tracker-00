import { BankAccount, ChequeRecord } from "../types";

export interface ChequeTrackerTabProps {
  accounts: BankAccount[];
  cheques: ChequeRecord[];
  onCreateCheque: (chequeData: Partial<ChequeRecord>) => Promise<void>;
  onUpdateChequeStatus: (
    chequeId: string,
    status: ChequeRecord["status"],
    bounceReason?: string
  ) => Promise<void>;
  onClearCheque: (cheque: ChequeRecord) => Promise<void>;
}

export type ChequeTypeFilter = "all" | "received" | "issued";
