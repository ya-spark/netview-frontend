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
  const { firebaseUser, user, loading: authLoading, setSelectedTenant } = useAuth();
  const checkingTenantsRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const lastProcessedEmailRef = useRef<string | null>(null);
  const hasSetPrimaryTenantRef = useRef(false); // Track if we've already set primary tenant for this Firebase user
  
  // Use sessionStorage as a persistent flag to prevent duplicate tenant checks
  // This survives component remounts and race conditions
  const getTenantCheckKey = (email: string) => `login_tenant_check_${email}`;
  const markTenantCheckComplete = (email: string) => {
    sessionStorage.setItem(getTenantCheckKey(email), 'true');
    hasSetPrimaryTenantRef.current = true;
    hasRedirectedRef.current = true;
  };
  const isTenantCheckComplete = (email: string | null): boolean => {
    if (!email) return false;
    return sessionStorage.getItem(getTenantCheckKey(email)) === 'true' || hasSetPrimaryTenantRef.current || hasRedirectedRef.current;
  };
  const clearTenantCheckFlag = (email: string | null) => {
    if (email) {
      sessionStorage.removeItem(getTenantCheckKey(email));
    }
    hasSetPrimaryTenantRef.current = false;
    hasRedirectedRef.current = false;
  };

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

    // Reset redirect flag if Firebase user changes
    const currentEmail = firebaseUser?.email || null;
    if (currentEmail !== lastProcessedEmailRef.current) {
      clearTenantCheckFlag(lastProcessedEmailRef.current);
      checkingTenantsRef.current = false;
      lastProcessedEmailRef.current = currentEmail;
    }

    // Check if we're on the login page
    const currentPath = window.location.pathname;
    const isOnLoginPage = currentPath === '/login' || currentPath.startsWith('/login?');
    
    // Check sessionStorage only if we're NOT on login page (already redirected)
    // OR if refs indicate we've already processed (to prevent duplicate checks during redirect)
    const sessionStorageKey = currentEmail ? getTenantCheckKey(currentEmail) : null;
    const hasSessionStorageFlag = sessionStorageKey ? sessionStorage.getItem(sessionStorageKey) === 'true' : false;
    
    // If we're on login page, only check refs (not sessionStorage) to allow fresh attempts
    // If we're not on login page, check both sessionStorage and refs
    if (!isOnLoginPage && hasSessionStorageFlag) {
      logger.debug('Skipping tenant check - already processed (sessionStorage, not on login page)', {
        component: 'Login',
        action: 'skip_tenant_check_sessionstorage',
        firebaseEmail: currentEmail,
        currentPath,
        hasSessionStorageFlag,
      });
      return;
    }
    
    // Always check refs regardless of page
    if (hasSetPrimaryTenantRef.current || hasRedirectedRef.current) {
      logger.debug('Skipping tenant check - already processed (refs check)', {
        component: 'Login',
        action: 'skip_tenant_check_refs',
        firebaseEmail: currentEmail,
        hasSetPrimaryTenant: hasSetPrimaryTenantRef.current,
        hasRedirected: hasRedirectedRef.current,
        checkingTenants: checkingTenantsRef.current,
        isOnLoginPage,
      });
      return;
    }
    
    // If we're on login page and sessionStorage has a flag, clear it (stale from previous attempt)
    if (isOnLoginPage && hasSessionStorageFlag) {
      logger.debug('Clearing stale sessionStorage flag - on login page, allowing fresh attempt', {
        component: 'Login',
        action: 'clear_stale_flag_on_login_page',
        firebaseEmail: currentEmail,
      });
      if (sessionStorageKey) {
        sessionStorage.removeItem(sessionStorageKey);
      }
    }


    // If Firebase user is authenticated
    if (firebaseUser) {
      const redirectPath = getRedirectPath();
      
      // If backend user exists and has tenantId, redirect immediately
      if (user?.tenantId) {
        hasRedirectedRef.current = true;
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
        return;
      }
      
      // Wait for backend user sync to complete before checking tenants
      // This prevents 401 errors when trying to check tenants before backend user exists
      if (!user && authLoading) {
        logger.debug('Waiting for backend user sync before checking tenants', {
          component: 'Login',
          action: 'wait_for_backend_sync',
          firebaseEmail: firebaseUser.email,
        });
        return;
      }
      
      // If we're already checking tenants, don't proceed
      if (checkingTenantsRef.current) {
        logger.debug('Skipping tenant check - already in progress', {
          component: 'Login',
          action: 'skip_tenant_check_in_progress',
          firebaseEmail: firebaseUser.email,
        });
        return;
      }
      
      // Final safety check before starting async operation
      // This prevents race conditions where state changes between the useEffect check and async start
      if (hasRedirectedRef.current || hasSetPrimaryTenantRef.current) {
        logger.debug('Skipping tenant check - already redirected or primary tenant set (pre-async check)', {
          component: 'Login',
          action: 'skip_tenant_check_pre_async',
          firebaseEmail: firebaseUser.email,
          hasRedirected: hasRedirectedRef.current,
          hasSetPrimaryTenant: hasSetPrimaryTenantRef.current,
        });
        return;
      }
      
      // Check tenants if user doesn't exist or user exists but has no tenantId
      // This handles both new users and existing users without a primary tenant
      // Set checking flag IMMEDIATELY to prevent concurrent checks
      checkingTenantsRef.current = true;
      
      const checkAndHandleTenants = async () => {
        try {
          // CRITICAL: Check refs IMMEDIATELY at the start of async function
          // This prevents race conditions where useEffect runs again while this function is executing
          if (hasSetPrimaryTenantRef.current || hasRedirectedRef.current) {
            logger.debug('Skipping tenant check - primary tenant already set or redirected (async guard)', {
              component: 'Login',
              action: 'skip_tenant_check_async',
              firebaseEmail: firebaseUser.email,
              hasSetPrimaryTenant: hasSetPrimaryTenantRef.current,
              hasRedirected: hasRedirectedRef.current,
            });
            checkingTenantsRef.current = false;
            return;
          }
          
          // Set checking flag again here as a double-check (in case it was reset somehow)
          checkingTenantsRef.current = true;
          
          // Final check before proceeding - if refs changed while we were waiting, abort
          if (hasSetPrimaryTenantRef.current || hasRedirectedRef.current) {
            logger.debug('Aborting tenant check - state changed before fetch', {
              component: 'Login',
              action: 'abort_tenant_check',
              firebaseEmail: firebaseUser.email,
              hasSetPrimaryTenant: hasSetPrimaryTenantRef.current,
              hasRedirected: hasRedirectedRef.current,
            });
            checkingTenantsRef.current = false;
            return;
          }
          
          const hasBackendUser = !!user;
          logger.info(hasBackendUser ? 'User has no tenantId, checking for tenants' : 'Firebase user authenticated but no backend user yet, checking for tenants', {
            component: 'Login',
            action: hasBackendUser ? 'check_tenants' : 'check_tenants_for_new_user',
            userId: user?.id,
            userEmail: user?.email || firebaseUser.email,
            firebaseUserId: firebaseUser.uid,
          });
          
          const tenants = await getUserTenants();
          
          // Check again after async call (in case primary tenant was set while we were fetching)
          if (hasSetPrimaryTenantRef.current || hasRedirectedRef.current) {
            logger.debug('Skipping tenant processing - primary tenant was set or redirected during fetch', {
              component: 'Login',
              action: 'skip_tenant_processing',
              firebaseEmail: firebaseUser.email,
              hasSetPrimaryTenant: hasSetPrimaryTenantRef.current,
              hasRedirected: hasRedirectedRef.current,
            });
            checkingTenantsRef.current = false;
            return;
          }
          
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
            
            // Mark that we're setting primary tenant IMMEDIATELY to prevent re-checking
            // Use sessionStorage for persistence across remounts and race conditions
            // This must be set before calling setPrimaryTenant, which triggers auth state changes
            markTenantCheckComplete(firebaseUser.email);
            
            // Set selected tenant in context
            const tenantObj = {
              id: String(tenant.id),
              name: tenant.name,
              email: user?.email || firebaseUser.email || '',
              createdAt: tenant.createdAt || new Date().toISOString(),
            };
            setSelectedTenant(tenantObj);
            
            // Set current user info for API headers
            setCurrentUserInfo(user?.email || firebaseUser.email || '', String(tenant.id));
            
            // Set as primary tenant in backend
            // AuthContext will automatically sync when Firebase auth state changes
            await setPrimaryTenant(tenantId);
            
            // Redirect to dashboard or saved path
            // Note: AuthContext will sync backend user automatically after setPrimaryTenant
            // triggers Firebase auth state change, so we don't need to call syncBackendUser here
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
            hasRedirectedRef.current = true;
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
            hasRedirectedRef.current = true;
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
          
          // Handle 401 errors gracefully - backend user might not be synced yet
          // Don't redirect on 401 - let the backend sync complete and try again
          const isUnauthorized = err instanceof Error && (err.message?.includes('Unauthorized') || err.message?.includes('401'));
          if (isUnauthorized) {
            logger.debug('Unauthorized error checking tenants - backend user may not be synced yet, will retry after sync', {
              component: 'Login',
              action: 'check_tenants_unauthorized',
              firebaseEmail: firebaseUser.email,
              hasBackendUser: !!user,
            });
            // Reset checking flag so useEffect can retry after backend sync completes
            checkingTenantsRef.current = false;
            return;
          }
          
          logger.error('Error checking tenants', err, {
            component: 'Login',
            action: 'check_tenants',
          });
          // On other errors, fall back to onboarding
          hasRedirectedRef.current = true;
          const redirectPath = getRedirectPath();
          if (redirectPath && isValidProtectedRoute(redirectPath)) {
            const redirectData = {
              path: redirectPath,
              tenantId: null,
            };
            sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
          }
          setLocation('/onboarding');
        } finally {
          // Don't reset checkingTenantsRef if we've set primary tenant
          // This prevents the useEffect from running again after setPrimaryTenant triggers auth state changes
          if (!hasSetPrimaryTenantRef.current) {
            checkingTenantsRef.current = false;
          }
        }
      };
      
      checkAndHandleTenants();
    }
  }, [firebaseUser, user, authLoading, setLocation]);

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

