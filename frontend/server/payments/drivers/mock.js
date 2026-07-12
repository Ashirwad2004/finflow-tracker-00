import crypto from 'crypto';

export class MockGateway {
  name = 'mock';

  async createOrder({ orderId, amount, currency = 'INR', customer }) {
    const mockOrderId = `mock_order_${crypto.randomBytes(8).toString('hex')}`;
    
    // In mock mode, we'll return a simulated checkout object.
    return {
      success: true,
      gatewayOrderId: mockOrderId,
      checkoutUrl: `/payment/checkout?gateway=mock&order_id=${orderId}&gateway_order_id=${mockOrderId}`,
      details: {
        amount,
        currency,
        merchantName: "FinFlow Storefront",
        customerName: customer.name,
        customerPhone: customer.phone
      }
    };
  }

  async verifyPayment({ gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
    // Generate a mock signature if none provided or compare
    const expectedSignature = crypto
      .createHmac('sha256', 'mock_secret')
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');

    // In mock mode, we accept anything starting with mock_pay
    if (gatewayPaymentId && gatewayPaymentId.startsWith('mock_pay')) {
      const paymentMethod = gatewayPaymentId.split('_')[2] || 'card';
      return {
        success: true,
        paymentMethod,
        paymentMethodDetails: {
          brand: paymentMethod === 'card' ? 'Visa' : null,
          last4: paymentMethod === 'card' ? '4242' : null,
          upiId: paymentMethod === 'upi' ? 'customer@upi' : null,
          bank: paymentMethod === 'netbanking' ? 'State Bank of India' : null,
          wallet: paymentMethod === 'wallet' ? 'Paytm' : null
        }
      };
    }

    throw new Error('Invalid mock payment verification payload');
  }

  async refund({ gatewayPaymentId, amount, reason }) {
    return {
      success: true,
      refundId: `mock_ref_${crypto.randomBytes(8).toString('hex')}`
    };
  }

  verifyWebhook(req) {
    // In mock mode, we verify raw event details
    const event = req.body;
    return {
      isValid: true,
      type: event.type, // e.g. 'payment.captured', 'refund.processed'
      data: event.data
    };
  }
}
