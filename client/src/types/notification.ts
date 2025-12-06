// Notification Group types based on NetView API specification

export interface NotificationGroupCreate {
  name: string;
  emails: string[]; // Array of email addresses
  alert_threshold?: number; // Minimum failures before alert (default: 1)
  is_active?: boolean; // Default: true
}

export interface NotificationGroupUpdate {
  name?: string;
  emails?: string[]; // Array of email addresses
  alert_threshold?: number;
  is_active?: boolean;
}

export interface NotificationGroup {
  id: string;
  tenant_id: number;
  name: string;
  emails: string[];
  alert_threshold: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationGroupListResponse {
  data: NotificationGroup[];
}

export interface NotificationGroupSingleResponse {
  data: NotificationGroup;
}

// User Notification types

export interface UserNotification {
  id: string;
  user_email: string;
  tenant_id?: number;
  type: 'collaborator_invitation' | 'alert' | 'system' | string;
  title: string;
  message?: string;
  data?: {
    collaborator_id?: string;
    invitation_token?: string;
    tenant_id?: number;
    tenant_name?: string;
    role?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface UserNotificationListResponse {
  success: boolean;
  timestamp: string;
  data: UserNotification[];
  count: number;
}

export interface UserNotificationSingleResponse {
  success: boolean;
  timestamp: string;
  data: UserNotification;
}

