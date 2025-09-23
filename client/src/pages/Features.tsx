import { Card, CardContent } from "@/components/ui/card";
import { Shield, Activity, Globe, Zap } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function Features() {
  const features = [
    {
      icon: Activity,
      title: "Uptime Monitoring",
      description:
        "Monitor your websites and APIs 24/7 with real-time alerts and detailed analytics.",
    },
    {
      icon: Shield,
      title: "Security Monitoring",
      description:
        "Detect security vulnerabilities and integrity issues before they impact your users.",
    },
    {
      icon: Globe,
      title: "Global Monitoring",
      description:
        "Monitor from multiple locations worldwide with our distributed gateway network.",
    },
    {
      icon: Zap,
      title: "AI-Powered Insights",
      description:
        "Auto-generate monitoring probes and get intelligent recommendations.",
    },
  ];

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen">
        {/* Features Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Monitor
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From simple uptime checks to complex security monitoring,
                NetView has you covered.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="text-center hover:shadow-lg transition-shadow"
                    data-testid={`card-feature-${index}`}
                  >
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}