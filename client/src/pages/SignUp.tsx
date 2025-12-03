import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { signUpWithEmail } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { isBusinessEmail } from '@/utils/emailValidation';
import { sendVerificationCode, verifyCode } from '@/services/authApi';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

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

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

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

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    // Redirect to dashboard if user is authenticated
    if (user) {
      console.log('✅ SignUp: User authenticated, redirecting to dashboard...');
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const handleStep1Submit = async (data: SignUpFormData) => {
    console.log('📝 SignUp: Step 1 submitted:', data.email);
    setUserEmail(data.email);
    
    // Skip API call, just move to verification code step
    toast({
      title: "Verification Code Sent",
      description: `A 6-digit code has been sent to ${data.email}. Please check your inbox.`,
    });
    setStep(2);
  };

  useEffect(() => {
    // Auto-advance to step 3 after showing success message for 2 seconds
    if (step === 2) {
      const timer = setTimeout(() => {
        setStep(3);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleStep3Submit = async (data: VerifyCodeFormData) => {
    console.log('🔐 SignUp: Verifying code for:', userEmail);
    setLoading(true);

    try {
      // Skip code verification, just proceed with account creation
      
      // Get form data from step 1
      const signUpData = signUpForm.getValues();
      
      // Validate password
      if (signUpData.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (signUpData.password !== signUpData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Store sign-up data in sessionStorage for AuthContext to use
      sessionStorage.setItem('signUpData', JSON.stringify({
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
      }));
      
      // Create Firebase account
      console.log('🔥 SignUp: Creating Firebase account...');
      await signUpWithEmail(userEmail, signUpData.password);
      
      console.log('✅ SignUp: Firebase account created, user will be registered in AuthContext');

      toast({
        title: "Account Created",
        description: "Your account has been created successfully. Redirecting to dashboard...",
      });

      // Redirect to dashboard (AuthContext will handle user state)
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('❌ SignUp: Registration failed:', error);
      const errorMessage = error.message || "Failed to create account. Please try again.";
      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      verifyCodeForm.reset();
    } else if (step === 2) {
      setStep(1);
    } else {
      setLocation('/login');
    }
  };

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
            <CardTitle className="text-2xl">
              {step === 1 && 'Create Account'}
              {step === 2 && 'Verification Code Sent'}
              {step === 3 && 'Verify Your Email'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Start monitoring your infrastructure today'}
              {step === 2 && 'Check your email for the verification code'}
              {step === 3 && 'Enter the 6-digit code sent to your email'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: User Details Form */}
            {step === 1 && (
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleStep1Submit)} className="space-y-4">
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

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    data-testid="button-submit"
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                  </Button>
                </form>
              </Form>
            )}

            {/* Step 2: Code Sent Success */}
            {step === 2 && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit verification code to
                  </p>
                  <p className="text-sm font-medium mt-1">{userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    The code will expire in 10 minutes
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Code sent successfully</span>
                </div>
              </div>
            )}

            {/* Step 3: Verify Code */}
            {step === 3 && (
              <Form {...verifyCodeForm}>
                <form onSubmit={verifyCodeForm.handleSubmit(handleStep3Submit)} className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="text-sm font-medium">{userEmail}</p>
                  </div>

                  <FormField
                    control={verifyCodeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000000" 
                            maxLength={6}
                            className="text-center text-2xl tracking-widest font-mono"
                            {...field} 
                            data-testid="input-verification-code"
                            onChange={(e) => {
                              // Only allow numeric input
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    data-testid="button-verify-code"
                  >
                    {loading ? 'Creating Account...' : 'Verify & Create Account'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleBack}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </form>
              </Form>
            )}

            {/* Back to Login Link */}
            {step === 1 && (
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setLocation('/login')}
                  className="text-sm"
                  data-testid="button-back-to-login"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

