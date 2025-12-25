import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, setGlobalErrorHandler, ApiError } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect, lazy, Suspense } from "react";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import Landing from "@/pages/Landing";
import SignUp from "@/pages/SignUp";
import Login from "@/pages/Login";
import Entry from "@/pages/Entry";
import ForgotPassword from "@/pages/ForgotPassword";
import OnboardingRouter from "@/pages/onboarding/OnboardingRouter";
import VerifyEmail from "@/pages/onboarding/VerifyEmail";
import Invites from "@/pages/onboarding/Invites";
import SelectTenant from "@/pages/onboarding/SelectTenant";
import EmailVerification from "@/pages/EmailVerification";
import PublicEmailError from "@/pages/PublicEmailError";
import UserDetails from "@/pages/UserDetails";
import TenantSelection from "@/pages/TenantSelection";
import TenantCreated from "@/pages/TenantCreated";
import ScopeSettings from "@/pages/ScopeSettings";
import LoggedOut from "@/pages/LoggedOut";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import Docs from "@/pages/docs/index";
import Dashboard from "@/pages/Dashboard";
import Manage from "@/pages/Manage";
import CreateProbe from "@/pages/CreateProbe";
import ProbeStatus from "@/pages/ProbeStatus";
import ResourceGroups from "@/pages/ResourceGroups";
import ProbeGroups from "@/pages/ProbeGroups";
import Monitor from "@/pages/Monitor";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
const Billing = lazy(() => import("@/pages/Billing"));
import Users from "@/pages/Users";
import ApiKeys from "@/pages/ApiKeys";
import AcceptInvitation from "@/pages/AcceptInvitation";
import NotFound from "@/pages/not-found";
import { isBusinessEmail } from "@/utils/emailValidation";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, selectedTenant, loading, emailVerification } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!loading) {
      logger.debug('ProtectedRoute check', {
        component: 'App',
        action: 'protected_route_check',
        location,
        hasUser: !!user,
        hasSelectedTenant: !!selectedTenant,
        hasEmailVerification: !!emailVerification,
      });
    }
  }, [loading, location, user, selectedTenant, emailVerification]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check if email verification is pending - block access to protected routes
  if (emailVerification) {
    // Check if the email is a public email (not a business email)
    if (!isBusinessEmail(emailVerification.email)) {
      logger.info('Redirecting to public email error page', {
        component: 'App',
        action: 'protected_route_redirect',
        reason: 'public_email',
        email: emailVerification.email,
        location,
      });
      // Redirect to public email error page
      return <Redirect to="/public-email-error" />;
    } else {
      logger.info('Redirecting to email verification page', {
        component: 'App',
        action: 'protected_route_redirect',
        reason: 'email_verification_pending',
        email: emailVerification.email,
        location,
      });
      // Redirect to email verification page for business emails
      return <Redirect to="/email-verification" />;
    }
  }

  if (!user) {
    logger.info('User not authenticated, redirecting to login', {
      component: 'App',
      action: 'protected_route_redirect',
      reason: 'not_authenticated',
      location,
    });
    // Redirect to login with current path preserved
    const loginUrl = `/login?redirect=${encodeURIComponent(location)}`;
    return <Redirect to={loginUrl} />;
  }

  // If user doesn't have firstName set, redirect to settings to complete profile
  if (!user.firstName || !user.firstName.trim()) {
    logger.info('User missing firstName, redirecting to settings', {
      component: 'App',
      action: 'protected_route_redirect',
      reason: 'missing_firstname',
      location,
      userId: user.id,
    });
    return <Redirect to="/settings" />;
  }

  // If user doesn't have a tenant selected, redirect to tenant selection
  // Check selectedTenant first (session state), then user.tenantId (backend state)
  // selectedTenant might be set before user.tenantId is updated, so we allow access if either exists
  if (!selectedTenant && !user.tenantId) {
    logger.info('User missing tenant, redirecting to tenant selection', {
      component: 'App',
      action: 'protected_route_redirect',
      reason: 'missing_tenant',
      location,
      userId: user.id,
      hasSelectedTenant: !!selectedTenant,
      hasUserTenantId: !!user.tenantId,
    });
    // Save current location and tenant ID to sessionStorage for redirect after tenant selection
    if (location && location !== '/tenant-selection') {
      const isValidProtectedRoute = (path: string): boolean => {
        const protectedRoutes = [
          '/dashboard',
          '/manage',
          '/monitor',
          '/reports',
          '/settings',
          '/billing',
          '/users',
        ];
        return protectedRoutes.some(route => path.startsWith(route));
      };
      
      if (isValidProtectedRoute(location)) {
        // Store redirect path and tenant ID (if available from user.tenantId or selectedTenant)
        const tenantId = user.tenantId || selectedTenant?.id || null;
        const redirectData = {
          path: location,
          tenantId: tenantId,
        };
        sessionStorage.setItem('loginRedirect', JSON.stringify(redirectData));
      }
    }
    return <Redirect to="/tenant-selection" />;
  }

  return <>{children}</>;
}

