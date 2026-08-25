import logging
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response

from src.core.config import settings
from src.core.supabase import supabase_client
from src.api.deps import get_current_user
from src.services.payments import get_gateway_driver
from src.schemas.payments import (
    OrderCreate,
    OrderCancel,
    SubscriptionOrderCreate,
    PaymentVerify,
    PaymentRefund,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])

def generate_invoice_number() -> str:
    year = datetime.utcnow().year
    rand = random.randint(1000, 9999)
    return f"INV-{year}-{rand}"


@router.get("")
async def health_check():
    return {
        "status": "ok",
        "message": "FinFlow Payments API",
        "endpoints": {
            "createOrder": "/create-order",
            "verifyPayment": "/verify-payment",
            "webhook": "/webhook",
            "refund": "/refund"
        }
    }


@router.post("/create-order")
async def create_order(payload: OrderCreate):
    try:
        # Standard Razorpay configuration check
        key_id = settings.RAZORPAY_KEY_ID
        key_secret = settings.RAZORPAY_KEY_SECRET

        if not key_id or not key_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Razorpay API credentials not configured in environment."
            )

        driver = get_gateway_driver("razorpay")

        # Handle Direct Standard Web Checkout Request
        if payload.amount is not None:
            amount_in_paise = float(payload.amount)
            if amount_in_paise < 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid amount. Minimum amount must be at least 100 paise (₹1)."
                )

            currency = (payload.currency or "INR").upper()
            receipt = payload.receipt or f"receipt_{int(datetime.utcnow().timestamp())}"

            gateway_response = await driver.create_order(
                order_id=receipt,
                amount=amount_in_paise / 100.0,
                currency=currency,
                customer={
                    "name": payload.customerName,
                    "phone": payload.customerPhone
                }
            )

            return {
                "success": True,
                "order_id": gateway_response["gatewayOrderId"],
                "gatewayOrderId": gateway_response["gatewayOrderId"],
                "amount": amount_in_paise,
                "currency": currency,
                "key_id": key_id
            }

        # Store online orders flow
        order_id = payload.orderId
        if not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required field: orderId or amount"
            )

        # Check if order payment is already successful or processing
        res = supabase_client.table("payments").select("*").eq("order_id", order_id).eq("status", "success").execute()
        if res.data and len(res.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order has already been paid successfully."
            )

        # Fetch order from DB
        order_res = supabase_client.table("online_orders").select("*, store_id").eq("id", order_id).execute()
        if not order_res.data or len(order_res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        order = order_res.data[0]

        gateway_response = await driver.create_order(
            order_id=order["id"],
            amount=float(order["total_amount"]),
            currency=order.get("currency") or "INR",
            customer={
                "name": order.get("customer_name"),
                "phone": order.get("customer_phone")
            }
        )

        if not gateway_response.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment in gateway."
            )

        return {
            "success": True,
            "order_id": gateway_response["gatewayOrderId"],
            "gatewayOrderId": gateway_response["gatewayOrderId"],
            "amount": int(round(float(order["total_amount"]) * 100)),
            "currency": order.get("currency") or "INR",
            "key_id": key_id,
            "details": gateway_response.get("details")
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create order")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc) or "Failed to create payment order."
        )


