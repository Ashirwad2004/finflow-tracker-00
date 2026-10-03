export interface GstSlabItem {
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceCount: number;
}

export function computeGstSlabReport(filteredSales: any[]): GstSlabItem[] {
  const slabs: Record<string, GstSlabItem> = {
    "0%": { rate: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
    "5%": { rate: 5, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
    "12%": { rate: 12, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
    "18%": { rate: 18, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
    "28%": { rate: 28, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
  };

  filteredSales.forEach((s: any) => {
    const items = Array.isArray(s.items) ? s.items : [];
    if (items.length > 0) {
      items.forEach((it: any) => {
        const rate = Number(it.tax_rate || it.gst_rate || 18);
        const key = `${rate}%`;
        if (!slabs[key]) {
          slabs[key] = { rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 };
        }
        const price = Number(it.price || 0);
        const qty = Number(it.quantity || 1);
        const itemVal = price * qty;
        const taxable = itemVal / (1 + rate / 100);
        const tax = itemVal - taxable;

        slabs[key].taxableValue += taxable;
        slabs[key].cgst += tax / 2;
        slabs[key].sgst += tax / 2;
        slabs[key].totalTax += tax;
        slabs[key].invoiceCount++;
      });
    } else {
      // Fallback to invoice totals at 18% standard rate
      const total = Number(s.total_amount || 0);
      const taxable = total / 1.18;
      const tax = total - taxable;
      slabs["18%"].taxableValue += taxable;
      slabs["18%"].cgst += tax / 2;
      slabs["18%"].sgst += tax / 2;
      slabs["18%"].totalTax += tax;
      slabs["18%"].invoiceCount++;
    }
  });

  return Object.values(slabs);
}
