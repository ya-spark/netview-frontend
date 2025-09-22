import { randomUUID } from 'crypto';
import type { NotificationGroup } from '@shared/schema';

export interface NotificationPayload {
  id: string;
  type: 'email' | 'sms' | 'webhook';
  recipient: string;
  subject?: string;
  message: string;
  data?: any;
  metadata: {
    tenantId: string;
    probeId?: string;
    alertId?: string;
    groupId?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface NotificationLog {
  id: string;
  timestamp: number;
  type: 'email' | 'sms' | 'webhook';
  recipient: string;
  subject?: string;
  message: string;
  tenantId: string;
  probeId?: string;
  alertId?: string;
  groupId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'failed' | 'rate_limited' | 'blocked';
  attemptCount: number;
  responseCode?: number;
  errorMessage?: string;
  deliveryTime?: number;
  retryAfter?: number;
}

export interface NotificationRateLimit {
  key: string;
  type: 'email' | 'sms' | 'webhook';
  tenantId: string;
  recipient?: string;
  windowMs: number;
  maxNotifications: number;
  currentCount: number;
  windowStart: number;
  blockedUntil?: number;
}

class NotificationManager {
  private notificationLogs: Map<string, NotificationLog> = new Map();
  private rateLimits: Map<string, NotificationRateLimit> = new Map();
  private pendingNotifications: Map<string, NotificationPayload> = new Map();
  
  // Rate limiting configuration
  private readonly DEFAULT_LIMITS = {
    email: { windowMs: 60 * 1000, maxNotifications: 10 }, // 10 emails per minute
    sms: { windowMs: 60 * 1000, maxNotifications: 5 },   // 5 SMS per minute
    webhook: { windowMs: 60 * 1000, maxNotifications: 20 } // 20 webhooks per minute
  };

  constructor() {
    // Clean old logs and rate limit data every 10 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 10 * 60 * 1000);

    console.log('NotificationManager initialized with hairpinning and rate limiting');
  }

  /**
   * Hairpin function - intercepts all outbound notifications
   * This is the main entry point for all notifications
   */
  public hairpinNotification = async (payload: NotificationPayload): Promise<NotificationLog> => {
    const notificationLog: NotificationLog = {
      id: payload.id,
      timestamp: Date.now(),
      type: payload.type,
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
      tenantId: payload.metadata.tenantId,
      probeId: payload.metadata.probeId,
      alertId: payload.metadata.alertId,
      groupId: payload.metadata.groupId,
      priority: payload.metadata.priority,
      status: 'pending',
      attemptCount: 0,
    };

    // Store the notification log
    this.notificationLogs.set(notificationLog.id, notificationLog);

    // Log the hairpinned notification
    console.log(`[NOTIFICATION HAIRPIN] ${payload.type.toUpperCase()} to ${payload.recipient} - ${payload.metadata.tenantId}`);

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(payload);
    if (!rateLimitResult.allowed) {
      notificationLog.status = 'rate_limited';
      notificationLog.retryAfter = rateLimitResult.retryAfter;
      notificationLog.errorMessage = `Rate limit exceeded: ${rateLimitResult.reason}`;
      
      console.warn(`[NOTIFICATION BLOCKED] Rate limit exceeded for ${payload.type} to ${payload.recipient}`);
      return notificationLog;
    }

    // Process the notification
    try {
      await this.processNotification(payload, notificationLog);
    } catch (error) {
      notificationLog.status = 'failed';
      notificationLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NOTIFICATION ERROR] Failed to process ${payload.type} to ${payload.recipient}:`, error);
    }

    return notificationLog;
  };

  /**
   * Send notifications to a notification group
   */
  public async sendToNotificationGroup(group: NotificationGroup, subject: string, message: string, metadata: NotificationPayload['metadata']): Promise<NotificationLog[]> {
    const notifications: NotificationPayload[] = [];

    // Email notifications
    if (group.emails && group.emails.length > 0) {
      for (const email of group.emails) {
        notifications.push({
          id: randomUUID(),
          type: 'email',
          recipient: email,
          subject,
          message,
          metadata: { ...metadata, groupId: group.id }
        });
      }
    }

    // SMS notifications
    if (group.smsNumbers && group.smsNumbers.length > 0) {
      for (const phone of group.smsNumbers) {
        notifications.push({
          id: randomUUID(),
          type: 'sms',
          recipient: phone,
          message,
          metadata: { ...metadata, groupId: group.id }
        });
      }
    }

    // Webhook notification
    if (group.webhookUrl) {
      notifications.push({
        id: randomUUID(),
        type: 'webhook',
        recipient: group.webhookUrl,
        message,
        data: { subject, message, metadata },
        metadata: { ...metadata, groupId: group.id }
      });
    }

    // Process all notifications through hairpin
    const results: NotificationLog[] = [];
    for (const notification of notifications) {
      const result = await this.hairpinNotification(notification);
      results.push(result);
    }

    return results;
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(payload: NotificationPayload): { allowed: boolean; retryAfter?: number; reason?: string } {
    const now = Date.now();
    const limits = this.DEFAULT_LIMITS[payload.type];
    
    // Create rate limit keys
    const keys = [
      `${payload.type}:tenant:${payload.metadata.tenantId}`, // Per tenant
      `${payload.type}:recipient:${payload.recipient}`,      // Per recipient
      `${payload.type}:global`                               // Global limit
    ];

    for (const key of keys) {
      let rateLimitData = this.rateLimits.get(key);
      
      if (!rateLimitData) {
        rateLimitData = {
          key,
          type: payload.type,
          tenantId: payload.metadata.tenantId,
          recipient: payload.recipient,
          windowMs: limits.windowMs,
          maxNotifications: limits.maxNotifications,
          currentCount: 0,
          windowStart: now
        };
        this.rateLimits.set(key, rateLimitData);
      }

      // Check if blocked
      if (rateLimitData.blockedUntil && rateLimitData.blockedUntil > now) {
        return {
          allowed: false,
          retryAfter: Math.ceil((rateLimitData.blockedUntil - now) / 1000),
          reason: `Blocked until ${new Date(rateLimitData.blockedUntil).toISOString()}`
        };
      }

      // Reset window if expired
      if (now - rateLimitData.windowStart > rateLimitData.windowMs) {
        rateLimitData.currentCount = 0;
        rateLimitData.windowStart = now;
        rateLimitData.blockedUntil = undefined;
      }

      // Check rate limit
      if (rateLimitData.currentCount >= rateLimitData.maxNotifications) {
        const retryAfter = Math.ceil((rateLimitData.windowMs - (now - rateLimitData.windowStart)) / 1000);
        return {
          allowed: false,
          retryAfter,
          reason: `Rate limit exceeded for ${key}: ${rateLimitData.currentCount}/${rateLimitData.maxNotifications} in ${rateLimitData.windowMs}ms`
        };
      }

      // Increment counter
      rateLimitData.currentCount++;
    }

    return { allowed: true };
  }

  /**
   * Process individual notification (actual sending)
   */
  private async processNotification(payload: NotificationPayload, log: NotificationLog): Promise<void> {
    const startTime = Date.now();
    log.attemptCount++;

    try {
      switch (payload.type) {
        case 'email':
          await this.sendEmail(payload);
          break;
        case 'sms':
          await this.sendSMS(payload);
          break;
        case 'webhook':
          await this.sendWebhook(payload);
          break;
      }

      log.status = 'sent';
      log.deliveryTime = Date.now() - startTime;
      log.responseCode = 200;

      console.log(`[NOTIFICATION SENT] ${payload.type.toUpperCase()} to ${payload.recipient} in ${log.deliveryTime}ms`);

    } catch (error) {
      log.status = 'failed';
      log.deliveryTime = Date.now() - startTime;
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw error;
    }
  }

  /**
   * Send email (mock implementation for development)
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL MOCK] To: ${payload.recipient}, Subject: ${payload.subject}, Message: ${payload.message.substring(0, 100)}...`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.01) { // 1% failure rate
      throw new Error('Mock email service failure');
    }
  }

  /**
   * Send SMS (mock implementation for development)
   */
  private async sendSMS(payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`[SMS MOCK] To: ${payload.recipient}, Message: ${payload.message.substring(0, 50)}...`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Mock SMS service failure');
    }
  }

