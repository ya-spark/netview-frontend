// Gateway API service functions based on NetView API OpenAPI specification

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  GatewayCreate,
  GatewayUpdate,
  GatewayResponse,
  GatewayListResponse,
  GatewaySingleResponse,
  GatewayRegistrationRequest,
  GatewayRegistrationResponse,
  GatewayResultsSubmission,
  GatewayHeartbeat,
  RegistrationKeyResponse,
  AuditLogListResponse,
  LogsBreakdown,
  DbBreakdown,
} from '../types/gateway';
import type { SingleResponse } from '../types/probe';

/**
 * Gateway API service class for all gateway-related operations
 */
export class GatewayApiService {
  /**
   * List all gateways for the authenticated tenant
   */
  static async listGateways(): Promise<GatewayListResponse> {
    const response = await apiRequest('GET', '/api/gateways');
    return response.json();
  }

  /**
   * Get shared gateways available to all tenants
   */
  static async getSharedGateways(): Promise<GatewayListResponse> {
    const response = await apiRequest('GET', '/api/gateways/shared');
    return response.json();
  }

  /**
   * Get a specific gateway by ID
   */
  static async getGateway(gatewayId: string): Promise<GatewaySingleResponse> {
    const response = await apiRequest('GET', `/api/gateways/${gatewayId}`);
    return response.json();
  }

  /**
   * Get gateway uptime
   */
  static async getGatewayUptime(gatewayId: string): Promise<SingleResponse> {
    const response = await apiRequest('GET', `/api/gateways/${gatewayId}/uptime`);
    return response.json();
  }

