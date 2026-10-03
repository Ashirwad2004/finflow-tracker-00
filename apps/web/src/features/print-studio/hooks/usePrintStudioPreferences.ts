import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { toast } from "sonner";
import {
  PageSize,
  getStoredBankAccounts,
  resolveInvoiceBankDetails,
  BankDetailsInfo,
} from "@/utils/generateInvoicePDF";
import { InvoiceTheme, invoiceThemes, themeMeta } from "../types";

export function usePrintStudioPreferences(user: any, profile: any) {
  const queryClient = useQueryClient();

  const [selectedTheme, setSelectedTheme] = useState<InvoiceTheme>("startup-gradient");

  const [pageSize, setPageSize] = useState<PageSize>(() => {
    return (localStorage.getItem("rupeebill_invoice_pagesize") as PageSize) || "a4";
  });

  const [fontSizeFactor, setFontSizeFactor] = useState<number>(() => {
    return Number(localStorage.getItem("rupeebill_invoice_fontsize_factor")) || 1.0;
  });

  const [customTerms, setCustomTerms] = useState<string>(() => {
    return localStorage.getItem("rupeebill_invoice_terms") || "";
  });

  const [printBankDetails, setPrintBankDetails] = useState<boolean>(() => {
    const saved = localStorage.getItem("rupeebill_print_bank_details");
    return saved !== "false";
  });

  const [printUpiQr, setPrintUpiQr] = useState<boolean>(() => {
    const saved = localStorage.getItem("rupeebill_print_upi_qr");
    return saved !== "false";
  });

  const [showItemTaxRate, setShowItemTaxRate] = useState<boolean>(() => {
    const saved = localStorage.getItem("rupeebill_show_item_tax_rate_on_bill");
    return saved === "true";
  });

  const [showPartyPreviousBalance, setShowPartyPreviousBalance] = useState<boolean>(() => {
    const savedPending = localStorage.getItem("rupeebill_show_party_pending_balance");
    if (savedPending !== null) return savedPending !== "false";
    const saved = localStorage.getItem("rupeebill_show_party_previous_balance");
    return saved !== "false";
  });

  const [upiIdInput, setUpiIdInput] = useState<string>(() => {
    return localStorage.getItem("rupeebill_upi_id") || "";
  });

  const [bankAccounts, setBankAccounts] = useState<any[]>(() => getStoredBankAccounts(user?.id));
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    return localStorage.getItem("rupeebill_selected_bank_account_id") || "";
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("rupeebill_invoice_theme") as InvoiceTheme;
    if (savedTheme && invoiceThemes.includes(savedTheme)) {
      setSelectedTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const updateAccounts = () => {
      const accounts = getStoredBankAccounts(user?.id);
      setBankAccounts(accounts);
    };
    updateAccounts();
    window.addEventListener("focus", updateAccounts);
    return () => window.removeEventListener("focus", updateAccounts);
  }, [user?.id]);

  useEffect(() => {
    if (profile?.upi_id && !upiIdInput) {
      setUpiIdInput(profile.upi_id);
      localStorage.setItem("rupeebill_upi_id", profile.upi_id);
    }
  }, [profile?.upi_id, upiIdInput]);

  const handleThemeSelect = (theme: InvoiceTheme) => {
    setSelectedTheme(theme);
    localStorage.setItem("rupeebill_invoice_theme", theme);
    toast.success(`Default template changed to ${themeMeta[theme].name}`);
  };

  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    localStorage.setItem("rupeebill_invoice_pagesize", size);
    toast.success(`Print page size set to ${size.toUpperCase()}`);
  };

  const handleFontSizeChange = (factor: number) => {
    setFontSizeFactor(factor);
    localStorage.setItem("rupeebill_invoice_fontsize_factor", factor.toString());
  };

  const handleTermsChange = (text: string) => {
    setCustomTerms(text);
    localStorage.setItem("rupeebill_invoice_terms", text);
  };

  const handlePrintBankToggle = (checked: boolean) => {
    setPrintBankDetails(checked);
    localStorage.setItem("rupeebill_print_bank_details", checked ? "true" : "false");
    toast.success(checked ? "Bank details enabled on invoices" : "Bank details hidden from invoices");
  };

  const handlePrintUpiToggle = (checked: boolean) => {
    setPrintUpiQr(checked);
    localStorage.setItem("rupeebill_print_upi_qr", checked ? "true" : "false");
    toast.success(checked ? "UPI QR code enabled on invoices" : "UPI QR code hidden from invoices");
  };

  const handleShowItemTaxToggle = (checked: boolean) => {
    setShowItemTaxRate(checked);
    localStorage.setItem("rupeebill_show_item_tax_rate_on_bill", checked ? "true" : "false");
    toast.success(checked ? "Product Tax % enabled on bills/invoices" : "Product Tax % hidden from bills/invoices");
  };

  const handleShowPartyPreviousBalanceToggle = (checked: boolean) => {
    setShowPartyPreviousBalance(checked);
    localStorage.setItem("rupeebill_show_party_pending_balance", checked ? "true" : "false");
    localStorage.setItem("rupeebill_show_party_previous_balance", checked ? "true" : "false");
    toast.success(checked ? "Party pending balance enabled on invoices" : "Party pending balance hidden from invoices");
  };

  const handleSaveUpiId = async (newUpi: string) => {
    const trimmed = newUpi.trim();
    setUpiIdInput(trimmed);
    if (trimmed) {
      localStorage.setItem("rupeebill_upi_id", trimmed);
    } else {
      localStorage.removeItem("rupeebill_upi_id");
    }
    if (user?.id) {
      try {
        await (supabase as any).from("profiles").update({ upi_id: trimmed || null }).eq("user_id", user.id);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("UPI ID updated successfully");
      } catch (err) {
        console.error("Failed to update UPI in profile:", err);
      }
    }
  };

  const handleBankSelect = (id: string) => {
    setSelectedBankId(id);
    localStorage.setItem("rupeebill_selected_bank_account_id", id);
    toast.success("Default invoice bank account updated");
  };

  const activeBankAccount: BankDetailsInfo | null = useMemo(() => {
    return resolveInvoiceBankDetails({
      printBankDetails,
      selectedBankAccountId: selectedBankId,
      bankAccounts,
      profile,
      userId: user?.id,
    });
  }, [printBankDetails, selectedBankId, profile, bankAccounts, user?.id]);

  return {
    selectedTheme,
    handleThemeSelect,
    pageSize,
    handlePageSizeChange,
    fontSizeFactor,
    handleFontSizeChange,
    customTerms,
    handleTermsChange,
    printBankDetails,
    handlePrintBankToggle,
    printUpiQr,
    handlePrintUpiToggle,
    showItemTaxRate,
    handleShowItemTaxToggle,
    showPartyPreviousBalance,
    handleShowPartyPreviousBalanceToggle,
    upiIdInput,
    setUpiIdInput,
    handleSaveUpiId,
    bankAccounts,
    selectedBankId,
    handleBankSelect,
    activeBankAccount,
  };
}
