import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Activity, Globe, Zap, Users } from 'lucide-react';
import { Layout } from '@/components/Layout';

export default function Landing() {
  const features = [
    {
      icon: Activity,
      title: 'Uptime Monitoring',
      description: 'Monitor your websites and APIs 24/7 with real-time alerts and detailed analytics.',
    },
    {
      icon: Shield,
      title: 'Security Monitoring',
      description: 'Detect security vulnerabilities and integrity issues before they impact your users.',
    },
    {
      icon: Globe,
      title: 'Global Monitoring',
      description: 'Monitor from multiple locations worldwide with our distributed gateway network.',
    },
    {
      icon: Zap,
      title: 'AI-Powered Insights',
      description: 'Auto-generate monitoring probes and get intelligent recommendations.',
    },
  ];

  const pricing = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      credits: '1,000 credits',
      features: [
        'Basic uptime monitoring',
        'Email notifications',
        '1 custom gateway',
        'Basic reporting',
      ],
    },
    {
      name: 'Paid',
      price: '$29',
      period: '/month',
      credits: '10,000 credits',
      features: [
        'Advanced monitoring (API, Security, Browser)',
        'SMS & Email notifications',
        'Unlimited custom gateways',
        'Advanced analytics',
        'AI-powered probe generation',
        'Stripe billing integration',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      credits: '100,000 credits',
      features: [
        'Everything in Paid',
        'Priority support',
        'Custom integrations',
        'Advanced role management',
        'SLA guarantees',
        'Dedicated account manager',
      ],
    },
  ];

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-20">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                Monitor Your Digital Infrastructure
                <span className="text-primary block">With Confidence</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                NetView provides comprehensive monitoring for websites, APIs, security, and browser performance. 
                Get real-time alerts, detailed analytics, and AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild data-testid="button-get-started">
                  <Link href="/login">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-view-demo">
                  <Link href="/demo">View Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Monitor
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From simple uptime checks to complex security monitoring, NetView has you covered.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your monitoring needs. All plans include our core features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricing.map((plan, index) => (
                <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground ml-1">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{plan.credits}</p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-secondary mr-3 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                      data-testid={`button-select-${plan.name.toLowerCase()}`}
                    >
                      <Link href="/login">Get Started</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <Users className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Monitoring?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of teams who trust NetView to keep their services running smoothly.
              </p>
              <Button size="lg" variant="secondary" asChild data-testid="button-start-free-trial">
                <Link href="/login">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-12">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold text-foreground">NetView</span>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <a 
                  href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'contact@yaseenmd.com'}`}
                  className="hover:text-foreground transition-colors"
                  data-testid="link-contact-email"
                >
                  {import.meta.env.VITE_CONTACT_EMAIL || 'contact@yaseenmd.com'}
                </a>
                <a 
                  href="https://linkedin.com/in/yaseenmd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-linkedin"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
