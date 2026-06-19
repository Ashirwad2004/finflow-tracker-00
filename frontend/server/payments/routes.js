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

// 1. Create Payment Order
paymentRouter.post(
  '/create-order',
  rateLimiter(10, 60000), // Max 10 requests per minute per IP
  validateRequest({ orderId: 'string', idempotencyKey: 'string' }),
  async (req, res) => {
    try {
      const { orderId, idempotencyKey } = req.body;

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

      // Check for duplicate payment via idempotency key
      const { data: duplicatePayment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (duplicatePayment) {
        // Return existing payment details to client to prevent re-creation
        const driver = getGatewayDriver();
        return res.json({
          success: true,
          paymentId: duplicatePayment.id,
          gatewayOrderId: duplicatePayment.gateway_order_id,
          status: duplicatePayment.status,
          amount: duplicatePayment.amount
        });
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

      const driver = getGatewayDriver();
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

      // Insert pending payment into DB
      const { data: paymentRecord, error: insertError } = await supabaseAdmin
        .from('payments')
        .insert({
          order_id: orderId,
          user_id: order.store_id, // Store owner
          amount: order.total_amount,
          currency: order.currency || 'INR',
          status: 'pending',
          gateway: driver.name,
          gateway_order_id: gatewayResponse.gatewayOrderId,
          idempotency_key: idempotencyKey
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Log order creation in Audit logs
      await supabaseAdmin.from('payment_audit_logs').insert({
        payment_id: paymentRecord.id,
        user_id: order.store_id,
        action: 'order_created',
        ip_address: req.ip,
        details: { gatewayOrderId: gatewayResponse.gatewayOrderId, idempotencyKey }
      });

      return res.json({
        success: true,
        paymentId: paymentRecord.id,
        gatewayOrderId: gatewayResponse.gatewayOrderId,
        checkoutUrl: gatewayResponse.checkoutUrl,
        details: gatewayResponse.details
      });

    } catch (err) {
      console.error('Create Payment Order Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create payment order.' });
    }
  }
);

// 2. Verify Payment Integrity
paymentRouter.post(
  '/verify-payment',
  rateLimiter(20, 60000), // Max 20 attempts per minute
  validateRequest({ gatewayOrderId: 'string', gatewayPaymentId: 'string' }),
  async (req, res) => {
    try {
      const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

      // Find the payment record
      const { data: payment, error: fetchErr } = await supabaseAdmin
        .from('payments')
        .select('*, online_orders(status)')
        .eq('gateway_order_id', gatewayOrderId)
        .maybeSingle();

      if (fetchErr || !payment) {
        return res.status(404).json({ error: 'Payment record not found for this gateway order.' });
      }

      if (payment.status === 'success') {
        // Already processed, return immediately
        return res.json({ success: true, status: 'success', paymentId: payment.id });
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

        if (updateErr) throw updateErr;

        // Update online_orders status to 'accepted'
        await supabaseAdmin
          .from('online_orders')
          .update({ status: 'accepted' })
          .eq('id', payment.order_id);

        // Generate Invoice
        const invNum = await generateInvoiceNumber();
        await supabaseAdmin
          .from('invoices')
          .insert({
            payment_id: payment.id,
            invoice_number: invNum
          });

        // Audit Log
        await supabaseAdmin.from('payment_audit_logs').insert({
          payment_id: payment.id,
          user_id: payment.user_id,
          action: 'payment_success',
          ip_address: req.ip,
          details: { gatewayPaymentId, method: verification.paymentMethod }
        });

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
