from fastapi import APIRouter, HTTPException, Response
from src.whatsapp.models import BillingEvent
from src.whatsapp.notification import process_billing_event
from src.whatsapp.client import WhatsAppPlaywrightClient

router = APIRouter(tags=["whatsapp"])

@router.post("/webhook/billing-event")
async def billing_event_webhook(event: BillingEvent):
    try:
        result = await process_billing_event(event)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_whatsapp_status():
    try:
        client = WhatsAppPlaywrightClient.get_instance()
        authenticated = await client.is_authenticated()
        return {"authenticated": authenticated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check WhatsApp status: {str(e)}")

@router.get("/qr")
async def get_whatsapp_qr():
    try:
        client = WhatsAppPlaywrightClient.get_instance()
        authenticated = await client.is_authenticated()
        if authenticated:
            return {"authenticated": True, "message": "Already authenticated"}
        
        qr_bytes = await client.get_qr_screenshot()
        if qr_bytes:
            return Response(content=qr_bytes, media_type="image/png")
        else:
            raise HTTPException(status_code=503, detail="QR Code not ready yet. Please retry in a few seconds.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get WhatsApp QR Code: {str(e)}")

