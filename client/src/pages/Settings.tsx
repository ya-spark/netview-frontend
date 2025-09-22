import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings as SettingsIcon, Shield, Bell, Users, Globe } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  region: z.string().optional(),
});

const tenantSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  subdomain: z.string().optional(),
});

const notificationSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  webhookEnabled: z.boolean(),
  alertThreshold: z.number().min(1).max(10),
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['/api/tenant', user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      company: user?.company || '',
      region: user?.region || '',
    },
  });

  const tenantForm = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: tenant?.name || '',
      subdomain: tenant?.subdomain || '',
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailEnabled: true,
      smsEnabled: false,
      webhookEnabled: false,
      alertThreshold: 3,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await apiRequest('PUT', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantSchema>) => {
      const response = await apiRequest('PUT', `/api/tenants/${user?.tenantId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Organization settings updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const canManageOrganization = user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Admin';

  return (
    <Layout>
      <div className="p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage your account and organization preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" data-testid="tab-organization" disabled={!canManageOrganization}>
              <Globe className="w-4 h-4 mr-2" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" disabled data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-region">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="north-america">North America</SelectItem>
                                <SelectItem value="europe">Europe</SelectItem>
                                <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Role: {user?.role}</p>
                        {user?.tenantId && (
                          <p className="text-xs text-muted-foreground">Tenant ID: {user.tenantId}</p>
                        )}
                      </div>
                      <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...tenantForm}>
                  <form onSubmit={tenantForm.handleSubmit((data) => updateTenantMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={tenantForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-org-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={tenantForm.control}
                      name="subdomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subdomain (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="your-org" data-testid="input-subdomain" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={updateTenantMutation.isPending} data-testid="button-save-org">
                      {updateTenantMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Current Plan</p>
                      <p className="text-sm text-muted-foreground">Free Tier</p>
                    </div>
                    <Button variant="outline" data-testid="button-upgrade">
                      Upgrade Plan
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Credits Used</p>
                      <p className="text-sm text-muted-foreground">753 of 1,000 this month</p>
                    </div>
                    <Button variant="outline" data-testid="button-buy-credits">
                      Buy Credits
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Email Notifications</FormLabel>
                              <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-email" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="smsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>SMS Notifications</FormLabel>
                              <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sms" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="webhookEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Webhook Notifications</FormLabel>
                              <p className="text-sm text-muted-foreground">Send alerts to webhook URLs</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-webhook" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={notificationForm.control}
                      name="alertThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Threshold</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-4">
                              <Input 
                                type="number" 
                                min="1" 
                                max="10" 
                                className="w-20"
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value))} 
                                data-testid="input-alert-threshold"
                              />
                              <span className="text-sm text-muted-foreground">failures before alerting</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button data-testid="button-save-notifications">
                      Save Notification Settings
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Authentication Method</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      You are signed in with {user?.email}
                    </p>
                    <Button variant="outline" data-testid="button-change-auth">
                      Manage Authentication
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline" data-testid="button-setup-2fa">
                      Setup 2FA
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">API Keys</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage API keys for integrations
                    </p>
                    <Button variant="outline" data-testid="button-manage-api-keys">
                      Manage API Keys
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">Session Management</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      View and manage active sessions
                    </p>
                    <Button variant="outline" data-testid="button-manage-sessions">
                      View Sessions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Theme</Label>
                      <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                    </div>
                    <Select defaultValue="light">
                      <SelectTrigger className="w-32" data-testid="select-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Timezone</Label>
                      <p className="text-sm text-muted-foreground">Select your timezone</p>
                    </div>
                    <Select defaultValue="utc">
                      <SelectTrigger className="w-48" data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time</SelectItem>
                        <SelectItem value="pst">Pacific Time</SelectItem>
                        <SelectItem value="cet">Central European Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Language</Label>
                      <p className="text-sm text-muted-foreground">Choose your language</p>
                    </div>
                    <Select defaultValue="en">
                      <SelectTrigger className="w-32" data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-refresh Dashboard</Label>
                      <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-auto-refresh" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact View</Label>
                      <p className="text-sm text-muted-foreground">Use compact layout for tables</p>
                    </div>
                    <Switch data-testid="switch-compact-view" />
                  </div>
                </div>

                <Button data-testid="button-save-preferences">
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
