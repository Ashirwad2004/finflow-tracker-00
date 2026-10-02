import { v4 as uuidv4 } from "uuid";
import { QueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { InvoiceFormValues } from "./types";

interface ResolveInvoicePartyParams {
    values: InvoiceFormValues;
    userId: string;
    queryClient: QueryClient;
    parties?: any[];
}

export async function resolveInvoiceParty({
    values,
    userId,
    queryClient,
    parties,
}: ResolveInvoicePartyParams): Promise<string | null> {
    let resolvedPartyId: string | null = null;
    const customerNameTrimmed = values.customer_name?.trim();

    if (!customerNameTrimmed) {
        return null;
    }

    const cachedParties: any[] =
        queryClient.getQueryData(["parties", userId]) ||
        (parties as any[]) ||
        [];

    const existingParty = cachedParties.find(
        (p: any) =>
            p.name?.trim().toLowerCase() === customerNameTrimmed.toLowerCase()
    );

    if (existingParty) {
        resolvedPartyId = existingParty.id;
        const needsUpdate =
            (!existingParty.phone && values.customer_phone?.trim()) ||
            (!existingParty.email && values.customer_email?.trim()) ||
            (!existingParty.gst_number && values.customer_gstin?.trim()) ||
            (!existingParty.address && values.place_of_supply?.trim()) ||
            existingParty.type === "vendor";

        if (needsUpdate) {
            const updatedPartyPayload: any = {
                ...existingParty,
                phone:
                    existingParty.phone ||
                    values.customer_phone?.trim() ||
                    null,
                email:
                    existingParty.email ||
                    values.customer_email?.trim() ||
                    null,
                gst_number:
                    existingParty.gst_number ||
                    values.customer_gstin?.trim()?.toUpperCase() ||
                    null,
                address:
                    existingParty.address ||
                    values.place_of_supply?.trim() ||
                    null,
                type:
                    existingParty.type === "vendor"
                        ? "both"
                        : existingParty.type,
            };

            offlineMutate({
                table: "parties",
                action: "update",
                recordId: existingParty.id,
                payload: updatedPartyPayload,
                userId,
            }).catch((err) =>
                console.warn("Could not update party details:", err)
            );

            queryClient.setQueryData(["parties", userId], (old: any) => {
                if (!old) return [updatedPartyPayload];
                return old.map((p: any) =>
                    p.id === existingParty.id ? updatedPartyPayload : p
                );
            });
            queryClient.setQueryData(["invoice-parties"], (old: any) => {
                if (!old) return [updatedPartyPayload];
                return old.map((p: any) =>
                    p.id === existingParty.id ? updatedPartyPayload : p
                );
            });
        }
    } else {
        resolvedPartyId = uuidv4();
        const newPartyPayload = {
            id: resolvedPartyId,
            user_id: userId,
            name: customerNameTrimmed,
            type: "customer",
            phone: values.customer_phone?.trim() || null,
            email: values.customer_email?.trim() || null,
            address: values.place_of_supply?.trim() || null,
            gst_number:
                values.customer_gstin?.trim()?.toUpperCase() || null,
            opening_balance: 0,
            opening_balance_type: "to_receive",
            created_at: new Date().toISOString(),
        };

        await offlineMutate({
            table: "parties",
            action: "insert",
            recordId: resolvedPartyId,
            payload: newPartyPayload,
            userId,
        });

        queryClient.setQueryData(["parties", userId], (old: any) => {
            const prev = old || [];
            return [...prev, newPartyPayload].sort((a: any, b: any) =>
                a.name.localeCompare(b.name)
            );
        });
        queryClient.setQueryData(["invoice-parties"], (old: any) => {
            const prev = old || [];
            return [...prev, newPartyPayload].sort((a: any, b: any) =>
                a.name.localeCompare(b.name)
            );
        });
    }

    return resolvedPartyId;
}
