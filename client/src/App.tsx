import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, setGlobalErrorHandler, ApiError } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useEffect, lazy, Suspense } from "react";
import { logger } from "@/lib/logger";
import Landing from "@/pages/Landing";
import SignUp from "@/pages/SignUp";
import Login from "@/pages/Login";
import OnboardingRouter from "@/pages/onboarding/OnboardingRouter";
import VerifyEmail from "@/pages/onboarding/VerifyEmail";
import Invites from "@/pages/onboarding/Invites";
import SelectTenant from "@/pages/onboarding/SelectTenant";
import EmailVerification from "@/pages/EmailVerification";
import PublicEmailError from "@/pages/PublicEmailError";
import TenantSelection from "@/pages/TenantSelection";
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
import Collaborators from "@/pages/Collaborators";
import AcceptInvitation from "@/pages/AcceptInvitation";
import NotFound from "@/pages/not-found";
import { isBusinessEmail } from "@/utils/emailValidation";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, selectedTenant, loading, emailVerification } = useAuth();
  const [location] = useLocation();

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
      // Redirect to public email error page
      return <Redirect to="/public-email-error" />;
    } else {
      // Redirect to email verification page for business emails
      return <Redirect to="/email-verification" />;
    }
  }

  if (!user) {
    // Redirect to login with current path preserved
    const loginUrl = `/login?redirect=${encodeURIComponent(location)}`;
    return <Redirect to={loginUrl} />;
  }

  // If user doesn't have firstName set, redirect to settings to complete profile
  if (!user.firstName || !user.firstName.trim()) {
    return <Redirect to="/settings" />;
  }

  // If user doesn't have a tenant selected, redirect to tenant selection
  // Preserve current location and tenant ID so we can redirect back after tenant selection
  if (!selectedTenant || !user.tenantId) {
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
          '/collaborators',
        ];
        return protectedRoutes.some(route => path.startsWith(route));
      };
      
      if (isValidProtectedRoute(location)) {
        // Store redirect path and tenant ID (if available from user.tenantId)
        const redirectData = {
          path: location,
          tenantId: user.tenantId || null,
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
      return <Redirect to="/dashboard" />;
    }
    // Otherwise, go to tenant selection
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
      // Redirect to public email error page
      return <Redirect to="/public-email-error" />;
    } else {
      // Redirect to email verification page for business emails
      return <Redirect to="/email-verification" />;
    }
  }

  // Redirect to signup if not authenticated
  if (!user) {
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

      <Route path="/manage/collaborators">
        <ProtectedRoute>
          <Collaborators />
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

      <Route path="/collaborators">
        <ProtectedRoute>
          <Redirect to="/manage/collaborators" />
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
  const { emailVerification, retryRegistration } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to signup if no email verification state or if email is not a business email
  useEffect(() => {
    if (!emailVerification) {
      setLocation('/signup');
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
      onVerificationSuccess={async () => {
        try {
          const newUser = await retryRegistration();
          logger.info('Email verification successful, registration retried', {
            component: 'App',
            action: 'email_verification_success',
            userId: newUser?.id,
          });
          
          // Always go to tenant selection after verification
          // User may not have tenant info if they're new, or tenant may not have been created
          // Tenant selection page allows user to create a tenant if needed
          logger.info('Navigating to tenant selection after successful email verification', {
            component: 'App',
            action: 'navigate_after_verification',
            userId: newUser?.id,
          });
          setLocation('/tenant-selection');
        } catch (error: any) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Failed to retry registration', err, {
            component: 'App',
            action: 'email_verification_success',
          });
          // Error will be handled by AuthContext and verification state will remain
        }
      }}
    />
  );
}

function AppContent() {
  const { error, clearError, setError } = useAuth();
  const [location, setLocation] = useLocation();

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
        clearError(); // Clear error to prevent ErrorDisplay from showing
        return;
      }
      
      setError(apiError);
    });
  }, [setError, location, setLocation, clearError]);

  // Show error display if there's an error (but not for 401s which are handled above)
  if (error) {
    return <ErrorDisplay error={error} onDismiss={clearError} />;
  }

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
