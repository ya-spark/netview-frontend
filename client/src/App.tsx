import { Switch, Route, Redirect } from "wouter";
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
  const { user, firebaseUser, selectedTenant, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
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
  const { error, clearError, setError } = useAuth();

  // Set up global error handler for API errors
  useEffect(() => {
    setGlobalErrorHandler((apiError: Error) => {
      console.error('Global API error:', apiError);
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
