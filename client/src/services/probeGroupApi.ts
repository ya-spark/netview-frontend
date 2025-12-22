// Probe Group API service functions

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  ProbeGroupCreate,
  ProbeGroupUpdate,
  ProbeGroupListResponse,
  ProbeGroupSingleResponse,
} from '../types/probeGroup';
import type { ProbeListResponse } from '../types/probe';

/**
 * Probe Group API service class for all probe group-related operations
 */
export class ProbeGroupApiService {
  /**
   * List all probe groups for the authenticated tenant
   */
  static async listProbeGroups(): Promise<ProbeGroupListResponse> {
    logger.debug('Listing probe groups', {
      component: 'probeGroupApi',
      action: 'list_probe_groups',
    });
    
    const response = await apiRequest('GET', '/api/probe-groups');
    const result = await response.json();
    
    logger.info('Probe groups listed successfully', {
      component: 'probeGroupApi',
      action: 'list_probe_groups',
      count: result?.data?.length || 0,
    });
    
    return result;
  }

  /**
   * Get a specific probe group by ID
   */
  static async getProbeGroup(groupId: string): Promise<ProbeGroupSingleResponse> {
    logger.debug('Getting probe group', {
      component: 'probeGroupApi',
      action: 'get_probe_group',
      groupId,
    });
    
    const response = await apiRequest('GET', `/api/probe-groups/${groupId}`);
    const result = await response.json();
    
    logger.debug('Probe group retrieved successfully', {
      component: 'probeGroupApi',
      action: 'get_probe_group',
      groupId,
    });
    
    return result;
  }

  /**
   * Get all probes in a specific probe group
   */
  static async getProbesByGroup(groupId: string): Promise<ProbeListResponse> {
    logger.debug('Getting probes by group', {
      component: 'probeGroupApi',
      action: 'get_probes_by_group',
      groupId,
    });
    
    const response = await apiRequest('GET', `/api/probe-groups/${groupId}/probes`);
    const result = await response.json();
    
    logger.info('Probes retrieved for group successfully', {
      component: 'probeGroupApi',
      action: 'get_probes_by_group',
      groupId,
      count: result?.data?.length || 0,
    });
    
    return result;
  }

  /**
   * Create a new probe group
   */
  static async createProbeGroup(groupData: ProbeGroupCreate): Promise<ProbeGroupSingleResponse> {
    logger.info('Creating probe group', {
      component: 'probeGroupApi',
      action: 'create_probe_group',
      groupName: groupData.name,
    });
    const response = await apiRequest('POST', '/api/probe-groups', groupData);
    const result = await response.json();
    logger.info('Probe group created successfully', {
      component: 'probeGroupApi',
      action: 'create_probe_group',
      groupId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing probe group
   */
  static async updateProbeGroup(groupId: string, groupData: ProbeGroupUpdate): Promise<ProbeGroupSingleResponse> {
    logger.info('Updating probe group', {
      component: 'probeGroupApi',
      action: 'update_probe_group',
      groupId,
    });
    const response = await apiRequest('PUT', `/api/probe-groups/${groupId}`, groupData);
    const result = await response.json();
    logger.info('Probe group updated successfully', {
      component: 'probeGroupApi',
      action: 'update_probe_group',
      groupId,
    });
    return result;
  }

  /**
   * Delete a probe group
   */
  static async deleteProbeGroup(groupId: string): Promise<void> {
    logger.info('Deleting probe group', {
      component: 'probeGroupApi',
      action: 'delete_probe_group',
      groupId,
    });
    await apiRequest('DELETE', `/api/probe-groups/${groupId}`);
    logger.info('Probe group deleted successfully', {
      component: 'probeGroupApi',
      action: 'delete_probe_group',
      groupId,
    });
  }
}

