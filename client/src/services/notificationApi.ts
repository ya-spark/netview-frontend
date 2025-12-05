// Notification Group API service functions based on NetView API specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
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
    logger.info('Creating notification group', {
      component: 'notificationApi',
      action: 'create_group',
      groupName: data.name,
      emailCount: data.emails?.length || 0,
    });
    const response = await apiRequest('POST', '/api/notifications/groups', data);
    const result = await response.json();
    logger.info('Notification group created successfully', {
      component: 'notificationApi',
      action: 'create_group',
      groupId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing notification group
   */
  static async updateGroup(
    groupId: string,
    data: NotificationGroupUpdate
  ): Promise<NotificationGroupSingleResponse> {
    logger.info('Updating notification group', {
      component: 'notificationApi',
      action: 'update_group',
      groupId,
    });
    const response = await apiRequest('PUT', `/api/notifications/groups/${groupId}`, data);
    const result = await response.json();
    logger.info('Notification group updated successfully', {
      component: 'notificationApi',
      action: 'update_group',
      groupId,
    });
    return result;
  }

  /**
   * Delete a notification group
   */
  static async deleteGroup(groupId: string): Promise<{ message: string }> {
    logger.info('Deleting notification group', {
      component: 'notificationApi',
      action: 'delete_group',
      groupId,
    });
    const response = await apiRequest('DELETE', `/api/notifications/groups/${groupId}`);
    const result = await response.json();
    logger.info('Notification group deleted successfully', {
      component: 'notificationApi',
      action: 'delete_group',
      groupId,
    });
    return result;
  }
}

