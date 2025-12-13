import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { logger } from '@/lib/logger';
import { User, Shield, Bell, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable(),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  region: z.string().optional(),
});

const notificationSchema = z.object({
  emailEnabled: z.boolean(),
  webhookEnabled: z.boolean(),
  gatewayAdministration: z.boolean(),
  apiKeyCreations: z.boolean(),
  reportDownloads: z.boolean(),
});

export default function Settings() {
  const { user, firebaseUser, syncBackendUser } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || null,
      email: user?.email || '',
      company: user?.company || '',
      region: user?.region || '',
    },
  });

  useEffect(() => {
    logger.debug('Settings page initialized', {
      component: 'Settings',
      userId: user?.id,
    });
  }, [user?.id]);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || null,
        email: user.email || '',
        company: user.company || '',
        region: user.region || '',
      });
    }
  }, [user, profileForm]);

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailEnabled: true,
      webhookEnabled: false,
      gatewayAdministration: true,
      apiKeyCreations: true,
      reportDownloads: true,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      logger.info('Updating user profile', {
        component: 'Settings',
        action: 'update_profile',
        userId: user?.id,
      });
      const response = await apiRequest('PUT', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: async () => {
      logger.info('Profile updated successfully', {
        component: 'Settings',
        action: 'update_profile',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      // Refresh user data in AuthContext
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update profile', err, {
        component: 'Settings',
        action: 'update_profile',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSchema>) => {
      logger.info('Updating notification preferences', {
        component: 'Settings',
        action: 'update_notifications',
        userId: user?.id,
      });
      const response = await apiRequest('PUT', `/api/users/${user?.id}/notifications`, data);
      return response.json();
    },
    onSuccess: () => {
      logger.info('Notification preferences updated successfully', {
        component: 'Settings',
        action: 'update_notifications',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Notification preferences updated successfully' });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update notification preferences', err, {
        component: 'Settings',
        action: 'update_notifications',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2" data-testid="text-page-title">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your account and organization preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="profile" data-testid="tab-profile" className="text-xs sm:text-sm">
              <User className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications" className="text-xs sm:text-sm">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security" className="text-xs sm:text-sm">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {(!user?.firstName || !user.firstName.trim()) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Profile Incomplete</AlertTitle>
                <AlertDescription>
                  Please complete your profile by providing your first name. This is required to continue using the application.
                </AlertDescription>
              </Alert>
            )}
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
                            <FormLabel>Organization</FormLabel>
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

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationMutation.mutate(data))} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Email Notifications</FormLabel>
                              <p className="text-sm text-muted-foreground">Enable email notifications</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-email" />
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

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-foreground mb-4">Major Events - Email Notifications</h4>
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="gatewayAdministration"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Gateway Administration</FormLabel>
                                <p className="text-sm text-muted-foreground">Notify for gateway creation, deletion, and changes</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gateway-administration" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="apiKeyCreations"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>API Key Creations</FormLabel>
                                <p className="text-sm text-muted-foreground">Notify when API keys are created</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-api-key-creations" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="reportDownloads"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Report Downloads</FormLabel>
                                <p className="text-sm text-muted-foreground">Notify when reports are downloaded</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-report-downloads" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={updateNotificationMutation.isPending} data-testid="button-save-notifications">
                      {updateNotificationMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
                    </Button>
                  </form>
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
                    <h4 className="font-medium text-foreground mb-2">API Keys</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage API keys for integrations
                    </p>
                    <Button variant="outline" data-testid="button-manage-api-keys">
                      Manage API Keys
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
