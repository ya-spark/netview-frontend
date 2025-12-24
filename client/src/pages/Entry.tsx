import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, registerUser } from '@/services/authApi';
import { createTenant } from '@/services/tenantApi';
import { isBusinessEmail } from '@/utils/emailValidation';
import { logger } from '@/lib/logger';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const userDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
});

type UserDetailsFormData = z.infer<typeof userDetailsSchema>;

export default function Entry() {
  const [, setLocation] = useLocation();
  const { firebaseUser, syncBackendUser, setSelectedTenant, setEmailVerification } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);

  const userDetailsForm = useForm<UserDetailsFormData>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  // Load user status on mount
  useEffect(() => {
    const loadUserStatus = async () => {
      // Prevent multiple redirects
      if (hasRedirectedRef.current) {
        return;
      }

      if (!firebaseUser) {
        // Redirect to login if not authenticated
        setLocation('/login');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        logger.info('Loading user status on entry page', {
          component: 'Entry',
          action: 'load_user_status',
          email: firebaseUser.email,
        });

        const userData = await getCurrentUser();
        setUserStatus(userData);

        logger.info('User status loaded', {
          component: 'Entry',
          action: 'load_user_status',
          emailVerified: userData.emailVerified,
          hasUserDetails: userData.hasUserDetails,
          isBusinessEmail: userData.isBusinessEmail,
          tenantCount: userData.tenants?.length || 0,
        });

        // Check email verification - MUST be verified before proceeding
        if (!userData.emailVerified) {
          logger.info('Email not verified, redirecting to verification', {
            component: 'Entry',
            action: 'redirect_to_verification',
            email: userData.email,
            signInProvider: userData.signInProvider,
            emailVerified: userData.emailVerified,
          });
          
          // Set email verification state so EmailVerificationRoute can access it
          if (setEmailVerification && firebaseUser?.email) {
            setEmailVerification({
              email: firebaseUser.email,
              firstName: userData.firstName || 'User',
              lastName: userData.lastName || '',
            });
          }
          
          hasRedirectedRef.current = true;
          setLocation('/email-verification');
          setLoading(false);
          return;
        }

        logger.info('Email verified, proceeding with onboarding flow', {
          component: 'Entry',
          action: 'email_verified',
          email: userData.email,
        });

        // Check if user needs to provide details (for email/password login)
        if (!userData.hasUserDetails && userData.signInProvider === 'password') {
          logger.info('User details missing for password login', {
            component: 'Entry',
            action: 'show_details_form',
          });
          // Show form - don't redirect
          setLoading(false);
          return;
        }

        // Check tenants
        const tenants = userData.tenants || [];
        if (tenants.length === 0) {
          // No tenants - check if business email to auto-create
          if (userData.isBusinessEmail) {
            logger.info('No tenants, auto-creating for business email', {
              component: 'Entry',
              action: 'auto_create_tenant',
            });
            await handleAutoCreateTenant(userData);
          } else {
            // Gmail user - show error
            logger.info('No tenants for Gmail user, showing error', {
              component: 'Entry',
              action: 'show_gmail_error',
            });
            setError('Gmail users cannot create tenants. Please wait for an invitation from a tenant owner.');
            setLoading(false);
          }
        } else {
          // User has tenants - redirect to dashboard
          logger.info('User has tenants, redirecting to dashboard', {
            component: 'Entry',
            action: 'redirect_to_dashboard',
            tenantCount: tenants.length,
          });
          
          // Set primary tenant if available
          const primaryTenant = tenants.find((t: any) => t.id === userData.tenantId) || tenants[0];
          if (primaryTenant) {
            setSelectedTenant({
              id: String(primaryTenant.id),
              name: primaryTenant.name,
              email: userData.email,
              createdAt: primaryTenant.created_at || new Date().toISOString(),
            });
          }
          
          setLocation('/dashboard');
        }
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to load user status', err, {
          component: 'Entry',
          action: 'load_user_status',
        });
        setError(error.message || 'Failed to load user status. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserStatus();
  }, [firebaseUser, setLocation, setSelectedTenant]);

  const handleAutoCreateTenant = async (userData: any) => {
    setCreatingTenant(true);
    try {
      // Extract domain from email for tenant name
      const domain = userData.email.split('@')[1];
      const tenantName = domain ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Tenant';

      logger.info('Auto-creating tenant', {
        component: 'Entry',
        action: 'auto_create_tenant',
        tenantName,
        email: userData.email,
      });

      const tenant = await createTenant(tenantName);

      // Sync backend user state
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }

      // Set selected tenant
      setSelectedTenant({
        id: String(tenant.id),
        name: tenant.name,
        email: userData.email,
        createdAt: tenant.created_at || new Date().toISOString(),
      });

      toast({
        title: 'Tenant Created',
        description: `Your tenant "${tenantName}" has been created successfully.`,
      });

      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to auto-create tenant', err, {
        component: 'Entry',
        action: 'auto_create_tenant',
      });

      let errorMessage = error.message || 'Failed to create tenant. Please try again.';
      if (error.code === 'PUBLIC_EMAIL_NOT_ALLOWED' || error.details?.code === 'PUBLIC_EMAIL_NOT_ALLOWED') {
        errorMessage = 'Only business email addresses are allowed for tenant creation.';
      }

      setError(errorMessage);
      toast({
        title: 'Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleSubmitDetails = async (data: UserDetailsFormData) => {
    setSubmittingDetails(true);
    try {
      logger.info('Submitting user details', {
        component: 'Entry',
        action: 'submit_user_details',
        firstName: data.firstName,
      });

      await registerUser(data.firstName, data.lastName || '');

      // Sync backend user state
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }

      toast({
        title: 'Details Saved',
        description: 'Your profile has been updated successfully.',
      });

      // Reload user status to continue flow
      const userData = await getCurrentUser();
      setUserStatus(userData);

      // Check tenants
      const tenants = userData.tenants || [];
      if (tenants.length === 0) {
        if (userData.isBusinessEmail) {
          await handleAutoCreateTenant(userData);
        } else {
          setError('Gmail users cannot create tenants. Please wait for an invitation from a tenant owner.');
        }
      } else {
        const primaryTenant = tenants.find((t: any) => t.id === userData.tenantId) || tenants[0];
        if (primaryTenant) {
          setSelectedTenant({
            id: String(primaryTenant.id),
            name: primaryTenant.name,
            email: userData.email,
            createdAt: primaryTenant.created_at || new Date().toISOString(),
          });
        }
        setLocation('/dashboard');
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to submit user details', err, {
        component: 'Entry',
        action: 'submit_user_details',
      });
      toast({
        title: 'Failed to Save',
        description: error.message || 'Failed to save your details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingDetails(false);
    }
  };

  if (!firebaseUser) {
    return null;
  }

  if (loading || creatingTenant) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              {creatingTenant ? 'Creating your tenant...' : 'Loading...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show user details form if needed
  if (userStatus && !userStatus.hasUserDetails && userStatus.signInProvider === 'password') {
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
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>Please provide your details to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...userDetailsForm}>
                <form onSubmit={userDetailsForm.handleSubmit(handleSubmitDetails)} className="space-y-4">
                  <FormField
                    control={userDetailsForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userDetailsForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={submittingDetails}>
                    {submittingDetails ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show error if Gmail user without tenants
  if (error) {
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
              <CardTitle className="text-2xl">Waiting for Invitation</CardTitle>
              <CardDescription>You need to be invited to join a tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">No tenant access</p>
                  <p className="text-sm">{error}</p>
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Check Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Default loading state (shouldn't reach here normally)
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