// Pre-auth routes: accessible to everyone, no redirects
// These pages should load immediately without waiting for auth state
function PreAuthRoute({ children }: { children: React.ReactNode }) {
  // Don't wait for loading - public pages should be accessible immediately
  return <>{children}</>;
}

// Auth routes: redirect authenticated users (for signup)
// Only check auth when user tries to access these pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, emailVerification, loading } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!loading) {
      logger.debug('PublicRoute check', {
        component: 'App',
        action: 'public_route_check',
        location,
        hasUser: !!user,
        hasEmailVerification: !!emailVerification,
      });
    }
  }, [loading, location, user, emailVerification]);

  // Don't redirect while loading - wait for auth state to settle
  if (loading) {
    return <>{children}</>;
  }

  // Don't redirect if email verification is pending - let user complete verification
  if (emailVerification) {
    return <>{children}</>;
  }

  // Only redirect if backend user is set
  // This ensures we have complete user data before redirecting
  if (user) {
    // If user has a tenant, go to dashboard
    if (user.tenantId) {
      logger.info('Authenticated user with tenant, redirecting to dashboard', {
        component: 'App',
        action: 'public_route_redirect',
        reason: 'authenticated_with_tenant',
        location,
        userId: user.id,
        tenantId: user.tenantId,
      });
      return <Redirect to="/dashboard" />;
    }
    // Otherwise, go to tenant selection
    logger.info('Authenticated user without tenant, redirecting to tenant selection', {
      component: 'App',
      action: 'public_route_redirect',
      reason: 'authenticated_no_tenant',
      location,
      userId: user.id,
    });
    return <Redirect to="/tenant-selection" />;
  }

  return <>{children}</>;
}

