// User and Invitation API service functions based on NetView Users API specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  UserInvitationCreate,
  UserUpdate,
  UserListResponse,
  UserSingleResponse,
  UserDeleteResponse,
  InvitationTokenResponse,
} from '../types/user';

/**
 * Helper function to create headers required by Users API
 */
function getUserHeaders(userEmail: string, tenantId: string): Record<string, string> {
  // Convert tenantId to integer (API expects integer)
  const tenantIdInt = parseInt(tenantId, 10);
  if (isNaN(tenantIdInt)) {
    throw new Error(`Invalid tenant ID: ${tenantId}`);
  }

  return {
    'X-Tenant-ID': tenantIdInt.toString(),
    'X-User-Email': userEmail,
  };
}

/**
 * User API service class for all user and invitation-related operations
 */
export class UserApiService {
  /**
   * List all invitations for the authenticated tenant
   * Requires Owner role
   */
  static async listInvitations(
    userEmail: string,
    tenantId: string
  ): Promise<UserListResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', '/api/users/invitations', undefined, headers);
    return response.json();
  }

  /**
   * Get a specific invitation by ID
   * Requires Owner role
   */
  static async getInvitation(
    invitationId: string,
    userEmail: string,
    tenantId: string
  ): Promise<UserSingleResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', `/api/users/invitations/${invitationId}`, undefined, headers);
    return response.json();
  }

  /**
   * Create a new invitation (send invite)
   * Requires Owner role
   */
  static async createInvitation(
    data: UserInvitationCreate,
    userEmail: string,
    tenantId: string
  ): Promise<UserSingleResponse> {
    logger.info('Creating invitation', {
      component: 'userApi',
      action: 'create_invitation',
      invitationEmail: data.email,
      tenantId,
    });
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('POST', '/api/users/invitations', data, headers);
    const result = await response.json();
    logger.info('Invitation created successfully', {
      component: 'userApi',
      action: 'create_invitation',
      invitationId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing invitation
   * Requires Owner role
   */
  static async updateInvitation(
    invitationId: string,
    data: UserUpdate,
    userEmail: string,
    tenantId: string
  ): Promise<UserSingleResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('PUT', `/api/users/invitations/${invitationId}`, data, headers);
    return response.json();
  }

  /**
   * Delete an invitation (soft delete)
   * Requires Owner role
   */
  static async deleteInvitation(
    invitationId: string,
    userEmail: string,
    tenantId: string
  ): Promise<UserDeleteResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('DELETE', `/api/users/invitations/${invitationId}`, undefined, headers);
    return response.json();
  }

  /**
   * Accept an invitation
   * Requires authenticated user with email matching invitation email
   * tenantId is required - must match the invitation's tenant (backend will verify)
   */
  static async acceptInvitation(
    invitationId: string,
    userEmail: string,
    tenantId: string
  ): Promise<UserSingleResponse> {
    // Build headers with required tenantId
    const headers: Record<string, string> = {
      'X-User-Email': userEmail,
      'X-Tenant-ID': tenantId, // Required - backend will verify it matches invitation's tenant
    };
    
    const response = await apiRequest('POST', `/api/users/invitations/${invitationId}/accept`, undefined, headers);
    return response.json();
  }

  /**
   * Reject an invitation
   * Requires authenticated user with email matching invitation email
   */
  static async rejectInvitation(
    invitationId: string,
    userEmail: string,
    tenantId: string
  ): Promise<UserSingleResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('POST', `/api/users/invitations/${invitationId}/reject`, undefined, headers);
    return response.json();
  }

  /**
   * Get pending invitations for the authenticated user
   */
  static async getPendingInvitations(
    userEmail: string,
    tenantId: string
  ): Promise<UserListResponse> {
    const headers = getUserHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', '/api/users/invitations/pending', undefined, headers);
    return response.json();
  }

  /**
   * Get pending invitations by email (public endpoint, no auth required)
   */
  static async getPendingInvitationsByEmail(email: string): Promise<UserListResponse> {
    // This is a public endpoint, so we need to call it without auth headers
    const fullUrl = `/api/users/invitations/pending-by-email?email=${encodeURIComponent(email)}`;
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API request failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    return res.json();
  }

  /**
   * Get invitation details by token (public endpoint, no auth required)
   */
  static async getInvitationByToken(token: string): Promise<InvitationTokenResponse> {
    // This is a public endpoint, so we need to call it without auth headers
    const fullUrl = `/api/users/invitations/invitation-by-token?token=${encodeURIComponent(token)}`;
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API request failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    return res.json();
  }

  /**
   * Accept invitation by token (requires authentication, tenantId is optional - will use tenant from invitation)
   * Accepts optional user details (first_name, last_name, name) to populate user profile
   */
  static async acceptInvitationByToken(
    token: string,
    userEmail: string,
    tenantId?: string,
    userDetails?: {
      firstName?: string;
      lastName?: string;
      name?: string;
    }
  ): Promise<UserSingleResponse> {
    // Build headers - only include tenantId if provided (user might not have one yet)
    const headers: Record<string, string> = {
      'X-User-Email': userEmail,
    };
    
    // Only add tenantId if provided - backend will use tenant from invitation if not provided
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    // Build request body with user details if provided
    const body = userDetails ? {
      first_name: userDetails.firstName,
      last_name: userDetails.lastName,
      name: userDetails.name,
    } : undefined;
    
    const response = await apiRequest('POST', `/api/users/invitations/accept-by-token?token=${encodeURIComponent(token)}`, body, headers);
    return response.json();
  }
}


