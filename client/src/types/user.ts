// User and Invitation types based on NetView Users API specification

export interface User {
  id: string; // UUID
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  isActive: boolean;
  status?: 'invited' | 'accepted' | 'rejected';
  createdAt: string; // ISO 8601 date string
  tenantName?: string; // Added for invitation response
  invitationToken?: string; // Token to accept the invitation (only in pending invitations response)
}

export interface UserInvitationCreate {
  email: string; // required
  first_name?: string; // optional
  last_name?: string; // optional
  role?: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer'; // optional, default: Viewer
  is_active?: boolean; // optional, default: true
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string; // optional, must be unique per tenant if changed
  role?: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  is_active?: boolean;
}

export interface UserListResponse {
  success: boolean;
  timestamp: string;
  data: User[];
  count: number;
}

export interface UserSingleResponse {
  success: boolean;
  timestamp: string;
  data: User;
}

export interface UserDeleteResponse {
  success: boolean;
  timestamp: string;
  data: {
    message: string;
    user_id: string;
  };
}

export interface Invitation {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  status: 'invited';
  tenantName?: string;
  tenantId?: number; // Tenant ID from the invitation (required for accepting)
  invitationToken?: string; // Token to accept the invitation (only needed if user is not logged in)
  createdAt: string;
}

export interface InvitationTokenResponse {
  success: boolean;
  timestamp: string;
  data: User & {
    tenantName: string;
  };
}


