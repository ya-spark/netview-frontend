/**
 * User Scope Service
 * 
 * Service for managing user authorization scopes
 */

import { apiRequest } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import type { 
  UserScopes, 
  RoleTemplate, 
  ScopeValidationResult,
  UserScopesUpdate,
  ParsedScope 
} from '@/types/scope';

export class UserScopeService {
  /**
   * Get user's current scopes
   */
  static async getUserScopes(userId: string): Promise<UserScopes> {
    logger.debug('Getting user scopes', {
      component: 'UserScopeService',
      action: 'get_user_scopes',
      userId,
    });

    const response = await apiRequest('GET', `/api/users/${userId}/scopes`);
    const data = await response.json();

    logger.info('User scopes retrieved', {
      component: 'UserScopeService',
      action: 'get_user_scopes',
      userId,
      scopeCount: data.data?.scopes?.length || 0,
    });

    return data.data;
  }

  /**
   * Update user's scopes
   */
  static async updateUserScopes(userId: string, update: UserScopesUpdate): Promise<UserScopes> {
    logger.info('Updating user scopes', {
      component: 'UserScopeService',
      action: 'update_user_scopes',
      userId,
      scopeCount: update.scopes.length,
      isCustom: update.is_custom,
    });

    const response = await apiRequest('PUT', `/api/users/${userId}/scopes`, update);
    const data = await response.json();

    logger.info('User scopes updated successfully', {
      component: 'UserScopeService',
      action: 'update_user_scopes',
      userId,
    });

    return data.data;
  }

  /**
   * Get available role templates
   */
  static async getRoleTemplates(): Promise<RoleTemplate[]> {
    logger.debug('Getting role templates', {
      component: 'UserScopeService',
      action: 'get_role_templates',
    });

    const response = await apiRequest('GET', '/api/scopes/templates');
    const data = await response.json();

    logger.info('Role templates retrieved', {
      component: 'UserScopeService',
      action: 'get_role_templates',
      count: data.data?.length || 0,
    });

    return data.data;
  }

  /**
   * Validate scopes against user's scope boundary
   */
  static async validateScopes(scopes: string[], userId?: string): Promise<ScopeValidationResult> {
    logger.debug('Validating scopes', {
      component: 'UserScopeService',
      action: 'validate_scopes',
      scopeCount: scopes.length,
      userId,
    });

    const response = await apiRequest('POST', '/api/scopes/validate', {
      scopes,
      user_id: userId,
    });
    const data = await response.json();

    logger.info('Scopes validated', {
      component: 'UserScopeService',
      action: 'validate_scopes',
      valid: data.data?.valid,
      errorCount: data.data?.errors?.length || 0,
    });

    return data.data;
  }

  /**
   * Parse a scope string into its components
   */
  static parseScope(scopeString: string): ParsedScope {
    const parts = scopeString.split(':');
    
    if (parts.length < 4) {
      throw new Error(`Invalid scope format: ${scopeString}`);
    }

    const [rgLabel, rgValue, pgLabel, pgValue, ...rest] = parts;
    const resource = rest.length >= 2 ? rest[rest.length - 2] : '*';
    const action = rest[rest.length - 1];

    const isWildcard = scopeString.includes('*');
    
    let level: 'platform' | 'resource_group' | 'probe_group' | 'resource';
    if (rgValue === '*') {
      level = 'platform';
    } else if (pgValue === '*') {
      level = 'resource_group';
    } else if (resource === '*') {
      level = 'probe_group';
    } else {
      level = 'resource';
    }

    return {
      raw: scopeString,
      parts: {
        resource_group: rgValue,
        probe_group: pgValue,
        resource: resource as any,
        action: action as any,
      },
      isWildcard,
      level,
    };
  }

  /**
   * Build a scope string from components
   */
  static buildScope(
    resourceGroup: string,
    probeGroup: string,
    resource: string,
    action: string
  ): string {
    return `resource_group:${resourceGroup}:probe_group:${probeGroup}:${resource}:${action}`;
  }

  /**
   * Check if a scope grants a specific permission
   */
  static scopeGrantsPermission(userScope: string, requiredScope: string): boolean {
    const user = this.parseScope(userScope);
    const required = this.parseScope(requiredScope);

    // Check resource group
    if (user.parts.resource_group !== '*' && 
        user.parts.resource_group !== required.parts.resource_group) {
      return false;
    }

    // Check probe group
    if (user.parts.probe_group !== '*' && 
        user.parts.probe_group !== required.parts.probe_group) {
      return false;
    }

    // Check resource
    if (user.parts.resource !== '*' && 
        user.parts.resource !== required.parts.resource) {
      return false;
    }

    // Check action
    if (user.parts.action !== '*' && 
        user.parts.action !== required.parts.action) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has permission based on their scopes
   */
  static hasPermission(userScopes: string[], requiredScope: string): boolean {
    return userScopes.some(scope => this.scopeGrantsPermission(scope, requiredScope));
  }

  /**
   * Format scope for human-readable display
   */
  static formatScopeForDisplay(scope: string): string {
    try {
      const parsed = this.parseScope(scope);
      const { resource_group, probe_group, resource, action } = parsed.parts;

      const parts = [];
      
      if (resource_group !== '*') {
        parts.push(`Resource Group: ${resource_group}`);
      } else {
        parts.push('All Resource Groups');
      }

      if (probe_group !== '*') {
        parts.push(`Probe Group: ${probe_group}`);
      } else if (resource_group !== '*') {
        parts.push('All Probe Groups');
      }

      if (resource !== '*') {
        parts.push(`Resource: ${resource}`);
      } else if (probe_group !== '*') {
        parts.push('All Resources');
      }

      if (action !== '*') {
        parts.push(`Action: ${action}`);
      } else {
        parts.push('All Actions');
      }

      return parts.join(' → ');
    } catch (error) {
      return scope;
    }
  }

  /**
   * Get scope hierarchy level display name
   */
  static getScopeLevelName(scope: string): string {
    try {
      const parsed = this.parseScope(scope);
      const levelNames = {
        platform: 'Platform-wide',
        resource_group: 'Resource Group',
        probe_group: 'Probe Group',
        resource: 'Specific Resource',
      };
      return levelNames[parsed.level];
    } catch {
      return 'Unknown';
    }
  }
}

export default UserScopeService;

