import { useState } from 'react';
import { Link } from 'wouter';
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async (data: SignUpFormData) => {
    console.log('📝 SignUp: Form submitted:', data.email);
    setLoading(true);

    try {
      // Store sign-up data in sessionStorage for AuthContext to use
      const signUpData = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      console.log('💾 Storing sign-up data in sessionStorage:', signUpData);
      sessionStorage.setItem('signUpData', JSON.stringify(signUpData));
      
      // Verify it was stored
      const stored = sessionStorage.getItem('signUpData');
      console.log('✅ Verified sign-up data stored:', stored);
      
      // Register user with backend
      console.log('📝 SignUp: Registering user with backend...');
      await registerUser(data.firstName, data.lastName);
      
      console.log('✅ SignUp: User registered, redirecting...');
      
      // Note: If email verification is required, AuthContext will handle showing
      // the EmailVerification page. Otherwise, user will be redirected to dashboard.
    } catch (error: any) {
      console.error('❌ SignUp: Registration failed:', error);
      // Don't clear sessionStorage on error - let AuthContext handle it
      // This allows retry if needed
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Start monitoring your infrastructure today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

