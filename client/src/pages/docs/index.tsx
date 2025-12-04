import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, ArrowRight, Clock, Users, Shield, BarChart } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export default function Docs() {
  const tableOfContents = [
    {
      title: "Getting Started",
      icon: Book,
      items: [
        { name: "Quick Start Guide", href: "/docs/getting-started", status: "coming-soon" },
        { name: "Installation", href: "/docs/installation", status: "coming-soon" },
        { name: "Basic Configuration", href: "/docs/configuration", status: "coming-soon" },
      ]
    },
    {
      title: "Monitoring",
      icon: BarChart,
      items: [
        { name: "Uptime Monitoring", href: "/docs/uptime", status: "coming-soon" },
        { name: "Performance Monitoring", href: "/docs/performance", status: "coming-soon" },
        { name: "Custom Probes", href: "/docs/probes", status: "coming-soon" },
        { name: "Alert Configuration", href: "/docs/alerts", status: "coming-soon" },
      ]
    },
    {
      title: "Security",
      icon: Shield,
      items: [
        { name: "Security Monitoring", href: "/docs/security", status: "coming-soon" },
        { name: "SSL Certificate Monitoring", href: "/docs/ssl", status: "coming-soon" },
        { name: "Vulnerability Scanning", href: "/docs/vulnerabilities", status: "coming-soon" },
      ]
    },
    {
      title: "Team Management",
      icon: Users,
      items: [
        { name: "User Roles", href: "/docs/roles", status: "coming-soon" },
        { name: "Team Collaboration", href: "/docs/collaboration", status: "coming-soon" },
        { name: "Permissions", href: "/docs/permissions", status: "coming-soon" },
      ]
    },
    {
      title: "API Reference",
      icon: Clock,
      items: [
        { name: "Authentication", href: "/docs/api/auth", status: "coming-soon" },
        { name: "Endpoints", href: "/docs/api/endpoints", status: "coming-soon" },
        { name: "Webhooks", href: "/docs/api/webhooks", status: "coming-soon" },
      ]
    }
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* Header Section */}
        <section className="py-12 bg-muted/20">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                NetView Documentation
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Learn how to monitor your digital infrastructure with confidence. 
                From basic setup to advanced monitoring strategies, we've got you covered.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/docs/getting-started">
                  <Card className="inline-block hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-quick-start">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <Book className="h-5 w-5 text-primary" />
                      <span className="font-medium">Quick Start Guide</span>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section className="py-16">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Welcome to NetView
              </h2>
              <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
                <p>
                  NetView is a comprehensive monitoring platform designed to help you keep track of your 
                  websites, APIs, and digital infrastructure. Whether you're running a simple website or 
                  managing complex microservices, NetView provides the tools you need to ensure everything 
                  runs smoothly.
                </p>
                
                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">
                  What can you monitor with NetView?
                </h3>
                
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Website Uptime:</strong> Monitor your websites 24/7 and get alerted when they go down</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>API Performance:</strong> Track response times and error rates for your APIs</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Security Issues:</strong> Detect vulnerabilities and security threats before they impact users</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>SSL Certificates:</strong> Monitor certificate expiration and renewal status</span>
                  </li>
                </ul>
                
                <p>
                  Our platform uses AI-powered insights to help you create monitoring probes automatically 
                  and provides intelligent recommendations to improve your infrastructure's reliability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-16 bg-muted/20">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Documentation Sections
              </h2>
              <p className="text-xl text-muted-foreground">
                Explore our comprehensive documentation organized by topics
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {tableOfContents.map((section, sectionIndex) => {
                const Icon = section.icon;
                return (
                  <Card key={sectionIndex} className="hover:shadow-lg transition-shadow" data-testid={`card-section-${sectionIndex}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <span>{section.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center justify-between">
                            <Link 
                              href={item.href} 
                              className="text-muted-foreground hover:text-primary transition-colors flex-grow"
                              data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {item.name}
                            </Link>
                            {item.status === 'coming-soon' && (
                              <Badge variant="outline" className="ml-2">
                                Coming Soon
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Get Started CTA */}
        <section className="py-16">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Set up your first monitoring probe in less than 5 minutes
              </p>
              <Link href="/signup">
                <Card className="inline-block hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-get-started">
                  <CardContent className="p-6 flex items-center space-x-4">
                    <div className="flex-grow text-left">
                      <h3 className="font-semibold text-foreground mb-1">Start Monitoring Now</h3>
                      <p className="text-sm text-muted-foreground">Sign up for free and begin monitoring your infrastructure</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}