  /**
   * Create a new gateway
   */
  static async createGateway(gatewayData: GatewayCreate): Promise<GatewaySingleResponse> {
    logger.info('Creating gateway', {
      component: 'gatewayApi',
      action: 'create_gateway',
      gatewayName: gatewayData.name,
      gatewayType: gatewayData.type,
    });
    const response = await apiRequest('POST', '/api/gateways', gatewayData);
    const result = await response.json();
    logger.info('Gateway created successfully', {
      component: 'gatewayApi',
      action: 'create_gateway',
      gatewayId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing gateway
   */
  static async updateGateway(gatewayId: string, gatewayData: GatewayUpdate): Promise<GatewaySingleResponse> {
    logger.info('Updating gateway', {
      component: 'gatewayApi',
      action: 'update_gateway',
      gatewayId,
    });
    const response = await apiRequest('PUT', `/api/gateways/${gatewayId}`, gatewayData);
    const result = await response.json();
    logger.info('Gateway updated successfully', {
      component: 'gatewayApi',
      action: 'update_gateway',
      gatewayId,
    });
    return result;
  }

  /**
   * Delete a gateway
   */
  static async deleteGateway(gatewayId: string): Promise<{ message: string }> {
    logger.info('Deleting gateway', {
      component: 'gatewayApi',
      action: 'delete_gateway',
      gatewayId,
    });
    const response = await apiRequest('DELETE', `/api/gateways/${gatewayId}`);
    const result = await response.json();
    logger.info('Gateway deleted successfully', {
      component: 'gatewayApi',
      action: 'delete_gateway',
      gatewayId,
    });
    return result;
  }

  /**
   * Regenerate registration key for a gateway
   */
  static async regenerateRegistrationKey(gatewayId: string): Promise<RegistrationKeyResponse> {
    const response = await apiRequest('POST', `/api/gateways/${gatewayId}/regenerate-key`);
    return response.json();
  }

  /**
   * Download registration key for a gateway as a text file
   */
  static async downloadRegistrationKey(gatewayId: string): Promise<string> {
    const response = await apiRequest('GET', `/api/gateways/${gatewayId}/download-key`);
    return response.text();
  }

  /**
   * Get audit logs for a specific gateway
   */
  static async getGatewayAuditLogs(
    gatewayId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/api/gateways/${gatewayId}/audit-logs?${queryString}` : `/api/gateways/${gatewayId}/audit-logs`;
    
    const response = await apiRequest('GET', url);
    return response.json();
  }

  /**
   * Register a gateway with the controller using a registration key
   */
  static async registerGateway(registrationData: GatewayRegistrationRequest): Promise<GatewayRegistrationResponse> {
    const response = await apiRequest('POST', '/gateways/register', registrationData);
    return response.json();
  }

  /**
   * Get assigned probes for a gateway (Gateway API)
   */
  static async getAssignedProbes(gatewayId: string): Promise<any> {
    const response = await apiRequest('GET', `/gateways/${gatewayId}/probes`);
    return response.json();
  }

  /**
   * Submit probe results from a gateway (Gateway API)
   */
  static async submitProbeResults(gatewayId: string, results: GatewayResultsSubmission): Promise<{ success: boolean; message: string; timestamp: string }> {
    const response = await apiRequest('POST', `/gateways/${gatewayId}/results`, results);
    return response.json();
  }

  /**
   * Send heartbeat signal from a gateway (Gateway API)
   */
  static async sendHeartbeat(gatewayId: string, heartbeatData: GatewayHeartbeat): Promise<{ success: boolean; message: string; timestamp: string }> {
    const response = await apiRequest('POST', `/gateways/${gatewayId}/heartbeat`, heartbeatData);
    return response.json();
  }
}

/**
 * Utility functions for gateway operations
 */
export class GatewayUtils {
  /**
   * Generate a registration key (64-character hex string)
   */
  static generateRegistrationKey(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format gateway status for display
   */
  static formatGatewayStatus(status: string): { label: string; color: string } {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'text-green-600' };
      case 'registered':
        return { label: 'Registered', color: 'text-blue-600' };
      case 'pending':
        return { label: 'Pending', color: 'text-yellow-600' };
      case 'revoked':
        return { label: 'Revoked', color: 'text-red-600' };
      default:
        return { label: 'Unknown', color: 'text-gray-600' };
    }
  }

  /**
   * Format gateway type for display
   */
  static formatGatewayType(type: string): { label: string; description: string } {
    switch (type) {
      case 'Core':
        return { 
          label: 'Core Gateway', 
          description: 'Managed by NetView platform, available to all tenants' 
        };
      case 'TenantSpecific':
        return { 
          label: 'Custom Gateway', 
          description: 'Deployed by tenant, private monitoring' 
        };
      default:
        return { 
          label: 'Unknown', 
          description: 'Unknown gateway type' 
        };
    }
  }

  /**
   * Get logs breakdown for a gateway
   */
  static async getGatewayLogsBreakdown(gatewayId: string): Promise<SingleResponse<LogsBreakdown>> {
    const response = await apiRequest('GET', `/api/gateways/${gatewayId}/logs-breakdown`);
    return response.json();
  }

  /**
   * Get DB breakdown for a gateway
   */
  static async getGatewayDbBreakdown(gatewayId: string): Promise<SingleResponse<DbBreakdown>> {
    const response = await apiRequest('GET', `/api/gateways/${gatewayId}/db-breakdown`);
    return response.json();
  }

  /**
   * Check if gateway is online based on last heartbeat
   */
  static isGatewayOnline(lastHeartbeat?: string): boolean {
    if (!lastHeartbeat) return false;
    
    const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
    const now = Date.now();
    const timeDiff = now - lastHeartbeatTime;
    
    // Consider gateway online if heartbeat was within last 60 seconds
    return timeDiff < 60000;
  }

  /**
   * Format last heartbeat time for display
   */
  static formatLastHeartbeat(lastHeartbeat?: string): string {
    if (!lastHeartbeat) return 'Never';
    
    const lastHeartbeatTime = new Date(lastHeartbeat);
    const now = new Date();
    const timeDiff = now.getTime() - lastHeartbeatTime.getTime();
    
    if (timeDiff < 60000) {
      return 'Just now';
    } else if (timeDiff < 3600000) {
      const minutes = Math.floor(timeDiff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (timeDiff < 86400000) {
      const hours = Math.floor(timeDiff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(timeDiff / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }
}
