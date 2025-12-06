import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CollaboratorApiService } from '@/services/collaboratorApi';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { PendingInvitation } from '@/types/collaborator';

interface InvitationBannerProps {
  onDismiss?: (invitationId: string) => void;
}

export function InvitationBanner({ onDismiss }: InvitationBannerProps) {
  const { user } = useAuth();
  const [dismissedInvitations, setDismissedInvitations] = useState<Set<string>>(new Set());

  // Load dismissed invitations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedInvitations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedInvitations(new Set(parsed));
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.debug('Failed to parse dismissed invitations from localStorage', {
          component: 'InvitationBanner',
          action: 'parse_localStorage',
        }, err);
      }
    }
  }, []);

  // Fetch pending invitations
  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ['/api/collaborators/pending', user?.email, user?.tenantId],
    queryFn: async () => {
      if (!user?.email || !user?.tenantId) {
        return { data: [], count: 0 };
      }
      return CollaboratorApiService.getPendingInvitations(
        user.email,
        user.tenantId.toString()
      );
    },
    enabled: !!user?.email && !!user?.tenantId,
  });

  const pendingInvitations: PendingInvitation[] = invitationsData?.data || [];

  // Filter out dismissed invitations
  const visibleInvitations = pendingInvitations.filter(
    (inv) => !dismissedInvitations.has(inv.id)
  );

  // Don't show banner if no visible invitations
  if (!isLoading && visibleInvitations.length === 0) {
    return null;
  }

  const handleDismiss = (invitationId: string) => {
    const newDismissed = new Set(dismissedInvitations);
    newDismissed.add(invitationId);
    setDismissedInvitations(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedInvitations', JSON.stringify(Array.from(newDismissed)));
    
    if (onDismiss) {
      onDismiss(invitationId);
    }
  };

  if (isLoading) {
    return (
      <Alert className="mb-4">
        <Mail className="h-4 w-4" />
        <AlertDescription>Loading invitations...</AlertDescription>
      </Alert>
    );
  }

  // Show banner for first visible invitation
  const invitation = visibleInvitations[0];
  if (!invitation) {
    return null;
  }

  const invitationCount = visibleInvitations.length;

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5">
      <Mail className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="font-medium">
            {invitationCount === 1
              ? `You have been invited to join ${invitation.tenantName || 'an organization'} as ${invitation.role}`
              : `You have ${invitationCount} pending invitations`}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button asChild size="sm" variant="default">
            <Link href="/accept-invitation">
              {invitationCount === 1 ? 'View Invitation' : 'View All'}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDismiss(invitation.id)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
