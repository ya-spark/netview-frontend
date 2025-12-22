// Resource Group API service functions

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';
import type {
  ResourceGroupCreate,
  ResourceGroupUpdate,
  ResourceGroupListResponse,
  ResourceGroupSingleResponse,
} from '../types/resourceGroup';

/**
 * Resource Group API service class for all resource group-related operations
 */
export class ResourceGroupApiService {
  /**
   * List all resource groups for the authenticated tenant
   */
  static async listResourceGroups(): Promise<ResourceGroupListResponse> {
    logger.debug('Listing resource groups', {
      component: 'resourceGroupApi',
      action: 'list_resource_groups',
    });
    
    const response = await apiRequest('GET', '/api/resource-groups');
    const result = await response.json();
    
    logger.info('Resource groups listed successfully', {
      component: 'resourceGroupApi',
      action: 'list_resource_groups',
      count: result?.data?.length || 0,
    });
    
    return result;
  }

  /**
   * Get a specific resource group by ID
   */
  static async getResourceGroup(groupId: string): Promise<ResourceGroupSingleResponse> {
    logger.debug('Getting resource group', {
      component: 'resourceGroupApi',
      action: 'get_resource_group',
      groupId,
    });
    
    const response = await apiRequest('GET', `/api/resource-groups/${groupId}`);
    const result = await response.json();
    
    logger.debug('Resource group retrieved successfully', {
      component: 'resourceGroupApi',
      action: 'get_resource_group',
      groupId,
    });
    
    return result;
  }

  /**
   * Create a new resource group
   */
  static async createResourceGroup(groupData: ResourceGroupCreate): Promise<ResourceGroupSingleResponse> {
    logger.info('Creating resource group', {
      component: 'resourceGroupApi',
      action: 'create_resource_group',
      groupName: groupData.name,
    });
    const response = await apiRequest('POST', '/api/resource-groups', groupData);
    const result = await response.json();
    logger.info('Resource group created successfully', {
      component: 'resourceGroupApi',
      action: 'create_resource_group',
      groupId: result?.data?.id,
    });
    return result;
  }

  /**
   * Update an existing resource group
   */
  static async updateResourceGroup(groupId: string, groupData: ResourceGroupUpdate): Promise<ResourceGroupSingleResponse> {
    logger.info('Updating resource group', {
      component: 'resourceGroupApi',
      action: 'update_resource_group',
      groupId,
    });
    const response = await apiRequest('PUT', `/api/resource-groups/${groupId}`, groupData);
    const result = await response.json();
    logger.info('Resource group updated successfully', {
      component: 'resourceGroupApi',
      action: 'update_resource_group',
      groupId,
    });
    return result;
  }

  /**
   * Delete a resource group
   */
  static async deleteResourceGroup(groupId: string): Promise<void> {
    logger.info('Deleting resource group', {
      component: 'resourceGroupApi',
      action: 'delete_resource_group',
      groupId,
    });
    await apiRequest('DELETE', `/api/resource-groups/${groupId}`);
    logger.info('Resource group deleted successfully', {
      component: 'resourceGroupApi',
      action: 'delete_resource_group',
      groupId,
    });
  }
}

