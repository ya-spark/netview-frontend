import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { getUserTenants, setPrimaryTenant } from '@/services/authApi';
import { logger } from '@/lib/logger';
import { setCurrentUserInfo } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Tenant {
  id: string | number;
  name: string;
  createdAt?: string;
}

/**
 * Select Tenant Page - Show all tenants user belongs to and allow selection
 * Auto-selects if single tenant, shows selection if multiple
 */
export default function SelectTenant() {
  const [, setLocation] = useLocation();
  const { firebaseUser, setSelectedTenant, syncBackendUser, selectedTenant } = useAuth();
  const [selecting, setSelecting] = useState<string | null>(null);
  const { toast } = useToast();
  const autoSelectingRef = useRef(false);
  
  const userEmail = firebaseUser?.email || '';

  // Helper function to get redirect data from sessionStorage
  const getRedirectData = () => {
    try {
      const saved = sessionStorage.getItem('loginRedirect');
      if (saved) {
        const data = JSON.parse(saved);
        return {
          path: data.path || null,
          tenantId: data.tenantId || null,
        };
      }
    } catch (error) {
      // If parsing fails, try legacy format (just a string path)
      const saved = sessionStorage.getItem('loginRedirect');
      if (saved && !saved.startsWith('{')) {
        return { path: saved, tenantId: null };
      }
    }
    return { path: null, tenantId: null };
  };

  const { data: tenantsData, isLoading: loadingTenants } = useQuery({
    queryKey: ['/api/auth/my-tenants', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      logger.info('Fetching user tenants', { component: 'SelectTenant', email: userEmail });
      try {
        const tenants = await getUserTenants();
        logger.info('User tenants fetched', {
          component: 'SelectTenant',
          email: userEmail,
          count: tenants.length,
        });
        return tenants;
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to fetch user tenants', err, { component: 'SelectTenant', email: userEmail });
        throw error;
      }
    },
    enabled: !!userEmail && !!firebaseUser,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const tenants = (tenantsData || []) as Tenant[];

  const handleSelectTenant = useCallback(async (tenant: Tenant, setAsPrimary: boolean = false) => {
    setSelecting(String(tenant.id));
    try {
      const tenantIdNum = typeof tenant.id === 'number' ? tenant.id : parseInt(String(tenant.id), 10);
      logger.info('Selecting tenant', {
        component: 'SelectTenant',
        action: 'select_tenant',
        tenantId: tenantIdNum,
        tenantName: tenant.name,
        setAsPrimary,
      });
      
      // Set as primary tenant if requested (for single tenant auto-select)
      if (setAsPrimary) {
        await setPrimaryTenant(tenantIdNum);
        logger.info('Set tenant as primary', {
          component: 'SelectTenant',
          action: 'set_primary_tenant',
          tenantId: tenantIdNum,
        });
      }
      
      const tenantObj = {
        id: String(tenant.id),
        name: tenant.name,
        email: userEmail,
        createdAt: tenant.createdAt || new Date().toISOString(),
      };
      setSelectedTenant(tenantObj);
      
      // Set current user info for API headers
      setCurrentUserInfo(userEmail, String(tenant.id));
      
      // Sync backend user to update context
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Organization Selected",
        description: `Switched to "${tenant.name}".`,
      });

      // Check for saved redirect data
      const redirectData = getRedirectData();
      const isValidProtectedRoute = (path: string | null): boolean => {
        if (!path) return false;
        const protectedRoutes = [
          '/dashboard',
          '/manage',
          '/monitor',
          '/reports',
          '/settings',
          '/billing',
          '/collaborators',
        ];
        return protectedRoutes.some(route => path.startsWith(route));
      };

      // Redirect to saved path or dashboard
      setTimeout(() => {
        if (redirectData.path && isValidProtectedRoute(redirectData.path)) {
          sessionStorage.removeItem('loginRedirect'); // Clear after use
          logger.info('Redirecting to saved path after tenant selection', {
            component: 'SelectTenant',
            action: 'select_tenant',
          }, { redirectPath: redirectData.path });
          setLocation(redirectData.path);
        } else {
          logger.info('Redirecting to dashboard after tenant selection', {
            component: 'SelectTenant',
            action: 'select_tenant',
          });
          setLocation('/dashboard');
        }
      }, 500);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to select tenant', err, {
        component: 'SelectTenant',
        action: 'select_tenant',
        tenantId: typeof tenant.id === 'number' ? tenant.id : Number(tenant.id),
      });
      toast({
        title: "Error",
        description: error.message || "Failed to select organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSelecting(null);
      autoSelectingRef.current = false;
    }
  }, [firebaseUser, syncBackendUser, setSelectedTenant, userEmail, toast, setLocation]);

  // Auto-select and set primary if there's exactly one tenant
  useEffect(() => {
    if (tenants.length === 1 && !selecting && !autoSelectingRef.current && !loadingTenants) {
      const tenant = tenants[0];
      autoSelectingRef.current = true;
      
      const tenantId = typeof tenant.id === 'number' ? tenant.id : parseInt(String(tenant.id), 10);
      logger.info('Auto-selecting single tenant and setting as primary', {
        component: 'SelectTenant',
        action: 'auto_select_tenant',
        tenantId,
        tenantName: tenant.name,
      });
      
      // Auto-select with setAsPrimary flag
      handleSelectTenant(tenant, true).catch((error: any) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error auto-selecting tenant', err, {
          component: 'SelectTenant',
          action: 'auto_select_tenant',
        });
        autoSelectingRef.current = false;
      });
    }
  }, [tenants.length, selecting, loadingTenants, tenants, handleSelectTenant]);

  if (!firebaseUser) {
    return null;
  }

  if (loadingTenants) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your organizations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If only one tenant, show loading while auto-selecting (don't show selection UI)
  if (tenants.length === 1 && (selecting || autoSelectingRef.current)) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Setting up your organization...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If auto-selecting, show loading state
  if (selecting) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Setting up your organization...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // No tenants - shouldn't happen after invites, but handle it
  if (tenants.length === 0) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold text-foreground">NetView</span>
              </div>
              <CardTitle className="text-2xl">No Organizations Found</CardTitle>
              <CardDescription>You don't belong to any organizations yet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please accept an invitation or create an organization to continue.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/onboarding/invites')}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }


  // Multiple tenants - show selection
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
            <CardTitle className="text-2xl">Select Organization</CardTitle>
            <CardDescription>Choose an organization to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Your Organizations</h3>
              <div className="grid gap-3">
                {tenants.map((tenant) => (
                  <Card 
                    key={tenant.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selecting === String(tenant.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectTenant(tenant)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{userEmail}</p>
                          </div>
                        </div>
                        {selecting === String(tenant.id) ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
