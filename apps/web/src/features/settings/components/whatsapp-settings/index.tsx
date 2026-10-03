import React from "react";
import { useWhatsAppSettings } from "./useWhatsAppSettings";
import { WhatsAppConnectionCard } from "./WhatsAppConnectionCard";
import { WhatsAppAuditLogs } from "./WhatsAppAuditLogs";
import { WhatsAppTestMessageDialog } from "./WhatsAppTestMessageDialog";
import { WhatsAppDisconnectDialog } from "./WhatsAppDisconnectDialog";

export * from "./useWhatsAppSettings";
export * from "./WhatsAppConnectionCard";
export * from "./WhatsAppAuditLogs";
export * from "./WhatsAppTestMessageDialog";
export * from "./WhatsAppDisconnectDialog";

export const WhatsAppSettings: React.FC = () => {
  const {
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
  } = useWhatsAppSettings();

  return (
    <div className="space-y-6">
      {/* Main Connection Status Card */}
      <WhatsAppConnectionCard
        currentStatus={currentStatus}
        statusLoading={statusLoading}
        rawQr={rawQr}
        qrLoading={qrLoading}
        connStatus={connStatus}
        connectPending={connectMutation.isPending}
        onConnect={handleConnect}
        onDisconnectClick={() => setDisconnectDialogOpen(true)}
        onOpenTestModal={() => setTestModalOpen(true)}
        onRefetchQR={refetchQR}
        onRefetchStatus={refetchStatus}
        onCancelConnecting={() => disconnectMutation.mutate()}
      />

      {/* Message Audit Log Section */}
      {currentStatus === "connected" && <WhatsAppAuditLogs logs={messageLogs} />}

      {/* Test Message Modal */}
      <WhatsAppTestMessageDialog
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        phone={testPhone}
        onPhoneChange={setTestPhone}
        onSubmit={handleSendTest}
        isSending={testMessageMutation.isPending}
      />

      {/* Disconnect Confirmation Dialog */}
      <WhatsAppDisconnectDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
        onDisconnect={handleDisconnect}
        isDisconnecting={disconnectMutation.isPending}
      />
    </div>
  );
};

export default WhatsAppSettings;
