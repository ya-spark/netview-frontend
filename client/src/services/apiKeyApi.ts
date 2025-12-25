/**
 * API Key Service
 * 
 * Service for managing user API keys
 */

import { apiRequest } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import type { 
  ApiKey, 
  ApiKeyCreate, 
  ApiKeyCreateResponse,
  ApiKeyUpdate,
  ApiKeyListResponse,
  ApiKeyDetailsResponse 
} from '@/types/apiKey';

export class ApiKeyService {
  private static BASE_URL = '/api/api-keys';

  /**
   * List all API keys for the current user
   */
  static async listApiKeys(): Promise<ApiKeyListResponse> {
    logger.debug('Listing API keys', {
      component: 'ApiKeyService',
      action: 'list_api_keys',
    });

    const response = await apiRequest('GET', this.BASE_URL);
    const data = await response.json();

    logger.info('API keys listed successfully', {
      component: 'ApiKeyService',
      action: 'list_api_keys',
      count: data.data?.length || 0,
    });

    return data;
  }

  /**
   * Get details of a specific API key
   */
  static async getApiKey(id: string): Promise<ApiKeyDetailsResponse> {
    logger.debug('Getting API key details', {
      component: 'ApiKeyService',
      action: 'get_api_key',
      apiKeyId: id,
    });

    const response = await apiRequest('GET', `${this.BASE_URL}/${id}`);
    const data = await response.json();

    logger.info('API key details retrieved', {
      component: 'ApiKeyService',
      action: 'get_api_key',
      apiKeyId: id,
    });

    return data;
  }

  /**
   * Create a new API key
   * Returns the full key only once - must be saved by user
   */
  static async createApiKey(data: ApiKeyCreate): Promise<ApiKeyCreateResponse> {
    logger.info('Creating API key', {
      component: 'ApiKeyService',
      action: 'create_api_key',
      name: data.name,
      scopeCount: data.scopes.length,
    });

    const response = await apiRequest('POST', this.BASE_URL, data);
    const result = await response.json();

    logger.info('API key created successfully', {
      component: 'ApiKeyService',
      action: 'create_api_key',
      apiKeyId: result.data?.api_key?.id,
    });

    return result.data;
  }

  /**
   * Update an existing API key
   */
  static async updateApiKey(id: string, data: ApiKeyUpdate): Promise<ApiKeyDetailsResponse> {
    logger.info('Updating API key', {
      component: 'ApiKeyService',
      action: 'update_api_key',
      apiKeyId: id,
    });

    const response = await apiRequest('PATCH', `${this.BASE_URL}/${id}`, data);
    const result = await response.json();

    logger.info('API key updated successfully', {
      component: 'ApiKeyService',
      action: 'update_api_key',
      apiKeyId: id,
    });

    return result;
  }

  /**
   * Revoke an API key (sets is_active to false)
   */
  static async revokeApiKey(id: string): Promise<void> {
    logger.info('Revoking API key', {
      component: 'ApiKeyService',
      action: 'revoke_api_key',
      apiKeyId: id,
    });

    await apiRequest('PATCH', `${this.BASE_URL}/${id}/revoke`);

    logger.info('API key revoked successfully', {
      component: 'ApiKeyService',
      action: 'revoke_api_key',
      apiKeyId: id,
    });
  }

  /**
   * Delete an API key permanently
   */
  static async deleteApiKey(id: string): Promise<void> {
    logger.info('Deleting API key', {
      component: 'ApiKeyService',
      action: 'delete_api_key',
      apiKeyId: id,
    });

    await apiRequest('DELETE', `${this.BASE_URL}/${id}`);

    logger.info('API key deleted successfully', {
      component: 'ApiKeyService',
      action: 'delete_api_key',
      apiKeyId: id,
    });
  }

  /**
   * Format API key for display (show prefix only)
   */
  static formatApiKeyForDisplay(key: string, prefixLength: number = 12): string {
    if (!key || key.length < prefixLength) {
      return '••••••••';
    }
    return `${key.substring(0, prefixLength)}••••••••`;
  }

  /**
   * Check if API key is expired
   */
  static isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  /**
   * Get days until expiration
   */
  static getDaysUntilExpiration(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Format expiration status for display
   */
  static getExpirationStatus(expiresAt: string): {
    status: 'expired' | 'expiring_soon' | 'active';
    message: string;
    color: 'red' | 'yellow' | 'green';
  } {
    if (this.isExpired(expiresAt)) {
      return {
        status: 'expired',
        message: 'Expired',
        color: 'red',
      };
    }

    const days = this.getDaysUntilExpiration(expiresAt);
    if (days <= 7) {
      return {
        status: 'expiring_soon',
        message: `Expires in ${days} day${days !== 1 ? 's' : ''}`,
        color: 'yellow',
      };
    }

    return {
      status: 'active',
      message: `Expires in ${days} days`,
      color: 'green',
    };
  }
}

export default ApiKeyService;

