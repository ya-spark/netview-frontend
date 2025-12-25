import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { registerUser } from '@/services/authApi';
import { Layout } from '@/components/Layout';
import { isBusinessEmail } from '@/utils/emailValidation';
import { createUserWithEmailAndPassword, signInWithGoogle, signOut } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { Chrome } from 'lucide-react';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string()
    .email('Invalid email address')
    .refine(isBusinessEmail, 'Only business email addresses are allowed. Public email providers (Gmail, Yahoo, etc.) are not permitted.'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Log component mount
  useEffect(() => {
    logger.info('SignUp page loaded', {
      component: 'SignUp',
      action: 'page_load',
      hasUser: !!user,
    });
  }, [user]);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      logger.info('Starting Google sign-up', {
        component: 'SignUp',
        action: 'google_signup',
      });
      const firebaseUser = await signInWithGoogle();
      logger.info('Google sign-up successful', {
        component: 'SignUp',
        action: 'google_signup',
        email: firebaseUser.email,
      });
      
      // Validate business email
      const email = firebaseUser.email;
      if (!email) {
        throw new Error('Email address not provided by Google account');
      }
      
      if (!isBusinessEmail(email)) {
        // Sign out the user if email is not a business email
        await signOut();
        logger.warn('Business email required, signing out user', {
          component: 'SignUp',
          action: 'google_signup',
          email,
        });
        toast({
          title: "Business Email Required",
          description: "Only business email addresses are allowed. Public email providers (Gmail, Yahoo, etc.) are not permitted.",
          variant: "destructive",
        });
        return;
      }
      
      // Extract name from Firebase user
      let firstName = '';
      let lastName = '';
      
      if (firebaseUser.displayName) {
        const nameParts = firebaseUser.displayName.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (email) {
        // Fallback: use email prefix as firstName
        const emailPrefix = email.split('@')[0];
        firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        lastName = '';
      } else {
        // Last resort: use defaults
        firstName = 'User';
        lastName = '';
      }
      
      // Store signup data for onboarding/registration
      const signUpData = {
        firstName,
        lastName,
      };
      logger.debug('Storing sign-up data in sessionStorage', {
        component: 'SignUp',
        action: 'google_signup',
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
      });
      sessionStorage.setItem('signUpData', JSON.stringify(signUpData));
      
      // Redirect to onboarding
      // Onboarding will handle email verification and registration
      logger.info('Redirecting to onboarding for email verification and registration', {
        component: 'SignUp',
        action: 'google_signup',
        email,
      });
      setLocation('/onboarding');
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Google sign-up failed', err, {
        component: 'SignUp',
        action: 'google_signup',
      });
      
      // Handle specific Firebase errors
      let errorMessage = error.message || "Failed to sign up with Google. Please try again.";
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-up popup was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account with this email already exists. Please login instead.';
      }
      
      toast({
        title: "Sign-up Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (data: SignUpFormData) => {
    logger.info('Form submitted', {
      component: 'SignUp',
      action: 'email_signup',
      email: data.email,
    });
    setLoading(true);

    try {
      // Step 1: Create Firebase account
      logger.info('Creating Firebase account', {
        component: 'SignUp',
        action: 'email_signup',
        email: data.email,
      });
      await createUserWithEmailAndPassword(data.email, data.password);
      logger.info('Firebase account created successfully', {
        component: 'SignUp',
        action: 'email_signup',
        email: data.email,
      });
      
      // Step 2: Store signup data for onboarding/registration
      // This will be used during onboarding to register with backend after email verification
      const signUpData = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      logger.debug('Storing sign-up data in sessionStorage', {
        component: 'SignUp',
        action: 'email_signup',
        hasFirstName: !!data.firstName,
        hasLastName: !!data.lastName,
      });
      sessionStorage.setItem('signUpData', JSON.stringify(signUpData));
      
      // Step 3: Redirect to onboarding
      // Onboarding will handle email verification and registration
      logger.info('Redirecting to onboarding for email verification and registration', {
        component: 'SignUp',
        action: 'email_signup',
        email: data.email,
      });
      setLocation('/onboarding');
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Account creation failed', err, {
        component: 'SignUp',
        action: 'email_signup',
        email: data.email,
      });
      
      // Handle specific Firebase errors
      let errorMessage = error.message || "Failed to create account. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please login instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      }
      
      toast({
        title: "Account Creation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Start monitoring your infrastructure today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              data-testid="button-google-signup"
            >
              <Chrome className="mr-2 h-4 w-4" />
              {googleLoading ? 'Signing up...' : 'Sign up with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john@company.com" 
                            {...field} 
                            data-testid="input-email" 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Only business email addresses are allowed
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              data-testid="input-password" 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Must be at least 8 characters
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              {...field} 
                              data-testid="input-confirm-password" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || googleLoading}
                  data-testid="button-submit"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already Signed up? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

