/**
 * Scope Types
 * 
 * Types for authorization scopes and permissions
 */

export type ScopeAction = 'read' | 'write' | 'delete' | 'manage' | '*';

export type ScopeResource = 
  | 'probes' 
  | 'gateways' 
  | 'results' 
  | 'alerts' 
  | 'notifications'
  | 'users'
  | 'tenants'
  | 'resource_groups'
  | 'probe_groups'
  | 'secrets'
  | '*';

export interface Scope {
  resource_group: string; // e.g., "prod", "staging", "*"
  probe_group?: string;   // e.g., "critical", "monitoring", "*"
  resource: ScopeResource;
  action: ScopeAction;
}

export interface ParsedScope {
  raw: string; // Original scope string
  parts: {
    resource_group: string;
    probe_group: string;
    resource: ScopeResource;
    action: ScopeAction;
  };
  isWildcard: boolean;
  level: 'platform' | 'resource_group' | 'probe_group' | 'resource';
}

export interface UserScopes {
  user_id: string;
  user_email: string;
  role: string;
  scopes: string[];
  is_custom: boolean; // true if custom scopes, false if derived from role
  inherited_from_role?: string;
}

export interface RoleTemplate {
  role: string;
  display_name: string;
  description: string;
  scopes: string[];
  is_platform_level: boolean;
}

export interface ScopeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UserScopesUpdate {
  scopes: string[];
  is_custom: boolean;
}

export interface ScopeTreeNode {
  id: string;
  label: string;
  type: 'resource_group' | 'probe_group' | 'resource' | 'action';
  scope?: string; // Full scope string
  children?: ScopeTreeNode[];
  selected?: boolean;
  parent?: string;
}

