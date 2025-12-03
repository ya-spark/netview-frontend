import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, setGlobalErrorHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useEffect } from "react";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
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
  const { user, selectedTenant, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // If user doesn't have a tenant selected, redirect to tenant selection
  if (!selectedTenant || !user.tenantId) {
    return <Redirect to="/tenant-selection" />;
  }

  return <>{children}</>;
}

// Pre-auth routes: accessible to everyone, no redirects
function PreAuthRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

// Public routes: redirect authenticated users (for login/signup)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser, selectedTenant, loading, emailVerification } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't redirect if email verification is pending - AppContent will handle showing verification page
  if (emailVerification && firebaseUser) {
    return <>{children}</>;
  }

  // Redirect if user is authenticated
  if (user || firebaseUser) {
    // If user has a tenant selected, go to dashboard
    if (selectedTenant && user?.tenantId) {
      return <Redirect to="/dashboard" />;
    }
    // Otherwise, go to tenant selection
    return <Redirect to="/tenant-selection" />;
  }

  return <>{children}</>;
}

function TenantSelectionRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
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

      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>

      <Route path="/signup">
        <PublicRoute>
          <SignUp />
        </PublicRoute>
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

function AppContent() {
  const { error, clearError, setError, emailVerification, retryRegistration, firebaseUser, user, selectedTenant } = useAuth();
  const [, setLocation] = useLocation();

  // Set up global error handler for API errors
  useEffect(() => {
    setGlobalErrorHandler((apiError: Error) => {
      // Don't set error if email verification is pending - let verification page handle it
      if (emailVerification && firebaseUser) {
        console.log('📧 Skipping global error handler - email verification in progress');
        return;
      }
      console.error('Global API error:', apiError);
      setError(apiError);
    });
  }, [setError, emailVerification, firebaseUser]);

  // Show email verification page if verification is required
  // This check must come FIRST to prevent error display or routing interference
  if (emailVerification && firebaseUser) {
    // Check if the email is a public email (not a business email)
    if (!isBusinessEmail(emailVerification.email)) {
      return (
        <PublicEmailError email={emailVerification.email} />
      );
    }
    
    // Show verification page for business emails
    return (
      <EmailVerification
        email={emailVerification.email}
        onVerificationSuccess={async () => {
          try {
            const newUser = await retryRegistration();
            console.log('✅ Email verification successful, registration retried');
            
            // Navigate based on user's tenant status
            if (newUser && newUser.tenantId) {
              // User has a tenant, go to dashboard
              console.log('✅ Navigating to dashboard after successful registration');
              setLocation('/dashboard');
            } else {
              // User doesn't have a tenant, go to tenant selection
              console.log('✅ Navigating to tenant selection after successful registration');
              setLocation('/tenant-selection');
            }
          } catch (error: any) {
            console.error('Failed to retry registration:', error);
            // Error will be handled by AuthContext and verification state will remain
          }
        }}
      />
    );
  }

  // Show error display if there's an error (but not if verification is pending)
  if (error && !emailVerification) {
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
