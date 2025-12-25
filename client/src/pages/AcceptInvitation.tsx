import { useState, useEffect } from 'react';
import { useLocation, Link, Redirect } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserApiService } from '@/services/userApi';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import type { InvitationTokenResponse } from '@/types/user';

export default function AcceptInvitation() {
  const [location, setLocation] = useLocation();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract token from URL
  const urlParams = new URL(window.location.href).searchParams;
  const token = urlParams.get('token');

  // Log component mount
  useEffect(() => {
    logger.info('AcceptInvitation page loaded', {
      component: 'AcceptInvitation',
      action: 'page_load',
      hasToken: !!token,
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
    });
  }, [token, user, firebaseUser]);

  // Fetch invitation details
  const {
    data: invitationData,
    isLoading: isLoadingInvitation,
    error: invitationError,
  } = useQuery<InvitationTokenResponse>({
    queryKey: ['/api/users/invitations/invitation-by-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      logger.info('Fetching invitation by token', {
        component: 'AcceptInvitation',
        action: 'fetch_invitation',
        hasToken: !!token,
      });
      const result = await UserApiService.getInvitationByToken(token);
      logger.info('Invitation fetched successfully', {
        component: 'AcceptInvitation',
        action: 'fetch_invitation',
        invitationId: result?.data?.id,
        tenantName: result?.data?.tenantName,
        email: result?.data?.email,
      });
      return result;
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user || !user.email || !user.tenantId) {
        throw new Error('Missing required information');
      }
      logger.info('Accepting invitation by token', {
        component: 'AcceptInvitation',
        action: 'accept_invitation',
        invitationToken: token,
        userEmail: user.email,
        tenantId: user.tenantId,
      });
      return UserApiService.acceptInvitationByToken(
        token,
        user.email,
        user.tenantId.toString()
      );
    },
    onSuccess: () => {
      logger.info('Invitation accepted successfully', {
        component: 'AcceptInvitation',
        action: 'accept_invitation_success',
        userEmail: user?.email,
      });
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully joined the organization.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/user'] });
      // Redirect to dashboard
      setTimeout(() => {
        logger.info('Redirecting to dashboard after invitation acceptance', {
          component: 'AcceptInvitation',
          action: 'redirect_after_acceptance',
        });
        setLocation('/dashboard');
      }, 1500);
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to accept invitation', err, {
        component: 'AcceptInvitation',
        action: 'accept_invitation',
      });
      toast({
        title: 'Failed to accept invitation',
        description: error.message || 'An error occurred while accepting the invitation.',
        variant: 'destructive',
      });
    },
  });

  // Handle loading state
  if (authLoading || isLoadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle missing token
  if (!token) {
    logger.warn('AcceptInvitation: No token provided', {
      component: 'AcceptInvitation',
      action: 'missing_token',
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>No invitation token provided.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                The invitation link is invalid. Please check the link and try again.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle invitation error
  if (invitationError) {
    const errorMessage =
      (invitationError as any)?.response?.data?.detail ||
      (invitationError as Error)?.message ||
      'Failed to load invitation';

    logger.error('Failed to load invitation', invitationError instanceof Error ? invitationError : new Error(String(invitationError)), {
      component: 'AcceptInvitation',
      action: 'fetch_invitation_error',
      errorMessage,
    });

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle invitation data
  const invitation = invitationData?.data;
  if (!invitation) {
    return null;
  }

  // If user is not logged in, redirect to login with token preserved
  if (!firebaseUser || !user) {
    logger.info('User not authenticated, redirecting to login', {
      component: 'AcceptInvitation',
      action: 'redirect_to_login',
      hasFirebaseUser: !!firebaseUser,
      hasUser: !!user,
    });
    const loginUrl = `/login?redirect=${encodeURIComponent(location)}`;
    return <Redirect to={loginUrl} />;
  }

  // Check if email matches
  const emailMatches = user.email?.toLowerCase() === invitation.email.toLowerCase();

  if (!emailMatches) {
    logger.warn('Email mismatch for invitation', {
      component: 'AcceptInvitation',
      action: 'email_mismatch',
      invitationEmail: invitation.email,
      userEmail: user.email,
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Email Mismatch
            </CardTitle>
            <CardDescription>
              This invitation is for a different email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                This invitation was sent to <strong>{invitation.email}</strong>, but you are
                logged in as <strong>{user.email}</strong>. Please log in with the correct
                email address to accept this invitation.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Log in with different account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.status === 'accepted') {
    logger.info('Invitation already accepted', {
      component: 'AcceptInvitation',
      action: 'invitation_already_accepted',
      invitationId: invitation.id,
      userEmail: user.email,
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Invitation Already Accepted
            </CardTitle>
            <CardDescription>This invitation has already been accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                You have already accepted this invitation. You can now access the organization
                from your dashboard.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation details and accept button
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization on NetView
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Organization:</span>
              <span className="font-medium">{invitation.tenantName || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge variant="secondary">{invitation.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="font-medium">{invitation.email}</span>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              By accepting this invitation, you will be granted access to the organization with
              the role of <strong>{invitation.role}</strong>.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="flex-1"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              disabled={acceptMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
