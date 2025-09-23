import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, handleRedirectResult } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';

export default function Login() {
  const [, setLocation] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, firebaseUser } = useAuth();

  useEffect(() => {
    // Handle OAuth redirect result
    console.log('🔄 Login: Checking for redirect result...');
    handleRedirectResult()
      .then((result) => {
        console.log('🔄 Login: Redirect result:', result ? 'Success' : 'No redirect');
        if (result) {
          console.log('🔄 Login: Redirect result details:', {
            uid: result.user?.uid || 'unknown',
            email: result.user?.email || 'unknown',
            displayName: result.user?.displayName || 'unknown'
          });
          toast({
            title: "Welcome to NetView!",
            description: "You have successfully signed in.",
          });
        }
      })
      .catch((error) => {
        console.error('❌ Login: Redirect error:', error);
        toast({
          title: "Sign-in Error",
          description: error.message,
          variant: "destructive",
        });
      });
  }, [toast]);

  useEffect(() => {
    // Redirect to dashboard if user is authenticated
    console.log('🚪 Login: Auth state changed:', {
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
      loading,
      userDetails: user ? { id: user.id, email: user.email, role: user.role } : null
    });
    
    if (user) {
      console.log('✅ Login: User authenticated, redirecting to dashboard...');
      setLocation('/dashboard');
    }
  }, [user, firebaseUser, loading, setLocation]);

  const handleGoogleSignIn = async () => {
    console.log('🖱️ Login: Google sign-in button clicked');
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      console.log('✅ Login: Google sign-in completed successfully');
      // The AuthContext will handle the user state update automatically
    } catch (error: any) {
      console.error('❌ Login: Google sign-in failed:', error);
      toast({
        title: "Sign-in Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        toast({
          title: "Account Created",
          description: "Your account has been created successfully.",
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: "Welcome Back",
          description: "You have successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
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
            <CardTitle className="text-2xl">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Start monitoring your infrastructure today' 
                : 'Welcome back to NetView'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign In */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              data-testid="button-google-signin"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="button-submit"
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm"
                data-testid="button-toggle-mode"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
