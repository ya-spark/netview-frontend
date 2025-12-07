import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { CollaboratorApiService } from '@/services/collaboratorApi';
import { createTenant } from '@/services/tenantApi';
import { isBusinessEmail } from '@/utils/emailValidation';
import { logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Invites Page - Let users choose: accept invite OR create their own tenant
 * 
 * Scenarios:
 * - Business email + Has invites → Show both options
 * - Business email + No invites → Show create option only
 * - Gmail + Has invites → Show accept option only
 * - Gmail + No invites → Show wait message
 */
export default function Invites() {
  const [, setLocation] = useLocation();
  const { firebaseUser, syncBackendUser } = useAuth();
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const { toast } = useToast();
  
  const userEmail = firebaseUser?.email || '';
  const isBusiness = isBusinessEmail(userEmail);
  
  const { data: pendingInvitationsData, isLoading: checkingInvitations } = useQuery({
    queryKey: ['/api/collaborators/pending-by-email', userEmail],
    queryFn: async () => {
      if (!userEmail) return { data: [], count: 0 };
      logger.info('Checking for pending invitations', { component: 'Invites', email: userEmail });
      try {
        const result = await CollaboratorApiService.getPendingInvitationsByEmail(userEmail);
        logger.info('Pending invitations check completed', {
          component: 'Invites',
          email: userEmail,
          count: result?.data?.length || 0,
        });
        return result;
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to check pending invitations', err, { component: 'Invites', email: userEmail });
        throw error;
      }
    },
    enabled: !!userEmail && !!firebaseUser,
    retry: 1,
  });
  
  const pendingInvitations = (pendingInvitationsData?.data || []) as Array<import('@/types/collaborator').PendingInvitation>;
  const hasPendingInvitations = pendingInvitations.length > 0;

  // Extract user details from Firebase
  const getUserDetails = () => {
    if (!firebaseUser) return undefined;
    
    const displayName = firebaseUser.displayName || '';
    const nameParts = displayName.trim().split(/\s+/);
    
    return {
      firstName: nameParts[0] || firebaseUser.email?.split('@')[0] || 'User',
      lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
      name: displayName || firebaseUser.email?.split('@')[0] || 'User',
    };
  };

  const handleAcceptInvitation = async (inv: import('@/types/collaborator').PendingInvitation) => {
    if (!inv.invitationToken) {
      toast({
        title: "Invitation Token Missing",
        description: "Unable to accept invitation. Please check your email for the invitation link.",
        variant: "destructive",
      });
      return;
    }
    
    setAcceptingInvitation(inv.id);
    try {
      const userDetails = getUserDetails();
      
      logger.info('Accepting invitation', { component: 'Invites', action: 'accept_invitation', invitationId: inv.id });
      await CollaboratorApiService.acceptInvitationByToken(
        inv.invitationToken,
        userEmail,
        undefined,
        userDetails
      );
      
      logger.info('Invitation accepted successfully', { component: 'Invites', action: 'accept_invitation_success', invitationId: inv.id });
      
      // Wait a moment for backend to fully commit user creation before syncing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Retry syncing backend user
      if (firebaseUser && syncBackendUser) {
        let retries = 3;
        let syncSuccess = false;
        while (retries > 0 && !syncSuccess) {
          try {
            await syncBackendUser(firebaseUser);
            syncSuccess = true;
            logger.info('Backend user synced successfully after invitation acceptance', { component: 'Invites' });
          } catch (syncError: any) {
            retries--;
            if (retries > 0) {
              logger.warn(`Backend user sync failed, retrying... (${retries} attempts left)`, { component: 'Invites' });
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              logger.error('Failed to sync backend user after invitation acceptance', syncError instanceof Error ? syncError : new Error(String(syncError)), { component: 'Invites' });
            }
          }
        }
      }
      
      toast({
        title: "Invitation Accepted",
        description: `You've been added to ${inv.tenantName || 'the organization'} as ${inv.role}.`,
      });
      
      // Redirect to tenant selection
      setTimeout(() => {
        setLocation('/onboarding/select-tenant');
      }, 1500);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to accept invitation', err, { component: 'Invites', action: 'accept_invitation_error', invitationId: inv.id });
      toast({
        title: "Failed to Accept Invitation",
        description: error.message || "An error occurred while accepting the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAcceptingInvitation(null);
    }
  };

  const handleCreateTenant = async () => {
    if (!isBusiness) {
      toast({
        title: "Business Email Required",
        description: "Only business email addresses can create organizations.",
        variant: "destructive",
      });
      return;
    }
    
    setCreatingTenant(true);
    try {
      // Extract domain from email for tenant name
      const domain = userEmail.split('@')[1];
      const tenantName = domain ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Organization';
      
      logger.info('Creating tenant', { component: 'Invites', action: 'create_tenant', tenantName, email: userEmail });
      await createTenant(tenantName);
      
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      toast({
        title: "Organization Created",
        description: `Your organization "${tenantName}" has been created successfully.`,
      });
      
      // Redirect to tenant selection
      setTimeout(() => {
        setLocation('/onboarding/select-tenant');
      }, 1500);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create tenant', err, { component: 'Invites', action: 'create_tenant' });
      
      let errorMessage = error.message || "Failed to create organization. Please try again.";
      let errorTitle = "Creation Failed";
      
      if (error.code === 'PUBLIC_EMAIL_NOT_ALLOWED' || error.details?.code === 'PUBLIC_EMAIL_NOT_ALLOWED') {
        errorTitle = "Business Email Required";
        errorMessage = error.details?.message || "Only business email addresses are allowed for tenant creation.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreatingTenant(false);
    }
  };

  if (!firebaseUser) {
    return null;
  }

  if (checkingInvitations) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Checking for invitations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Gmail user with no invites
  if (!isBusiness && !hasPendingInvitations) {
    return (
      <Layout showSidebar={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold text-foreground">NetView</span>
              </div>
              <CardTitle className="text-2xl">Waiting for Invitation</CardTitle>
              <CardDescription>You need to be invited to join an organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">No pending invitations found</p>
                  <p className="text-sm text-muted-foreground">
                    Please check your email for an invitation, or ask an organization owner to invite you.
                  </p>
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Check Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-foreground">NetView</span>
            </div>
            <CardTitle className="text-2xl">Welcome! Choose Your Path</CardTitle>
            <CardDescription>Select how you'd like to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invitations Section */}
            {hasPendingInvitations && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">You have pending invitations</h3>
                </div>
                <div className="space-y-3">
                  {pendingInvitations.map((inv) => (
                    <Card key={inv.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{inv.tenantName || 'An organization'}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited you as: <span className="font-medium">{inv.role}</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAcceptInvitation(inv)}
                            disabled={acceptingInvitation === inv.id || creatingTenant}
                            className="ml-4"
                          >
                            {acceptingInvitation === inv.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Accepting...
                              </>
                            ) : (
                              'Accept Invitation'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Create Organization Section (Business emails only) */}
            {isBusiness && (
              <>
                {hasPendingInvitations && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">OR</span>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Create Your Own Organization</h3>
                  </div>
                  <Card className="border-primary/20">
                    <CardContent className="p-4 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Start fresh with your own organization. Based on your email domain, we'll create an organization for you.
                      </p>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-muted-foreground">Organization name:</span>
                        <span className="font-medium">
                          {userEmail.split('@')[1]?.split('.')[0]?.charAt(0).toUpperCase() + userEmail.split('@')[1]?.split('.')[0]?.slice(1) || 'Organization'}
                        </span>
                      </div>
                      <Button
                        onClick={handleCreateTenant}
                        disabled={creatingTenant || !!acceptingInvitation}
                        className="w-full"
                      >
                        {creatingTenant ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 mr-2" />
                            Create Organization
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
