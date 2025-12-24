import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendVerificationCode, verifyCode } from '@/services/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { logger } from '@/lib/logger';
import { Mail, Loader2 } from 'lucide-react';

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

interface EmailVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
}

export default function EmailVerification({ email, onVerificationSuccess }: EmailVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const { toast } = useToast();

  const verifyCodeForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const handleSendCode = useCallback(async () => {
    setSendingCode(true);
    try {
      await sendVerificationCode();
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

  // Automatically send verification code when component mounts
  useEffect(() => {
    handleSendCode();
  }, [handleSendCode]);

  const handleVerifyCode = async (data: VerifyCodeFormData) => {
    setLoading(true);
    try {
      await verifyCode(data.code);
      logger.info('Code verified successfully', {
        component: 'EmailVerification',
        action: 'verify_code',
        email,
      });
      toast({
        title: "Code Verified",
        description: "Your email has been verified successfully.",
      });
      // Call the success callback to retry registration, then redirect to entry
      onVerificationSuccess();
      // Entry page will handle the next steps
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

