import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/core/api/apiClient";
import { toast } from "sonner";
import {
  WhatsAppConnection,
  WhatsAppMessageLog,
  SendInvoiceWhatsAppPayload,
  SendReceiptWhatsAppPayload,
  SendReminderWhatsAppPayload,
  SendCustomMessageWhatsAppPayload,
  WhatsAppSendResult,
} from "../types";

/**
 * Hook to query WhatsApp connection status for the current merchant.
 * Auto-polls every 3 seconds if in 'connecting' or 'qr_required' state.
 */
export function useWhatsAppStatus() {
  return useQuery<WhatsAppConnection>({
    queryKey: ["whatsapp_status"],
    queryFn: async () => {
      const response = await apiClient.get<WhatsAppConnection>("/api/v1/whatsapp/status");
      return response.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "connecting" || status === "qr_required") {
        return 3000; // Poll every 3 seconds while awaiting QR scan
      }
      return false;
    },
    staleTime: 5000,
  });
}

/**
 * Hook to fetch current QR code from backend.
 */
export function useWhatsAppQR(enabled = false) {
  return useQuery<{ status: string; qr_code?: string; message?: string }>({
    queryKey: ["whatsapp_qr"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/whatsapp/qr");
      return response.data;
    },
    enabled,
    refetchInterval: 5000,
  });
}

/**
 * Hook to initiate WhatsApp connection.
 */
export function useWhatsAppConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: { phone_number?: string; webhook_url?: string }) => {
      const response = await apiClient.post<{ status: string; qr_code?: string; session_id: string }>(
        "/api/v1/whatsapp/connect",
        payload || {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_qr"] });
      if (data.status === "connected") {
        toast.success("WhatsApp connected successfully!");
      } else {
        toast.info("WhatsApp session initialized. Please scan the QR code.");
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to initialize WhatsApp connection.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to disconnect WhatsApp session.
 */
export function useWhatsAppDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ success: boolean; status: string; message: string }>(
        "/api/v1/whatsapp/disconnect"
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_qr"] });
      toast.success("WhatsApp disconnected successfully.");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to disconnect WhatsApp.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to send a test message.
 */
export function useWhatsAppTestMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { phone_number: string; message?: string }) => {
      const response = await apiClient.post<WhatsAppSendResult>(
        "/api/v1/whatsapp/test-message",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });
      toast.success(res.detail || "Test message sent successfully!");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to send test message.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to send an invoice notification via WhatsApp.
 */
export function useWhatsAppSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendInvoiceWhatsAppPayload) => {
      const response = await apiClient.post<WhatsAppSendResult>(
        "/api/v1/whatsapp/send-invoice",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });
      if (res.is_duplicate) {
        toast.info(res.detail || "Invoice was already sent to this customer.");
      } else {
        toast.success(res.detail || "Invoice sent via WhatsApp!");
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Could not send invoice via WhatsApp.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to send a payment receipt via WhatsApp.
 */
export function useWhatsAppSendReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendReceiptWhatsAppPayload) => {
      const response = await apiClient.post<WhatsAppSendResult>(
        "/api/v1/whatsapp/send-receipt",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });
      if (res.is_duplicate) {
        toast.info(res.detail || "Receipt was already sent to this customer.");
      } else {
        toast.success(res.detail || "Receipt sent via WhatsApp!");
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Could not send receipt via WhatsApp.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to send an outstanding payment reminder via WhatsApp.
 */
export function useWhatsAppSendReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendReminderWhatsAppPayload) => {
      const response = await apiClient.post<WhatsAppSendResult>(
        "/api/v1/whatsapp/send-reminder",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });
      if (res.is_duplicate) {
        toast.info(res.detail || "Reminder was already sent to this customer.");
      } else {
        toast.success(res.detail || "Payment reminder sent via WhatsApp!");
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Could not send reminder via WhatsApp.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to send a custom message via WhatsApp.
 */
export function useWhatsAppSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendCustomMessageWhatsAppPayload) => {
      const response = await apiClient.post<WhatsAppSendResult>(
        "/api/v1/whatsapp/send-message",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });
      toast.success(res.detail || "WhatsApp message sent successfully!");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Could not send message via WhatsApp.";
      toast.error(detail);
    },
  });
}

/**
 * Hook to fetch audit logs of sent WhatsApp messages.
 */
export function useWhatsAppMessages(limit = 30) {
  return useQuery<WhatsAppMessageLog[]>({
    queryKey: ["whatsapp_messages", limit],
    queryFn: async () => {
      const response = await apiClient.get<WhatsAppMessageLog[]>(`/api/v1/whatsapp/messages?limit=${limit}`);
      return response.data;
    },
    staleTime: 10000,
  });
}
