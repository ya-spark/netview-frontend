import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function Landing() {

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
                NetView provides comprehensive monitoring for websites, APIs,
                security, and browser performance. Get real-time alerts,
                detailed analytics, and AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild data-testid="button-signup">
                  <Link href="/login">Sign up</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-demo"
                >
                  <Link href="/demo">Demo</Link>
                </Button>
              </div>
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
                Join thousands of teams who trust NetView to keep their services
                running smoothly.
              </p>
              <Button
                size="lg"
                variant="secondary"
                asChild
                data-testid="button-start-free-trial"
              >
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
                  <span className="text-primary-foreground font-bold text-lg">
                    N
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  NetView
                </span>
              </div>

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <a
                  href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || "contact@yaseenmd.com"}`}
                  className="hover:text-foreground transition-colors"
                  data-testid="link-contact-email"
                >
                  {import.meta.env.VITE_CONTACT_EMAIL || "contact@yaseenmd.com"}
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
