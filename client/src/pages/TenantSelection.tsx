import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { logger } from '@/lib/logger';
import { setCurrentUserInfo } from '@/lib/queryClient';
import { Building2, Plus, Check, Loader2 } from 'lucide-react';
import { generateTenantId, validateTenantIdAvailability } from '@/services/tenantApi';

const tenantSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .min(3, 'Organization name must be at least 3 characters'),
  tenantId: z.string()
    .min(1, 'Tenant ID is required')
    .min(3, 'Tenant ID must be at least 3 characters')
    .max(50, 'Tenant ID must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Tenant ID can only contain lowercase letters, numbers, and hyphens'),
});

type TenantFormData = z.infer<typeof tenantSchema>;

export default function TenantSelection() {
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingTenantId, setValidatingTenantId] = useState(false);
  const [tenantIdError, setTenantIdError] = useState<string | null>(null);
  const [isTenantIdManuallyEdited, setIsTenantIdManuallyEdited] = useState(false);
  const { toast } = useToast();
  const { user, tenants, selectedTenant, loadTenants, createTenant, setSelectedTenant } = useAuth();

  useEffect(() => {
    logger.debug('TenantSelection page initialized', {
      component: 'TenantSelection',
      userId: user?.id,
      tenantCount: tenants.length,
      hasSelectedTenant: !!selectedTenant,
    });
  }, [user?.id, tenants.length, selectedTenant]);

  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      tenantId: '',
    },
  });

  const orgName = tenantForm.watch('name');
  const tenantIdValue = tenantForm.watch('tenantId');

  // Auto-generate tenant ID when organization name changes (if not manually edited)
  useEffect(() => {
    if (!isTenantIdManuallyEdited && orgName) {
      const generatedId = generateTenantId(orgName);
      if (generatedId) {
        tenantForm.setValue('tenantId', generatedId, { shouldValidate: false });
        // Clear any previous validation errors when auto-generating
        setTenantIdError(null);
      }
    }
  }, [orgName, isTenantIdManuallyEdited, tenantForm]);

  // Validate tenant ID when it changes (debounced)
  useEffect(() => {
    if (!tenantIdValue || tenantIdValue.trim().length === 0) {
      setTenantIdError(null);
      return;
    }

    // Validate format first
    const formatValidation = tenantSchema.shape.tenantId.safeParse(tenantIdValue);
    if (!formatValidation.success) {
      setTenantIdError(formatValidation.error.errors[0]?.message || 'Invalid tenant ID format');
      return;
    }

    // Debounce backend validation
    const timeoutId = setTimeout(async () => {
      setValidatingTenantId(true);
      setTenantIdError(null);

      try {
        const validation = await validateTenantIdAvailability(tenantIdValue);
        if (!validation.available) {
          setTenantIdError(validation.message || 'This tenant ID is not available');
        } else {
          setTenantIdError(null);
        }
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error validating tenant ID', err, {
          component: 'TenantSelection',
          action: 'validate_tenant_id',
          tenantId: tenantIdValue,
        });
        setTenantIdError('Failed to validate tenant ID. Please try again.');
      } finally {
        setValidatingTenantId(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [tenantIdValue]);

  const handleTenantIdChange = useCallback((value: string) => {
    setIsTenantIdManuallyEdited(true);
    tenantForm.setValue('tenantId', value, { shouldValidate: true });
  }, [tenantForm]);

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

  useEffect(() => {
    // Load tenants when component mounts
    // Auth check is handled by TenantSelectionRoute
    if (user?.email) {
      logger.info('Loading tenants for TenantSelection', {
        component: 'TenantSelection',
        action: 'load_tenants',
        userEmail: user.email,
        tenantCount: tenants.length,
        hasSelectedTenant: !!selectedTenant,
      });
      loadTenants(user.email).catch((error) => {
        logger.error('Failed to load tenants', error instanceof Error ? error : new Error(String(error)), {
          component: 'TenantSelection',
        });
      });
    }
  }, [user?.email]); // Only depend on user.email


  const handleCreateTenant = async (data: TenantFormData) => {
    if (!user) return;

    // Final validation before submission
    if (tenantIdError) {
      toast({
        title: "Validation Error",
        description: tenantIdError,
        variant: "destructive",
      });
      return;
    }

    // Validate tenant ID availability one more time before creating
    setValidatingTenantId(true);
    try {
      const validation = await validateTenantIdAvailability(data.tenantId);
      if (!validation.available) {
        setTenantIdError(validation.message || 'This tenant ID is not available');
        toast({
          title: "Validation Error",
          description: validation.message || 'This tenant ID is not available',
          variant: "destructive",
        });
        setValidatingTenantId(false);
        return;
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error validating tenant ID before creation', err, {
        component: 'TenantSelection',
        action: 'validate_tenant_id',
        tenantId: data.tenantId,
      });
      toast({
        title: "Validation Error",
        description: 'Failed to validate tenant ID. Please try again.',
        variant: "destructive",
      });
      setValidatingTenantId(false);
      return;
    }
    setValidatingTenantId(false);
    
    setLoading(true);
    try {
      logger.info('Creating tenant', {
        component: 'TenantSelection',
        action: 'create_tenant',
        tenantName: data.name,
        tenantId: data.tenantId,
        userId: user.id,
      });
      const tenant = await createTenant(data.name, data.tenantId);
      
      logger.info('Tenant created successfully', {
        component: 'TenantSelection',
        action: 'create_tenant',
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: user.id,
      });
      toast({
        title: "Organization Created",
        description: `Organization "${tenant.name}" has been created successfully.`,
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
          logger.info('Redirecting to saved path after tenant creation', {
            component: 'TenantSelection',
            action: 'create_tenant',
          }, { redirectPath: redirectData.path });
          setLocation(redirectData.path);
        } else {
          logger.info('Redirecting to dashboard after tenant creation', {
            component: 'TenantSelection',
            action: 'create_tenant',
          });
          setLocation('/dashboard');
        }
      }, 1000);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create tenant', err, {
        component: 'TenantSelection',
        action: 'create_tenant',
        tenantName: data.name,
        tenantId: data.tenantId,
        userId: user.id,
      });
      toast({
        title: "Error",
        description: error.message || "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowCreateForm(false);
      setIsTenantIdManuallyEdited(false);
      tenantForm.reset();
      setTenantIdError(null);
    }
  };

  const handleSelectTenant = async (tenant: typeof tenants[0]) => {
    if (!user) {
      logger.warn('Cannot select tenant - no user', {
        component: 'TenantSelection',
        action: 'select_tenant',
      });
      return;
    }
    
    setLoading(true);
    try {
      logger.info('Selecting tenant', {
        component: 'TenantSelection',
        action: 'select_tenant',
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: user.id,
        userEmail: user.email,
      });
      
      // Set current user info for API headers BEFORE setting selected tenant
      setCurrentUserInfo(user.email, String(tenant.id));
      logger.debug('Set current user info for API headers', {
        component: 'TenantSelection',
        action: 'select_tenant',
        email: user.email,
        tenantId: tenant.id,
      });
      
      // Set selected tenant
      setSelectedTenant(tenant);
      logger.debug('Selected tenant set in context', {
        component: 'TenantSelection',
        action: 'select_tenant',
        tenantId: tenant.id,
      });
      
      toast({
        title: "Organization Selected",
        description: `Switched to "${tenant.name}".`,
      });

      // Check for saved redirect data from login
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
            component: 'TenantSelection',
            action: 'select_tenant',
          }, { redirectPath: redirectData.path });
          setLocation(redirectData.path);
        } else {
          logger.debug('Redirecting to dashboard', {
            component: 'TenantSelection',
            action: 'select_tenant',
          });
          setLocation('/dashboard');
        }
      }, 500);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to select tenant', err, {
        component: 'TenantSelection',
        action: 'select_tenant',
        tenantId: tenant.id,
        userId: user.id,
      });
      toast({
        title: "Error",
        description: error.message || "Failed to select organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
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
            <CardTitle className="text-2xl">
              {showCreateForm ? 'Create Organization' : 'Select Organization'}
            </CardTitle>
            <CardDescription>
              {showCreateForm 
                ? 'Create a new organization to get started' 
                : 'Choose an organization to continue or create a new one'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showCreateForm ? (
              <>
                {/* Existing Tenants List */}
                {tenants.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Your Organizations</h3>
                    <div className="grid gap-3">
                      {tenants.map((tenant) => (
                        <Card 
                          key={tenant.id} 
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedTenant?.id === tenant.id ? 'ring-2 ring-primary' : ''
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
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              {selectedTenant?.id === tenant.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      You don't have any organizations yet.
                    </p>
                  </div>
                )}

                {/* Create New Tenant Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCreateForm(true)}
                  data-testid="button-create-tenant"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Organization
                </Button>
              </>
            ) : (
              <>
                {/* Create Tenant Form */}
                <Form {...tenantForm}>
                  <form onSubmit={tenantForm.handleSubmit(handleCreateTenant)} className="space-y-4">
                    <FormField
                      control={tenantForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Acme Inc." 
                              {...field} 
                              data-testid="input-tenant-name" 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            This will be your organization's name in NetView
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tenantForm.control}
                      name="tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant ID</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="acme-inc" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleTenantIdChange(e.target.value);
                                }}
                                data-testid="input-tenant-id"
                                className={tenantIdError ? 'border-destructive' : ''}
                              />
                              {validatingTenantId && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                          {tenantIdError && (
                            <p className="text-xs text-destructive mt-1">{tenantIdError}</p>
                          )}
                          {!tenantIdError && !validatingTenantId && tenantIdValue && (
                            <p className="text-xs text-green-600 mt-1">✓ Tenant ID is available</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            A unique identifier for your organization. Auto-generated from organization name, but you can customize it.
                            Only lowercase letters, numbers, and hyphens are allowed.
                          </p>
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowCreateForm(false);
                          setIsTenantIdManuallyEdited(false);
                          setTenantIdError(null);
                          tenantForm.reset();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={loading || validatingTenantId || !!tenantIdError}
                        data-testid="button-create"
                      >
                        {loading ? 'Creating...' : validatingTenantId ? 'Validating...' : 'Create Organization'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

