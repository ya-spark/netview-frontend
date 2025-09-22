import Stripe from 'stripe';

let stripe: Stripe | null = null;
let stripeInitialized = false;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
  stripeInitialized = true;
} else {
  console.info('💳 Stripe not configured - payment processing disabled in development mode. To enable Stripe, add STRIPE_SECRET_KEY to your environment.');
}

export { stripe };

export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    displayPrice: '$0',
    period: '/month',
    startupCredit: 5, // dollars
    billingModel: 'free',
    stripePriceId: null,
    features: [
      'Basic uptime monitoring probes',
      'Basic reporting', 
      '5 users in organization',
      'AI powered probe creation',
    ],
    limitations: [
      'All probes stop after startup credit is used',
      'No email notifications',
      'No custom gateway',
    ]
  },
  PAID: {
    name: 'Paid',
    price: null,
    displayPrice: 'Pay as you go',
    period: '',
    billingModel: 'payg',
    defaultTopUpAmount: 20, // dollars
    lowBalanceThreshold: 5, // dollars  
    autoTopUpConfigurable: true,
    stripePriceId: process.env.STRIPE_PAID_PRICE_ID,
    features: [
      'Pay as you go billing',
      'Email notifications',
      '3 custom gateways',
      'Advanced analytics (coming soon)',
      'Stripe billing',
      'Basic email support',
      'Configurable auto top-up',
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    displayPrice: 'Contact Sales',
    period: '',
    billingModel: 'enterprise',
    contactSales: true,
    stripePriceId: null,
    features: [
      'Priority support',
      'Higher custom gateway count',
      '50 users in organization', 
      'Custom integrations',
      'SLA guarantees',
      'Dedicated account manager',
    ]
  },
};

export async function createOrGetCustomer(email: string, name: string) {
  if (!stripe || !stripeInitialized) {
    console.warn('Stripe not initialized, returning mock customer for development');
    return { id: 'dev-customer-1', email, name } as any;
  }

  // First, check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer;
}

export async function createSubscription(customerId: string, priceId: string) {
  if (!stripe || !stripeInitialized) {
    console.warn('Stripe not initialized, returning mock subscription for development');
    return { id: 'dev-subscription-1', status: 'active' } as any;
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  return subscription;
}

export async function cancelSubscription(subscriptionId: string) {
  if (!stripe || !stripeInitialized) {
    console.warn('Stripe not initialized, returning mock cancellation for development');
    return { id: subscriptionId, status: 'canceled' } as any;
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  if (!stripe || !stripeInitialized) {
    console.warn('Stripe not initialized, returning mock subscription for development');
    return { id: subscriptionId, status: 'active' } as any;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}
