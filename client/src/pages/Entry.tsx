import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/services/authApi';
import { logger } from '@/lib/logger';
import { setCurrentUserInfo } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Entry() {
  const [location, setLocation] = useLocation();
  const { firebaseUser, user, setSelectedTenant, setEmailVerification, selectedTenant, syncBackendUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progressMessage, setProgressMessage] = useState('Initializing...');
  const [progressValue, setProgressValue] = useState(0);
  const hasCheckedRef = useRef(false);

  // Sequential check function - all logic is sequential
  const checkUserStatus = async () => {
    // Only run if on /entry route
    if (location !== '/entry') {
      return;
    }

    // Prevent multiple checks
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;
    setLoading(true);
    setProgressValue(0);
    setProgressMessage('Checking authentication...');

    try {
      // Step 1: Check if authenticated
      setProgressValue(10);
      setProgressMessage('Checking authentication...');
      if (!firebaseUser) {
        logger.info('No Firebase user, redirecting to login', {
          component: 'Entry',
          action: 'redirect_to_login',
        });
        setLocation('/login');
        return;
      }

      // Step 2: Fetch user data first to determine what we need to do
      setProgressValue(20);
      setProgressMessage('Fetching user data...');
      logger.info('Checking user status on entry page', {
        component: 'Entry',
        action: 'check_user_status',
        email: firebaseUser.email,
      });

      const userData = await getCurrentUser();

      // Step 3: Ensure user is synced in AuthContext
      setProgressValue(30);
      setProgressMessage('Syncing user context...');
      if (!user && firebaseUser) {
        logger.info('User not synced yet, syncing backend user', {
          component: 'Entry',
          action: 'sync_user',
          email: firebaseUser.email,
        });
        await syncBackendUser(firebaseUser);
        logger.info('User synced successfully', {
          component: 'Entry',
          action: 'sync_user_complete',
          email: firebaseUser.email,
        });
      } else if (user) {
        logger.debug('User already synced, skipping sync', {
          component: 'Entry',
          action: 'sync_user_skip',
          userId: user.id,
          email: user.email,
        });
      }

      // Step 4: Check completion status
      setProgressValue(40);
      setProgressMessage('Checking completion status...');
      const isEmailVerified = userData.emailVerified;
      const hasUserDetails = userData.hasUserDetails || userData.signInProvider !== 'password';
      const tenants = userData.tenants || [];
      const hasTenant = tenants.length > 0;

      logger.info('User status check complete', {
        component: 'Entry',
        action: 'status_check',
        emailVerified: isEmailVerified,
        hasUserDetails,
        hasTenant,
        tenantCount: tenants.length,
      });

      // Step 5: Route based on completion status
      if (isEmailVerified && hasUserDetails && hasTenant) {
        if (tenants.length === 1) {
          // Single tenant - auto-select and route to dashboard
          const tenant = tenants[0];
          const tenantId = String(tenant.id);
          const tenantObj = {
            id: tenantId,
            name: tenant.name,
            email: userData.email,
            createdAt: tenant.created_at || new Date().toISOString(),
          };
          
          // Set all states sequentially
          setProgressValue(50);
          setProgressMessage('Setting tenant context...');
          logger.info('Setting tenant and user info', {
            component: 'Entry',
            action: 'set_tenant_state',
            tenantIdStr: tenantId,
            tenantName: tenant.name,
            email: userData.email,
          });
          
          // Set in queryClient first
          setCurrentUserInfo(userData.email, tenantId);
          
          setProgressValue(60);
          setProgressMessage('Saving tenant to storage...');
          // Save to localStorage explicitly to ensure it's available immediately
          localStorage.setItem('selectedTenant', JSON.stringify({
            id: tenantId,
            name: tenant.name,
            email: userData.email,
            createdAt: tenant.created_at || new Date().toISOString(),
          }));
          
          logger.info('Tenant saved to localStorage', {
            component: 'Entry',
            action: 'tenant_saved_to_localStorage',
            tenantIdStr: tenantId,
          });
          
          setProgressValue(70);
          setProgressMessage('Updating authentication context...');
          // Set in AuthContext (this also saves to localStorage, but we already did it above)
          // This will trigger useEffect, but flag should prevent early redirect
          setSelectedTenant(tenantObj);
          
          logger.info('Tenant set in AuthContext', {
            component: 'Entry',
            action: 'tenant_set_in_auth_context',
            tenantIdStr: tenantId,
          });
          
          // Ensure user is synced with tenant info
          if (firebaseUser && syncBackendUser) {
            setProgressValue(80);
            setProgressMessage('Syncing user with tenant info...');
            logger.info('Syncing user with tenant info', {
              component: 'Entry',
              action: 'sync_user_with_tenant',
              tenantIdStr: tenantId,
            });
            await syncBackendUser(firebaseUser);
            logger.info('User synced with tenant info', {
              component: 'Entry',
              action: 'sync_user_with_tenant_complete',
              tenantIdStr: tenantId,
            });
          }
          
          setProgressValue(90);
          setProgressMessage('Finalizing setup...');
          // Wait 2 seconds to ensure all state is set before redirecting
          logger.info('Waiting 2 seconds before redirecting to ensure state is set', {
            component: 'Entry',
            action: 'wait_before_redirect',
            tenantIdStr: tenantId,
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          setProgressValue(100);
          setProgressMessage('Redirecting to dashboard...');
          logger.info('All checks complete, routing to dashboard', {
            component: 'Entry',
            action: 'route_to_dashboard',
            tenantIdStr: tenantId,
            tenantName: tenant.name,
          });
          
          setLocation('/dashboard');
          return;
        } else {
          // Multiple tenants - route to tenant selection
          setProgressValue(100);
          setProgressMessage('Redirecting to tenant selection...');
          logger.info('Multiple tenants, routing to tenant selection', {
            component: 'Entry',
            action: 'route_to_tenant_selection',
            tenantCount: tenants.length,
          });
          
          setLocation('/tenant-selection');
          return;
        }
      }

      // Step 6: Route to first needed step
      if (!isEmailVerified) {
        // Set email verification state
        setProgressValue(50);
        setProgressMessage('Setting email verification context...');
        if (setEmailVerification && firebaseUser?.email) {
          logger.info('Setting email verification state', {
            component: 'Entry',
            action: 'set_email_verification_state',
            email: firebaseUser.email,
            firstName: userData.firstName || 'User',
          });
          setEmailVerification({
            email: firebaseUser.email,
            firstName: userData.firstName || 'User',
            lastName: userData.lastName || '',
          });
          // Wait for state to propagate
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.info('Email verification state set, waiting complete', {
            component: 'Entry',
            action: 'email_verification_state_set',
          });
        }
        
        setProgressValue(100);
        setProgressMessage('Redirecting to email verification...');
        logger.info('Email not verified, routing to email verification', {
          component: 'Entry',
          action: 'route_to_email_verification',
        });
        
        setLocation('/email-verification');
      } else if (!hasUserDetails) {
        // Ensure user is synced before redirecting
        setProgressValue(50);
        setProgressMessage('Syncing user context...');
        if (firebaseUser && syncBackendUser && !user) {
          logger.info('Syncing user before routing to user details', {
            component: 'Entry',
            action: 'sync_user_before_user_details',
            email: firebaseUser.email,
          });
          await syncBackendUser(firebaseUser);
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.info('User synced, ready to route to user details', {
            component: 'Entry',
            action: 'sync_user_before_user_details_complete',
          });
        }
        
        setProgressValue(100);
        setProgressMessage('Redirecting to user details...');
        logger.info('User details missing, routing to user details', {
          component: 'Entry',
          action: 'route_to_user_details',
        });
        
        setLocation('/user-details');
      } else {
        // Has email and details, but no tenant - route to tenant selection
        // Ensure user is synced before redirecting
        setProgressValue(50);
        setProgressMessage('Syncing user context...');
        if (firebaseUser && syncBackendUser && !user) {
          logger.info('Syncing user before routing to tenant selection', {
            component: 'Entry',
            action: 'sync_user_before_tenant_selection',
            email: firebaseUser.email,
          });
          await syncBackendUser(firebaseUser);
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.info('User synced, ready to route to tenant selection', {
            component: 'Entry',
            action: 'sync_user_before_tenant_selection_complete',
          });
        }
        
        setProgressValue(100);
        setProgressMessage('Redirecting to tenant selection...');
        logger.info('No tenant, routing to tenant selection', {
          component: 'Entry',
          action: 'route_to_tenant_selection',
        });
        
        setLocation('/tenant-selection');
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to check user status', err, {
        component: 'Entry',
        action: 'check_user_status',
        email: firebaseUser?.email,
      });
      hasCheckedRef.current = false; // Allow retry on error
      setLoading(false);
    } finally {
      if (hasCheckedRef.current) {
        setLoading(false);
      }
    }
  };

  // Run the sequential check once on mount - useEffect runs after render
  useEffect(() => {
    // Only run if on /entry route
    if (location !== '/entry') {
      return;
    }
    
    // Run the sequential check
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount


  if (!firebaseUser) {
    return null;
  }

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-center w-full max-w-md px-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground mb-4">{progressMessage}</p>
          <Progress value={progressValue} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">{progressValue}%</p>
        </div>
      </div>
    </Layout>
  );
}

