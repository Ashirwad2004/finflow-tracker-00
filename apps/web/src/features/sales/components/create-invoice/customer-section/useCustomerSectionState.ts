import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/core/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { CustomerPartyItem, CustomerSectionProps } from "./types";

export function useCustomerSectionState({
  customerName,
  customerGstin,
  placeOfSupply,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onCustomerGstinChange,
  onPlaceOfSupplyChange,
  parties = [],
  userId,
  onPartySelected,
}: CustomerSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [isSavingParty, setIsSavingParty] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter parties for customers or both
  const customerParties = parties.filter(
    (p) => p.type === "customer" || p.type === "both" || !p.type
  );

  const filteredParties = customerName.trim()
    ? customerParties.filter(
        (p) =>
          p.name.toLowerCase().includes(customerName.toLowerCase().trim()) ||
          (p.phone && p.phone.includes(customerName.trim())) ||
          ((p.gst_number || p.gstin) &&
            (p.gst_number || p.gstin)
              ?.toLowerCase()
              .includes(customerName.toLowerCase().trim()))
      )
    : customerParties.slice(0, 10);

  const matchedParty = customerParties.find(
    (p) => p.name.toLowerCase() === customerName.trim().toLowerCase()
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectParty = (party: CustomerPartyItem) => {
    onCustomerNameChange(party.name);
    if (party.phone) {
      onCustomerPhoneChange(party.phone);
    }
    if (party.email) {
      onCustomerEmailChange(party.email);
    }
    const gst = party.gst_number || party.gstin;
    if (gst) {
      onCustomerGstinChange(gst.toUpperCase());
      if (gst.length >= 2 && !placeOfSupply) {
        onPlaceOfSupplyChange(gst.substring(0, 2));
      }
    }
    if (party.address && !placeOfSupply) {
      onPlaceOfSupplyChange(party.address);
    }

    if (onPartySelected) {
      onPartySelected(party);
    }

    setIsDropdownOpen(false);
  };

  const handleQuickAddParty = async (newPartyData: any) => {
    if (!userId) return;
    setIsSavingParty(true);
    const partyId = uuidv4();

    try {
      const payload = {
        id: partyId,
        user_id: userId,
        name: newPartyData.name,
        type: newPartyData.type || "customer",
        phone: newPartyData.phone || null,
        email: newPartyData.email || null,
        address: newPartyData.address || null,
        gst_number: newPartyData.gst_number || null,
        opening_balance: Number(newPartyData.opening_balance) || 0,
        opening_balance_type:
          newPartyData.opening_balance_type || "to_receive",
      };

      await offlineMutate({
        table: "parties",
        action: "insert",
        recordId: partyId,
        payload,
        userId,
      });

      // Optimistically update parties query
      queryClient.setQueryData(["parties", userId], (old: any) => {
        return old ? [payload, ...old] : [payload];
      });
      queryClient.setQueryData(["invoice-parties"], (old: any) => {
        return old ? [payload, ...old] : [payload];
      });

      toast({
        title: "Customer Created",
        description: `${payload.name} added to party directory.`,
      });

      // Automatically select the new party
      handleSelectParty(payload);
      setIsPartyDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to create customer",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingParty(false);
    }
  };

  const isValidGstin = (gst: string) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      gst.trim().toUpperCase()
    );
  };

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    highlightedIndex,
    setHighlightedIndex,
    isPartyDialogOpen,
    setIsPartyDialogOpen,
    isSavingParty,
    containerRef,
    inputRef,
    filteredParties,
    matchedParty,
    handleSelectParty,
    handleQuickAddParty,
    isValidGstin,
  };
}
