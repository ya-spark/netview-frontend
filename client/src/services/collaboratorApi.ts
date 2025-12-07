// Collaborator API service functions based on NetView Collaborators API specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  CollaboratorCreate,
  CollaboratorUpdate,
  CollaboratorListResponse,
  CollaboratorSingleResponse,
  CollaboratorDeleteResponse,
  InvitationTokenResponse,
} from '../types/collaborator';

/**
 * Helper function to create headers required by Collaborators API
 */
function getCollaboratorHeaders(userEmail: string, tenantId: string): Record<string, string> {
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
 * Collaborator API service class for all collaborator-related operations
 */
export class CollaboratorApiService {
  /**
   * List all collaborators for the authenticated tenant
   * Requires Owner role
   */
  static async listCollaborators(
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorListResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', '/api/collaborators', undefined, headers);
    return response.json();
  }

  /**
   * Get a specific collaborator by ID
   * Requires Owner role
   */
  static async getCollaborator(
    collaboratorId: string,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorSingleResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', `/api/collaborators/${collaboratorId}`, undefined, headers);
    return response.json();
  }

  /**
   * Create a new collaborator (send invite)
   * Requires Owner role
   */
  static async createCollaborator(
    data: CollaboratorCreate,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorSingleResponse> {
    logger.info('Creating collaborator', {
      component: 'collaboratorApi',
      action: 'create_collaborator',
      collaboratorEmail: data.email,
      tenantId,
    });
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('POST', '/api/collaborators', data, headers);
    const result = await response.json();
    logger.info('Collaborator created successfully', {
      component: 'collaboratorApi',
      action: 'create_collaborator',
      collaboratorId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing collaborator
   * Requires Owner role
   */
  static async updateCollaborator(
    collaboratorId: string,
    data: CollaboratorUpdate,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorSingleResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('PUT', `/api/collaborators/${collaboratorId}`, data, headers);
    return response.json();
  }

  /**
   * Delete a collaborator (soft delete)
   * Requires Owner role
   */
  static async deleteCollaborator(
    collaboratorId: string,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorDeleteResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('DELETE', `/api/collaborators/${collaboratorId}`, undefined, headers);
    return response.json();
  }

  /**
   * Accept a collaborator invite
   * Requires authenticated user with email matching collaborator email
   */
  static async acceptInvite(
    collaboratorId: string,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorSingleResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('POST', `/api/collaborators/${collaboratorId}/accept`, undefined, headers);
    return response.json();
  }

  /**
   * Reject a collaborator invite
   * Requires authenticated user with email matching collaborator email
   */
  static async rejectInvite(
    collaboratorId: string,
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorSingleResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('POST', `/api/collaborators/${collaboratorId}/reject`, undefined, headers);
    return response.json();
  }

  /**
   * Get pending invitations for the authenticated user
   */
  static async getPendingInvitations(
    userEmail: string,
    tenantId: string
  ): Promise<CollaboratorListResponse> {
    const headers = getCollaboratorHeaders(userEmail, tenantId);
    const response = await apiRequest('GET', '/api/collaborators/pending', undefined, headers);
    return response.json();
  }

  /**
   * Get pending invitations by email (public endpoint, no auth required)
   */
  static async getPendingInvitationsByEmail(email: string): Promise<CollaboratorListResponse> {
    // This is a public endpoint, so we need to call it without auth headers
    const fullUrl = `/api/collaborators/pending-by-email?email=${encodeURIComponent(email)}`;
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
    const fullUrl = `/api/collaborators/invitation-by-token?token=${encodeURIComponent(token)}`;
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
  ): Promise<CollaboratorSingleResponse> {
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
    
    const response = await apiRequest('POST', `/api/collaborators/accept-by-token?token=${encodeURIComponent(token)}`, body, headers);
    return response.json();
  }
}

