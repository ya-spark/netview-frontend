import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Mail, AlertCircle, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserNotificationApiService } from '@/services/notificationApi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { UserNotification } from '@/types/notification';

interface NotificationDropdownProps {
  children: React.ReactNode;
}

export function NotificationDropdown({ children }: NotificationDropdownProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unread notification count
  const { data: countData } = useQuery({
    queryKey: ['/api/notifications/user/count'],
    queryFn: () => UserNotificationApiService.getUnreadNotificationCount(),
    enabled: !!user?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = countData?.data?.count || 0;

  // Fetch recent notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['/api/notifications/user'],
    queryFn: () => UserNotificationApiService.getUserNotifications(true, 10, 0), // Unread only, limit 10
    enabled: !!user?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications: UserNotification[] = notificationsData?.data || [];

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      UserNotificationApiService.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/user/count'] });
    },
    onError: (error) => {
      logger.error('Failed to mark notification as read', { error });
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
  });

  const handleNotificationClick = (notification: UserNotification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'collaborator_invitation') {
      const token = notification.data?.invitation_token;
      if (token) {
        window.location.href = `/accept-invitation?token=${token}`;
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'collaborator_invitation':
        return <Mail className="h-4 w-4" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationTitle = (notification: UserNotification) => {
    if (notification.type === 'collaborator_invitation') {
      const tenantName = notification.data?.tenant_name || 'an organization';
      const role = notification.data?.role || 'member';
      return `Invitation to join ${tenantName} as ${role}`;
    }
    return notification.title;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No unread notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start gap-3 p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`mt-0.5 ${!notification.is_read ? 'text-primary' : 'text-muted-foreground'}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                    {getNotificationTitle(notification)}
                  </div>
                  {notification.message && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Notification Settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
