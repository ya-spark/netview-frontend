// Tenant API service functions for organization/tenant management

import { apiRequest } from '../lib/queryClient';

/**
 * Generate a tenant ID from organization name
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 * @param orgName - Organization name
 * @returns Generated tenant ID
 */
export function generateTenantId(orgName: string): string {
  if (!orgName || orgName.trim().length === 0) {
    return '';
  }

  // Convert to lowercase, remove special characters, replace spaces with hyphens
  const tenantId = orgName
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all characters except alphanumeric and hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');

  return tenantId;
}

/**
 * Validate tenant ID availability from backend
 * @param tenantId - Tenant ID to validate
 * @returns Promise that resolves with validation result
 */
export async function validateTenantIdAvailability(tenantId: string): Promise<{ available: boolean; message?: string }> {
  if (!tenantId || tenantId.trim().length === 0) {
    return { available: false, message: 'Tenant ID is required' };
  }

  try {
    logger.debug('Validating tenant ID availability', {
      component: 'tenantApi',
      action: 'validate_tenant_id',
      tenantId,
    });
    
    // TODO: Uncomment when backend endpoint is ready
    // const response = await apiRequest('GET', `/api/tenants/validate/${encodeURIComponent(tenantId)}`);
    // const responseData = await response.json();
    // 
    // return {
    //   available: responseData.available === true,
    //   message: responseData.message,
    // };

    // Placeholder: Return available for now (backend integration pending)
    logger.warn('Tenant ID validation not yet integrated with backend', {
      component: 'tenantApi',
      action: 'validate_tenant_id',
    });
    return { available: true };
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error validating tenant ID', err, {
      component: 'tenantApi',
      action: 'validate_tenant_id',
      tenantId,
    });
    
    // If it's a 404, tenant ID is available
    if (error.status === 404) {
      return { available: true };
    }
    
    // If it's a 409, tenant ID is taken
    if (error.status === 409) {
      return { available: false, message: 'This tenant ID is already taken' };
    }
    
    // For other errors, assume not available to be safe
    return { 
      available: false, 
      message: error.message || 'Failed to validate tenant ID. Please try again.' 
    };
  }
}

/**
 * Create a new tenant/organization
 * @param name - Organization name
 * @param tenantId - Tenant ID (optional, will be generated from name if not provided)
 * @returns Promise that resolves with created Tenant object
 */
export async function createTenant(name: string, tenantId?: string): Promise<any> {
  if (!name || name.trim().length === 0) {
    throw new Error('Organization name is required');
  }

  // Generate tenant ID if not provided
  const finalTenantId = tenantId || generateTenantId(name);
  
  if (!finalTenantId || finalTenantId.trim().length === 0) {
    throw new Error('Unable to generate tenant ID from organization name');
  }

  logger.info('Creating tenant', {
    component: 'tenantApi',
    action: 'create_tenant',
    tenantName: name,
    tenantId: finalTenantId,
  });

  try {
    const response = await apiRequest('POST', '/api/tenants', {
      name,
      tenantId: finalTenantId || undefined,
    });
    
    const responseData = await response.json();
    const tenant = responseData.data || responseData;
    
    if (!tenant || !tenant.id) {
      logger.error('Invalid tenant creation response', new Error('Tenant data is missing'), {
        component: 'tenantApi',
        action: 'create_tenant',
      }, responseData);
      throw new Error('Invalid response from tenant creation endpoint. Tenant data is missing.');
    }
    
    logger.info('Tenant created successfully', {
      component: 'tenantApi',
      action: 'create_tenant',
      tenantId: tenant.id,
      tenantName: tenant.name,
    });
    return tenant;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error creating tenant', err, {
      component: 'tenantApi',
      action: 'create_tenant',
      tenantName: name,
    });
    throw error;
  }
}

