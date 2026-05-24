import crypto from 'crypto';

export class RazorpayGateway {
  name = 'razorpay';
  client = null;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      this.initClient(keyId, keySecret);
    }
  }

  async initClient(keyId, keySecret) {
    try {
      const Razorpay = (await import('razorpay')).default;
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
    } catch (err) {
      console.warn("Razorpay SDK is not installed. Run 'npm install razorpay' to use Razorpay.");
    }
  }

  async ensureClient() {
    if (!this.client) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables are not defined.');
      }
      await this.initClient(keyId, keySecret);
      if (!this.client) {
        throw new Error('Razorpay SDK could not be loaded. Please install razorpay dependency.');
      }
    }
  }

  async createOrder({ orderId, amount, currency = 'INR', customer }) {
    await this.ensureClient();

    // Razorpay expects amounts in paisa (subunit)
    const subunitAmount = Math.round(amount * 100);

    const rzpOrder = await this.client.orders.create({
      amount: subunitAmount,
      currency: currency.toUpperCase(),
      receipt: `receipt_order_${orderId.slice(0, 16)}`,
      notes: { orderId }
    });

    return {
      success: true,
      gatewayOrderId: rzpOrder.id,
      checkoutUrl: null, // Loaded on client side using Razorpay Checkout script
      details: {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        orderId: rzpOrder.id,
        customerName: customer.name,
        customerPhone: customer.phone
      }
    };
  }

  async verifyPayment({ gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
    await this.ensureClient();

    if (!gatewaySignature) {
      throw new Error('Razorpay payment requires gatewaySignature for verification.');
    }

    // Verify hash signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = gatewayOrderId + '|' + gatewayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== gatewaySignature) {
      throw new Error('Razorpay signature verification failed.');
    }

    // Retrieve payment details to fetch method
    const paymentDetails = await this.client.payments.fetch(gatewayPaymentId);

    return {
      success: true,
      paymentMethod: paymentDetails.method, // card, upi, netbanking, wallet
      paymentMethodDetails: {
        bank: paymentDetails.bank,
        wallet: paymentDetails.wallet,
        vpa: paymentDetails.vpa,
        cardId: paymentDetails.card_id,
        email: paymentDetails.email,
        contact: paymentDetails.contact
      }
    };
  }

  async refund({ gatewayPaymentId, amount, reason }) {
    await this.ensureClient();

    const refundParams = {};
    if (amount) {
      refundParams.amount = Math.round(amount * 100); // convert to paisa
    }
    
    // Notes
    refundParams.notes = { reason: reason || 'Merchant refund' };

    const refund = await this.client.payments.refund(gatewayPaymentId, refundParams);

    return {
      success: true,
      refundId: refund.id
    };
  }

  verifyWebhook(req) {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      throw new Error('Missing x-razorpay-signature or RAZORPAY_WEBHOOK_SECRET');
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    // Note: requires req.rawBody or raw text buffer
    const rawBody = req.rawBody || JSON.stringify(req.body);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      throw new Error('Razorpay webhook signature verification failed.');
    }

    const event = req.body;
    return {
      isValid: true,
      type: event.event, // e.g. 'payment.captured', 'refund.processed'
      data: event.payload
    };
  }
}
