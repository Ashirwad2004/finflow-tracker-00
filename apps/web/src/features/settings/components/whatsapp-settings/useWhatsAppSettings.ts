import { useState } from "react";
import { toast } from "sonner";
import {
  useWhatsAppStatus,
  useWhatsAppConnect,
  useWhatsAppDisconnect,
  useWhatsAppQR,
  useWhatsAppTestMessage,
  useWhatsAppMessages,
} from "@/features/whatsapp/hooks/useWhatsApp";

export function useWhatsAppSettings() {
  const {
    data: connStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useWhatsAppStatus();
  const connectMutation = useWhatsAppConnect();
  const disconnectMutation = useWhatsAppDisconnect();
  const testMessageMutation = useWhatsAppTestMessage();

  const isAwaitingQR =
    connStatus?.status === "qr_required" ||
    connStatus?.status === "connecting" ||
    (Boolean(connStatus?.qr_code_data) && connStatus?.status !== "connected");

  const {
    data: qrData,
    isLoading: qrLoading,
    refetch: refetchQR,
  } = useWhatsAppQR(isAwaitingQR);

  const { data: messageLogs = [] } = useWhatsAppMessages(10);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const currentStatus = connStatus?.status || "disconnected";
  const rawQr = qrData?.qr_code || connStatus?.qr_code_data;

  const handleConnect = async () => {
    connectMutation.mutate({});
  };

  const handleDisconnect = async () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => {
        setDisconnectDialogOpen(false);
      },
    });
  };

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      toast.error("Please enter a valid destination phone number.");
      return;
    }
    testMessageMutation.mutate(
      { phone_number: testPhone.trim() },
      {
        onSuccess: () => {
          setTestModalOpen(false);
          setTestPhone("");
        },
      }
    );
  };

  return {
    connStatus,
    statusLoading,
    refetchStatus,
    connectMutation,
    disconnectMutation,
    testMessageMutation,
    qrLoading,
    refetchQR,
    messageLogs,
    testModalOpen,
    setTestModalOpen,
    testPhone,
    setTestPhone,
    disconnectDialogOpen,
    setDisconnectDialogOpen,
    currentStatus,
    rawQr,
    handleConnect,
    handleDisconnect,
    handleSendTest,
  };
}
