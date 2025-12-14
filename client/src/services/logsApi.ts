// Logs API service for fetching gateway and probe logs

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';

export interface LogEntry {
  timestamp: string;
  level?: string;
  type?: string;
  message: string;
  content?: string;
  status?: string;
  execution_id?: string;
  [key: string]: any;
}

export interface LogsListResponse {
  success: boolean;
  timestamp: string;
  data: LogEntry[];
  count: number; // Total count of items (after filters, before pagination)
}

export interface LogsFilters {
  dateStart?: string;
  dateEnd?: string;
  status?: string;
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
    offset: number = 0,
    filters?: LogsFilters
  ): Promise<LogsListResponse> {
    try {
      logger.debug('Fetching gateway logs', {
        component: 'logsApi',
        action: 'get_gateway_logs',
        gatewayId,
        limit,
        offset,
        filters,
      });
      
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      if (filters?.dateStart) {
        queryParams.append('date_start', filters.dateStart);
      }
      if (filters?.dateEnd) {
        queryParams.append('date_end', filters.dateEnd);
      }
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }
      
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
    offset: number = 0,
    filters?: LogsFilters
  ): Promise<LogsListResponse> {
    try {
      logger.debug('Fetching probe logs', {
        component: 'logsApi',
        action: 'get_probe_logs',
        probeId,
        limit,
        offset,
        filters,
      });
      
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      if (filters?.dateStart) {
        queryParams.append('date_start', filters.dateStart);
      }
      if (filters?.dateEnd) {
        queryParams.append('date_end', filters.dateEnd);
      }
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }
      
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

  /**
   * Get full probe execution log file
   */
  static async getProbeLogFile(
    executionId: string,
    probeId: string
  ): Promise<{ execution_id: string; content: string; timestamp: string }> {
    try {
      logger.debug('Fetching probe log file', {
        component: 'logsApi',
        action: 'get_probe_log_file',
        executionId,
        probeId,
      });
      
      const queryParams = new URLSearchParams();
      queryParams.append('probe_id', probeId);
      
      const response = await apiRequest('GET', `/api/logs/probe/execution/${executionId}?${queryParams.toString()}`);
      const result = await response.json();
      
      logger.debug('Probe log file fetched successfully', {
        component: 'logsApi',
        action: 'get_probe_log_file',
        executionId,
        contentLength: result.content?.length || 0,
      });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to fetch probe log file', err, {
        component: 'logsApi',
        action: 'get_probe_log_file',
        executionId,
        probeId,
      });
      throw err;
    }
  }
}
