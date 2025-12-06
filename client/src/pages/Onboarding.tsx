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
import { CollaboratorApiService } from '@/services/collaboratorApi';
import { isBusinessEmail } from '@/utils/emailValidation';
import { logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Mail, Building2, AlertCircle } from 'lucide-react';

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

const tenantNameSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name is too long'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type TenantNameFormData = z.infer<typeof tenantNameSchema>;

type Step = 1 | 2 | 3 | 4;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { firebaseUser, user, loading: authLoading, emailVerification, syncBackendUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [hasAcceptedInvitation, setHasAcceptedInvitation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [tenantCreated, setTenantCreated] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const { toast } = useToast();
  
  const userEmail = firebaseUser?.email || emailVerification?.email || '';
  const shouldCheckInvitations = !!userEmail && !!firebaseUser && !authLoading && (!user || !user.tenantId);
  
  const { data: pendingInvitationsData, isLoading: checkingInvitations } = useQuery({
    queryKey: ['/api/collaborators/pending-by-email', userEmail],
    queryFn: async () => {
      if (!userEmail) return { data: [], count: 0 };
      logger.info('Checking for pending invitations', { component: 'Onboarding', email: userEmail });
      try {
        const result = await CollaboratorApiService.getPendingInvitationsByEmail(userEmail);
        logger.info('Pending invitations check completed', {
          component: 'Onboarding',
          email: userEmail,
          count: result?.data?.length || 0,
        });
        return result;
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to check pending invitations', err, { component: 'Onboarding', email: userEmail });
        throw error;
      }
    },
    enabled: shouldCheckInvitations,
    retry: 1,
  });
  
  const pendingInvitations = (pendingInvitationsData?.data || []) as Array<import('@/types/collaborator').PendingInvitation>;
  const hasPendingInvitations = pendingInvitations.length > 0;

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  const tenantNameForm = useForm<TenantNameFormData>({
    resolver: zodResolver(tenantNameSchema),
    defaultValues: { tenantName: '' },
  });

  const hasAttemptedSend = useRef(false);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has tenant on mount
  useEffect(() => {
    if (authLoading) {
      setCheckingTenant(true);
      return;
    }

    setCheckingTenant(false);

    if (!firebaseUser) {
      setLocation('/login');
      return;
    }

    if (user?.tenantId) {
      logger.info('User has tenant, redirecting to dashboard', {
        component: 'Onboarding',
        action: 'check_auth',
        userId: user.id,
        tenantId: user.tenantId as unknown as number,
      });
      setLocation('/dashboard');
      return;
    }

    // If email verification is pending and no invitation flow, start at step 2
    if (emailVerification && !hasPendingInvitations && !hasAcceptedInvitation) {
      setCurrentStep(2);
      const isValid = isBusinessEmail(emailVerification.email);
      setEmailValid(isValid);
    }
  }, [firebaseUser, user, authLoading, emailVerification, setLocation, hasPendingInvitations, hasAcceptedInvitation]);

  // Check email validity when not in invitation flow
  useEffect(() => {
    if (!checkingInvitations && !hasPendingInvitations && !hasAcceptedInvitation && firebaseUser?.email) {
      const isValid = isBusinessEmail(firebaseUser.email);
      setEmailValid(isValid);
    } else if (hasAcceptedInvitation && emailValid !== null) {
      setEmailValid(null);
    }
  }, [checkingInvitations, hasPendingInvitations, hasAcceptedInvitation, firebaseUser?.email, emailValid]);

  // Auto-progress from Step 1 to Step 2 if no invitations found
  useEffect(() => {
    if (currentStep === 1 && !checkingInvitations && !hasPendingInvitations && !hasAcceptedInvitation) {
      logger.debug('Auto-progressing from Step 1 to Step 2 (no invitations)', {
        component: 'Onboarding',
        action: 'auto_progress',
        currentStep,
      });
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 1500); // Small delay to show the "no invitations" message
      return () => clearTimeout(timer);
    }
  }, [currentStep, checkingInvitations, hasPendingInvitations, hasAcceptedInvitation]);

  // Auto-progress from Step 2 to Step 3 (email verification) if business email is valid
  useEffect(() => {
    if (currentStep === 2 && !hasAcceptedInvitation && emailValid === true) {
      logger.debug('Auto-progressing from Step 2 to Step 3 (business email valid)', {
        component: 'Onboarding',
        action: 'auto_progress',
        currentStep,
        emailValid,
      });
      const timer = setTimeout(() => {
        setCurrentStep(3);
      }, 2000); // Delay to show the validation success message
      return () => clearTimeout(timer);
    }
  }, [currentStep, hasAcceptedInvitation, emailValid]);

  // Auto-send verification code when reaching step 3
  useEffect(() => {
    if (currentStep === 3 && firebaseUser && !hasAttemptedSend.current) {
      handleSendCode();
    }
    
    if (currentStep !== 3) {
      hasAttemptedSend.current = false;
      setCodeSent(false);
      setResendCooldown(0);
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    }
  }, [currentStep, firebaseUser]);

  const handleSendCode = useCallback(async () => {
    if (sendingCode || resendCooldown > 0) return;
    
    hasAttemptedSend.current = true;
    setSendingCode(true);
    
    try {
      logger.info('Sending verification code', { component: 'Onboarding', action: 'send_code', email: firebaseUser?.email });
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
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to send verification code', err, { component: 'Onboarding', action: 'send_code', email: firebaseUser?.email });
      hasAttemptedSend.current = false;
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  }, [sendingCode, firebaseUser?.email, toast, resendCooldown]);

  const handleAcceptInvitation = async (inv: import('@/types/collaborator').PendingInvitation) => {
    if (!inv.invitationToken) {
      toast({
        title: "Invitation Token Missing",
        description: "Unable to accept invitation. Please check your email for the invitation link.",
        variant: "destructive",
      });
      return;
    }
    
    setAcceptingInvitation(true);
    try {
      logger.info('Accepting invitation', { component: 'Onboarding', action: 'accept_invitation', invitationId: inv.id });
      await CollaboratorApiService.acceptInvitationByToken(inv.invitationToken, userEmail);
      
      logger.info('Invitation accepted successfully', { component: 'Onboarding', action: 'accept_invitation_success', invitationId: inv.id });
      
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Invitation Accepted",
        description: `You've been added to ${inv.tenantName || 'the organization'} as ${inv.role}. Please verify your email to continue.`,
      });
      
      setHasAcceptedInvitation(true);
      setEmailValid(null);
      setCurrentStep(3); // Skip to email code verification (step 3)
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to accept invitation', err, { component: 'Onboarding', action: 'accept_invitation_error', invitationId: inv.id });
      toast({
        title: "Failed to Accept Invitation",
        description: error.message || "An error occurred while accepting the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAcceptingInvitation(false);
    }
  };

  const handleVerifyCode = async (data: VerifyCodeFormData) => {
    setLoading(true);
    try {
      await verifyCode(data.code);
      setCodeVerified(true);
      toast({
        title: "Code Verified",
        description: "Your email has been verified successfully.",
      });
      
      // Register user if not already registered
      if (!user) {
        try {
          let firstName = '';
          let lastName = '';
          
          const signUpDataStr = sessionStorage.getItem('signUpData');
          if (signUpDataStr) {
            const signUpData = JSON.parse(signUpDataStr);
            firstName = signUpData.firstName || '';
            lastName = signUpData.lastName || '';
            sessionStorage.removeItem('signUpData');
          } else if (firebaseUser?.displayName) {
            const nameParts = firebaseUser.displayName.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          } else if (firebaseUser?.email) {
            const emailPrefix = firebaseUser.email.split('@')[0];
            firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            lastName = '';
          } else {
            firstName = 'User';
            lastName = '';
          }
          
          await registerUser(firstName, lastName);
        } catch (registerError: any) {
          logger.error('Failed to register user', registerError instanceof Error ? registerError : new Error(String(registerError)), {
            component: 'Onboarding',
            action: 'register_user',
            email: firebaseUser?.email,
          });
        }
      }
      
      // Sync backend user state
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      // If invitation was accepted, redirect to dashboard (skip tenant creation)
      if (hasAcceptedInvitation) {
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      } else {
        // If no invitation, move to step 4 (tenant creation)
        setTimeout(() => {
          setCurrentStep(4);
        }, 1500);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to verify code', err, { component: 'Onboarding', action: 'verify_code', email: firebaseUser?.email });
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

  const handleCreateTenant = async (data: TenantNameFormData) => {
    setLoading(true);
    try {
      logger.info('Creating tenant', { component: 'Onboarding', action: 'create_tenant', tenantName: data.tenantName });
      await createTenant(data.tenantName);
      
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Tenant Created",
        description: "Your organization has been created successfully.",
      });
      setTenantCreated(true);
      
      // Redirect to dashboard after tenant creation
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create tenant', err, { component: 'Onboarding', action: 'create_tenant' });
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigate to step (with validation)
  const goToStep = (step: Step) => {
    // Don't allow navigation if invitation was accepted (can only go to step 1 or 3)
    if (hasAcceptedInvitation && step !== 1 && step !== 3) {
      toast({
        title: "Cannot Navigate",
        description: "You've accepted an invitation. Please complete email verification.",
        variant: "default",
      });
      return;
    }
    
    // Don't allow skipping business email check if email is invalid
    if (step === 3 && emailValid === false && !hasAcceptedInvitation) {
      toast({
        title: "Business Email Required",
        description: "Please use a business email address to continue.",
        variant: "default",
      });
      return;
    }
    
    setCurrentStep(step);
  };

  // Get step labels
  const getStepLabel = (step: Step): string => {
    if (hasAcceptedInvitation) {
      return step === 1 ? 'Invitation' : 'Email Verification';
    }
    switch (step) {
      case 1: return 'Invitations';
      case 2: return 'Business Email';
      case 3: return 'Email Verification';
      case 4: return 'Create Tenant';
      default: return '';
    }
  };

  // Get total steps based on invitation status
  const getTotalSteps = (): Step[] => {
    return hasAcceptedInvitation ? [1, 3] : [1, 2, 3, 4];
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

  const totalSteps = getTotalSteps();

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
            <CardDescription>Follow these steps to get started</CardDescription>
          </CardHeader>

          {/* Step Indicator - Clickable */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center">
              {totalSteps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => goToStep(step)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep === step
                        ? 'bg-primary border-primary text-primary-foreground cursor-default'
                        : currentStep > step
                        ? 'bg-primary border-primary text-primary-foreground cursor-pointer hover:scale-110'
                        : 'bg-background border-muted text-muted-foreground cursor-pointer hover:border-primary/50'
                    }`}
                    disabled={currentStep === step}
                    title={`Go to Step ${step}: ${getStepLabel(step)}`}
                  >
                    {currentStep > step ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </button>
                  {index < totalSteps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center mt-2">
              {totalSteps.map((step) => (
                <div key={step} className="flex-1 text-center">
                  {currentStep === step && (
                    <p className="text-xs text-primary font-medium">{getStepLabel(step)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <CardContent className="space-y-6">
            {/* Step 1: Check for Invitations */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {checkingInvitations ? (
                  <div className="text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm font-medium">Checking for invitations...</p>
                    <p className="text-sm text-muted-foreground">Your email address</p>
                    <p className="text-sm font-medium">{userEmail}</p>
                  </div>
                ) : hasPendingInvitations ? (
                  <>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Step 1: Pending Invitations</p>
                      <p className="text-sm text-muted-foreground">Your email address</p>
                      <p className="text-sm font-medium">{userEmail}</p>
                    </div>

                    <Alert className="border-primary/50 bg-primary/5">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="font-medium">
                            You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}
                          </p>
                          {pendingInvitations.map((inv) => (
                            <div key={inv.id} className="text-sm space-y-1 p-2 bg-background rounded border">
                              <p>
                                <strong>{inv.tenantName || 'An organization'}</strong> has invited you to join as <strong>{inv.role}</strong>
                              </p>
                            </div>
                          ))}
                          <div className="space-y-2">
                            {pendingInvitations.map((inv) => (
                              <Button
                                key={inv.id}
                                onClick={() => handleAcceptInvitation(inv)}
                                className="w-full"
                                disabled={acceptingInvitation}
                              >
                                {acceptingInvitation ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Accepting...
                                  </>
                                ) : (
                                  `Accept Invitation from ${inv.tenantName || 'Organization'}`
                                )}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm font-medium">Step 1: No Pending Invitations</p>
                    <p className="text-sm text-muted-foreground">No invitations found for {userEmail}</p>
                    <p className="text-sm text-muted-foreground">Moving to business email check...</p>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Business Email Check (only if no invitation accepted) */}
            {currentStep === 2 && !hasAcceptedInvitation && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Step 2: Verify Business Email</p>
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
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Moving to email verification...</p>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Email Code Verification */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Step 3: Verify Your Email</p>
                  <p className="text-sm text-muted-foreground">A verification code has been sent to</p>
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

                {!codeSent && !sendingCode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSendCode}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </Button>
                )}

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

            {/* Step 4: Tenant Creation (only if no invitation accepted) */}
            {currentStep === 4 && !hasAcceptedInvitation && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Step 4: Create Your Organization</p>
                  <p className="text-sm text-muted-foreground">Enter a name for your organization</p>
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
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading || tenantCreated}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : tenantCreated ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Created
                        </>
                      ) : (
                        'Create Organization'
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
