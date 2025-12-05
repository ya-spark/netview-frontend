// Dashboard API service functions based on NetView API OpenAPI specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  DashboardSingleResponse,
  DashboardStatsResponse,
} from '../types/dashboard';

/**
 * Dashboard API service class for all dashboard-related operations
 */
export class DashboardApiService {
  /**
   * Get dashboard statistics for the authenticated tenant
   */
  static async getDashboardStats(): Promise<DashboardSingleResponse> {
    logger.debug('Fetching dashboard stats', {
      component: 'dashboardApi',
      action: 'get_dashboard_stats',
    });
    
    const response = await apiRequest('GET', '/api/dashboard');
    const result = await response.json();
    
    logger.info('Dashboard stats loaded successfully', {
      component: 'dashboardApi',
      action: 'get_dashboard_stats',
      stats: result?.data,
    });
    
    return result;
  }
}
