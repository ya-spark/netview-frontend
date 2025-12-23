/**
 * Secret Management Types
 * 
 * Types for managing encrypted secrets in the NetView platform
 */

export type SecretType = 
  | 'api_key' 
  | 'username_password' 
  | 'certificate' 
  | 'json_config' 
  | 'custom_key_value';

/**
 * Secret metadata (without decrypted data)
 */
export interface Secret {
  id: string;
  tenant_id: number;
  name: string;
  description?: string;
  secret_type: SecretType;
  is_shared: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

/**
 * Secret with decrypted data
 */
export interface SecretWithValue extends Secret {
  secret_data: Record<string, any>;
}

/**
 * Create secret request
 */
export interface SecretCreate {
  name: string;
  description?: string;
  secret_type: SecretType;
  secret_data: Record<string, any>;
  is_shared?: boolean;
}

/**
 * Update secret request
 */
export interface SecretUpdate {
  name?: string;
  description?: string;
  secret_data?: Record<string, any>;
  is_shared?: boolean;
}

/**
 * Secret metadata for UI display
 */
export interface SecretMetadata {
  id: string;
  name: string;
  secret_type: SecretType;
  created_at: string;
  last_accessed_at?: string;
}

