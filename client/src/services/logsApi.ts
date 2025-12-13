// Logs API service for fetching gateway and probe logs

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';

export interface LogEntry {
  timestamp: string;
  level?: string;
  type?: string;
  message: string;
  content?: string;
  [key: string]: any;
}

export interface LogsListResponse {
  success: boolean;
  timestamp: string;
  data: LogEntry[];
  count: number;
  total_count?: number;
}

/**
 * Logs API service class for fetching gateway and probe logs
 */
export class LogsApiService {
  /**
   * Get gateway logs
   */
  static async getGatewayLogs(
    gatewayId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<LogsListResponse> {
    try {
      logger.debug('Fetching gateway logs', {
        component: 'logsApi',
        action: 'get_gateway_logs',
        gatewayId,
        limit,
        offset,
      });
      
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await apiRequest('GET', `/api/logs/gateway/${gatewayId}?${queryParams.toString()}`);
      const result = await response.json();
      
      logger.debug('Gateway logs fetched successfully', {
        component: 'logsApi',
        action: 'get_gateway_logs',
        gatewayId,
        count: result.data?.length || 0,
      });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to fetch gateway logs', err, {
        component: 'logsApi',
        action: 'get_gateway_logs',
        gatewayId,
      });
      throw err;
    }
  }

  /**
   * Get probe logs
   */
  static async getProbeLogs(
    probeId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<LogsListResponse> {
    try {
      logger.debug('Fetching probe logs', {
        component: 'logsApi',
        action: 'get_probe_logs',
        probeId,
        limit,
        offset,
      });
      
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await apiRequest('GET', `/api/logs/probe/${probeId}?${queryParams.toString()}`);
      const result = await response.json();
      
      logger.debug('Probe logs fetched successfully', {
        component: 'logsApi',
        action: 'get_probe_logs',
        probeId,
        count: result.data?.length || 0,
      });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to fetch probe logs', err, {
        component: 'logsApi',
        action: 'get_probe_logs',
        probeId,
      });
      throw err;
    }
  }
}
