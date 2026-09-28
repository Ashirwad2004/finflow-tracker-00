import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi, CreateInvoicePayload, InvoiceRecord } from "@/core/api/invoices";

export function useInvoices(params?: {
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["api-invoices", params],
    queryFn: () => invoicesApi.listInvoices(params),
    staleTime: 30000,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["api-invoice", id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: !!id,
  });
}

export function useNextInvoiceNumber(prefix: string = "INV-", enabled: boolean = true) {
  return useQuery({
    queryKey: ["api-next-invoice-number", prefix],
    queryFn: () => invoicesApi.getNextInvoiceNumber(prefix),
    enabled,
    staleTime: 5000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoicesApi.createInvoice(payload),
    onSuccess: (data: InvoiceRecord) => {
      queryClient.invalidateQueries({ queryKey: ["api-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-movements"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateInvoicePayload> }) =>
      invoicesApi.updateInvoice(id, payload),
    onSuccess: (data: InvoiceRecord) => {
      queryClient.invalidateQueries({ queryKey: ["api-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["api-invoice", data.id] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}
