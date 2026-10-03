import { Search, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPartyReportPDF } from "@/utils/exportPartyReportPDF";
import { exportPartyReportCSV } from "@/utils/exportPartyReportCSV";
import { EnrichedPartyItem } from "./types";

interface PartyReportFilterBarProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    typeFilter: "all" | "customer" | "vendor";
    setTypeFilter: (val: "all" | "customer" | "vendor") => void;
    balanceFilter: "all" | "active" | "receivable" | "payable";
    setBalanceFilter: (val: "all" | "active" | "receivable" | "payable") => void;
    filteredData: EnrichedPartyItem[];
    profile: any;
}

export const PartyReportFilterBar = ({
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    balanceFilter,
    setBalanceFilter,
    filteredData,
    profile,
}: PartyReportFilterBarProps) => {
    const profileData = profile
        ? {
              name: (profile as any).business_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone,
              gst: (profile as any).gst_number,
          }
        : undefined;

    return (
        <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search party or phone..."
                    className="pl-8 h-8 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Party Type" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="vendor">Vendors</SelectItem>
                </SelectContent>
            </Select>

            <Select value={balanceFilter} onValueChange={(v: any) => setBalanceFilter(v)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Balance Status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="active">Due Only (Active)</SelectItem>
                    <SelectItem value="receivable">To Receive (Dr)</SelectItem>
                    <SelectItem value="payable">To Pay (Cr)</SelectItem>
                </SelectContent>
            </Select>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                    <DropdownMenuItem
                        className="text-xs"
                        onClick={() => exportPartyReportPDF(filteredData, profileData)}
                    >
                        <FileText className="w-3.5 h-3.5 mr-2 text-rose-500" />
                        Export Statement (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-xs"
                        onClick={() => exportPartyReportCSV(filteredData, profileData)}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                        Export Statement (Excel)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
