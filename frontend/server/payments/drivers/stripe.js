export class StripeGateway {
  name = 'stripe';
  client = null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.initClient(secretKey);
    }
  }

  async initClient(secretKey) {
    try {
      const Stripe = (await import('stripe')).default;
      this.client = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    } catch (err) {
      console.warn("Stripe SDK is not installed. Run 'npm install stripe' to use Stripe.");
    }
  }

  async ensureClient() {
    if (!this.client) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not defined.');
      }
      await this.initClient(secretKey);
      if (!this.client) {
        throw new Error('Stripe SDK could not be loaded. Please install stripe dependency.');
      }
    }
  }

  async createOrder({ orderId, amount, currency = 'USD', customer }) {
    await this.ensureClient();

    // Stripe expects amounts in cents/subunit
    const subunitAmount = Math.round(amount * 100);

    const paymentIntent = await this.client.paymentIntents.create({
      amount: subunitAmount,
      currency: currency.toLowerCase(),
      description: `FinFlow Storefront Order #${orderId}`,
      metadata: { orderId },
      receipt_email: customer.email || undefined,
    });

    return {
      success: true,
      gatewayOrderId: paymentIntent.id,
      checkoutUrl: null, // Stripe elements loaded via clientSecret on frontend
      details: {
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
      }
    };
  }

  async verifyPayment({ gatewayOrderId }) {
    await this.ensureClient();

    const paymentIntent = await this.client.paymentIntents.retrieve(gatewayOrderId);

    if (paymentIntent.status === 'succeeded') {
      const charge = paymentIntent.latest_charge 
        ? await this.client.charges.retrieve(paymentIntent.latest_charge)
        : null;
      
      const method = charge?.payment_method_details?.type || 'card';
      return {
        success: true,
        paymentMethod: method,
        paymentMethodDetails: charge?.payment_method_details || {}
      };
    }

    throw new Error(`Stripe Payment Intent is in status: ${paymentIntent.status}`);
  }

  async refund({ gatewayPaymentId, amount, reason }) {
    await this.ensureClient();

    const refundParams = {
      payment_intent: gatewayPaymentId,
      reason: 'requested_by_customer'
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // convert to cents
    }

    const refund = await this.client.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id
    };
  }

  verifyWebhook(req) {
    if (!this.client) {
      throw new Error('Stripe client not initialized');
    }
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    }

    // Note: requires req.rawBody (raw express body)
    const event = this.client.webhooks.constructEvent(
      req.rawBody || JSON.stringify(req.body),
      signature,
      webhookSecret
    );

    return {
      isValid: true,
      type: event.type,
      data: event.data.object
    };
  }
}