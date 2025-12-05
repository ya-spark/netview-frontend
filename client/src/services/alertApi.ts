// Alert API service functions based on NetView API OpenAPI specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type { AlertListResponse } from '../types/alert';

/**
 * Alert API service class for all alert-related operations
 */
export class AlertApiService {
  /**
   * List all alerts for the authenticated tenant
   */
  static async listAlerts(): Promise<AlertListResponse> {
    logger.debug('Fetching alerts', {
      component: 'alertApi',
      action: 'list_alerts',
    });
    
    const response = await apiRequest('GET', '/api/alerts');
    const result = await response.json();
    
    logger.info('Alerts loaded successfully', {
      component: 'alertApi',
      action: 'list_alerts',
      count: result?.count || 0,
    });
    
    return result;
  }
}
