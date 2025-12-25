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
import { logger } from '@/lib/logger';
import { setCurrentUserInfo } from '@/lib/queryClient';
import { Loader2, CheckCircle2 } from 'lucide-react';

const userDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
});

type UserDetailsFormData = z.infer<typeof userDetailsSchema>;

export default function UserDetails() {
  const [location, setLocation] = useLocation();
  const { firebaseUser, syncBackendUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const hasCheckedRef = useRef(false);

  const userDetailsForm = useForm<UserDetailsFormData>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  // Check if user details are needed
  useEffect(() => {
    const checkDetailsNeeded = async () => {
      if (hasCheckedRef.current || location !== '/user-details') {
        return;
      }

      if (!firebaseUser) {
        setLocation('/login');
        return;
      }

      hasCheckedRef.current = true;

      try {
        const userData = await getCurrentUser();
        
        // Check if user details are already provided
        const hasUserDetails = userData.hasUserDetails || userData.signInProvider !== 'password';
        
        if (hasUserDetails) {
          logger.info('User details already provided, skipping details step', {
            component: 'UserDetails',
            action: 'skip_details',
            email: userData.email,
          });
          
          setSkipping(true);
          
          // Show message for 2 seconds, then route to next step
          setTimeout(() => {
            setLocation('/tenant-selection');
          }, 2000);
          
          return;
        }

        // Pre-fill form if user has partial details
        if (userData.firstName) {
          userDetailsForm.setValue('firstName', userData.firstName);
        }
        if (userData.lastName) {
          userDetailsForm.setValue('lastName', userData.lastName);
        }

        // Set user info for API headers
        if (userData.email) {
          setCurrentUserInfo(userData.email, '');
        }
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to check user details status', err, {
          component: 'UserDetails',
          action: 'check_details',
        });
      }
    };

    checkDetailsNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, location]);

  const handleSubmitDetails = async (data: UserDetailsFormData) => {
    setSubmittingDetails(true);
    try {
      logger.info('Submitting user details', {
        component: 'UserDetails',
        action: 'submit_user_details',
        firstName: data.firstName,
      });

      await registerUser(data.firstName, data.lastName || '');

      // Sync backend user state
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }

      // Wait a moment for state to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      toast({
        title: 'Details Saved',
        description: 'Your profile has been updated successfully.',
      });

      // Route to next step
      logger.info('User details saved, routing to tenant selection', {
        component: 'UserDetails',
        action: 'redirect_after_details',
      });
      setLocation('/tenant-selection');
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to submit user details', err, {
        component: 'UserDetails',
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

  // Show skip message if details not needed
  if (skipping) {
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
              <CardTitle className="text-2xl">Profile Complete</CardTitle>
              <CardDescription>
                Your profile details are already set. Continuing to next step...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Skipping user details step
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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

