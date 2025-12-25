/**
 * useScopes Hook
 * 
 * Hook for checking user permissions based on scopes
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserScopeService } from '@/services/userScopeApi';
import type { UserScopes } from '@/types/scope';

export function useScopes() {
  const { user } = useAuth();

  // Fetch user's scopes
  const {
    data: userScopesData,
    isLoading,
    error,
  } = useQuery<UserScopes>({
    queryKey: ['user-scopes', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required');
      return await UserScopeService.getUserScopes(user.id);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const scopes = userScopesData?.scopes || [];
  const role = userScopesData?.role || user?.role || '';
  const isCustom = userScopesData?.is_custom || false;

  /**
   * Check if user has a specific permission
   */
  const canPerform = (requiredScope: string): boolean => {
    if (isLoading || !scopes.length) return false;
    return UserScopeService.hasPermission(scopes, requiredScope);
  };

  /**
   * Check if user can perform any of the given permissions
   */
  const canPerformAny = (requiredScopes: string[]): boolean => {
    if (isLoading || !scopes.length) return false;
    return requiredScopes.some(scope => UserScopeService.hasPermission(scopes, scope));
  };

  /**
   * Check if user can perform all of the given permissions
   */
  const canPerformAll = (requiredScopes: string[]): boolean => {
    if (isLoading || !scopes.length) return false;
    return requiredScopes.every(scope => UserScopeService.hasPermission(scopes, scope));
  };

  /**
   * Check if user can access a specific resource group
   */
  const canAccessResourceGroup = (resourceGroup: string, action: string = 'read'): boolean => {
    const scope = UserScopeService.buildScope(resourceGroup, '*', '*', action);
    return canPerform(scope);
  };

  /**
   * Check if user can access a specific probe group
   */
  const canAccessProbeGroup = (
    resourceGroup: string,
    probeGroup: string,
    action: string = 'read'
  ): boolean => {
    const scope = UserScopeService.buildScope(resourceGroup, probeGroup, '*', action);
    return canPerform(scope);
  };

  /**
   * Check if user can manage other users
   */
  const canManageUsers = (): boolean => {
    return role === 'Owner' || role === 'Admin';
  };

  /**
   * Check if user is an owner
   */
  const isOwner = (): boolean => {
    return role === 'Owner';
  };

  /**
   * Check if user is an admin
   */
  const isAdmin = (): boolean => {
    return role === 'Admin';
  };

  /**
   * Check if user can edit another user's scopes
   * (cannot edit own scopes, must be Owner or Admin)
   */
  const canEditUserScopes = (targetUserId: string): boolean => {
    if (!canManageUsers()) return false;
    if (targetUserId === user?.id) return false; // Cannot edit own scopes
    return true;
  };

  /**
   * Get filtered scopes for a specific resource type
   */
  const getScopesForResource = (resource: string): string[] => {
    return scopes.filter(scope => {
      try {
        const parsed = UserScopeService.parseScope(scope);
        return parsed.parts.resource === resource || parsed.parts.resource === '*';
      } catch {
        return false;
      }
    });
  };

  /**
   * Get all resource groups user has access to
   */
  const getAccessibleResourceGroups = (): string[] => {
    const groups = new Set<string>();
    scopes.forEach(scope => {
      try {
        const parsed = UserScopeService.parseScope(scope);
        if (parsed.parts.resource_group !== '*') {
          groups.add(parsed.parts.resource_group);
        }
      } catch {
        // Skip invalid scopes
      }
    });
    return Array.from(groups);
  };

  /**
   * Get all probe groups user has access to in a resource group
   */
  const getAccessibleProbeGroups = (resourceGroup: string): string[] => {
    const groups = new Set<string>();
    scopes.forEach(scope => {
      try {
        const parsed = UserScopeService.parseScope(scope);
        if (
          (parsed.parts.resource_group === resourceGroup || parsed.parts.resource_group === '*') &&
          parsed.parts.probe_group !== '*'
        ) {
          groups.add(parsed.parts.probe_group);
        }
      } catch {
        // Skip invalid scopes
      }
    });
    return Array.from(groups);
  };

  return {
    // Scope data
    scopes,
    role,
    isCustom,
    isLoading,
    error,

    // Permission checks
    canPerform,
    canPerformAny,
    canPerformAll,
    canAccessResourceGroup,
    canAccessProbeGroup,

    // Role checks
    canManageUsers,
    isOwner,
    isAdmin,
    canEditUserScopes,

    // Scope utilities
    getScopesForResource,
    getAccessibleResourceGroups,
    getAccessibleProbeGroups,
  };
}

export default useScopes;

