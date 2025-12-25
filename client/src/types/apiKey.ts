/**
 * API Key Types
 * 
 * Types for API key management and authentication
 */

export interface ApiKey {
  id: string;
  tenant_id: number;
  user_id: string;
  name: string;
  scopes: string[];
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreate {
  name: string;
  scopes: string[];
  expires_at: string;
  description?: string;
}

export interface ApiKeyCreateResponse {
  api_key: ApiKey;
  key: string; // Full API key - only returned once
}

export interface ApiKeyUpdate {
  name?: string;
  scopes?: string[];
  is_active?: boolean;
}

export interface ApiKeyListResponse {
  data: ApiKey[];
  total: number;
}

export interface ApiKeyDetailsResponse {
  data: ApiKey;
}

