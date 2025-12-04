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
import { createTenant } from '@/services/tenantApi';
import { isBusinessEmail } from '@/utils/emailValidation';
import { CheckCircle2, XCircle, Loader2, Mail, Building2 } from 'lucide-react';

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

const tenantNameSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name is too long'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type TenantNameFormData = z.infer<typeof tenantNameSchema>;

type Step = 1 | 2 | 3;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { firebaseUser, user, loading: authLoading, emailVerification, syncBackendUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [tenantCreated, setTenantCreated] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false); // Track if code has been sent
  const [resendCooldown, setResendCooldown] = useState(0); // Countdown timer in seconds
  const { toast } = useToast();
  
  // Use useRef to track if we've already attempted to send (persists across re-renders)
  const hasAttemptedSend = useRef(false);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  const tenantNameForm = useForm<TenantNameFormData>({
    resolver: zodResolver(tenantNameSchema),
    defaultValues: { tenantName: '' },
  });

  // Check if user has tenant on mount - use AuthContext state
  useEffect(() => {
    // Wait for auth state to settle
    if (authLoading) {
      setCheckingTenant(true);
      return;
    }

    // Auth state has settled, stop checking
    setCheckingTenant(false);

    if (!firebaseUser) {
      console.log('🚪 No Firebase user, redirecting to login');
      setLocation('/login');
      return;
    }

    // Check if user has tenant from AuthContext
    if (user?.tenantId) {
      console.log('✅ User has tenant, redirecting to dashboard');
      setLocation('/dashboard');
      return;
    }

    // Check if email verification is pending
    if (emailVerification) {
      console.log('✅ Email verification pending, starting at step 2');
      setCurrentStep(2);
      const isValid = isBusinessEmail(emailVerification.email);
      setEmailValid(isValid);
      return;
    }

    // User authenticated but no tenant - show onboarding
    console.log('✅ User authenticated but no tenant, showing onboarding');
    // Check email validity for step 1
    const isValid = isBusinessEmail(firebaseUser.email || '');
    setEmailValid(isValid);
  }, [firebaseUser, user, authLoading, emailVerification, setLocation]);

  // Auto-progress from step 1 to step 2 if email is valid
  useEffect(() => {
    if (currentStep === 1 && emailValid === true) {
      const timer = setTimeout(() => {
        console.log('✅ Auto-progressing to step 2 after email validation');
        setCurrentStep(2);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, emailValid]);

  // Memoize handleSendCode to prevent recreation on every render
  const handleSendCode = useCallback(async () => {
    // Prevent multiple simultaneous calls - only check sendingCode and cooldown
    // Don't check codeSent or hasAttemptedSend here - they're reset when cooldown expires
    if (sendingCode || resendCooldown > 0) {
      console.log('⚠️ Code sending in progress or cooldown active, skipping...', { 
        sendingCode, 
        resendCooldown
      });
      return;
    }
    
    // Set ref immediately to prevent race conditions
    hasAttemptedSend.current = true;
    setSendingCode(true);
    
    try {
      console.log('📧 Sending verification code (API call)...');
      await sendVerificationCode();
      console.log('✅ Verification code sent successfully');
      setCodeSent(true); // Mark as sent to prevent duplicate sends
      
      // Start 1-minute cooldown timer
      setResendCooldown(60);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (resendTimerRef.current) {
              clearInterval(resendTimerRef.current);
              resendTimerRef.current = null;
            }
            // Reset flags when cooldown expires to allow resend
            setCodeSent(false);
            hasAttemptedSend.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${firebaseUser?.email}. Please check your inbox.`,
      });
    } catch (error: any) {
      console.error('❌ Failed to send verification code:', error);
      // Reset ref on error so user can retry
      hasAttemptedSend.current = false;
      const errorMessage = error.message || "Failed to send verification code. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Don't set codeSent on error, so user can retry
    } finally {
      setSendingCode(false);
    }
  }, [sendingCode, codeSent, firebaseUser?.email, toast, resendCooldown]);

  // Auto-send verification code when step 2 is reached (only once)
  useEffect(() => {
    // Only send if step 2 is reached and we haven't attempted yet
    // handleSendCode has its own guards for sendingCode and codeSent
    if (currentStep === 2 && firebaseUser && !hasAttemptedSend.current) {
      console.log('📧 Auto-sending verification code (useEffect triggered)...', {
        currentStep,
        hasFirebaseUser: !!firebaseUser,
        hasAttemptedSend: hasAttemptedSend.current
      });
      // Call handleSendCode - it will check sendingCode and codeSent internally
      handleSendCode();
    }
    
    // Reset flag when leaving step 2
    if (currentStep !== 2) {
      console.log('🔄 Resetting code send flags (leaving step 2)');
      hasAttemptedSend.current = false;
      setCodeSent(false); // Also reset codeSent when leaving step 2
      setResendCooldown(0); // Reset cooldown timer
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, firebaseUser]); // Only depend on currentStep and firebaseUser to prevent re-runs

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  // Check if user got a tenant after registration (step 2 -> step 3 transition)
  useEffect(() => {
    if (currentStep === 2 && user?.tenantId) {
      console.log('✅ User has tenant after registration, redirecting to dashboard');
      setTenantCreated(true);
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);
    }
  }, [currentStep, user?.tenantId, setLocation]);

  const handleVerifyCode = async (data: VerifyCodeFormData) => {
    setLoading(true);
    try {
      // Step 1: Verify the code
      await verifyCode(data.code);
      setCodeVerified(true);
      toast({
        title: "Code Verified",
        description: "Your email has been verified successfully.",
      });
      
      // Step 2: Register user with backend (always, if not already registered)
      let registeredUser = user;
      if (!user) {
        try {
          let firstName = '';
          let lastName = '';
          
          // Check if signup data exists in sessionStorage (from email/password signup)
          const signUpDataStr = sessionStorage.getItem('signUpData');
          if (signUpDataStr) {
            const signUpData = JSON.parse(signUpDataStr);
            firstName = signUpData.firstName || '';
            lastName = signUpData.lastName || '';
            // Clear signup data after use
            sessionStorage.removeItem('signUpData');
          } else {
            // For Google login users, extract name from Firebase user
            if (firebaseUser?.displayName) {
              const nameParts = firebaseUser.displayName.trim().split(/\s+/);
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            } else if (firebaseUser?.email) {
              // Fallback: use email prefix as firstName
              const emailPrefix = firebaseUser.email.split('@')[0];
              firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
              lastName = '';
            } else {
              // Last resort: use defaults
              firstName = 'User';
              lastName = '';
            }
          }
          
          console.log('📝 Registering user with backend after email verification...', { firstName, lastName });
          registeredUser = await registerUser(firstName, lastName);
          console.log('✅ User registered successfully');
        } catch (registerError: any) {
          console.error('❌ Failed to register user:', registerError);
          // Check if user already exists (that's okay)
          if (registerError.message?.includes('already exists') || registerError.status === 409) {
            console.log('ℹ️ User already exists, will sync backend state...');
          } else {
            // For other errors, show warning but continue
            console.warn('⚠️ Registration failed, but continuing with onboarding');
            toast({
              title: "Registration Warning",
              description: "Could not complete registration, but you can continue.",
              variant: "default",
            });
          }
        }
      }
      
      // Sync backend user state to update AuthContext (always do this after verification)
      if (firebaseUser && syncBackendUser) {
        console.log('🔄 Syncing backend user state after email verification...');
        try {
          await syncBackendUser(firebaseUser);
          // Get updated user from context after sync
          // Note: We'll check user state in useEffect or after timeout
        } catch (syncError: any) {
          console.error('❌ Failed to sync backend user:', syncError);
          // Continue anyway - user might not exist yet
        }
      }
      
      // Step 3: Auto-progress to step 3 after 2 seconds
      setTimeout(() => {
        // Check if tenant was auto-created during verification/registration
        // The user state will be updated by syncBackendUser, so we check it via useEffect
        // For now, always proceed to step 3 - if tenant exists, useEffect will handle redirect
        console.log('✅ Auto-progressing to step 3 after email verification');
        setCurrentStep(3);
        const email = firebaseUser?.email || '';
        const domain = email.split('@')[1];
        if (domain) {
          const suggestedName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
          tenantNameForm.setValue('tenantName', suggestedName);
        }
      }, 2000); // Wait 2 seconds before moving to next step
    } catch (error: any) {
      console.error('❌ Failed to verify code:', error);
      setCodeVerified(false);
      const errorMessage = error.message || "Invalid verification code. Please try again.";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      verifyCodeForm.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (data: TenantNameFormData) => {
    setLoading(true);
    try {
      // Call tenant API directly (backend uses Firebase auth, doesn't require backend user)
      console.log('🏢 Creating tenant:', data.tenantName);
      await createTenant(data.tenantName);
      
      // Sync backend user state to update AuthContext with tenant info
      if (firebaseUser && syncBackendUser) {
        console.log('🔄 Syncing backend user state after tenant creation...');
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Tenant Created",
        description: "Your organization has been created successfully.",
      });
      setTenantCreated(true);
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Failed to create tenant:', error);
      const errorMessage = error.message || "Failed to create tenant. Please try again.";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingTenant) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Checking your account...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  const userEmail = firebaseUser.email || '';

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
            <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
            <CardDescription>
              Follow these steps to get started
            </CardDescription>
          </CardHeader>

          {/* Step Indicator */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep === step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : currentStep > step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-muted text-muted-foreground'
                  }`}>
                    {currentStep > step ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      currentStep > step ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <CardContent className="space-y-6">
            {/* Step 1: Business Email Validation */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Step 1: Verify Business Email</p>
                  <p className="text-sm text-muted-foreground">Your email address</p>
                  <p className="text-sm font-medium">{userEmail}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    {emailValid === true ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-sm font-medium">Valid business email</span>
                      </div>
                    ) : emailValid === false ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2 text-red-600">
                          <XCircle className="w-6 h-6" />
                          <span className="text-sm font-medium">Public email not allowed</span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Please use a business email address to continue.
                        </p>
                      </div>
                    ) : (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                  </div>
                </div>

                {emailValid === true && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Moving to next step...</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Email Verification */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Step 2: Verify Your Email</p>
                  <p className="text-sm text-muted-foreground">
                    A verification code has been sent to
                  </p>
                  <p className="text-sm font-medium">{userEmail}</p>
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

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || codeVerified}
                    >
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

                {codeVerified && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Moving to next step...</p>
                  </div>
                )}

                {!codeVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setCodeSent(false); // Reset flag to allow resend
                      hasAttemptedSend.current = false; // Reset ref flag
                      setResendCooldown(0); // Reset cooldown
                      if (resendTimerRef.current) {
                        clearInterval(resendTimerRef.current);
                        resendTimerRef.current = null;
                      }
                      handleSendCode();
                    }}
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

            {/* Step 3: Tenant Creation */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {tenantCreated ? (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm font-medium">Step 3: Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      Your organization has been created successfully.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Redirecting to dashboard...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm font-medium">Step 3: Create Your Organization</p>
                      <p className="text-sm text-muted-foreground">
                        Enter a name for your organization
                      </p>
                    </div>

                    <Form {...tenantNameForm}>
                      <form onSubmit={tenantNameForm.handleSubmit(handleCreateTenant)} className="space-y-4">
                        <FormField
                          control={tenantNameForm.control}
                          name="tenantName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Acme Inc" 
                                  {...field} 
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
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Organization'
                          )}
                        </Button>
                      </form>
                    </Form>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

