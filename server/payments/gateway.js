import { MockGateway } from './drivers/mock.js';
import { StripeGateway } from './drivers/stripe.js';
import { RazorpayGateway } from './drivers/razorpay.js';

/**
 * Get the appropriate gateway driver for a store.
 * If storeConfig.razorpay_key_id is present, use Razorpay with per-store credentials.
 * Otherwise, fall back to the mock gateway for testing.
 */
export function getGatewayDriver(storeConfig = {}) {
  const provider = storeConfig.payment_gateway || process.env.PAYMENT_GATEWAY_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'razorpay': {
      // Per-store Razorpay key from DB, or fallback to env var
      const keyId = storeConfig.razorpay_key_id || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      return new RazorpayGateway({ keyId, keySecret });
    }
    case 'stripe':
      return new StripeGateway();
    case 'mock':
    default:
      return new MockGateway();
  }
}