  /**
   * Send webhook (mock implementation for development)
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual HTTP client
    console.log(`[WEBHOOK MOCK] To: ${payload.recipient}, Data:`, payload.data);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.01) { // 1% failure rate
      throw new Error('Mock webhook service failure');
    }
  }

  /**
   * Get notification statistics
   */
  public getStats() {
    const logs = Array.from(this.notificationLogs.values());
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => log.timestamp > oneHourAgo);
    
    const stats = {
      total: logs.length,
      recent: recentLogs.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averageDeliveryTime: 0,
      failureRate: 0,
      rateLimitedCount: 0,
      activeRateLimits: this.rateLimits.size,
    };

    // Calculate statistics
    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    recentLogs.forEach(log => {
      // By type
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      
      // By status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      
      // By priority
      stats.byPriority[log.priority] = (stats.byPriority[log.priority] || 0) + 1;
      
      // Delivery time
      if (log.deliveryTime && log.status === 'sent') {
        totalDeliveryTime += log.deliveryTime;
        deliveredCount++;
      }
      
      // Rate limited
      if (log.status === 'rate_limited') {
        stats.rateLimitedCount++;
      }
    });

    stats.averageDeliveryTime = deliveredCount > 0 ? totalDeliveryTime / deliveredCount : 0;
    stats.failureRate = recentLogs.length > 0 ? (stats.byStatus.failed || 0) / recentLogs.length : 0;

