import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { UserApiService } from '@/services/userApi';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { Invitation } from '@/types/user';

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
    queryKey: ['/api/users/invitations/pending', user?.email, user?.tenantId],
    queryFn: async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c2da348a-4c9d-412f-a7c7-795cb56e870b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationBanner.tsx:40',message:'Fetching pending invitations',data:{hasEmail:!!user?.email,hasTenantId:!!user?.tenantId,email:user?.email,tenantId:user?.tenantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!user?.email || !user?.tenantId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c2da348a-4c9d-412f-a7c7-795cb56e870b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationBanner.tsx:42',message:'Missing user email or tenantId, returning empty',data:{hasEmail:!!user?.email,hasTenantId:!!user?.tenantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return { data: [], count: 0 };
      }
      const result = await UserApiService.getPendingInvitations(
        user.email,
        user.tenantId.toString()
      );
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c2da348a-4c9d-412f-a7c7-795cb56e870b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationBanner.tsx:48',message:'Received pending invitations response',data:{count:result?.data?.length||0,invitations:result?.data?.map((inv:any)=>({id:inv.id,tenantName:inv.tenantName,hasTenantName:!!inv.tenantName}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return result;
    },
    enabled: !!user?.tenantId,
  });

  const pendingInvitations: Invitation[] = invitationsData?.data || [];
  
  // #region agent log
  useEffect(() => {
    if (pendingInvitations.length > 0) {
      fetch('http://127.0.0.1:7242/ingest/c2da348a-4c9d-412f-a7c7-795cb56e870b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationBanner.tsx:52',message:'Pending invitations processed',data:{count:pendingInvitations.length,firstInvitation:{id:pendingInvitations[0]?.id,tenantName:pendingInvitations[0]?.tenantName,hasTenantName:!!pendingInvitations[0]?.tenantName,role:pendingInvitations[0]?.role}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
  }, [pendingInvitations]);
  // #endregion

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
