import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function TenantCreated() {
  const [, setLocation] = useLocation();
  const { selectedTenant } = useAuth();

  // Log component mount
  useEffect(() => {
    logger.info('TenantCreated page loaded', {
      component: 'TenantCreated',
      action: 'page_load',
      hasSelectedTenant: !!selectedTenant,
      tenantName: selectedTenant?.name,
    });
  }, [selectedTenant]);

  const handleContinue = () => {
    logger.info('Continuing to scope settings after tenant creation', {
      component: 'TenantCreated',
      action: 'continue_to_scope_settings',
      tenantName: selectedTenant?.name,
      tenantId: selectedTenant?.id,
    });
    
    // Route to scope settings page to configure tenant and scope details
    setLocation('/scope-settings');
  };

  if (!selectedTenant) {
    // If no tenant selected, redirect to entry
    logger.warn('No tenant selected, redirecting to entry', {
      component: 'TenantCreated',
      action: 'redirect_no_tenant',
    });
    setLocation('/entry');
    return null;
  }

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-foreground">NetView</span>
            </div>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Your Tenant is Ready!</CardTitle>
            <CardDescription className="text-lg mt-2">
              <span className="font-semibold text-foreground">{selectedTenant.name}</span> has been created successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">
                Start Reimagining Observability with AI
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Your observability platform is now set up. Configure your scopes and permissions to get started with intelligent monitoring, 
                automated insights, and AI-powered analytics that transform how you understand your infrastructure.
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleContinue}
                className="w-full"
                size="lg"
              >
                Let's Go
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

