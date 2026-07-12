import os
import asyncio
from src.whatsapp.client import WhatsAppPlaywrightClient

# Template map: event_type -> (template_name, parameter_builder)
TEMPLATES = {
    "invoice_created": {
        "name": "billing_invoice_created",
        "params": lambda e: [
            e.customer_name, e.invoice_number or "",
            str(e.amount or 0.0), e.due_date or "", e.payment_link or ""
        ]
    },
    "invoice_due_soon": {
        "name": "billing_payment_due_reminder",
        "params": lambda e: [
            e.customer_name, str(e.days_remaining or 0),
            e.invoice_number or "", str(e.amount or 0.0), e.payment_link or ""
        ]
    },
    "invoice_overdue": {
        "name": "billing_payment_overdue",
        "params": lambda e: [
            e.customer_name, str(e.overdue_days or 0),
            e.invoice_number or "", str(e.amount or 0.0), e.payment_link or ""
        ]
    },
    "payment_received": {
        "name": "billing_payment_confirmed",
        "params": lambda e: [
            e.customer_name, str(e.amount or 0.0),
            e.invoice_number or "", e.transaction_id or ""
        ]
    },
    "payment_failed": {
        "name": "billing_payment_failed",
        "params": lambda e: [
            e.customer_name, e.invoice_number or "",
            e.failure_reason or "transaction declined", e.payment_link or ""
        ]
    },
    "subscription_expiring": {
        "name": "billing_subscription_expiring",
        "params": lambda e: [
            e.customer_name, e.plan_name or "Standard",
            e.expiry_date or "", e.payment_link or ""
        ]
    },
    "subscription_renewed": {
        "name": "billing_subscription_renewed",
        "params": lambda e: [
            e.customer_name, e.plan_name or "Standard",
            str(e.amount or 0.0), e.expiry_date or ""
        ]
    },
    "subscription_cancelled": {
        "name": "billing_subscription_cancelled",
        "params": lambda e: [
            e.customer_name, e.plan_name or "Standard",
            e.expiry_date or ""
        ]
    },
    "refund_issued": {
        "name": "billing_refund_issued",
        "params": lambda e: [
            e.customer_name, str(e.refund_amount or 0.0),
            e.transaction_id or "", "5-7 business days"
        ]
    },
}

def build_message_text(event_type: str, e) -> str:
    """Format template parameters into a friendly, plain text WhatsApp message."""
    try:
        name = e.customer_name
        amt = f"Rs. {float(e.amount):.2f}" if e.amount else "Rs. 0.00"
        inv = e.invoice_number or "Invoice"
        link = e.payment_link or ""
        
        if event_type == "invoice_created":
            return f"Hi {name},\n\nYour invoice {inv} for {amt} has been generated. Due date: {e.due_date or 'N/A'}.\n\nPlease pay here: {link}\n\nThank you!"
            
        elif event_type == "invoice_due_soon":
            return f"Hi {name},\n\nFriendly reminder: Payment of {amt} for invoice {inv} is due in {e.days_remaining or 0} days.\n\nQuick pay link: {link}"
            
        elif event_type == "invoice_overdue":
            return f"Hi {name},\n\nAlert: Your invoice {inv} for {amt} is overdue by {e.overdue_days or 0} days. Please clear the dues immediately.\n\nPay here: {link}"
            
        elif event_type == "payment_received":
            return f"Hi {name},\n\nPayment confirmed! We received {amt} for invoice {inv}.\nTransaction ID: {e.transaction_id or 'N/A'}.\n\nThank you for your business!"
            
        elif event_type == "payment_failed":
            reason = e.failure_reason or "declined by bank"
            return f"Hi {name},\n\nPayment attempt of {amt} for invoice {inv} failed. Reason: {reason}.\n\nPlease try again: {link}"
            
        elif event_type == "subscription_expiring":
            return f"Hi {name},\n\nYour subscription to {e.plan_name or 'Plan'} will expire on {e.expiry_date or 'N/A'}.\n\nRenew your plan: {link}"
            
        elif event_type == "subscription_renewed":
            return f"Hi {name},\n\nGreat news! Your subscription to {e.plan_name or 'Plan'} has auto-renewed successfully. Charged: {amt}. Next renewal: {e.expiry_date or 'N/A'}."
            
        elif event_type == "subscription_cancelled":
            return f"Hi {name},\n\nYour subscription to {e.plan_name or 'Plan'} has been cancelled. Your access remains active until {e.expiry_date or 'N/A'}."
            
        elif event_type == "refund_issued":
            refund_amt = f"Rs. {float(e.refund_amount):.2f}" if e.refund_amount else "Rs. 0.00"
            return f"Hi {name},\n\nWe have issued a refund of {refund_amt} for transaction {e.transaction_id or 'N/A'}. The funds should reflect in your account in 5-7 business days."
            
        return f"Hi {name}, you have a new billing update regarding {inv}."
    except Exception as error:
        return f"Hello, you have a new billing update regarding {e.invoice_number or 'your account'}."

def build_payload(phone: str, event_type: str, event) -> dict:
    template = TEMPLATES[event_type]
    params = template["params"](event)
    message_text = build_message_text(event_type, event)
    
    return {
        "to": phone,
        "message_text": message_text,
        "messaging_product": "whatsapp",
        "type": "template",
        "template": {
            "name": template["name"],
            "language": {"code": "en"},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": p} for p in params]
            }]
        }
    }

async def send_whatsapp(payload: dict, retries: int = 3) -> dict:
    phone = payload["to"]
    message_text = payload.get("message_text", "")
    
    client = WhatsAppPlaywrightClient.get_instance()
    
    # Check session connectivity
    if not await client.is_authenticated():
        return {
            "status": "failed", 
            "error": "WhatsApp Web is not authenticated. Please scan the QR code in Settings."
        }
        
    # Attempt to send via browser automation
    success = await client.send_message(phone, message_text)
    if success:
        # Generate dummy message ID to log success
        random_id = "web_" + os.urandom(8).hex()
        return {
            "status": "sent",
            "data": {
                "messages": [{"id": random_id}]
            }
        }
    else:
        return {
            "status": "failed",
            "error": "Failed to send message via automated browser."
        }