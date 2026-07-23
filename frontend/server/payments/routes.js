import express from 'express';
import { getGatewayDriver } from './gateway.js';
import { 
  supabaseAdmin, 
  requireAuth, 
  rateLimiter, 
  roleCheck, 
  validateRequest 
} from './middleware.js';

export const paymentRouter = express.Router();

// 0. Default Health/Status check for Payments API
paymentRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FinFlow Payments API',
    endpoints: {
      createOrder: '/create-order',
      verifyPayment: '/verify-payment',
      webhook: '/webhook',
      refund: '/refund'
    }
  });
});

// Helper to generate Invoice Number
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${rand}`;
}

// 1. Create Payment Order (Direct & Store Orders)
paymentRouter.post(
  '/create-order',
  rateLimiter(20, 60000), // Max 20 requests per minute per IP
  async (req, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.status(401).json({ error: 'Razorpay API credentials not configured in environment.' });
      }

      // Handle Direct Standard Web Checkout Request (where amount in paise is provided directly)
      if (req.body.amount !== undefined) {
        let amountInPaise = Number(req.body.amount);
        if (isNaN(amountInPaise) || amountInPaise < 100) {
          return res.status(400).json({ error: 'Invalid amount. Minimum amount must be at least 100 paise (₹1).' });
        }

        const currency = (req.body.currency || 'INR').toUpperCase();
        const receipt = req.body.receipt || `receipt_${Date.now()}`;

        const driver = getGatewayDriver('razorpay');
        const gatewayResponse = await driver.createOrder({
          orderId: receipt,
          amount: amountInPaise / 100, // driver converts to paise (subunits)
          currency,
          customer: {
            name: req.body.customerName || 'Valued Customer',
            phone: req.body.customerPhone || '9999999999'
          }
        });

        return res.json({
          success: true,
          order_id: gatewayResponse.gatewayOrderId,
          gatewayOrderId: gatewayResponse.gatewayOrderId,
          amount: amountInPaise,
          currency,
          key_id: keyId
        });
      }

      // Existing store online_orders flow
      const { orderId, idempotencyKey } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'Missing required field: orderId or amount' });
      }

      // Check if order payment is already successful or processing
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'success')
        .maybeSingle();

      if (existingPayment) {
        return res.status(400).json({ error: 'This order has already been paid successfully.' });
      }

      // Fetch the actual order from the database
      const { data: order, error: orderError } = await supabaseAdmin
        .from('online_orders')
        .select('*, store_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const driver = getGatewayDriver('razorpay');
      const gatewayResponse = await driver.createOrder({
        orderId: order.id,
        amount: order.total_amount,
        currency: order.currency || 'INR',
        customer: {
          name: order.customer_name,
          phone: order.customer_phone
        }
      });

      if (!gatewayResponse.success) {
        throw new Error('Failed to create payment in gateway.');
      }

      return res.json({
        success: true,
        order_id: gatewayResponse.gatewayOrderId,
        gatewayOrderId: gatewayResponse.gatewayOrderId,
        amount: Math.round(order.total_amount * 100),
        currency: order.currency || 'INR',
        key_id: keyId,
        details: gatewayResponse.details
      });

    } catch (err) {
      console.error('Create Payment Order Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create payment order.' });
    }
  }
);

// 1.5 Cancel Payment Order (restores stock)
paymentRouter.post(
  '/cancel-order',
  rateLimiter(10, 60000), // Max 10 requests per minute per IP
  validateRequest({ orderId: 'string' }),
  async (req, res) => {
    try {
      const { orderId } = req.body;

      // Fetch the order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('online_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      // Check if there is already a successful payment for this order
      const { data: successfulPayment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'success')
        .maybeSingle();

      if (successfulPayment) {
        return res.status(400).json({ error: 'Cannot cancel a paid order.' });
      }

      // Update the order status to 'rejected' to automatically restore stock via database trigger
      const { error: updateError } = await supabaseAdmin
        .from('online_orders')
        .update({ status: 'rejected' })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update payment status to failed if a pending payment record exists
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('status', 'pending');

      return res.json({ success: true, message: 'Order payment cancelled. Stock restored.' });
    } catch (err) {
      console.error('Cancel Payment Order Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to cancel order.' });
    }
  }
);

// 2. Verify Payment Integrity
// 1.8 Create Subscription Payment Order
paymentRouter.post(
  '/create-subscription-order',
  rateLimiter(10, 60000), // Max 10 requests per minute per IP
  validateRequest({ planId: 'string', billingCycle: 'string', userId: 'string' }),
  async (req, res) => {
    try {
      const { planId, billingCycle, userId, couponCode, idempotencyKey } = req.body;

      const planPrices = {
        starter: { monthly: 0, annual: 0 },
        pro: { monthly: 799, annual: 639 },
        business: { monthly: 2499, annual: 1999 }
      };

      const selectedPlan = planPrices[planId] || planPrices.pro;
      const baseMonthly = billingCycle === 'annual' ? selectedPlan.annual : selectedPlan.monthly;
      const months = billingCycle === 'annual' ? 12 : 1;
      let rawSubtotal = baseMonthly * months;

      let discountPercent = 0;
      if (couponCode) {
        const code = couponCode.trim().toUpperCase();
        if (code === 'FINFLOW20' || code === 'WELCOME20') discountPercent = 20;
        else if (code === 'SPECIAL10') discountPercent = 10;
      }

      const discountAmt = Math.round(rawSubtotal * (discountPercent / 100));
      const subtotal = rawSubtotal - discountAmt;
      const gstAmount = Math.round(subtotal * 0.18);
      const grandTotal = subtotal + gstAmount;

      const orderRef = `SUB-${planId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const driver = getGatewayDriver();

      const gatewayResponse = await driver.createOrder({
        orderId: orderRef,
        amount: grandTotal,
        currency: 'INR',
        customer: {
          name: req.body.customerName || 'FinFlow User',
          phone: req.body.customerPhone || '9999999999'
        }
      });

      if (!gatewayResponse.success) {
        throw new Error('Failed to initialize subscription payment in gateway.');
      }

      // Record pending payment in DB
      const { data: paymentRecord, error: insertErr } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          amount: grandTotal,
          currency: 'INR',
          status: 'pending',
          gateway: driver.name,
          gateway_order_id: gatewayResponse.gatewayOrderId,
          idempotency_key: idempotencyKey || orderRef,
          notes: { planId, billingCycle, grandTotal, gstAmount, discountPercent }
        })
        .select()
        .single();

      if (insertErr) {
        console.warn('Subscription payment record insert warning:', insertErr.message);
      }

      return res.json({
        success: true,
        paymentId: paymentRecord?.id || orderRef,
        gatewayOrderId: gatewayResponse.gatewayOrderId,
        amount: grandTotal,
        currency: 'INR',
        details: gatewayResponse.details
      });

    } catch (err) {
      console.error('Create Subscription Order Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create subscription order.' });
    }
  }
);

