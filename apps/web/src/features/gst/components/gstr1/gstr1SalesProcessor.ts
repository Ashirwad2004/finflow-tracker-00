export interface ProcessedGSTR1Data {
  b2b: any[];
  b2ba: any[];
  b2cl: any[];
  b2cs: any[];
  hsn: any[];
  summary: {
    total_invoices: number;
    total_taxable_value: number;
    total_tax_amount: number;
  };
}

export function processClientSalesForGSTR1(
  sales: any[],
  effectiveStateCode: string
): ProcessedGSTR1Data {
  const b2b: any[] = [];
  const b2cl: any[] = [];
  const b2csMap = new Map<string, any>();
  const hsnMap = new Map<string, any>();
  const totalInvoices = sales.length;
  let totalTaxable = 0;
  let totalTax = 0;

  sales.forEach((s: any) => {
    const invVal = Number(s.total_amount) || 0;
    const taxVal = Number(s.tax_amount) || 0;
    const taxableVal = Number(s.subtotal) || invVal - taxVal;
    totalTaxable += taxableVal;
    totalTax += taxVal;

    const custGst = (s.customer_gstin || "").trim();
    const pos =
      s.place_of_supply ||
      (custGst ? custGst.slice(0, 2) : effectiveStateCode);
    const isInter = pos !== effectiveStateCode;
    const igst = isInter ? taxVal : 0;
    const cgst = isInter ? 0 : taxVal / 2;
    const sgst = isInter ? 0 : taxVal / 2;

    if (custGst && custGst.length === 15) {
      b2b.push({
        gstin: custGst,
        customer_name: s.customer_name || "Registered Customer",
        invoice_number: s.invoice_number,
        invoice_date: s.date,
        invoice_value: invVal,
        taxable_value: taxableVal,
        igst,
        cgst,
        sgst,
        place_of_supply: pos,
        reverse_charge: false,
      });
    } else if (isInter && invVal > 250000) {
      b2cl.push({
        invoice_number: s.invoice_number,
        invoice_date: s.date,
        invoice_value: invVal,
        place_of_supply: pos,
        taxable_value: taxableVal,
        igst,
      });
    } else {
      const rate =
        taxVal > 0 && taxableVal > 0
          ? Math.round((taxVal / taxableVal) * 100)
          : 18;
      const key = `${pos}_${rate}`;
      if (!b2csMap.has(key)) {
        b2csMap.set(key, {
          place_of_supply: pos,
          tax_rate: rate,
          taxable_value: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
        });
      }
      const row = b2csMap.get(key)!;
      row.taxable_value += taxableVal;
      row.igst += igst;
      row.cgst += cgst;
      row.sgst += sgst;
    }

    const items = Array.isArray(s.items) ? s.items : [];
    items.forEach((it: any) => {
      const hsn = it.hsn_code || "GEN";
      const itTaxable =
        Number(it.total) ||
        Number(it.quantity || 1) * Number(it.price || 0);
      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn_code: hsn,
          description: it.description || "Goods",
          uqc: it.unit || "PCS",
          quantity: 0,
          taxable_value: 0,
          tax_rate: 18,
          igst: 0,
          cgst: 0,
          sgst: 0,
        });
      }
      const hRow = hsnMap.get(hsn)!;
      hRow.quantity += Number(it.quantity) || 1;
      hRow.taxable_value += itTaxable;
      if (isInter) hRow.igst += itTaxable * 0.18;
      else {
        hRow.cgst += itTaxable * 0.09;
        hRow.sgst += itTaxable * 0.09;
      }
    });
  });

  return {
    b2b,
    b2ba: [],
    b2cl,
    b2cs: Array.from(b2csMap.values()),
    hsn: Array.from(hsnMap.values()),
    summary: {
      total_invoices: totalInvoices,
      total_taxable_value: totalTaxable,
      total_tax_amount: totalTax,
    },
  };
}
