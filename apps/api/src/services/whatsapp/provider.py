from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class WhatsAppProvider(ABC):
    """
    Abstract interface for WhatsApp providers (OpenWA, Meta Cloud API, etc.)
    FinFlow core services communicate solely through this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier, e.g. 'openwa' or 'meta_cloud'."""
        pass

    @abstractmethod
    async def create_session(
        self, session_id: str, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initializes a WhatsApp session.
        Returns:
            dict containing:
                - status: 'connecting' | 'qr_required' | 'connected' | 'error'
                - qr_code: Optional[str]
                - phone_number: Optional[str]
                - error_message: Optional[str]
        """
        pass

    @abstractmethod
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        Retrieves the real-time status of the specified WhatsApp session.
        Returns:
            dict containing:
                - status: 'connected' | 'qr_required' | 'connecting' | 'disconnected' | 'error'
                - phone_number: Optional[str]
                - display_name: Optional[str]
                - error_message: Optional[str]
        """
        pass

    @abstractmethod
    async def get_qr(self, session_id: str) -> Optional[str]:
        """
        Retrieves the active QR code string/data URL for linking.
        """
        pass

    @abstractmethod
    async def disconnect_session(self, session_id: str) -> bool:
        """
        Logs out and terminates the WhatsApp session.
        """
        pass

    @abstractmethod
    async def send_text(
        self, session_id: str, phone: str, text: str
    ) -> Dict[str, Any]:
        """
        Sends a plain text message to the specified phone number.
        Returns:
            dict containing:
                - message_id: str
                - status: 'sent' | 'queued' | 'failed'
        """
        pass

    @abstractmethod
    async def send_document(
        self,
        session_id: str,
        phone: str,
        document_base64: str,
        filename: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends a file document (PDF invoice, receipt, etc.) with optional caption.
        Returns:
            dict containing:
                - message_id: str
                - status: 'sent' | 'queued' | 'failed'
        """
        pass