@router.post("/cancel-order")
async def cancel_order(payload: OrderCancel):
    try:
        order_id = payload.orderId

        # Fetch order
        order_res = supabase_client.table("online_orders").select("*").eq("id", order_id).execute()
        if not order_res.data or len(order_res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        # Check if successful payment exists
        pay_res = supabase_client.table("payments").select("*").eq("order_id", order_id).eq("status", "success").execute()
        if pay_res.data and len(pay_res.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a paid order."
            )

        # Update order status to rejected (triggers stock restoration in DB)
        supabase_client.table("online_orders").update({"status": "rejected"}).eq("id", order_id).execute()

        # Update pending payment statuses to failed
        supabase_client.table("payments").update({
            "status": "failed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("order_id", order_id).eq("status", "pending").execute()

        return {"success": True, "message": "Order payment cancelled. Stock restored."}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to cancel order")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc) or "Failed to cancel order."
        )


@router.post("/create-subscription-order")
async def create_subscription_order(payload: SubscriptionOrderCreate):
    try:
        plan_prices = {
            "starter": {"monthly": 0, "annual": 0},
            "pro": {"monthly": 799, "annual": 639},
            "business": {"monthly": 2499, "annual": 1999}
        }

        selected_plan = plan_prices.get(payload.planId, plan_prices["pro"])
        base_monthly = selected_plan["annual"] if payload.billingCycle == "annual" else selected_plan["monthly"]
        months = 12 if payload.billingCycle == "annual" else 1
        raw_subtotal = base_monthly * months

        discount_percent = 0
        if payload.couponCode:
            code = payload.couponCode.strip().upper()
            if code in ["FINFLOW20", "WELCOME20"]:
                discount_percent = 20
            elif code == "SPECIAL10":
                discount_percent = 10

        discount_amt = int(round(raw_subtotal * (discount_percent / 100.0)))
        subtotal = raw_subtotal - discount_amt
        gst_amount = int(round(subtotal * 0.18))
        grand_total = subtotal + gst_amount

        order_ref = f"SUB-{payload.planId.upper()}-{int(datetime.utcnow().timestamp())}"
        driver = get_gateway_driver()

        gateway_response = await driver.create_order(
            order_id=order_ref,
            amount=grand_total,
            currency="INR",
            customer={
                "name": payload.customerName,
                "phone": payload.customerPhone
            }
        )

        if not gateway_response.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize subscription payment in gateway."
            )

        # Record pending payment
        insert_data = {
            "user_id": payload.userId,
            "amount": grand_total,
            "currency": "INR",
            "status": "pending",
            "gateway": driver.name,
            "gateway_order_id": gateway_response["gatewayOrderId"],
            "idempotency_key": payload.idempotencyKey or order_ref,
            "notes": {
                "planId": payload.planId,
                "billingCycle": payload.billingCycle,
                "grandTotal": grand_total,
                "gstAmount": gst_amount,
                "discountPercent": discount_percent
            }
        }

        res = supabase_client.table("payments").insert(insert_data).execute()
        payment_record = res.data[0] if res.data and len(res.data) > 0 else None

        return {
            "success": True,
            "paymentId": payment_record.get("id") if payment_record else order_ref,
            "gatewayOrderId": gateway_response["gatewayOrderId"],
            "amount": grand_total,
            "currency": "INR",
            "details": gateway_response.get("details")
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create subscription order")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc) or "Failed to create subscription order."
        )


@router.post("/verify-payment")
async def verify_payment(payload: PaymentVerify, request: Request):
    try:
        gateway_order_id = payload.razorpay_order_id or payload.gatewayOrderId or payload.order_id
        gateway_payment_id = payload.razorpay_payment_id or payload.gatewayPaymentId or payload.payment_id
        gateway_signature = payload.razorpay_signature or payload.gatewaySignature or payload.signature

        if not gateway_order_id or not gateway_payment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: order_id and payment_id are required."
            )

        if not gateway_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required field: razorpay_signature is required."
            )

        driver = get_gateway_driver("razorpay")
        
        # Verify payment signature
        try:
            verification = await driver.verify_payment(
                gateway_order_id=gateway_order_id,
                gateway_payment_id=gateway_payment_id,
                gateway_signature=gateway_signature
            )
        except Exception as verify_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(verify_err) or "Signature mismatch: Invalid payment signature."
            )

        # Retrieve payment from DB
        pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
        payment = pay_res.data[0] if pay_res.data and len(pay_res.data) > 0 else None

        if not payment:
            return {
                "success": True,
                "message": "Payment verified successfully.",
                "payment_id": gateway_payment_id,
                "order_id": gateway_order_id,
                "status": "success"
            }

        if payment["status"] == "success":
            return {
                "success": True,
                "message": "Payment already verified.",
                "payment_id": payment.get("gateway_payment_id") or gateway_payment_id,
                "order_id": gateway_order_id,
                "status": "success"
            }

        # Update payment record
        supabase_client.table("payments").update({
            "status": "success",
            "gateway_payment_id": gateway_payment_id,
            "payment_method": verification.get("paymentMethod") or "card",
            "payment_method_details": verification.get("paymentMethodDetails") or {},
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", payment["id"]).execute()

        # Update store order status if order_id is present
        if payment.get("order_id"):
            supabase_client.table("online_orders").update({"status": "accepted"}).eq("id", payment["order_id"]).execute()

        # Handle subscription logic
        notes = payment.get("notes") or {}
        plan_id = notes.get("planId") or payload.planId
        if plan_id:
            billing_cycle = notes.get("billingCycle") or payload.billingCycle or "annual"
            now = datetime.utcnow()
            period_end = now + timedelta(days=365) if billing_cycle == "annual" else now + timedelta(days=30)
            
            try:
                supabase_client.table("subscription_status").upsert({
                    "user_id": payment["user_id"],
                    "plan": plan_id,
                    "status": "active",
                    "current_period_start": now.isoformat(),
                    "current_period_end": period_end.isoformat(),
                    "cancel_at_period_end": False,
                    "updated_at": now.isoformat()
                }).execute()
            except Exception as sub_err:
                logger.warning(f"Subscription status upsert warning: {sub_err}")

        # Generate invoice
        inv_num = generate_invoice_number()
        try:
            supabase_client.table("invoices").insert({
                "payment_id": payment["id"],
                "invoice_number": inv_num
            }).execute()
        except Exception as inv_err:
            logger.warning(f"Invoice insert warning: {inv_err}")

        # Audit Log
        client_ip = request.client.host if request.client else "unknown"
        try:
            supabase_client.table("payment_audit_logs").insert({
                "payment_id": payment["id"],
                "user_id": payment["user_id"],
                "action": "payment_success",
                "ip_address": client_ip,
                "details": {
                    "gatewayPaymentId": gateway_payment_id,
                    "method": verification.get("paymentMethod")
                }
            }).execute()
        except Exception as aud_err:
            logger.warning(f"Audit log warning: {aud_err}")

        return {
            "success": True,
            "status": "success",
            "paymentId": payment["id"],
            "invoiceNumber": inv_num
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Verify Payment Error")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) or "Payment verification failed."
        )


@router.post("/webhook")
async def webhook(request: Request):
    try:
        req_body = await request.body()
        headers = dict(request.headers)

        driver = get_gateway_driver()
        webhook_event = driver.verify_webhook(req_body, headers)

        if not webhook_event.get("isValid"):
            raise HTTPException(status_code=400, detail="Invalid signature")

        event_type = webhook_event.get("type")
        data = webhook_event.get("data")

        if event_type in ["payment.captured", "payment_intent.succeeded"]:
            gateway_order_id = data.get("order_id") or data.get("id")
            gateway_payment_id = data.get("payment_id") or data.get("latest_charge") or data.get("id")

            pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
            payment = pay_res.data[0] if pay_res.data and len(pay_res.data) > 0 else None

            if payment and payment["status"] != "success":
                # Update payment
                supabase_client.table("payments").update({
                    "status": "success",
                    "gateway_payment_id": gateway_payment_id,
                    "payment_method": data.get("method") or "card",
                    "payment_method_details": data.get("payment_method_details") or {},
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", payment["id"]).execute()

                # Update Store Order
                if payment.get("order_id"):
                    supabase_client.table("online_orders").update({"status": "accepted"}).eq("id", payment["order_id"]).execute()

                # Invoice
                inv_num = generate_invoice_number()
                supabase_client.table("invoices").insert({
                    "payment_id": payment["id"],
                    "invoice_number": inv_num
                }).execute()

                # Audit log
                supabase_client.table("payment_audit_logs").insert({
                    "payment_id": payment["id"],
                    "user_id": payment["user_id"],
                    "action": "payment_success",
                    "details": {"webhookEvent": event_type, "gatewayPaymentId": gateway_payment_id}
                }).execute()

        elif event_type in ["payment.failed", "payment_intent.payment_failed"]:
            gateway_order_id = data.get("order_id") or data.get("id")
            pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
            payment = pay_res.data[0] if pay_res.data and len(pay_res.data) > 0 else None

            if payment and payment["status"] != "success":
                supabase_client.table("payments").update({
                    "status": "failed",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", payment["id"]).execute()

                supabase_client.table("payment_audit_logs").insert({
                    "payment_id": payment["id"],
                    "user_id": payment["user_id"],
                    "action": "payment_failed",
                    "details": {"webhookEvent": event_type, "error": data.get("error")}
                }).execute()

        elif event_type in ["refund.processed", "charge.refunded"]:
            gateway_payment_id = data.get("payment_id") or data.get("payment_intent")
            pay_res = supabase_client.table("payments").select("*").eq("gateway_payment_id", gateway_payment_id).execute()
            payment = pay_res.data[0] if pay_res.data and len(pay_res.data) > 0 else None

            if payment and payment["status"] != "refunded":
                supabase_client.table("payments").update({
                    "status": "refunded",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", payment["id"]).execute()

                supabase_client.table("refunds").insert({
                    "payment_id": payment["id"],
                    "amount": payment["amount"],
                    "status": "success",
                    "gateway_refund_id": data.get("refund_id") or data.get("id"),
                    "reason": "Webhook refund"
                }).execute()

                supabase_client.table("payment_audit_logs").insert({
                    "payment_id": payment["id"],
                    "user_id": payment["user_id"],
                    "action": "refund_success",
                    "details": {"webhookEvent": event_type}
                }).execute()

        return {"received": True}

    except Exception as exc:
        logger.exception("Webhook processing error")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/refund")
async def refund_payment(payload: PaymentRefund, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        # Fetch payment
        pay_res = supabase_client.table("payments").select("*").eq("id", payload.paymentId).execute()
        if not pay_res.data or len(pay_res.data) == 0:
            raise HTTPException(status_code=404, detail="Payment not found.")

        payment = pay_res.data[0]

        # Verify Owner role/authorization check
        if payment["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this transaction")

        if payment["status"] != "success":
            raise HTTPException(status_code=400, detail="Only successful payments can be refunded.")

        driver = get_gateway_driver()
        refund_amount = payload.amount or float(payment["amount"])
        
        refund_result = await driver.refund(
            gateway_payment_id=payment.get("gateway_payment_id"),
            amount=refund_amount,
            reason=payload.reason or "Merchant initiated refund"
        )

        if not refund_result.get("success"):
            raise HTTPException(status_code=500, detail="Refund failed on gateway.")

        # Record Refund
        ref_res = supabase_client.table("refunds").insert({
            "payment_id": payment["id"],
            "amount": refund_amount,
            "status": "success",
            "gateway_refund_id": refund_result["refundId"],
            "reason": payload.reason or "Merchant initiated"
        }).execute()
        refund_record = ref_res.data[0] if ref_res.data else None

        # Update payment status
        supabase_client.table("payments").update({
            "status": "refunded",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", payment["id"]).execute()

        # Audit Log
        client_ip = request.client.host if request.client else "unknown"
        supabase_client.table("payment_audit_logs").insert({
            "payment_id": payment["id"],
            "user_id": current_user["user_id"],
            "action": "refund_success",
            "ip_address": client_ip,
            "details": {
                "refundId": refund_result["refundId"],
                "amount": refund_amount,
                "reason": payload.reason
            }
        }).execute()

        return {
            "success": True,
            "refundId": refund_record.get("id") if refund_record else None,
            "status": "refunded"
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Refund processing error")
        raise HTTPException(status_code=500, detail=str(exc) or "Failed to process refund.")


@router.get("/admin/stats")
async def get_stats(storeId: str, current_user: dict = Depends(get_current_user)):
    # Owner verification check
    if storeId != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this store")

    try:
        pay_res = supabase_client.table("payments").select("*").eq("user_id", storeId).execute()
        payments = pay_res.data or []

        gross_volume = 0.0
        net_profit = 0.0
        total_refunded = 0.0
        success_count = 0
        failed_count = 0
        pending_count = 0

        methods = {"card": 0, "upi": 0, "netbanking": 0, "wallet": 0}

        for p in payments:
            amt = float(p.get("amount") or 0)
            status_val = p.get("status")

            if status_val == "success":
                gross_volume += amt
                success_count += 1
                m = (p.get("payment_method") or "card").lower()
                if m in methods:
                    methods[m] += 1
            elif status_val == "refunded":
                gross_volume += amt
                total_refunded += amt
                failed_count += 1
            elif status_val == "failed":
                failed_count += 1
            elif status_val == "pending":
                pending_count += 1

        net_profit = gross_volume - total_refunded

        return {
            "stats": {
                "grossVolume": gross_volume,
                "netProfit": net_profit,
                "totalRefunded": total_refunded,
                "successCount": success_count,
                "failedCount": failed_count,
                "pendingCount": pending_count,
                "paymentMethodsBreakdown": [
                    {"name": "Cards", "value": methods["card"]},
                    {"name": "UPI", "value": methods["upi"]},
                    {"name": "Netbanking", "value": methods["netbanking"]},
                    {"name": "Wallets", "value": methods["wallet"]}
                ]
            }
        }

    except Exception as exc:
        logger.exception("Failed to get stats")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/admin/history")
async def get_history(
    storeId: str,
    search: str = "",
    status: str = "",
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    if storeId != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this store")

    try:
        # Build query
        query = supabase_client.table("payments").select("*, online_orders(customer_name, customer_phone, status), invoices(invoice_number), refunds(amount, reason, created_at)").eq("user_id", storeId)
        
        if status:
            query = query.eq("status", status)

        res = query.order("created_at", desc=True).execute()
        payments = res.data or []

        # Perform filtering search logic
        filtered_payments = payments
        if search:
            clean_search = search.lower()
            filtered_payments = []
            for p in payments:
                orders = p.get("online_orders") or {}
                customer_name = (orders.get("customer_name") or "").lower()
                customer_phone = (orders.get("customer_phone") or "").lower()
                gateway_order_id = (p.get("gateway_order_id") or "").lower()
                
                invoice_list = p.get("invoices") or []
                invoice_num = (invoice_list[0].get("invoice_number") or "").lower() if invoice_list else ""
                
                if (clean_search in customer_name or 
                    clean_search in customer_phone or 
                    clean_search in gateway_order_id or 
                    clean_search in invoice_num):
                    filtered_payments.append(p)

        paginated = filtered_payments[offset : offset + limit]

        return {
            "payments": paginated,
            "total": len(filtered_payments)
        }

    except Exception as exc:
        logger.exception("Failed to get history")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/admin/logs")
async def get_logs(storeId: str, current_user: dict = Depends(get_current_user)):
    if storeId != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this store")

    try:
        res = supabase_client.table("payment_audit_logs").select("*, payments(gateway_order_id, amount)").eq("user_id", storeId).order("created_at", desc=True).limit(100).execute()
        return {"logs": res.data or []}
    except Exception as exc:
        logger.exception("Failed to get audit logs")
        raise HTTPException(status_code=500, detail=str(exc))