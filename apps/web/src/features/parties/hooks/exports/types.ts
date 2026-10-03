import { Party } from "../../types";

export interface UsePartyExportsProps {
  activeParty: Party | null;
  parties: Party[];
  filteredParties: Party[];
  partyLedgerMap: Map<string, any>;
  profile: any;
  filterType: string;
  toast: any;
}
