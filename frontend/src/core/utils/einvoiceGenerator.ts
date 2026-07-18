// Standard NIC E-Invoice JSON Schema Generator
// Compliant with Government of India IRP (Invoice Registration Portal) Format

export interface EInvoicePayload {
    Version: string;
    TranDtls: {
        TaxSch: "GST";
        SupTyp: string; // "B2B", "SEZWP", "SEZWOP", "EXPWP", "EXPWOP", "DEXP"
        RegRev?: "Y" | "N";
        IgstOnIntra?: "Y" | "N";
    };
    DocDtls: {
        Typ: string; // "INV", "CRN", "DBN"
        No: string;
        Dt: string; // DD/MM/YYYY
    };
    SellerDtls: {
        Gstin: string;
        LglNm: string;
        TrdNm?: string;
        Addr1: string;
        Loc: string;
        Pin: number;
        Stcd: string;
    };
    BuyerDtls: {
        Gstin: string;
        LglNm: string;
        TrdNm?: string;
        Pos: string;
        Addr1: string;
        Loc: string;
        Pin: number;
        Stcd: string;
    };
    ItemList: {
        SlNo: string;
        PrdDesc: string;
        IsServc: "Y" | "N";
        HsnCd: string;
        Qty: number;
        Unit: string; // e.g. "NOS"
        UnitPrice: number;
        TotAmt: number;
        Discount: number;
        PreTaxVal: number;
        AssAmt: number; // Taxable value
        GstRt: number;
        IgstAmt: number;
        CgstAmt: number;
        SgstAmt: number;
        CesRt?: number;
        CesAmt?: number;
        TotItemVal: number;
    }[];
    ValDtls: {
        AssVal: number;
        CgstVal: number;
        SgstVal: number;
        IgstVal: number;
        CesVal: number;
        StCesVal: number;
        Discount: number;
        OthChrg: number;
        RndOffAmt: number;
        TotInvVal: number;
    };
    EwbDtls?: {
        TransId: string;
        TransName: string;
        Distance: number;
        TransDocNo: string;
        TransDocDt: string;
        VehNo: string;
        VehType: "R" | "O";
        TransMode: "1" | "2" | "3" | "4";
    };
}

export function generateEInvoiceJSON(invoice: any, profile: any): EInvoicePayload {
    const sellerGstin = profile.gst_number || "";
    const sellerStateCode = sellerGstin.substring(0, 2);
    
    const buyerGstin = invoice.customer_gstin || "";
    const buyerStateCode = buyerGstin ? buyerGstin.substring(0, 2) : (invoice.place_of_supply || sellerStateCode);
    const pos = invoice.place_of_supply || buyerStateCode;

    const isInterState = sellerStateCode !== pos;

    const items = invoice.items.map((item: any, idx: number) => {
        const hsn = item.hsn_code || "0000";
        const qty = Number(item.quantity);
        const price = Number(item.price);
        const gross = qty * price;
        const discount = Number(item.discount || 0);
        const taxable = gross - discount;
        
        const taxRate = Number(item.tax_rate || 18);
        const taxAmt = Number((taxable * (taxRate / 100)).toFixed(2));
        
        let igst = 0, cgst = 0, sgst = 0;
        if (isInterState) {
            igst = taxAmt;
        } else {
            cgst = Number((taxAmt / 2).toFixed(2));
            sgst = Number((taxAmt / 2).toFixed(2));
        }

        return {
            SlNo: (idx + 1).toString(),
            PrdDesc: item.description,
            IsServc: "N" as const,
            HsnCd: hsn,
            Qty: qty,
            Unit: "NOS",
            UnitPrice: price,
            TotAmt: gross,
            Discount: discount,
            PreTaxVal: gross,
            AssAmt: taxable,
            GstRt: taxRate,
            IgstAmt: igst,
            CgstAmt: cgst,
            SgstAmt: sgst,
            TotItemVal: taxable + igst + cgst + sgst
        };
    });

    const totalTaxable = items.reduce((s, i) => s + i.AssAmt, 0);
    const totalIgst = items.reduce((s, i) => s + i.IgstAmt, 0);
    const totalCgst = items.reduce((s, i) => s + i.CgstAmt, 0);
    const totalSgst = items.reduce((s, i) => s + i.SgstAmt, 0);
    const totalInvoice = totalTaxable + totalIgst + totalCgst + totalSgst;

    // Formatting date to DD/MM/YYYY
    const d = new Date(invoice.date);
    const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    return {
        Version: "1.1",
        TranDtls: {
            TaxSch: "GST",
            SupTyp: "B2B",
            RegRev: "N",
            IgstOnIntra: "N"
        },
        DocDtls: {
            Typ: "INV",
            No: invoice.invoice_number,
            Dt: formattedDate
        },
        SellerDtls: {
            Gstin: sellerGstin,
            LglNm: profile.business_name || profile.full_name,
            Addr1: profile.business_address || "Not Provided",
            Loc: "City", // Placeholder
            Pin: 110001, // Placeholder
            Stcd: sellerStateCode
        },
        BuyerDtls: {
            Gstin: buyerGstin,
            LglNm: invoice.customer_name,
            Pos: pos,
            Addr1: "Not Provided",
            Loc: "City",
            Pin: 110001,
            Stcd: buyerStateCode
        },
        ItemList: items,
        ValDtls: {
            AssVal: totalTaxable,
            CgstVal: totalCgst,
            SgstVal: totalSgst,
            IgstVal: totalIgst,
            CesVal: 0,
            StCesVal: 0,
            Discount: 0,
            OthChrg: 0,
            RndOffAmt: 0,
            TotInvVal: totalInvoice
        }
    };
}

export function downloadJSON(data: any, filename: string) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}