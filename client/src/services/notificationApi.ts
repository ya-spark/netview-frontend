// Notification Group API service functions based on NetView API specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  NotificationGroupCreate,
  NotificationGroupUpdate,
  NotificationGroupListResponse,
  NotificationGroupSingleResponse,
  UserNotificationListResponse,
  UserNotificationSingleResponse,
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

/**
 * User Notification API service class for user notification operations
 */
export class UserNotificationApiService {
  /**
   * Get user notifications for the authenticated user
   */
  static async getUserNotifications(
    unreadOnly: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserNotificationListResponse> {
    const response = await apiRequest(
      'GET',
      `/api/notifications/user?unread_only=${unreadOnly}&limit=${limit}&offset=${offset}`
    );
    return response.json();
  }

  /**
   * Mark a user notification as read
   */
  static async markNotificationRead(notificationId: string): Promise<UserNotificationSingleResponse> {
    logger.info('Marking notification as read', {
      component: 'notificationApi',
      action: 'mark_read',
      notificationId,
    });
    const response = await apiRequest('PUT', `/api/notifications/user/${notificationId}/read`);
    const result = await response.json();
    logger.info('Notification marked as read successfully', {
      component: 'notificationApi',
      action: 'mark_read',
      notificationId,
    });
    return result;
  }

  /**
   * Get count of unread notifications for the authenticated user
   */
  static async getUnreadNotificationCount(): Promise<{ success: boolean; timestamp: string; data: { count: number } }> {
    const response = await apiRequest('GET', '/api/notifications/user/count');
    return response.json();
  }
}

