import { useState, useEffect, useCallback, useRef } from 'react';
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
import { sendVerificationCode, verifyCode, registerUser } from '@/services/authApi';
import { logger } from '@/lib/logger';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

const userDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type UserDetailsFormData = z.infer<typeof userDetailsSchema>;

/**
 * Extract user details from Firebase user
 */
function extractUserDetailsFromFirebase(displayName: string | null | undefined, email: string | null | undefined) {
  if (displayName) {
    const nameParts = displayName.trim().split(/\s+/);
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
      name: displayName,
    };
  }
  
  if (email) {
    const emailPrefix = email.split('@')[0];
    return {
      firstName: emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1),
      lastName: '',
      name: emailPrefix,
    };
  }
  
  return {
    firstName: 'User',
    lastName: '',
    name: 'User',
  };
}

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { firebaseUser, syncBackendUser } = useAuth();
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();
  
  const userEmail = firebaseUser?.email || '';
  
  // Check if user signed in with Google (skip email verification)
  const isGoogleSignIn = firebaseUser?.providerData?.some(
    (provider: any) => provider.providerId === 'google.com'
  ) || false;
  
  // Extract user details from Firebase
  const firebaseDetails = extractUserDetailsFromFirebase(
    firebaseUser?.displayName,
    firebaseUser?.email
  );

  const userDetailsForm = useForm<UserDetailsFormData>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      firstName: firebaseDetails.firstName,
      lastName: firebaseDetails.lastName,
    },
  });

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-send verification code when reaching verify step
  useEffect(() => {
    if (step === 'verify' && firebaseUser && !codeSent) {
      handleSendCode();
    }
    
    if (step !== 'verify') {
      setCodeSent(false);
      setResendCooldown(0);
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    }
  }, [step, firebaseUser]);

  const handleSendCode = useCallback(async () => {
    if (sendingCode || resendCooldown > 0) return;
    
    setSendingCode(true);
    
    try {
      logger.info('Sending verification code', { component: 'VerifyEmail', action: 'send_code', email: userEmail });
      await sendVerificationCode();
      setCodeSent(true);
      setResendCooldown(60);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (resendTimerRef.current) {
              clearInterval(resendTimerRef.current);
              resendTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${userEmail}. Please check your inbox.`,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to send verification code', err, { component: 'VerifyEmail', action: 'send_code', email: userEmail });
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  }, [sendingCode, userEmail, toast, resendCooldown]);

  const handleSubmitDetails = async (data: UserDetailsFormData) => {
    // If Google sign-in, skip verification and register directly
    if (isGoogleSignIn) {
      setLoading(true);
      try {
        logger.info('Google sign-in user, skipping email verification, registering directly', {
          component: 'VerifyEmail',
          email: userEmail,
        });
        
        await registerUser(
          data.firstName,
          data.lastName,
          `${data.firstName} ${data.lastName}`.trim()
        );
        
        // Sync backend user state
        if (firebaseUser && syncBackendUser) {
          await syncBackendUser(firebaseUser);
        }
        
        logger.info('Registration successful for Google user, redirecting to invites', {
          component: 'VerifyEmail',
        });
        
        // Redirect to invites page
        setTimeout(() => {
          setLocation('/onboarding/invites');
        }, 500);
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to register Google user', err, {
          component: 'VerifyEmail',
          action: 'register_google_user',
          email: userEmail,
        });
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to complete registration. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      setStep('verify');
    }
  };

  const handleVerifyCode = async (data: VerifyCodeFormData) => {
    setLoading(true);
    try {
      logger.info('Verifying code', { component: 'VerifyEmail', action: 'verify_code', email: userEmail });
      await verifyCode(data.code);
      setCodeVerified(true);
      
      toast({
        title: "Code Verified",
        description: "Your email has been verified successfully.",
      });
      
      // Register user with details
      const userDetails = userDetailsForm.getValues();
      logger.info('Registering user', { component: 'VerifyEmail', action: 'register_user', email: userEmail });
      
      await registerUser(
        userDetails.firstName,
        userDetails.lastName,
        `${userDetails.firstName} ${userDetails.lastName}`.trim()
      );
      
      // Sync backend user state
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      logger.info('Registration successful, redirecting to invites', { component: 'VerifyEmail' });
      
      // Redirect to invites page
      setTimeout(() => {
        setLocation('/onboarding/invites');
      }, 1500);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to verify code', err, { component: 'VerifyEmail', action: 'verify_code', email: userEmail });
      setCodeVerified(false);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      verifyCodeForm.reset();
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseUser) {
    return null;
  }

  // Show different message for Google sign-in users
  const cardTitle = isGoogleSignIn 
    ? 'Complete Your Profile'
    : (step === 'details' ? 'Complete Your Profile' : 'Verify Your Email');
  
  const cardDescription = isGoogleSignIn
    ? 'Please provide your details to continue (email verification skipped for Google sign-in)'
    : (step === 'details' 
        ? 'Please provide your details to continue'
        : `A verification code has been sent to ${userEmail}`
      );

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
            <CardTitle className="text-2xl">{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 'details' || isGoogleSignIn ? (
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isGoogleSignIn ? 'Registering...' : 'Continue'}
                      </>
                    ) : (
                      isGoogleSignIn ? 'Complete Registration' : 'Continue'
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Enter the verification code</p>
                  <p className="text-sm text-muted-foreground">Sent to {userEmail}</p>
                </div>

                <Form {...verifyCodeForm}>
                  <form onSubmit={verifyCodeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
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
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading || codeVerified}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : codeVerified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Verified
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </Button>
                  </form>
                </Form>

                {codeSent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSendCode}
                    disabled={sendingCode || resendCooldown > 0}
                  >
                    {sendingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Code ({resendCooldown}s)
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Code
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
