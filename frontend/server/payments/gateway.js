import { MockGateway } from './drivers/mock.js';
import { StripeGateway } from './drivers/stripe.js';
import { RazorpayGateway } from './drivers/razorpay.js';

export function getGatewayDriver(provider = process.env.PAYMENT_GATEWAY_PROVIDER || 'mock') {
  switch (provider.toLowerCase()) {
    case 'stripe':
      return new StripeGateway();
    case 'razorpay':
      return new RazorpayGateway();
    case 'mock':
    default:
      return new MockGateway();
  }
}
