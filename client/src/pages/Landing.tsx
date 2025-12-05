import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export default function Landing() {
  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* Construction Banner */}
        <div className="w-full bg-amber-500 dark:bg-amber-600 text-white py-3 px-4 text-center">
          <p className="text-sm sm:text-base font-medium">
            This site is under construction and available for only designated developers
          </p>
        </div>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-20">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
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
                  <Link href="/signup">Sign up</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-login"
                >
                  <Link href="/login">Login</Link>
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
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
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
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
