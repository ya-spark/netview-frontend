import Stripe from 'stripe';

let stripe: Stripe | null = null;
let stripeInitialized = false;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
  stripeInitialized = true;
} else {
  console.warn('Stripe secret key not found. Running in development mode without Stripe integration.');
}

export { stripe };

export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    credits: 1000,
    price: 0,
    stripePriceId: null,
  },
  PAID: {
    name: 'Paid',
    credits: 10000,
    price: 29,
    stripePriceId: process.env.STRIPE_PAID_PRICE_ID,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    credits: 100000,
    price: 199,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
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
