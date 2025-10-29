// Probe API service functions based on NetView API OpenAPI specification

import { apiRequest } from '../lib/queryClient';
import type {
  ProbeCreate,
  ProbeUpdate,
  ProbeListResponse,
  ProbeSingleResponse,
  ProbeResultsListResponse,
  ProbeStatusResponse,
  ProbeTypesResponse,
  ProbeListParams,
  ProbeTypesParams,
  ProbeResultsParams,
  ProbeHistoryParams,
} from '../types/probe';

/**
 * Probe API service class for all probe-related operations
 */
export class ProbeApiService {
  /**
   * List all probes for the authenticated tenant with optional filtering
   */
  static async listProbes(params?: ProbeListParams): Promise<ProbeListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.category) queryParams.append('category', params.category);
    if (params?.probe_type) queryParams.append('probe_type', params.probe_type);
    if (params?.gateway_type) queryParams.append('gateway_type', params.gateway_type);
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active === true || params.is_active === 'true' ? 'true' : 'false');
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/probes?${queryString}` : '/api/probes';
    
    const response = await apiRequest('GET', url);
    return response.json();
  }

  /**
   * Get a specific probe by ID
   */
  static async getProbe(probeId: string): Promise<ProbeSingleResponse> {
    const response = await apiRequest('GET', `/api/probes/${probeId}`);
    return response.json();
  }

  /**
   * Create a new probe
   */
  static async createProbe(probeData: ProbeCreate): Promise<ProbeSingleResponse> {
    const response = await apiRequest('POST', '/api/probes', probeData);
    return response.json();
  }

  /**
   * Update an existing probe
   */
  static async updateProbe(probeId: string, probeData: ProbeUpdate): Promise<ProbeSingleResponse> {
    const response = await apiRequest('PUT', `/api/probes/${probeId}`, probeData);
    return response.json();
  }

  /**
   * Delete a probe
   */
  static async deleteProbe(probeId: string): Promise<{ message: string }> {
    const response = await apiRequest('DELETE', `/api/probes/${probeId}`);
    return response.json();
  }

  /**
   * Start a probe
   */
  static async startProbe(probeId: string): Promise<{ message: string }> {
    const response = await apiRequest('POST', `/api/probes/${probeId}/start`);
    return response.json();
  }

  /**
   * Stop a probe
   */
  static async stopProbe(probeId: string): Promise<{ message: string }> {
    const response = await apiRequest('POST', `/api/probes/${probeId}/stop`);
    return response.json();
  }

  /**
   * Get probe results
   */
  static async getProbeResults(
    probeId: string,
    params?: ProbeResultsParams
  ): Promise<ProbeResultsListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `/api/probes/${probeId}/results?${queryString}` 
      : `/api/probes/${probeId}/results`;
    
    const response = await apiRequest('GET', url);
    return response.json();
  }

  /**
   * Get probe history
   */
  static async getProbeHistory(
    probeId: string,
    params?: ProbeHistoryParams
  ): Promise<ProbeResultsListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.days) queryParams.append('days', params.days.toString());
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `/api/probes/${probeId}/history?${queryString}` 
      : `/api/probes/${probeId}/history`;
    
    const response = await apiRequest('GET', url);
    return response.json();
  }

  /**
   * Get probe status
   */
  static async getProbeStatus(probeId: string): Promise<ProbeStatusResponse> {
    const response = await apiRequest('GET', `/api/probes/${probeId}/status`);
    return response.json();
  }

  /**
   * Get probe types, optionally filtered by category
   */
  static async getProbeTypes(params?: ProbeTypesParams): Promise<ProbeTypesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.category) queryParams.append('category', params.category);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/probes/types?${queryString}` : '/api/probes/types';
    
    const response = await apiRequest('GET', url);
    return response.json();
  }
}

/**
 * Utility functions for probe operations
 */
export class ProbeUtils {
  /**
   * Format probe status for display
   */
  static formatProbeStatus(status: string): { label: string; color: string } {
    switch (status) {
      case 'Success':
        return { label: 'Success', color: 'text-green-600' };
      case 'Failure':
        return { label: 'Failure', color: 'text-red-600' };
      case 'Warning':
        return { label: 'Warning', color: 'text-yellow-600' };
      case 'unknown':
        return { label: 'Unknown', color: 'text-gray-600' };
      default:
        return { label: 'Unknown', color: 'text-gray-600' };
    }
  }

  /**
   * Format probe category for display
   */
  static formatProbeCategory(category: string): { label: string; color: string } {
    const colors = {
      'Uptime': 'bg-primary/10 text-primary',
      'API': 'bg-secondary/10 text-secondary',
      'Security': 'bg-purple-100 text-purple-700',
      'Browser': 'bg-green-100 text-green-700',
    };
    
    return {
      label: category,
      color: colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground'
    };
  }

  /**
   * Get configuration display value based on probe type
   */
  static getConfigDisplay(probe: { type: string; configuration?: Record<string, any> }): string {
    const config = probe.configuration || {};
    switch (probe.type) {
      case 'HTTP/HTTPS':
      case 'Authentication':
        return config.url || 'No URL configured';
      case 'ICMP/Ping':
        return config.host || 'No host configured';
      case 'DNS Resolution':
        return config.domain || 'No domain configured';
      case 'SSL/TLS':
        return config.host ? `${config.host}:${config.port || 443}` : 'No host configured';
      default:
        return 'Configuration not set';
    }
  }
}

