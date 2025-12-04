import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export default function Pricing() {
  const pricing = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      startupCredit: "$5 startup credit",
      features: [
        "Basic uptime monitoring probes",
        "Basic reporting",
        "5 users in organization",
        "AI powered probe creation",
      ],
      limitations: [
        "All probes stop after startup credit is used",
        "No email notifications",
        "No custom gateway",
      ],
    },
    {
      name: "Paid",
      price: "Pay as you go",
      period: "",
      topUpInfo: "Auto top-up when balance goes below $5 (configurable)",
      features: [
        "Pay as you go billing",
        "Email notifications",
        "3 custom gateways",
        "Advanced analytics (coming soon)",
        "Stripe billing",
        "Basic email support",
        "Configurable auto top-up",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Contact Sales",
      period: "",
      contactSales: true,
      features: [
        "Priority support",
        "Higher custom gateway count",
        "50 users in organization",
        "Custom integrations",
        "SLA guarantees",
        "Dedicated account manager",
      ],
    },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* Pricing Section */}
        <section className="py-20">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your monitoring needs. All plans
                include our core features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricing.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-foreground">
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {plan.period}
                        </span>
                      </div>
                      {plan.startupCredit && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {plan.startupCredit}
                        </p>
                      )}
                      {plan.topUpInfo && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {plan.topUpInfo}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-center text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-secondary mr-3 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations &&
                        plan.limitations.map((limitation, limitationIndex) => (
                          <li
                            key={`limitation-${limitationIndex}`}
                            className="flex items-center text-sm"
                          >
                            <span className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0">
                              ×
                            </span>
                            <span className="text-muted-foreground">
                              {limitation}
                            </span>
                          </li>
                        ))}
                    </ul>

                    {plan.contactSales ? (
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        asChild
                        data-testid={`button-select-${plan.name.toLowerCase()}`}
                      >
                        <Link href="#contact">Contact Sales</Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        asChild
                        data-testid={`button-select-${plan.name.toLowerCase()}`}
                      >
                        <Link href="/signup">Get Started</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}