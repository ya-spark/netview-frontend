import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Check, Star, Download, Calendar, DollarSign } from 'lucide-react';
import type { Tenant } from '@shared/schema';

let stripePromise: Promise<any> | null = null;
const hasStripeConfig = !!import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (hasStripeConfig) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
} else {
  console.warn('Stripe public key not found. Billing functionality disabled in development mode.');
}

interface PricingPlan {
  name: string;
  credits: number;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
}

const PRICING_PLANS: Record<string, PricingPlan> = {
  FREE: {
    name: 'Free',
    credits: 1000,
    price: 0,
    period: '/month',
    features: [
      'Basic uptime monitoring',
      'Email notifications',
      '1 custom gateway',
      'Basic reporting',
    ],
    popular: false,
  },
  PAID: {
    name: 'Paid',
    credits: 10000,
    price: 29,
    period: '/month',
    features: [
      'Advanced monitoring (API, Security, Browser)',
      'SMS & Email notifications',
      'Unlimited custom gateways',
      'Advanced analytics',
      'AI-powered probe generation',
      'Priority support',
    ],
    popular: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    credits: 100000,
    price: 199,
    period: '/month',
    features: [
      'Everything in Paid',
      'Custom integrations',
      'Advanced role management',
      'SLA guarantees',
      'Dedicated account manager',
      'Custom contracts',
    ],
    popular: false,
  },
};

const SubscriptionForm = ({ plan, onSuccess }: { plan: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscription Successful",
        description: "Your subscription has been activated!",
      });
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        data-testid="button-confirm-payment"
      >
        {isProcessing ? 'Processing...' : `Subscribe to ${PRICING_PLANS[plan as keyof typeof PRICING_PLANS].name}`}
      </Button>
    </form>
  );
};

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['/api/tenant', user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest('POST', '/api/billing/create-subscription', { plan });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      toast({
        title: 'Success',
        description: 'Payment setup initialized. Please complete payment.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePlanSelect = (plan: string) => {
    if (plan === 'FREE') {
      toast({
        title: 'Info',
        description: 'You are already on the free plan.',
      });
      return;
    }
    setSelectedPlan(plan);
    createSubscriptionMutation.mutate(plan);
  };

  const handleSubscriptionSuccess = () => {
    setClientSecret(null);
    setSelectedPlan(null);
    queryClient.invalidateQueries({ queryKey: ['/api/tenant'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  const currentPlan = tenant?.billingTier || 'Free';
  const creditsUsed = tenant?.creditsUsed || 0;
  const creditsLimit = tenant?.creditsLimit || 1000;
  const usagePercentage = (creditsUsed / creditsLimit) * 100;

  return (
    <Layout>
      <div className="p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Current Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant={currentPlan === 'Free' ? 'outline' : 'default'} data-testid="badge-current-plan">
                    {currentPlan}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Cost</span>
                  <span className="font-medium" data-testid="text-monthly-cost">
                    ${PRICING_PLANS[currentPlan.toUpperCase() as keyof typeof PRICING_PLANS]?.price || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Credits Limit</span>
                  <span className="font-medium" data-testid="text-credits-limit">
                    {creditsLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Usage This Month</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Credits Used</span>
                    <span className="font-medium" data-testid="text-credits-used">
                      {creditsUsed.toLocaleString()} / {creditsLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usagePercentage.toFixed(1)}% used
                  </p>
                </div>
                {usagePercentage > 80 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      You're approaching your credit limit. Consider upgrading your plan.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Next Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Charge</span>
                  <span className="font-medium" data-testid="text-next-charge">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-medium" data-testid="text-next-amount">
                    ${PRICING_PLANS[currentPlan.toUpperCase() as keyof typeof PRICING_PLANS]?.price || 0}
                  </span>
                </div>
                {currentPlan !== 'Free' && (
                  <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-manage-subscription">
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(PRICING_PLANS).map(([key, plan]) => (
                <Card 
                  key={key} 
                  className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${
                    currentPlan.toUpperCase() === key ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  {currentPlan.toUpperCase() === key && (
                    <Badge className="absolute -top-3 right-4 bg-secondary text-secondary-foreground">
                      Current Plan
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground ml-1">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {plan.credits.toLocaleString()} credits
                      </p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-secondary mr-3 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full" 
                      variant={currentPlan.toUpperCase() === key ? "outline" : (plan.popular ? "default" : "outline")}
                      disabled={currentPlan.toUpperCase() === key || createSubscriptionMutation.isPending}
                      onClick={() => handlePlanSelect(key)}
                      data-testid={`button-select-${key.toLowerCase()}`}
                    >
                      {currentPlan.toUpperCase() === key 
                        ? 'Current Plan' 
                        : createSubscriptionMutation.isPending && selectedPlan === key
                        ? 'Setting up...'
                        : key === 'FREE' 
                        ? 'Downgrade' 
                        : 'Upgrade'
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billing History</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-download-invoices">
                <Download className="w-4 h-4 mr-2" />
                Download Invoices
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No billing history available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        {clientSecret && selectedPlan && (
          <Dialog open={!!clientSecret} onOpenChange={() => setClientSecret(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Complete Your Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-foreground">
                    {PRICING_PLANS[selectedPlan as keyof typeof PRICING_PLANS].name} Plan
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    ${PRICING_PLANS[selectedPlan as keyof typeof PRICING_PLANS].price}/month
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {PRICING_PLANS[selectedPlan as keyof typeof PRICING_PLANS].credits.toLocaleString()} credits included
                  </p>
                </div>
                
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscriptionForm 
                    plan={selectedPlan} 
                    onSuccess={handleSubscriptionSuccess}
                  />
                </Elements>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
