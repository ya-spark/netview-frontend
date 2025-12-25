import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendVerificationCode, verifyCode, getCurrentUser } from '@/services/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { logger } from '@/lib/logger';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

interface EmailVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
}

export default function EmailVerification({ email, onVerificationSuccess }: EmailVerificationProps) {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const { firebaseUser, syncBackendUser, clearEmailVerification } = useAuth();
  const { toast } = useToast();
  const hasCheckedRef = useRef(false);

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const handleSendCode = useCallback(async () => {
    setSendingCode(true);
    try {
      logger.info('Sending verification code', {
        component: 'EmailVerification',
        action: 'send_code',
        email,
      });
      await sendVerificationCode();
      logger.info('Verification code sent successfully', {
        component: 'EmailVerification',
        action: 'send_code_success',
        email,
      });
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${email}. Please check your inbox.`,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to send verification code', err, {
        component: 'EmailVerification',
        action: 'send_code',
        email,
      });
      const errorMessage = error.message || "Failed to send verification code. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  }, [email, toast]);

  // Check if email verification is needed
  useEffect(() => {
    const checkVerificationNeeded = async () => {
      if (hasCheckedRef.current || location !== '/email-verification') {
        return;
      }

      if (!firebaseUser) {
        setLocation('/login');
        return;
      }

      hasCheckedRef.current = true;

      try {
        const userData = await getCurrentUser();
        
        // If email is already verified, skip this step
        if (userData.emailVerified) {
          logger.info('Email already verified, skipping verification step', {
            component: 'EmailVerification',
            action: 'skip_verification',
            email: userData.email,
          });
          
          // Clear email verification state to prevent redirect loop
          clearEmailVerification();
          
          // Sync backend user to ensure context is updated
          if (firebaseUser && syncBackendUser) {
            await syncBackendUser(firebaseUser);
          }
          
          setSkipping(true);
          
          // Show message for 2 seconds, then route to next step
          setTimeout(() => {
            // Check if user details are needed
            const hasUserDetails = userData.hasUserDetails || userData.signInProvider !== 'password';
            if (!hasUserDetails) {
              setLocation('/user-details');
            } else {
              setLocation('/tenant-selection');
            }
          }, 2000);
          
          return;
        }

        // Email verification is needed - auto-send code
        logger.info('Email verification needed, auto-sending code', {
          component: 'EmailVerification',
          action: 'auto_send_code',
          email,
        });
        handleSendCode();
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to check verification status', err, {
          component: 'EmailVerification',
          action: 'check_verification',
        });
      }
    };

    checkVerificationNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, location]);

  const handleVerifyCode = async (data: VerifyCodeFormData) => {
    setLoading(true);
    try {
      await verifyCode(data.code);
      logger.info('Code verified successfully', {
        component: 'EmailVerification',
        action: 'verify_code',
        email,
      });
      
      // Clear email verification state to prevent redirect loop
      clearEmailVerification();
      
      // Sync backend user to update context
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Code Verified",
        description: "Your email has been verified successfully.",
      });
      
      // Wait a moment for state to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload user data to check next step
      const userData = await getCurrentUser();
      
      // Route to next step based on what's needed
      const hasUserDetails = userData.hasUserDetails || userData.signInProvider !== 'password';
      if (!hasUserDetails) {
        logger.info('Email verified, routing to user details', {
          component: 'EmailVerification',
          action: 'redirect_after_verification',
        });
        setLocation('/user-details');
      } else {
        logger.info('Email verified, routing to tenant selection', {
          component: 'EmailVerification',
          action: 'redirect_after_verification',
        });
        setLocation('/tenant-selection');
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to verify code', err, {
        component: 'EmailVerification',
        action: 'verify_code',
        email,
      });
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

  // Show skip message if verification not needed
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
              <CardTitle className="text-2xl">Email Already Verified</CardTitle>
              <CardDescription>
                Your email is already verified. Continuing to next step...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Skipping email verification step
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
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              Your email needs to be verified before you can complete registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A verification code has been sent to
              </p>
              <p className="text-sm font-medium">{email}</p>
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
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
              </form>
            </Form>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSendCode}
                disabled={sendingCode}
                data-testid="button-resend-code"
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Code
                  </>
                )}
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

