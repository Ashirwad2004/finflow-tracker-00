"""Payments API endpoints."""

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response

from src.core.config import settings
from src.core.supabase import supabase_client
from src.api.deps import get_current_user, get_optional_user
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
PROCESSED_WEBHOOK_EVENTS: set[str] = set()


def first_row(data: Any) -> Optional[Dict[str, Any]]:
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        return data[0]
    if isinstance(data, dict):
        return data
    return None


def rows_list(data: Any) -> list[Dict[str, Any]]:
    if isinstance(data, list):
        return [p for p in data if isinstance(p, dict)]
    return []


def extract_webhook_entity(event_type: Optional[str], data: Any) -> Tuple[Dict[str, Any], Optional[str], Optional[str]]:
    """
    Normalizes webhook payload entities across Razorpay and Stripe.
    Returns: (entity_dict, gateway_order_id, gateway_payment_id)
    """
    if not isinstance(data, dict):
        return {}, None, None

    # Razorpay payload structure: payload.payment.entity or payload.refund.entity
    if "payment" in data and isinstance(data["payment"], dict) and "entity" in data["payment"]:
        entity = data["payment"]["entity"]
        order_id = entity.get("order_id") or (data.get("order", {}).get("entity", {}).get("id") if isinstance(data.get("order"), dict) else None)
        payment_id = entity.get("id")
        return entity, order_id, payment_id

    if "refund" in data and isinstance(data["refund"], dict) and "entity" in data["refund"]:
        entity = data["refund"]["entity"]
        order_id = None
        payment_id = entity.get("payment_id")
        return entity, order_id, payment_id

    # Stripe or flat payload structure
    order_id = data.get("order_id") or data.get("id")
    payment_id = data.get("payment_id") or data.get("latest_charge") or data.get("id")
    return data, order_id, payment_id


def generate_invoice_number() -> str:
    year = datetime.now(timezone.utc).year
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
async def create_order(
    payload: OrderCreate,
    current_user: dict | None = Depends(get_optional_user),
):
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
            if current_user is None:
                raise HTTPException(status_code=401, detail="Authentication required")
            amount_in_paise = float(payload.amount)
            if amount_in_paise < 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid amount. Minimum amount must be at least 100 paise (₹1)."
                )

            currency = (payload.currency or "INR").upper()
            receipt = payload.receipt or f"receipt_{int(datetime.now(timezone.utc).timestamp())}"

            gateway_response = await driver.create_order(
                order_id=receipt,
                amount=amount_in_paise / 100.0,
                currency=currency,
                customer={
                    "name": payload.customerName,
                    "phone": payload.customerPhone
                }
            )

            supabase_client.table("payments").insert({
                "user_id": current_user["user_id"],
                "amount": amount_in_paise / 100.0,
                "currency": currency,
                "status": "pending",
                "gateway": driver.name,
                "gateway_order_id": gateway_response["gatewayOrderId"],
                "idempotency_key": payload.idempotencyKey or receipt,
            }).execute()

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
        order_res = (
            supabase_client.table("online_orders")
            .select("*, store_id")
            .eq("id", order_id)
            .execute()
        )
        order = first_row(order_res.data)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        if current_user and order["store_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not current_user and payload.customerPhone != order.get("customer_phone"):
            raise HTTPException(status_code=403, detail="Customer verification failed")

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

        supabase_client.table("payments").insert({
            "user_id": order["store_id"],
            "order_id": order["id"],
            "amount": float(order["total_amount"]),
            "currency": order.get("currency") or "INR",
            "status": "pending",
            "gateway": driver.name,
            "gateway_order_id": gateway_response["gatewayOrderId"],
            "idempotency_key": payload.idempotencyKey or order["id"],
        }).execute()

        return {
            "success": True,
            "order_id": gateway_response["gatewayOrderId"],
            "gatewayOrderId": gateway_response["gatewayOrderId"],
            "amount": round(float(order["total_amount"]) * 100),
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
            detail="Failed to create payment order."
        )


@router.post("/cancel-order")
async def cancel_order(
    payload: OrderCancel,
    current_user: dict | None = Depends(get_optional_user),
):
    try:
        order_id = payload.orderId

        # Fetch order
        order_query = supabase_client.table("online_orders").select("*").eq("id", order_id)
        if current_user:
            order_query = order_query.eq("store_id", current_user["user_id"])
        elif payload.customerPhone:
            order_query = order_query.eq("customer_phone", payload.customerPhone)
        else:
            raise HTTPException(status_code=401, detail="Authentication or customer verification required")
        order_res = order_query.execute()
        order = first_row(order_res.data)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )
        if order.get("status") not in {"pending", "processing"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Order cannot be cancelled in its current state",
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
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("order_id", order_id).eq("status", "pending").execute()

        return {"success": True, "message": "Order payment cancelled. Stock restored."}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to cancel order")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order."
        )


