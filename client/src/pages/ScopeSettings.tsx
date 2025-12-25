import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ScopeSettings() {
  const [, setLocation] = useLocation();
  const { user, selectedTenant } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !selectedTenant) {
      logger.warn('ScopeSettings: Missing user or tenant, redirecting to entry', {
        component: 'ScopeSettings',
        user: !!user,
        selectedTenant: !!selectedTenant,
      });
      setLocation('/entry');
      return;
    }

    logger.info('ScopeSettings page loaded', {
      component: 'ScopeSettings',
      userId: user.id,
      tenantName: selectedTenant.name,
    });
  }, [user, selectedTenant, setLocation]);

  const handleContinue = async () => {
    setLoading(true);
    try {
      logger.info('Scope settings configured, routing back to entry', {
        component: 'ScopeSettings',
        userId: user?.id,
        tenantName: selectedTenant?.name,
      });

      // Route back to entry (central point that handles everything)
      // Entry will then route to dashboard after tenant and scope details are set
      setLocation('/entry');
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to save scope settings', err, {
        component: 'ScopeSettings',
      });
      toast({
        title: 'Error',
        description: 'Failed to save scope settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !selectedTenant) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
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
            <CardTitle className="text-2xl">Configure Scope Settings</CardTitle>
            <CardDescription>
              Configure tenant and scope details for {selectedTenant.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Tenant Information</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Tenant Name:</span>
                    <span className="ml-2 font-medium">{selectedTenant.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tenant ID:</span>
                    <span className="ml-2 font-medium">{selectedTenant.id}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">User Information</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <span className="ml-2 font-medium">{user.role || 'Not assigned'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Scope configuration will be available here. For now, you can continue to the dashboard.
                </p>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

