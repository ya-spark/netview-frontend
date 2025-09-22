import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

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
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  return subscription;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}
