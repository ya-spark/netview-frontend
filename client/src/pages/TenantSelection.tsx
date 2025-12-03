import { useState, useEffect } from 'react';
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
import { Building2, Plus, Check } from 'lucide-react';

const tenantNameSchema = z.object({
  name: z.string().min(1, 'Organization name is required').min(3, 'Organization name must be at least 3 characters'),
});

type TenantNameFormData = z.infer<typeof tenantNameSchema>;

export default function TenantSelection() {
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, tenants, selectedTenant, loadTenants, createTenant, setSelectedTenant } = useAuth();

  const tenantForm = useForm<TenantNameFormData>({
    resolver: zodResolver(tenantNameSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      console.log('🚪 TenantSelection: No user, redirecting to login...');
      setLocation('/login');
      return;
    }

    // Load tenants for this user
    if (user.email) {
      console.log('📋 TenantSelection: Loading tenants for:', user.email);
      loadTenants(user.email);
    }
  }, [user, loadTenants, setLocation]);

  useEffect(() => {
    // If user already has a selected tenant, redirect to dashboard
    if (user && selectedTenant && user.tenantId === selectedTenant.id) {
      console.log('✅ TenantSelection: Tenant already selected, redirecting to dashboard...');
      setLocation('/dashboard');
    }
  }, [user, selectedTenant, setLocation]);

  const handleCreateTenant = async (data: TenantNameFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('🏢 Creating tenant:', data.name);
      const tenant = await createTenant(data.name);
      
      toast({
        title: "Organization Created",
        description: `Organization "${tenant.name}" has been created successfully.`,
      });

      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('❌ Failed to create tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowCreateForm(false);
      tenantForm.reset();
    }
  };

  const handleSelectTenant = async (tenant: typeof tenants[0]) => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('✅ Selecting tenant:', tenant.id);
      setSelectedTenant(tenant);
      
      toast({
        title: "Organization Selected",
        description: `Switched to "${tenant.name}".`,
      });

      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 500);
    } catch (error: any) {
      console.error('❌ Failed to select tenant:', error);
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

                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowCreateForm(false);
                          tenantForm.reset();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={loading}
                        data-testid="button-create"
                      >
                        {loading ? 'Creating...' : 'Create Organization'}
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

