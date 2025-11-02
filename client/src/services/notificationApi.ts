// Notification Group API service functions based on NetView API specification

import { apiRequest } from '../lib/queryClient';
import type {
  NotificationGroupCreate,
  NotificationGroupUpdate,
  NotificationGroupListResponse,
  NotificationGroupSingleResponse,
} from '../types/notification';

/**
 * Notification Group API service class for all notification group-related operations
 */
export class NotificationGroupApiService {
  /**
   * List all notification groups for the authenticated tenant
   */
  static async listGroups(): Promise<NotificationGroupListResponse> {
    const response = await apiRequest('GET', '/api/notifications/groups');
    return response.json();
  }

  /**
   * Get a specific notification group by ID
   */
  static async getGroup(groupId: string): Promise<NotificationGroupSingleResponse> {
    const response = await apiRequest('GET', `/api/notifications/groups/${groupId}`);
    return response.json();
  }

  /**
   * Create a new notification group
   */
  static async createGroup(data: NotificationGroupCreate): Promise<NotificationGroupSingleResponse> {
    const response = await apiRequest('POST', '/api/notifications/groups', data);
    return response.json();
  }

  /**
   * Update an existing notification group
   */
  static async updateGroup(
    groupId: string,
    data: NotificationGroupUpdate
  ): Promise<NotificationGroupSingleResponse> {
    const response = await apiRequest('PUT', `/api/notifications/groups/${groupId}`, data);
    return response.json();
  }

  /**
   * Delete a notification group
   */
  static async deleteGroup(groupId: string): Promise<{ message: string }> {
    const response = await apiRequest('DELETE', `/api/notifications/groups/${groupId}`);
    return response.json();
  }
}