// Login route: redirect authenticated users
function LoginRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();

  // Don't redirect while loading
  if (loading) {
    return <>{children}</>;
  }

  // If Firebase user is authenticated, let Login component handle redirect
  // (it will check for redirect parameter and sessionStorage)
  if (firebaseUser) {
    // If backend user exists with tenant, Login component will handle redirect
    // If no tenant, Login component will save redirect to sessionStorage and go to onboarding
    // So we just let Login component handle everything
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Entry route: requires Firebase auth only (not backend user)
function EntryRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      logger.debug('EntryRoute check', {
        component: 'App',
        action: 'entry_route_check',
        hasFirebaseUser: !!firebaseUser,
      });
    }
  }, [loading, firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!firebaseUser) {
    logger.info('No Firebase user, redirecting to login from entry route', {
      component: 'App',
      action: 'entry_route_redirect',
      reason: 'not_authenticated',
    });
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Onboarding route: requires Firebase auth, redirects if tenant exists
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();

  // Don't redirect while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!firebaseUser) {
    return <Redirect to="/login" />;
  }

  // Redirect to dashboard if tenant exists
  if (user?.tenantId) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function TenantSelectionRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerification } = useAuth();

  useEffect(() => {
    if (!loading) {
      logger.debug('TenantSelectionRoute check', {
        component: 'App',
        action: 'tenant_selection_route_check',
        hasUser: !!user,
        hasEmailVerification: !!emailVerification,
      });
    }
  }, [loading, user, emailVerification]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check if email verification is pending - block access
  if (emailVerification) {
    // Check if the email is a public email (not a business email)
    if (!isBusinessEmail(emailVerification.email)) {
      logger.info('Redirecting to public email error from tenant selection route', {
        component: 'App',
        action: 'tenant_selection_route_redirect',
        reason: 'public_email',
        email: emailVerification.email,
      });
      // Redirect to public email error page
      return <Redirect to="/public-email-error" />;
    } else {
      logger.info('Redirecting to email verification from tenant selection route', {
        component: 'App',
        action: 'tenant_selection_route_redirect',
        reason: 'email_verification_pending',
        email: emailVerification.email,
      });
      // Redirect to email verification page for business emails
      return <Redirect to="/email-verification" />;
    }
  }

  // Redirect to signup if not authenticated
  if (!user) {
    logger.info('User not authenticated, redirecting to signup from tenant selection route', {
      component: 'App',
      action: 'tenant_selection_route_redirect',
      reason: 'not_authenticated',
    });
    return <Redirect to="/signup" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PreAuthRoute>
          <Landing />
        </PreAuthRoute>
      </Route>

      <Route path="/signup">
        <PublicRoute>
          <SignUp />
        </PublicRoute>
      </Route>

      <Route path="/login">
        <LoginRoute>
          <Login />
        </LoginRoute>
      </Route>

      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      </Route>

      <Route path="/entry">
        <EntryRoute>
          <Entry />
        </EntryRoute>
      </Route>

      <Route path="/logged-out">
        <PreAuthRoute>
          <LoggedOut />
        </PreAuthRoute>
      </Route>

      <Route path="/onboarding">
        <OnboardingRoute>
          <OnboardingRouter />
        </OnboardingRoute>
      </Route>

      <Route path="/onboarding/verify-email">
        <OnboardingRoute>
          <VerifyEmail />
        </OnboardingRoute>
      </Route>

      <Route path="/onboarding/invites">
        <OnboardingRoute>
          <Invites />
        </OnboardingRoute>
      </Route>

      <Route path="/onboarding/select-tenant">
        <OnboardingRoute>
          <SelectTenant />
        </OnboardingRoute>
      </Route>

      <Route path="/public-email-error">
        <PreAuthRoute>
          <PublicEmailErrorRoute />
        </PreAuthRoute>
      </Route>

      <Route path="/email-verification">
        <PreAuthRoute>
          <EmailVerificationRoute />
        </PreAuthRoute>
      </Route>

      <Route path="/user-details">
        <PreAuthRoute>
          <UserDetails />
        </PreAuthRoute>
      </Route>

      <Route path="/accept-invitation">
        <PreAuthRoute>
          <AcceptInvitation />
        </PreAuthRoute>
      </Route>

      <Route path="/tenant-selection">
        <TenantSelectionRoute>
          <TenantSelection />
        </TenantSelectionRoute>
      </Route>

      <Route path="/tenant-created">
        <ProtectedRoute>
          <TenantCreated />
        </ProtectedRoute>
      </Route>

      <Route path="/scope-settings">
        <ProtectedRoute>
          <ScopeSettings />
        </ProtectedRoute>
      </Route>

      <Route path="/features">
        <PreAuthRoute>
          <Features />
        </PreAuthRoute>
      </Route>

      <Route path="/pricing">
        <PreAuthRoute>
          <Pricing />
        </PreAuthRoute>
      </Route>

      <Route path="/docs">
        <PreAuthRoute>
          <Docs />
        </PreAuthRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/probes/create">
        <ProtectedRoute>
          <CreateProbe />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/probes/status/:probeId">
        <ProtectedRoute>
          <ProbeStatus />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/probes/:probeId?">
        <ProtectedRoute>
          <Manage />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/gateways/:gatewayId?">
        <ProtectedRoute>
          <Manage />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/notifications/:notificationId?">
        <ProtectedRoute>
          <Manage />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/resource-groups/:groupId?">
        <ProtectedRoute>
          <ResourceGroups />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/probe-groups/:groupId?">
        <ProtectedRoute>
          <ProbeGroups />
        </ProtectedRoute>
      </Route>

      <Route path="/manage">
        <ProtectedRoute>
          <Manage />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/billing">
        <ProtectedRoute>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          }>
            <Billing />
          </Suspense>
        </ProtectedRoute>
      </Route>

      <Route path="/manage/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>

      <Route path="/manage/api-keys">
        <ProtectedRoute>
          <ApiKeys />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/overview">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/alerts/:alertId?">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/probes/:probeId?">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/gateways/:gatewayId?">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/map">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor/logs">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor">
        <ProtectedRoute>
          <Redirect to="/monitor/overview" />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Redirect to="/manage/settings" />
        </ProtectedRoute>
      </Route>

      <Route path="/billing">
        <ProtectedRoute>
          <Redirect to="/manage/billing" />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <Redirect to="/manage/users" />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// Component to handle PublicEmailError route
function PublicEmailErrorRoute() {
  const { emailVerification } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to signup if no email verification state
  useEffect(() => {
    if (!emailVerification) {
      setLocation('/signup');
    }
  }, [emailVerification, setLocation]);

  if (!emailVerification) {
    return null;
  }

  return <PublicEmailError email={emailVerification.email} />;
}

// Component to handle EmailVerification route
function EmailVerificationRoute() {
  const { emailVerification } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to entry if no email verification state
  useEffect(() => {
    if (!emailVerification) {
      setLocation('/entry');
      return;
    }
    if (!isBusinessEmail(emailVerification.email)) {
      setLocation('/public-email-error');
    }
  }, [emailVerification, setLocation]);

  if (!emailVerification || !isBusinessEmail(emailVerification.email)) {
    return null;
  }

  return (
    <EmailVerification
      email={emailVerification.email}
      onVerificationSuccess={() => {
        // onVerificationSuccess is handled inside EmailVerification component
        // It will route to the next step automatically
      }}
    />
  );
}

function AppContent() {
  const { clearError } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Set up global error handler for API errors
  useEffect(() => {
    setGlobalErrorHandler((apiError: Error) => {
      logger.error('Global API error', apiError, { component: 'AppContent' });
      
      // For 401 errors, redirect to login with current path preserved
      if (apiError instanceof ApiError && apiError.status === 401) {
        logger.info('401 error detected, redirecting to login', {
          component: 'AppContent',
          action: 'handle_401_error',
          currentPath: location,
        });
        const loginUrl = `/login?redirect=${encodeURIComponent(location)}`;
        setLocation(loginUrl);
        clearError(); // Clear error state
        return;
      }
      
      // Show error in toast notification instead of navigating to error page
      const errorMessage = apiError instanceof ApiError 
        ? apiError.message 
        : apiError.message || 'An unexpected error occurred';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      clearError(); // Clear error state after showing toast
    });
  }, [location, setLocation, clearError, toast]);

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
