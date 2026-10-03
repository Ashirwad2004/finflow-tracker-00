import { ColumnMapping } from "../../types/partyImportExportTypes";

export function guessColumnMapping(headers: string[]): ColumnMapping {
    const lowerH = headers.map((h) => h.toLowerCase());

    const findColIdx = (aliases: string[]) => {
        return lowerH.findIndex((h) =>
            aliases.includes(h) || aliases.some((alias) => h.includes(alias))
        );
    };

    return {
        name: findColIdx([
            "party name",
            "customer name",
            "vendor name",
            "party",
            "ledger name",
            "account name",
            "firm name",
            "client name",
            "name",
            "company",
        ]),
        type: findColIdx(["party type", "type", "category", "role", "group", "customer/vendor"]),
        phone: findColIdx(["phone", "mobile", "contact", "phone number", "mobile number", "cell", "whatsapp"]),
        email: findColIdx(["email", "email address", "e-mail", "mail id", "mail"]),
        gstin: findColIdx(["gstin", "gst number", "gst no", "gst", "tax id", "tin"]),
        address: findColIdx(["address", "billing address", "location", "city", "place", "state"]),
        opening_balance: findColIdx(["opening balance", "balance", "op bal", "amount", "opening amt"]),
        opening_balance_type: findColIdx([
            "balance type",
            "opening_balance_type",
            "dr/cr",
            "dr / cr",
            "type (dr/cr)",
            "to_receive/to_pay",
        ]),
    };
}