@router.post("/create-subscription-order")
async def create_subscription_order(
    payload: SubscriptionOrderCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        plan_prices = {
            "starter": {"monthly": 299, "annual": 299},
            "pro": {"monthly": 299, "annual": 299},
            "business": {"monthly": 299, "annual": 299},
            "premium": {"monthly": 299, "annual": 299},
        }

        selected_plan = plan_prices.get(payload.planId, plan_prices["pro"])
        base_monthly = selected_plan["annual"] if payload.billingCycle == "annual" else selected_plan["monthly"]
        months = 12 if payload.billingCycle == "annual" else 1
        raw_subtotal = base_monthly * months

        # Keep one authoritative subscription price: flat ₹299
        grand_total = 299
        gst_amount = 0
        discount_percent = 0

        order_ref = f"SUB-{payload.planId.upper()}-{int(datetime.now(timezone.utc).timestamp())}"
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
            "user_id": current_user["user_id"],
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
        payment_record = first_row(res.data)

        return {
            "success": True,
            "paymentId": payment_record.get("id") if payment_record else order_ref,
            "gatewayOrderId": gateway_response["gatewayOrderId"],
            "order_id": gateway_response["gatewayOrderId"],
            "amount": grand_total * 100,  # in paise for Razorpay
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "details": gateway_response.get("details")
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create subscription order")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription order."
        )


@router.post("/verify-payment")
async def verify_payment(
    payload: PaymentVerify,
    request: Request,
    current_user: dict | None = Depends(get_optional_user),
):
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

        # Retrieve payment from DB
        pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
        payment = first_row(pay_res.data)

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment order not found",
            )

        if current_user and payment.get("user_id") != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )

        driver = get_gateway_driver(payment.get("gateway") or settings.PAYMENT_GATEWAY_PROVIDER)

        try:
            verification = await driver.verify_payment(
                gateway_order_id=gateway_order_id,
                gateway_payment_id=gateway_payment_id,
                gateway_signature=gateway_signature,
                expected_amount=float(payment["amount"]),
                expected_currency=payment.get("currency") or "INR",
            )
        except Exception as verify_err:
            logger.warning("Payment verification rejected: %s", verify_err)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment verification.",
            ) from verify_err

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
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", payment["id"]).execute()

        # Update store order status if order_id is present
        if payment.get("order_id"):
            supabase_client.table("online_orders").update({"status": "accepted"}).eq("id", payment["order_id"]).execute()

        # Handle subscription logic
        notes = payment.get("notes") or {}
        plan_id = notes.get("planId") or payload.planId
        if plan_id:
            now = datetime.now(timezone.utc)
            # RupeeBill Business license: 6 months (183 days) for flat ₹299
            period_end = now + timedelta(days=183)
            
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
            detail="Payment verification failed."
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

        event_id = webhook_event.get("eventId")
        if event_id:
            if event_id in PROCESSED_WEBHOOK_EVENTS:
                logger.info("Duplicate webhook event ignored: %s", event_id)
                return {"received": True, "duplicate": True}
            PROCESSED_WEBHOOK_EVENTS.add(event_id)
            if len(PROCESSED_WEBHOOK_EVENTS) > 10000:
                PROCESSED_WEBHOOK_EVENTS.pop()

        event_type = webhook_event.get("type")
        data = webhook_event.get("data")

        entity, gateway_order_id, gateway_payment_id = extract_webhook_entity(event_type, data)

        if event_type in ["payment.captured", "payment_intent.succeeded"]:
            if not gateway_order_id:
                logger.warning("No order_id resolved from webhook event: %s", event_type)
                return {"received": True, "warning": "Unresolved order ID"}

            pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
            payment = first_row(pay_res.data)

            if payment and payment["status"] != "success":
                now_iso = datetime.now(timezone.utc).isoformat()

                # Update payment status
                supabase_client.table("payments").update({
                    "status": "success",
                    "gateway_payment_id": gateway_payment_id or payment.get("gateway_payment_id"),
                    "payment_method": entity.get("method") or "card",
                    "payment_method_details": entity.get("payment_method_details") or {},
                    "updated_at": now_iso
                }).eq("id", payment["id"]).execute()

                # Update Store Order if linked
                if payment.get("order_id"):
                    supabase_client.table("online_orders").update({"status": "accepted"}).eq("id", payment["order_id"]).execute()

                # Fulfill Subscription if planId is present in payment notes
                notes = payment.get("notes") or {}
                plan_id = notes.get("planId") or notes.get("plan_id")
                if plan_id:
                    billing_cycle = notes.get("billingCycle") or "annual"
                    now = datetime.now(timezone.utc)
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
                        logger.info("Successfully fulfilled subscription for user %s via webhook", payment["user_id"])
                    except Exception as sub_err:
                        logger.warning("Webhook subscription status upsert warning: %s", sub_err)

                # Invoice creation
                inv_num = generate_invoice_number()
                try:
                    supabase_client.table("invoices").insert({
                        "payment_id": payment["id"],
                        "invoice_number": inv_num
                    }).execute()
                except Exception as inv_err:
                    logger.warning("Webhook invoice generation warning: %s", inv_err)

                # Audit log
                try:
                    supabase_client.table("payment_audit_logs").insert({
                        "payment_id": payment["id"],
                        "user_id": payment["user_id"],
                        "action": "payment_success",
                        "details": {"webhookEvent": event_type, "gatewayPaymentId": gateway_payment_id}
                    }).execute()
                except Exception as aud_err:
                    logger.warning("Webhook audit log warning: %s", aud_err)

        elif event_type in ["payment.failed", "payment_intent.payment_failed"]:
            if gateway_order_id:
                pay_res = supabase_client.table("payments").select("*").eq("gateway_order_id", gateway_order_id).execute()
                payment = first_row(pay_res.data)

                if payment and payment["status"] != "success":
                    supabase_client.table("payments").update({
                        "status": "failed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", payment["id"]).execute()

                    try:
                        supabase_client.table("payment_audit_logs").insert({
                            "payment_id": payment["id"],
                            "user_id": payment["user_id"],
                            "action": "payment_failed",
                            "details": {"webhookEvent": event_type, "error": entity.get("error")}
                        }).execute()
                    except Exception as aud_err:
                        logger.warning("Webhook audit log warning: %s", aud_err)

        elif event_type in ["refund.processed", "charge.refunded"]:
            pay_identifier = gateway_payment_id or entity.get("payment_id")
            if pay_identifier:
                pay_res = supabase_client.table("payments").select("*").eq("gateway_payment_id", pay_identifier).execute()
                payment = first_row(pay_res.data)

                if payment and payment["status"] != "refunded":
                    supabase_client.table("payments").update({
                        "status": "refunded",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", payment["id"]).execute()

                    try:
                        supabase_client.table("refunds").insert({
                            "payment_id": payment["id"],
                            "amount": payment["amount"],
                            "status": "success",
                            "gateway_refund_id": entity.get("id") or entity.get("refund_id"),
                            "reason": "Webhook refund"
                        }).execute()
                    except Exception as ref_err:
                        logger.warning("Webhook refund record warning: %s", ref_err)

                    try:
                        supabase_client.table("payment_audit_logs").insert({
                            "payment_id": payment["id"],
                            "user_id": payment["user_id"],
                            "action": "refund_success",
                            "details": {"webhookEvent": event_type}
                        }).execute()
                    except Exception as aud_err:
                        logger.warning("Webhook audit log warning: %s", aud_err)

        return {"received": True}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Webhook processing error")
        raise HTTPException(status_code=400, detail="Invalid webhook request")


@router.post("/refund")
async def refund_payment(payload: PaymentRefund, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        # Fetch payment
        pay_res = supabase_client.table("payments").select("*").eq("id", payload.paymentId).execute()
        payment = first_row(pay_res.data)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found.")

        # Verify Owner role/authorization check
        if payment["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this transaction")

        if payment["status"] != "success":
            raise HTTPException(status_code=400, detail="Only successful payments can be refunded.")

        driver = get_gateway_driver()
        from decimal import Decimal

        payment_amount = Decimal(str(payment["amount"]))
        refund_amount = (
            payment_amount
            if payload.amount is None
            else Decimal(str(payload.amount))
        )

        if refund_amount <= 0 or refund_amount > payment_amount:
            raise HTTPException(
                status_code=400,
                detail="Refund amount is outside the refundable balance",
            )

        existing_refunds = (
            supabase_client.table("refunds")
            .select("amount")
            .eq("payment_id", payment["id"])
            .eq("status", "success")
            .execute()
        )
        already_refunded = sum(
            (Decimal(str(row.get("amount", 0))) for row in rows_list(existing_refunds.data)),
            Decimal("0"),
        )
        if already_refunded + refund_amount > payment_amount:
            raise HTTPException(
                status_code=409,
                detail="Refund exceeds the remaining refundable balance",
            )
        
        gateway_payment_id = payment.get("gateway_payment_id")
        if not gateway_payment_id:
            raise HTTPException(
                status_code=400,
                detail="Payment is missing a gateway payment ID and cannot be refunded.",
            )

        refund_result = await driver.refund(
            gateway_payment_id=gateway_payment_id,
            amount=float(refund_amount),
            reason=payload.reason or "Merchant initiated refund"
        )

        if not refund_result.get("success"):
            raise HTTPException(status_code=500, detail="Refund failed on gateway.")

        # Record Refund
        ref_res = supabase_client.table("refunds").insert({
            "payment_id": payment["id"],
            "amount": float(refund_amount),
            "status": "success",
            "gateway_refund_id": refund_result["refundId"],
            "reason": payload.reason or "Merchant initiated"
        }).execute()
        refund_record = first_row(ref_res.data)

        # Update payment status
        supabase_client.table("payments").update({
            "status": "refunded",
            "updated_at": datetime.now(timezone.utc).isoformat()
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
                "amount": float(refund_amount),
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
        raise HTTPException(status_code=500, detail="Failed to process refund.")


@router.get("/admin/stats")
async def get_stats(storeId: str, current_user: dict = Depends(get_current_user)):
    # Owner verification check
    if storeId != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this store")

    try:
        pay_res = supabase_client.table("payments").select("*").eq("user_id", storeId).execute()
        payments = rows_list(pay_res.data)

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
        raise HTTPException(status_code=500, detail="Failed to load payment statistics")


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

    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    try:
        # Build query
        query = supabase_client.table("payments").select("*, online_orders(customer_name, customer_phone, status), invoices(invoice_number), refunds(amount, reason, created_at)").eq("user_id", storeId)
        
        if status:
            query = query.eq("status", status)

        res = query.order("created_at", desc=True).execute()
        payments = rows_list(res.data)

        # Perform filtering search logic
        filtered_payments = payments
        if search:
            clean_search = search.lower()
            filtered_payments = []
            for p in payments:
                raw_orders = p.get("online_orders")
                orders: Dict[str, Any] = (
                    raw_orders
                    if isinstance(raw_orders, dict)
                    else (raw_orders[0] if isinstance(raw_orders, list) and len(raw_orders) > 0 and isinstance(raw_orders[0], dict) else {})
                )
                customer_name = (str(orders.get("customer_name") or "")).lower()
                customer_phone = (str(orders.get("customer_phone") or "")).lower()
                gateway_order_id = (str(p.get("gateway_order_id") or "")).lower()
                
                raw_invoices = p.get("invoices")
                invoice_list = rows_list(raw_invoices)
                invoice_num = (str(invoice_list[0].get("invoice_number") or "")).lower() if invoice_list else ""
                
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
        raise HTTPException(status_code=500, detail="Failed to load payment history")


@router.get("/admin/logs")
async def get_logs(storeId: str, current_user: dict = Depends(get_current_user)):
    if storeId != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this store")

    try:
        res = supabase_client.table("payment_audit_logs").select("*, payments(gateway_order_id, amount)").eq("user_id", storeId).order("created_at", desc=True).limit(100).execute()
        return {"logs": res.data or []}
    except Exception as exc:
        logger.exception("Failed to get audit logs")
        raise HTTPException(status_code=500, detail="Failed to load audit logs")