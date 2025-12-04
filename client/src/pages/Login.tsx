import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { signInWithGoogle, signInWithEmailPassword } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Chrome } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { firebaseUser, user, loading: authLoading } = useAuth();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect based on auth state after successful login
  useEffect(() => {
    // Wait for auth state to settle
    if (authLoading) {
      return;
    }

    // If Firebase user is authenticated
    if (firebaseUser) {
      // If backend user exists with tenant, go to dashboard
      if (user?.tenantId) {
        console.log('✅ User has tenant, redirecting to dashboard');
        setLocation('/dashboard');
      } else {
        // If Firebase user but no backend user or no tenant, go to onboarding
        console.log('✅ User authenticated, redirecting to onboarding');
        setLocation('/onboarding');
      }
    }
  }, [firebaseUser, user, authLoading, setLocation]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      console.log('🔐 Login: Starting Google sign-in...');
      await signInWithGoogle();
      console.log('✅ Login: Google sign-in successful');
      // AuthContext will handle backend sync and redirect via useEffect
    } catch (error: any) {
      console.error('❌ Login: Google sign-in failed:', error);
      toast({
        title: "Sign-in Error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      console.log('🔐 Login: Starting email/password sign-in...');
      await signInWithEmailPassword(data.email, data.password);
      console.log('✅ Login: Email/password sign-in successful');
      // AuthContext will handle backend sync and redirect via useEffect
    } catch (error: any) {
      console.error('❌ Login: Email/password sign-in failed:', error);
      toast({
        title: "Sign-in Error",
        description: error.message || "Failed to sign in. Please check your credentials and try again.",
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
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {googleLoading ? 'Signing in...' : 'Sign in with Google'}
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

            {/* Email/Password Form */}
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleEmailPasswordLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@company.com" 
                          {...field} 
                          data-testid="input-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
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
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || googleLoading}
                  data-testid="button-submit"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