    return stats;
  }

  /**
   * Get notification logs with filtering
   */
  public getLogs(filters?: {
    tenantId?: string;
    type?: string;
    status?: string;
    since?: number;
    limit?: number;
  }) {
    let logs = Array.from(this.notificationLogs.values());

    // Apply filters
    if (filters) {
      if (filters.tenantId) {
        logs = logs.filter(log => log.tenantId === filters.tenantId);
      }
      if (filters.type) {
        logs = logs.filter(log => log.type === filters.type);
      }
      if (filters.status) {
        logs = logs.filter(log => log.status === filters.status);
      }
      if (filters.since) {
        logs = logs.filter(log => log.timestamp > filters.since!);
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean old notification logs
    let cleaned = 0;
    this.notificationLogs.forEach((log, id) => {
      if (log.timestamp < cutoff) {
        this.notificationLogs.delete(id);
        cleaned++;
      }
    });

    // Clean expired rate limits
    let rateLimitsCleaned = 0;
    const now = Date.now();
    this.rateLimits.forEach((rateLimit, key) => {
      // Remove if window expired and not blocked
      if ((now - rateLimit.windowStart) > rateLimit.windowMs && !rateLimit.blockedUntil) {
        this.rateLimits.delete(key);
        rateLimitsCleaned++;
      }
      // Remove if block period expired
      else if (rateLimit.blockedUntil && rateLimit.blockedUntil < now) {
        rateLimit.blockedUntil = undefined;
        rateLimit.currentCount = 0;
        rateLimit.windowStart = now;
      }
    });

    if (cleaned > 0 || rateLimitsCleaned > 0) {
      console.log(`[NOTIFICATION CLEANUP] Cleaned ${cleaned} logs, ${rateLimitsCleaned} rate limits`);
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Export helper functions
export const sendNotification = notificationManager.hairpinNotification;
export const sendToGroup = notificationManager.sendToNotificationGroup.bind(notificationManager);
export const getNotificationStats = notificationManager.getStats.bind(notificationManager);
export const getNotificationLogs = notificationManager.getLogs.bind(notificationManager);