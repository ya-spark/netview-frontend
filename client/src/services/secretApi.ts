/**
 * Secret API Service
 * 
 * Service functions for managing encrypted secrets
 */

import { apiRequest } from '@/lib/queryClient';
import type { Secret, SecretWithValue, SecretCreate, SecretUpdate } from '@/types/secret';

export class SecretApiService {
  /**
   * Create a new secret
   */
  static async createSecret(data: SecretCreate): Promise<Secret> {
    const response = await apiRequest('POST', '/api/secrets', data);
    return response.data;
  }

  /**
   * List all secrets (metadata only, no decrypted data)
   */
  static async listSecrets(secretType?: string): Promise<Secret[]> {
    const url = secretType 
      ? `/api/secrets?secret_type=${encodeURIComponent(secretType)}`
      : '/api/secrets';
    const response = await apiRequest('GET', url);
    return response.data;
  }

  /**
   * Get secret by ID with decrypted data
   * 
   * WARNING: This endpoint returns decrypted data and is logged for audit purposes
   */
  static async getSecret(secretId: string, decrypt: boolean = true): Promise<SecretWithValue> {
    const url = `/api/secrets/${secretId}${decrypt ? '?decrypt=true' : '?decrypt=false'}`;
    const response = await apiRequest('GET', url);
    return response.data;
  }

  /**
   * Get secret metadata without decrypted data
   */
  static async getSecretMetadata(secretId: string): Promise<Secret> {
    const response = await apiRequest('GET', `/api/secrets/${secretId}/metadata`);
    return response.data;
  }

  /**
   * Update secret
   */
  static async updateSecret(secretId: string, data: SecretUpdate): Promise<Secret> {
    const response = await apiRequest('PUT', `/api/secrets/${secretId}`, data);
    return response.data;
  }

  /**
   * Delete secret (soft delete)
   */
  static async deleteSecret(secretId: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiRequest('DELETE', `/api/secrets/${secretId}`);
    return response.data;
  }
}

/**
 * Helper function to create a secret from probe credentials
 */
export async function createSecretFromCredentials(
  name: string,
  credentialType: 'username_password' | 'api_key' | 'token',
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
  }
): Promise<Secret> {
  let secretData: Record<string, any> = {};
  let secretType: 'api_key' | 'username_password' | 'custom_key_value' = 'custom_key_value';

  if (credentialType === 'username_password' && credentials.username && credentials.password) {
    secretType = 'username_password';
    secretData = {
      username: credentials.username,
      password: credentials.password
    };
  } else if (credentialType === 'api_key' && credentials.apiKey) {
    secretType = 'api_key';
    secretData = {
      api_key: credentials.apiKey
    };
  } else if (credentialType === 'token' && credentials.token) {
    secretType = 'api_key'; // Treat token as api_key type
    secretData = {
      token: credentials.token
    };
  }

  return SecretApiService.createSecret({
    name,
    description: `Credentials for ${name}`,
    secret_type: secretType,
    secret_data: secretData,
    is_shared: false
  });
}