// 2. Verify Payment Integrity
paymentRouter.post(
  '/verify-payment',
  rateLimiter(30, 60000), // Max 30 attempts per minute
  async (req, res) => {
    try {
      const gatewayOrderId = req.body.razorpay_order_id || req.body.gatewayOrderId || req.body.order_id;
      const gatewayPaymentId = req.body.razorpay_payment_id || req.body.gatewayPaymentId || req.body.payment_id;
      const gatewaySignature = req.body.razorpay_signature || req.body.gatewaySignature || req.body.signature;

      if (!gatewayOrderId || !gatewayPaymentId) {
        return res.status(400).json({ error: 'Missing required fields: order_id and payment_id are required.' });
      }

      if (!gatewaySignature) {
        return res.status(400).json({ error: 'Missing required field: razorpay_signature is required.' });
      }

      const driver = getGatewayDriver('razorpay');
      
      // Perform HMAC-SHA256 verification via driver
      let verification;
      try {
        verification = await driver.verifyPayment({
          gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature
        });
      } catch (verifyErr) {
        return res.status(400).json({
          success: false,
          error: verifyErr.message || 'Signature mismatch: Invalid payment signature.'
        });
      }

      // Find the payment record in database if present
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('gateway_order_id', gatewayOrderId)
        .maybeSingle();

      if (!payment) {
        return res.json({
          success: true,
          message: 'Payment verified successfully.',
          payment_id: gatewayPaymentId,
          order_id: gatewayOrderId,
          status: 'success'
        });
      }

      if (payment.status === 'success') {
        return res.json({
          success: true,
          message: 'Payment already verified.',
          payment_id: payment.gateway_payment_id || gatewayPaymentId,
          order_id: gatewayOrderId,
          status: 'success'
        });
      }

      const driver = getGatewayDriver();
      const verification = await driver.verifyPayment({
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature
      });

      if (verification.success) {
        // Update payment record in database
        const { error: updateErr } = await supabaseAdmin
          .from('payments')
          .update({
            status: 'success',
            gateway_payment_id: gatewayPaymentId,
            payment_method: verification.paymentMethod || 'card',
            payment_method_details: verification.paymentMethodDetails || {},
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateErr) console.warn('Payment status update warning:', updateErr.message);

        // If payment has order_id, update online_orders status to 'accepted'
        if (payment.order_id) {
          await supabaseAdmin
            .from('online_orders')
            .update({ status: 'accepted' })
            .eq('id', payment.order_id);
        }

        // If payment is for subscription, update subscription_status table
        const notes = payment.notes || {};
        if (notes.planId || req.body.planId) {
          const planId = notes.planId || req.body.planId;
          const billingCycle = notes.billingCycle || req.body.billingCycle || 'annual';
          const now = new Date();
          const periodEnd = new Date();
          if (billingCycle === 'annual') {
            periodEnd.setFullYear(now.getFullYear() + 1);
          } else {
            periodEnd.setMonth(now.getMonth() + 1);
          }

          try {
            await supabaseAdmin
              .from('subscription_status')
              .upsert({
                user_id: payment.user_id,
                plan: planId,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                cancel_at_period_end: false,
                updated_at: now.toISOString()
              });
          } catch (subErr) {
            console.warn('Subscription status upsert warning:', subErr);
          }
        }

        // Generate Invoice
        const invNum = await generateInvoiceNumber();
        try {
          await supabaseAdmin
            .from('invoices')
            .insert({
              payment_id: payment.id,
              invoice_number: invNum
            });
        } catch (invErr) {
          console.warn('Invoice insert warning:', invErr);
        }

        // Audit Log
        try {
          await supabaseAdmin.from('payment_audit_logs').insert({
            payment_id: payment.id,
            user_id: payment.user_id,
            action: 'payment_success',
            ip_address: req.ip,
            details: { gatewayPaymentId, method: verification.paymentMethod }
          });
        } catch (audErr) {
          console.warn('Audit log warning:', audErr);
        }

        return res.json({
          success: true,
          status: 'success',
          paymentId: payment.id,
          invoiceNumber: invNum
        });
      } else {
        throw new Error('Verification signature failed');
      }

    } catch (err) {
      console.error('Verify Payment Error:', err);
      return res.status(400).json({ error: err.message || 'Payment verification failed.' });
    }
  }
);

// 3. Gateway Webhook Handler
paymentRouter.post(
  '/webhook',
  async (req, res) => {
    try {
      const driver = getGatewayDriver();
      const webhookEvent = driver.verifyWebhook(req);

      if (!webhookEvent.isValid) {
        return res.status(400).send('Invalid signature');
      }

      const { type, data } = webhookEvent;

      if (type === 'payment.captured' || type === 'payment_intent.succeeded') {
        const gatewayOrderId = data.order_id || data.id; // Razorpay order_id or Stripe Intent ID
        const gatewayPaymentId = data.payment_id || data.latest_charge || data.id;

        // Process successful payment
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('gateway_order_id', gatewayOrderId)
          .maybeSingle();

        if (payment && payment.status !== 'success') {
          // Update payment
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'success',
              gateway_payment_id: gatewayPaymentId,
              payment_method: data.method || 'card',
              payment_method_details: data.payment_method_details || {},
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          // Update Order to accepted
          await supabaseAdmin
            .from('online_orders')
            .update({ status: 'accepted' })
            .eq('id', payment.order_id);

          // Invoice
          const invNum = await generateInvoiceNumber();
          await supabaseAdmin
            .from('invoices')
            .insert({
              payment_id: payment.id,
              invoice_number: invNum
            });

          // Audit
          await supabaseAdmin.from('payment_audit_logs').insert({
            payment_id: payment.id,
            user_id: payment.user_id,
            action: 'payment_success',
            details: { webhookEvent: type, gatewayPaymentId }
          });
        }
      } else if (type === 'payment.failed' || type === 'payment_intent.payment_failed') {
        const gatewayOrderId = data.order_id || data.id;
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('gateway_order_id', gatewayOrderId)
          .maybeSingle();

        if (payment && payment.status !== 'success') {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          await supabaseAdmin.from('payment_audit_logs').insert({
            payment_id: payment.id,
            user_id: payment.user_id,
            action: 'payment_failed',
            details: { webhookEvent: type, error: data.error }
          });
        }
      } else if (type === 'refund.processed' || type === 'charge.refunded') {
        const gatewayPaymentId = data.payment_id || data.payment_intent;
        
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('gateway_payment_id', gatewayPaymentId)
          .maybeSingle();

        if (payment && payment.status !== 'refunded') {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          await supabaseAdmin
            .from('refunds')
            .insert({
              payment_id: payment.id,
              amount: payment.amount,
              status: 'success',
              gateway_refund_id: data.refund_id || data.id,
              reason: 'Webhook refund'
            });

          await supabaseAdmin.from('payment_audit_logs').insert({
            payment_id: payment.id,
            user_id: payment.user_id,
            action: 'refund_success',
            details: { webhookEvent: type }
          });
        }
      }

      return res.status(200).json({ received: true });

    } catch (err) {
      console.error('Webhook Error:', err);
      // We return 200/202 to gateway even on processing errors so it stops retrying, or 400 for signature fail
      return res.status(400).json({ error: err.message });
    }
  }
);

// 4. Refund Payment (Auth & Owner Role Check required)
paymentRouter.post(
  '/refund',
  requireAuth,
  roleCheck,
  validateRequest({ paymentId: 'string' }),
  async (req, res) => {
    try {
      const { paymentId, amount, reason } = req.body;

      const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        return res.status(404).json({ error: 'Payment not found.' });
      }

      if (payment.status !== 'success') {
        return res.status(400).json({ error: 'Only successful payments can be refunded.' });
      }

      const driver = getGatewayDriver();
      const refundResult = await driver.refund({
        gatewayPaymentId: payment.gateway_payment_id,
        amount: amount || payment.amount,
        reason: reason || 'Merchant initiated refund'
      });

      if (!refundResult.success) {
        throw new Error('Refund failed on gateway.');
      }

      // Record Refund
      const { data: refundRecord } = await supabaseAdmin
        .from('refunds')
        .insert({
          payment_id: payment.id,
          amount: amount || payment.amount,
          status: 'success',
          gateway_refund_id: refundResult.refundId,
          reason: reason || 'Merchant initiated'
        })
        .select()
        .single();

      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // Audit Log
      await supabaseAdmin.from('payment_audit_logs').insert({
        payment_id: payment.id,
        user_id: req.user.id,
        action: 'refund_success',
        ip_address: req.ip,
        details: { refundId: refundResult.refundId, amount: amount || payment.amount, reason }
      });

      return res.json({
        success: true,
        refundId: refundRecord.id,
        status: 'refunded'
      });

    } catch (err) {
      console.error('Refund Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to process refund.' });
    }
  }
);

