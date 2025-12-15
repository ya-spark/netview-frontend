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
import { logger } from '@/lib/logger';
import { CreditCard, Check, Star, Download, Calendar, DollarSign } from 'lucide-react';
// Define Tenant type locally since shared schema is not available
interface Tenant {
  id: string;
  name: string;
  subdomain?: string;
  billingTier: string;
  balance: number;
  creditsLimit: number;
  creditsUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lazy initialization of Stripe - only load when component is actually rendered
let stripePromise: Promise<any> | null = null;
const hasStripeConfig = !!import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const getStripePromise = (): Promise<any> | null => {
  if (!hasStripeConfig) {
    return null;
  }
  
  // Lazy initialize Stripe only when needed
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  
  return stripePromise;
};

interface PricingPlan {
  name: string;
  price: number | null;
  displayPrice: string;
  period: string;
  billingModel: string;
  features: string[];
  limitations?: string[];
  startupCredit?: number;
  defaultTopUpAmount?: number;
  lowBalanceThreshold?: number;
  autoTopUpConfigurable?: boolean;
  contactSales?: boolean;
  popular?: boolean;
}

// Fetch pricing plans from server to ensure consistency
const fetchPricingPlans = async (): Promise<Record<string, PricingPlan>> => {
  try {
    const response = await apiRequest('GET', '/api/pricing-plans');
    return await response.json();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to fetch pricing plans', err, {
      component: 'Billing',
      action: 'fetch_pricing_plans',
    });
    // Fallback to default plans if server is unavailable
    return {
      FREE: {
        name: 'Free',
        price: 0,
        displayPrice: '$0',
        period: '/month',
        billingModel: 'free',
        startupCredit: 5,
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
        defaultTopUpAmount: 20,
        lowBalanceThreshold: 5,
        autoTopUpConfigurable: true,
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
  }
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
        {isProcessing ? 'Processing...' : `Subscribe to Plan`}
      </Button>
    </form>
  );
};

export default function Billing() {
  const { user } = useAuth();
  
  // Fetch pricing plans from server
  const { data: pricingPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/pricing-plans'],
    queryFn: fetchPricingPlans,
  });
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
  const balance = tenant?.balance || 0;
  
  if (plansLoading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </Layout>
    );
  }
  
  if (!pricingPlans) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Unable to load pricing plans. Please try again later.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2" data-testid="text-page-title">Billing</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Current Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Plan</span>
                  <Badge variant={currentPlan === 'Free' ? 'outline' : 'default'} data-testid="badge-current-plan">
                    {currentPlan}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Monthly Cost</span>
                  <span className="text-sm sm:text-base font-medium" data-testid="text-monthly-cost">
                    {pricingPlans[currentPlan.toUpperCase()]?.displayPrice || '$0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Account Balance</span>
                  <span className="text-sm sm:text-base font-medium" data-testid="text-account-balance">
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Usage This Month</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Account Balance</span>
                    <span className="text-sm sm:text-base font-medium" data-testid="text-account-balance-usage">
                      ${balance.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentPlan === 'Free' ? 'Startup credit remaining' : 'Available for monitoring services'}
                  </p>
                </div>
                {balance < 5 && currentPlan !== 'Free' && (
                  <div className="p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-amber-700">
                      Low balance. Consider topping up to avoid service interruption.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Next Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Next Charge</span>
                  <span className="text-sm sm:text-base font-medium" data-testid="text-next-charge">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm sm:text-base font-medium" data-testid="text-next-amount">
                    {pricingPlans[currentPlan.toUpperCase()]?.displayPrice || 'N/A'}
                  </span>
                </div>
                {currentPlan !== 'Free' && (
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs sm:text-sm" data-testid="button-manage-subscription">
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Choose Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {Object.entries(pricingPlans).map(([key, plan]) => (
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
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-2xl sm:text-3xl font-bold text-foreground">{plan.displayPrice}</span>
                        <span className="text-sm sm:text-base text-muted-foreground ml-1">{plan.period}</span>
                      </div>
                      {plan.startupCredit && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                          ${plan.startupCredit} startup credit
                        </p>
                      )}
                      {plan.billingModel === 'payg' && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                          Auto top-up: ${plan.defaultTopUpAmount} when balance &lt; ${plan.lowBalanceThreshold}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-xs sm:text-sm">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-secondary mr-2 sm:mr-3 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full text-xs sm:text-sm" 
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
        <Card className="mt-6 sm:mt-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <CardTitle className="text-base sm:text-lg">Billing History</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-download-invoices" className="w-full sm:w-auto text-xs sm:text-sm">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Download Invoices
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="text-center py-6 sm:py-8 px-3 text-xs sm:text-sm text-muted-foreground">
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
                    {pricingPlans[selectedPlan]?.name || 'Selected'} Plan
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    {pricingPlans[selectedPlan]?.displayPrice || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pricingPlans[selectedPlan]?.billingModel === 'payg' ? 'Pay-as-you-go billing' : pricingPlans[selectedPlan]?.billingModel === 'free' ? `$${pricingPlans[selectedPlan]?.startupCredit} startup credit` : 'Custom pricing'}
                  </p>
                </div>
                
                <Elements stripe={getStripePromise()} options={{ clientSecret }}>
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
