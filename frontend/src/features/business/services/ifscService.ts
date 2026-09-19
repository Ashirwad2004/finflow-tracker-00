/**
 * Service for Indian Bank IFSC (Indian Financial System Code) Verification and Lookup
 * Queries Razorpay's public IFSC API with offline fallback for top Indian banks.
 */

export interface IFSCDetails {
    bank: string;
    branch: string;
    city: string;
    state: string;
    ifsc: string;
    bankCode?: string;
    upi?: boolean;
    neft?: boolean;
    rtgs?: boolean;
    imps?: boolean;
}

const ifscCache = new Map<string, IFSCDetails>();

const KNOWN_BANK_PREFIXES: Record<string, string> = {
    "SBIN": "State Bank of India",
    "HDFC": "HDFC Bank",
    "ICIC": "ICICI Bank",
    "UTIB": "Axis Bank",
    "KKBK": "Kotak Mahindra Bank",
    "BARB": "Bank of Baroda",
    "PUNB": "Punjab National Bank",
    "CNRB": "Canara Bank",
    "UBIN": "Union Bank of India",
    "CBIN": "Central Bank of India",
    "IOBA": "Indian Overseas Bank",
    "IDIB": "Indian Bank",
    "YESB": "Yes Bank",
    "INDB": "IndusInd Bank",
    "FDRL": "Federal Bank",
    "IDFB": "IDFC FIRST Bank",
    "BKDN": "Dena Bank",
    "MAHB": "Bank of Maharashtra",
    "PSIB": "Punjab & Sind Bank",
    "CORP": "Corporation Bank",
    "ALLA": "Allahabad Bank",
    "ANDB": "Andhra Bank",
    "SYNB": "Syndicate Bank",
    "VIJB": "Vijaya Bank",
    "ORBC": "Oriental Bank of Commerce",
    "UTBI": "United Bank of India",
    "AIRP": "Airtel Payments Bank",
    "PYTM": "Paytm Payments Bank",
    "IPOS": "India Post Payments Bank",
    "JAKA": "Jammu & Kashmir Bank",
    "CSBK": "CSB Bank",
    "KVBL": "Karur Vysya Bank",
    "SIBL": "South Indian Bank",
    "TMBL": "Tamilnad Mercantile Bank",
    "RBLN": "RBL Bank",
    "BDBL": "Bandhan Bank",
    "AUBL": "AU Small Finance Bank",
    "ESFB": "Equitas Small Finance Bank",
    "UJVN": "Ujjivan Small Finance Bank"
};

/**
 * Validates whether string conforms to standard Indian IFSC structure:
 * 4 letters, followed by 0, followed by 6 alphanumeric characters.
 */
export function isValidIFSC(ifsc: string): boolean {
    if (!ifsc) return false;
    const clean = ifsc.trim().toUpperCase();
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
}

/**
 * Fast lookup from known 4-letter prefix
 */
export function getBankNameFromPrefix(ifsc: string): string | null {
    if (!ifsc || ifsc.length < 4) return null;
    const prefix = ifsc.trim().slice(0, 4).toUpperCase();
    return KNOWN_BANK_PREFIXES[prefix] || null;
}

/**
 * Fetches full branch, city, and bank name from Razorpay IFSC directory
 */
export async function lookupIFSC(ifsc: string): Promise<IFSCDetails | null> {
    const clean = ifsc.trim().toUpperCase();
    if (!isValidIFSC(clean)) {
        return null;
    }

    if (ifscCache.has(clean)) {
        return ifscCache.get(clean)!;
    }

    try {
        const response = await fetch(`https://ifsc.razorpay.com/${clean}`, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        if (response.ok) {
            const data = await response.json();
            const details: IFSCDetails = {
                bank: data.BANK || getBankNameFromPrefix(clean) || "Unknown Bank",
                branch: data.BRANCH || "Main Branch",
                city: data.CITY || data.DISTRICT || "",
                state: data.STATE || "",
                ifsc: clean,
                bankCode: data.BANKCODE || clean.slice(0, 4),
                upi: Boolean(data.UPI),
                neft: Boolean(data.NEFT),
                rtgs: Boolean(data.RTGS),
                imps: Boolean(data.IMPS)
            };
            ifscCache.set(clean, details);
            return details;
        }
    } catch (err) {
        console.warn("[IFSC] Network lookup failed, falling back to offline dictionary", err);
    }

    // Fallback: Use prefix dictionary
    const fallbackBank = getBankNameFromPrefix(clean);
    if (fallbackBank) {
        const fallbackDetails: IFSCDetails = {
            bank: fallbackBank,
            branch: "",
            city: "",
            state: "",
            ifsc: clean,
            bankCode: clean.slice(0, 4),
            upi: true,
            neft: true,
            rtgs: true,
            imps: true
        };
        return fallbackDetails;
    }

    return null;
}