// 5. Merchant Dashboard Analytics (Auth & Store Check)
paymentRouter.get(
  '/admin/stats',
  requireAuth,
  roleCheck,
  async (req, res) => {
    try {
      const { storeId } = req.query;

      // Fetch all payments for this user/store
      const { data: payments, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('user_id', storeId);

      if (error) throw error;

      let grossVolume = 0;
      let netProfit = 0;
      let totalRefunded = 0;
      let successCount = 0;
      let failedCount = 0;
      let pendingCount = 0;

      const methods = { card: 0, upi: 0, netbanking: 0, wallet: 0 };

      payments.forEach(p => {
        if (p.status === 'success') {
          grossVolume += Number(p.amount);
          netProfit += Number(p.amount);
          successCount++;
          const m = (p.payment_method || 'card').toLowerCase();
          if (methods[m] !== undefined) methods[m]++;
        } else if (p.status === 'refunded') {
          grossVolume += Number(p.amount);
          totalRefunded += Number(p.amount);
          failedCount++; // count as non-active revenue
        } else if (p.status === 'failed') {
          failedCount++;
        } else if (p.status === 'pending') {
          pendingCount++;
        }
      });

      netProfit = grossVolume - totalRefunded;

      return res.json({
        stats: {
          grossVolume,
          netProfit,
          totalRefunded,
          successCount,
          failedCount,
          pendingCount,
          paymentMethodsBreakdown: [
            { name: 'Cards', value: methods.card },
            { name: 'UPI', value: methods.upi },
            { name: 'Netbanking', value: methods.netbanking },
            { name: 'Wallets', value: methods.wallet }
          ]
        }
      });

    } catch (err) {
      console.error('Fetch Stats Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// 6. Payments History (Auth & Store Check)
paymentRouter.get(
  '/admin/history',
  requireAuth,
  roleCheck,
  async (req, res) => {
    try {
      const { storeId, search = '', status = '', limit = 50, offset = 0 } = req.query;

      let query = supabaseAdmin
        .from('payments')
        .select('*, online_orders(customer_name, customer_phone, status), invoices(invoice_number), refunds(amount, reason, created_at)')
        .eq('user_id', storeId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: payments, error } = await query;
      if (error) throw error;

      // Client-side search mapping to simulate ILIKE across relation columns
      let filteredPayments = payments;
      if (search) {
        const cleanSearch = search.toLowerCase();
        filteredPayments = payments.filter(p => {
          const customerName = p.online_orders?.customer_name?.toLowerCase() || '';
          const customerPhone = p.online_orders?.customer_phone?.toLowerCase() || '';
          const gatewayOrderId = p.gateway_order_id?.toLowerCase() || '';
          const invoiceNum = p.invoices?.[0]?.invoice_number?.toLowerCase() || '';
          return (
            customerName.includes(cleanSearch) || 
            customerPhone.includes(cleanSearch) || 
            gatewayOrderId.includes(cleanSearch) || 
            invoiceNum.includes(cleanSearch)
          );
        });
      }

      const paginated = filteredPayments.slice(Number(offset), Number(offset) + Number(limit));

      return res.json({
        payments: paginated,
        total: filteredPayments.length
      });

    } catch (err) {
      console.error('Fetch History Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// 7. Audit Logs Viewer (Auth & Store Check)
paymentRouter.get(
  '/admin/logs',
  requireAuth,
  roleCheck,
  async (req, res) => {
    try {
      const { storeId } = req.query;

      const { data: logs, error } = await supabaseAdmin
        .from('payment_audit_logs')
        .select('*, payments(gateway_order_id, amount)')
        .eq('user_id', storeId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return res.json({ logs });

    } catch (err) {
      console.error('Fetch Logs Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);