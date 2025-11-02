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

