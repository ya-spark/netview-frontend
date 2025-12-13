import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, getUserTenants } from '@/services/authApi';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

/**
 * Onboarding Router - Smart entry point that determines where user should go
 * 
 * Flow:
 * 1. Check if user exists in backend
 * 2. If 404/403 EMAIL_NOT_VERIFIED → /onboarding/verify-email
 * 3. If 200 → Check if user has tenants:
 *    - If has tenants → /onboarding/select-tenant
 *    - If no tenants → /onboarding/invites
 */
export default function OnboardingRouter() {
  const [, setLocation] = useLocation();
  const { firebaseUser, loading: authLoading, selectedTenant, setSelectedTenant, syncBackendUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) {
      return;
    }

    const checkUserStatus = async () => {
      try {
        setChecking(true);
        logger.info('Checking user status for onboarding', {
          component: 'OnboardingRouter',
          email: firebaseUser.email,
        });

        // FIRST: Check Firebase email verification status before calling backend
        // The backend /api/auth/me endpoint doesn't check email verification,
        // so we need to check it here to ensure proper workflow
        const isEmailVerified = firebaseUser.emailVerified || false;
        const isGoogleSignIn = firebaseUser.providerData?.some(
          (provider: any) => provider.providerId === 'google.com'
        ) || false;

        // If email not verified and not Google sign-in, redirect to verification
        if (!isEmailVerified && !isGoogleSignIn) {
          logger.info('Email not verified in Firebase, redirecting to verify-email', {
            component: 'OnboardingRouter',
            email: firebaseUser.email,
            emailVerified: isEmailVerified,
            isGoogleSignIn,
          });
          setLocation('/onboarding/verify-email');
          return;
        }

        // SECOND: Check if user exists in backend (only if email is verified or Google sign-in)
        const user = await getCurrentUser();
        
        logger.info('User exists in backend, checking for tenants', {
          component: 'OnboardingRouter',
          userId: user.id,
          hasTenant: !!user.tenantId,
        });

        // THIRD: Check if user has tenants
        // If user already has a selected tenant, go directly to dashboard
        if (selectedTenant) {
          // Check for saved redirect data from login
          let redirectData: { path: string | null; tenantId: string | null } = { path: null, tenantId: null };
          try {
            const saved = sessionStorage.getItem('loginRedirect');
            if (saved) {
              const data = JSON.parse(saved);
              redirectData = {
                path: data.path || null,
                tenantId: data.tenantId || null,
              };
            } else if (saved && !saved.startsWith('{')) {
              // Legacy format (just a string path)
              redirectData = { path: saved, tenantId: null };
            }
          } catch (error) {
            // If parsing fails, try legacy format
            const saved = sessionStorage.getItem('loginRedirect');
            if (saved && !saved.startsWith('{')) {
              redirectData = { path: saved, tenantId: null };
            }
          }
          
          const isValidProtectedRoute = (path: string | null): boolean => {
            if (!path) return false;
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
          
          if (redirectData.path && isValidProtectedRoute(redirectData.path)) {
            sessionStorage.removeItem('loginRedirect'); // Clear after use
            logger.info('User has selected tenant, redirecting to saved path', {
              component: 'OnboardingRouter',
              tenantName: selectedTenant.name,
            }, { redirectPath: redirectData.path });
            setLocation(redirectData.path);
          } else {
            logger.info('User has selected tenant, redirecting to dashboard', {
              component: 'OnboardingRouter',
              tenantName: selectedTenant.name,
            });
            setLocation('/dashboard');
          }
          return;
        }

        // Check if user has any tenants
        try {
          const tenants = await getUserTenants();
          const hasTenants = Array.isArray(tenants) && tenants.length > 0;
          
          logger.info('User tenants check completed', {
            component: 'OnboardingRouter',
            tenantCount: tenants.length,
            hasTenants,
          });

          if (hasTenants) {
            // User has tenants - redirect to tenant selection
            // SelectTenant component will handle auto-selection if single tenant
            logger.info('User has tenants, redirecting to select-tenant', {
              component: 'OnboardingRouter',
              tenantCount: tenants.length,
            });
            setLocation('/onboarding/select-tenant');
          } else {
            // User has no tenants - check for pending invitations
            logger.info('User has no tenants, redirecting to invites', {
              component: 'OnboardingRouter',
            });
            setLocation('/onboarding/invites');
          }
        } catch (tenantsError: any) {
          // If getting tenants fails, still redirect to invites as fallback
          logger.warn('Failed to fetch user tenants, redirecting to invites as fallback', {
            component: 'OnboardingRouter',
          }, tenantsError instanceof Error ? tenantsError : new Error(String(tenantsError)));
          setLocation('/onboarding/invites');
        }
      } catch (error: any) {
        const isNotFound = error.status === 404;
        const isEmailNotVerified = error.status === 403 && error.code === 'EMAIL_NOT_VERIFIED';

        if (isNotFound || isEmailNotVerified) {
          // Check if user signed in with Google (skip email verification)
          const isGoogleSignIn = firebaseUser.providerData?.some(
            (provider: any) => provider.providerId === 'google.com'
          ) || false;
          
          if (isGoogleSignIn) {
            logger.info('Google sign-in user, skipping email verification, going to invites', {
              component: 'OnboardingRouter',
            });
            setLocation('/onboarding/invites');
          } else {
            logger.info('User does not exist or email not verified, redirecting to email verification', {
              component: 'OnboardingRouter',
              isNotFound,
              isEmailNotVerified,
            });
            setLocation('/onboarding/verify-email');
          }
        } else {
          logger.error('Error checking user status', error instanceof Error ? error : new Error(String(error)), {
            component: 'OnboardingRouter',
          });
          // On error, still redirect to verify-email as safe fallback
          setLocation('/onboarding/verify-email');
        }
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [firebaseUser, authLoading, setLocation, selectedTenant, setSelectedTenant, syncBackendUser]);

  if (checking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    );
  }

  return null;
}
