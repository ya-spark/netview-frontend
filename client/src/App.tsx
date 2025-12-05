import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, setGlobalErrorHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useEffect } from "react";
import { logger } from "@/lib/logger";
import Landing from "@/pages/Landing";
import SignUp from "@/pages/SignUp";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import EmailVerification from "@/pages/EmailVerification";
import PublicEmailError from "@/pages/PublicEmailError";
import TenantSelection from "@/pages/TenantSelection";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import Docs from "@/pages/docs/index";
import Dashboard from "@/pages/Dashboard";
import Manage from "@/pages/Manage";
import Monitor from "@/pages/Monitor";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Billing from "@/pages/Billing";
import Collaborators from "@/pages/Collaborators";
import NotFound from "@/pages/not-found";
import { isBusinessEmail } from "@/utils/emailValidation";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, selectedTenant, loading, emailVerification } = useAuth();

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
    return <Redirect to="/signup" />;
  }

  // If user doesn't have a tenant selected, redirect to tenant selection
  if (!selectedTenant || !user.tenantId) {
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

  // If Firebase user is authenticated
  if (firebaseUser) {
    // If backend user exists with tenant, go to dashboard
    if (user?.tenantId) {
      return <Redirect to="/dashboard" />;
    }
    // If backend user exists without tenant, go to onboarding
    if (user) {
      return <Redirect to="/onboarding" />;
    }
    // If Firebase user but no backend user, go to onboarding
    return <Redirect to="/onboarding" />;
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

      <Route path="/onboarding">
        <OnboardingRoute>
          <Onboarding />
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

      <Route path="/manage">
        <ProtectedRoute>
          <Manage />
        </ProtectedRoute>
      </Route>

      <Route path="/monitor">
        <ProtectedRoute>
          <Monitor />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route path="/billing">
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      </Route>

      <Route path="/collaborators">
        <ProtectedRoute>
          <Collaborators />
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

  // Set up global error handler for API errors
  useEffect(() => {
    setGlobalErrorHandler((apiError: Error) => {
      logger.error('Global API error', apiError, { component: 'AppContent' });
      setError(apiError);
    });
  }, [setError]);

  // Show error display if there's an error
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
