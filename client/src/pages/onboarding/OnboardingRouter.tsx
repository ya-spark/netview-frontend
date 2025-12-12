import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/services/authApi';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

/**
 * Onboarding Router - Smart entry point that determines where user should go
 * 
 * Flow:
 * 1. Check if user exists in backend
 * 2. If 404/403 EMAIL_NOT_VERIFIED → /onboarding/verify-email
 * 3. If 200 → Check for invites → /onboarding/invites or /onboarding/select-tenant
 */
export default function OnboardingRouter() {
  const [, setLocation] = useLocation();
  const { firebaseUser, loading: authLoading } = useAuth();
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
        
        logger.info('User exists in backend, redirecting to invites check', {
          component: 'OnboardingRouter',
          userId: user.id,
          hasTenant: !!user.tenantId,
        });

        // User exists - check for invites
        setLocation('/onboarding/invites');
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
  }, [firebaseUser, authLoading, setLocation]);

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
