import { useState, useEffect, useRef } from 'react';
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
import { logger } from '@/lib/logger';
import { getUserTenants, setPrimaryTenant } from '@/services/authApi';
import { setCurrentUserInfo } from '@/lib/queryClient';

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
  const { firebaseUser, user, loading: authLoading, setSelectedTenant, syncBackendUser } = useAuth();
  const checkingTenantsRef = useRef(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Get redirect path from URL query parameter
  const getRedirectPath = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect') || null;
  };

  // Validate if redirect path is a protected route
  const isValidProtectedRoute = (path: string | null): boolean => {
    if (!path) return false;
    
    // List of protected route patterns
    const protectedRoutes = [
      '/dashboard',
      '/manage',
      '/monitor',
      '/reports',
      '/settings',
      '/billing',
      '/collaborators',
    ];
    
    // Check if path starts with any protected route
    return protectedRoutes.some(route => path.startsWith(route));
  };

  // Redirect based on auth state after successful login
  useEffect(() => {
    // Wait for auth state to settle
    if (authLoading) {
      return;
    }

    // If Firebase user is authenticated
    if (firebaseUser) {
      const redirectPath = getRedirectPath();
      
      // If backend user doesn't exist yet, check if they have tenants anyway
      // (user might exist but sync hasn't completed, or they might be a collaborator)
      if (!user && !checkingTenantsRef.current) {
        checkingTenantsRef.current = true;
        
        const checkTenantsForNewUser = async () => {
          try {
            logger.info('Firebase user authenticated but no backend user yet, checking for tenants', {
              component: 'Login',
              action: 'check_tenants_for_new_user',
              firebaseUserId: firebaseUser.uid,
              firebaseEmail: firebaseUser.email,
            });
            
            const tenants = await getUserTenants();
            
            if (tenants.length === 1) {
              // User has exactly one tenant - set it as primary and redirect
              const tenant = tenants[0];
              const tenantId = typeof tenant.id === 'number' ? tenant.id : parseInt(String(tenant.id), 10);
              
              logger.info('User has exactly one tenant, setting as primary', {
                component: 'Login',
                action: 'set_primary_tenant',
                tenantId,
                tenantName: tenant.name,
              });
              
              // Sync backend user FIRST to ensure user exists before setting primary tenant
              if (firebaseUser && syncBackendUser) {
                await syncBackendUser(firebaseUser);
              }
              
              // Set selected tenant in context
              const tenantObj = {
                id: String(tenant.id),
                name: tenant.name,
                email: firebaseUser.email || '',
                createdAt: tenant.createdAt || new Date().toISOString(),
              };
              setSelectedTenant(tenantObj);
              
              // Set current user info for API headers
              setCurrentUserInfo(firebaseUser.email || '', String(tenant.id));
              
              // Set as primary tenant in backend (after user is synced)
              await setPrimaryTenant(tenantId);
              
              // Sync backend user again to update context with new tenantId
              if (firebaseUser && syncBackendUser) {
                await syncBackendUser(firebaseUser);
              }
              
              // Redirect to dashboard or saved path
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                logger.info('Redirecting to saved path after setting primary tenant', {
                  component: 'Login',
                  action: 'redirect_after_set_primary',
                }, { redirectPath });
                setLocation(redirectPath);
              } else {
                logger.info('Redirecting to dashboard after setting primary tenant', {
                  component: 'Login',
                  action: 'redirect_after_set_primary',
                });
                setLocation('/dashboard');
              }
            } else if (tenants.length > 1) {
              // User has multiple tenants - go to tenant selection
              logger.info('User has multiple tenants, redirecting to tenant selection', {
                component: 'Login',
                action: 'redirect_to_tenant_selection',
                tenantCount: tenants.length,
              });
              
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                const redirectData = {
                  path: redirectPath,
                  tenantId: null,
                };
                sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
              }
              setLocation('/tenant-selection');
            } else {
              // User has no tenants - go to onboarding
              logger.info('User has no tenants, redirecting to onboarding', {
                component: 'Login',
                action: 'redirect_to_onboarding',
              });
              
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                const redirectData = {
                  path: redirectPath,
                  tenantId: null,
                };
                sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
              }
              setLocation('/onboarding');
            }
          } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Error checking tenants for new user', err, {
              component: 'Login',
              action: 'check_tenants_for_new_user',
            });
            // On error, fall back to onboarding
            if (redirectPath && isValidProtectedRoute(redirectPath)) {
              const redirectData = {
                path: redirectPath,
                tenantId: null,
              };
              sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
            }
            setLocation('/onboarding');
          } finally {
            checkingTenantsRef.current = false;
          }
        };
        
        checkTenantsForNewUser();
        return;
      }
      
      // If we're still checking tenants, don't proceed
      if (!user && checkingTenantsRef.current) {
        return;
      }
      
      // If backend user still doesn't exist after checking tenants, go to onboarding
      if (!user) {
        logger.info('Firebase user authenticated but no backend user, redirecting to onboarding', {
          component: 'Login',
          action: 'redirect_to_onboarding',
          firebaseUserId: firebaseUser.uid,
        });
        if (redirectPath && isValidProtectedRoute(redirectPath)) {
          const redirectData = {
            path: redirectPath,
            tenantId: null,
          };
          sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
        }
        setLocation('/onboarding');
        return;
      }
      
      // Backend user exists - check for tenant
      if (user.tenantId) {
        // Use redirect path if valid, otherwise go to dashboard
        if (redirectPath && isValidProtectedRoute(redirectPath)) {
          logger.info('User has tenant, redirecting to saved path', {
            component: 'Login',
            action: 'redirect_after_login',
            userId: user.id,
          }, { redirectPath });
          setLocation(redirectPath);
        } else {
          logger.info('User has tenant, redirecting to dashboard', {
            component: 'Login',
            action: 'redirect_after_login',
            userId: user.id,
          }, { redirectPath: redirectPath || 'none' });
          setLocation('/dashboard');
        }
      } else if (!checkingTenantsRef.current) {
        // If user has no tenantId, check if they have tenants
        // This handles Gmail users who may have tenants but no primary tenant set
        checkingTenantsRef.current = true;
        
        const checkAndSetTenant = async () => {
          try {
            logger.info('User has no tenantId, checking for tenants', {
              component: 'Login',
              action: 'check_tenants',
              userId: user.id,
              userEmail: user.email,
            });
            
            const tenants = await getUserTenants();
            
            if (tenants.length === 1) {
              // User has exactly one tenant - set it as primary and auto-select
              const tenant = tenants[0];
              const tenantId = typeof tenant.id === 'number' ? tenant.id : parseInt(String(tenant.id), 10);
              
              logger.info('User has exactly one tenant, setting as primary', {
                component: 'Login',
                action: 'set_primary_tenant',
                tenantId,
                tenantName: tenant.name,
              });
              
              // Set selected tenant in context
              const tenantObj = {
                id: String(tenant.id),
                name: tenant.name,
                email: user.email,
                createdAt: tenant.createdAt || new Date().toISOString(),
              };
              setSelectedTenant(tenantObj);
              
              // Set current user info for API headers
              setCurrentUserInfo(user.email, String(tenant.id));
              
              // Set as primary tenant in backend
              await setPrimaryTenant(tenantId);
              
              // Sync backend user to update context with new tenantId
              if (firebaseUser && syncBackendUser) {
                await syncBackendUser(firebaseUser);
              }
              
              // Redirect to dashboard or saved path
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                logger.info('Redirecting to saved path after setting primary tenant', {
                  component: 'Login',
                  action: 'redirect_after_set_primary',
                }, { redirectPath });
                setLocation(redirectPath);
              } else {
                logger.info('Redirecting to dashboard after setting primary tenant', {
                  component: 'Login',
                  action: 'redirect_after_set_primary',
                });
                setLocation('/dashboard');
              }
            } else if (tenants.length > 1) {
              // User has multiple tenants - go to tenant selection
              logger.info('User has multiple tenants, redirecting to tenant selection', {
                component: 'Login',
                action: 'redirect_to_tenant_selection',
                tenantCount: tenants.length,
              });
              
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                const redirectData = {
                  path: redirectPath,
                  tenantId: null,
                };
                sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
              }
              setLocation('/tenant-selection');
            } else {
              // User has no tenants - go to onboarding
              logger.info('User has no tenants, redirecting to onboarding', {
                component: 'Login',
                action: 'redirect_to_onboarding',
              });
              
              if (redirectPath && isValidProtectedRoute(redirectPath)) {
                const redirectData = {
                  path: redirectPath,
                  tenantId: null,
                };
                sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
              }
              setLocation('/onboarding');
            }
          } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Error checking tenants', err, {
              component: 'Login',
              action: 'check_tenants',
            });
            // On error, fall back to onboarding
            if (redirectPath && isValidProtectedRoute(redirectPath)) {
              const redirectData = {
                path: redirectPath,
                tenantId: null,
              };
              sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
            }
            setLocation('/onboarding');
          } finally {
            checkingTenantsRef.current = false;
          }
        };
        
        checkAndSetTenant();
      }
    }
  }, [firebaseUser, user, authLoading, setLocation, setSelectedTenant, syncBackendUser]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      logger.info('Starting Google sign-in', { component: 'Login', action: 'google_signin' });
      await signInWithGoogle();
      logger.info('Google sign-in successful', { component: 'Login', action: 'google_signin' });
      // AuthContext will handle backend sync and redirect via useEffect
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.exception('Google sign-in failed', err, {
        component: 'Login',
        action: 'google_signin',
      });
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
      logger.info('Starting email/password sign-in', {
        component: 'Login',
        action: 'email_password_login',
        email: data.email,
      });
      await signInWithEmailPassword(data.email, data.password);
      logger.info('Email/password sign-in successful', {
        component: 'Login',
        action: 'email_password_login',
        email: data.email,
      });
      // AuthContext will handle backend sync and redirect via useEffect
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Email/password sign-in failed', err, {
        component: 'Login',
        action: 'email_password_login',
        email: data.email,
      });
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

