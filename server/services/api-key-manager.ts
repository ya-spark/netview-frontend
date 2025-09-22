import { randomBytes, createHash } from 'crypto';
import { storage } from '../storage';
import type { User, ApiKey, InsertApiKey } from '@shared/schema';

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  user?: User;
  error?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey: string; // Only returned on creation
  scopes: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export class ApiKeyManager {
  private static readonly KEY_PREFIX = 'nv_'; // NetView prefix
  private static readonly KEY_LENGTH = 32; // 32 random bytes = 64 hex chars
  
  /**
   * Generate a new API key with secure random bytes
   */
  public static generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
    const randomKey = randomBytes(this.KEY_LENGTH).toString('hex');
    const fullKey = `${this.KEY_PREFIX}${randomKey}`;
    const keyPrefix = fullKey.substring(0, 8); // First 8 chars for display
    const keyHash = this.hashKey(fullKey);
    
    return { fullKey, keyPrefix, keyHash };
  }

  /**
   * Hash an API key using SHA-256
   */
  public static hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Validate an API key and return user information
   */
  public static async validateApiKey(providedKey: string): Promise<ApiKeyValidationResult> {
    try {
      // Basic format validation
      if (!providedKey || !providedKey.startsWith(this.KEY_PREFIX)) {
        return { valid: false, error: 'Invalid API key format' };
      }

      // Hash the provided key
      const keyHash = this.hashKey(providedKey);
      
      // Look up the API key
      const apiKey = await storage.getApiKeyByHash(keyHash);
      if (!apiKey) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Check if key is active
      if (!apiKey.isActive) {
        return { valid: false, error: 'API key is deactivated' };
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Get the associated user
      const user = await storage.getUser(apiKey.userId);
      if (!user) {
        return { valid: false, error: 'Associated user not found' };
      }

      // Check if user is active
      if (!user.isActive) {
        return { valid: false, error: 'Associated user is inactive' };
      }

      // Update usage stats asynchronously (don't wait)
      setImmediate(() => {
        storage.updateApiKeyUsage(apiKey.id).catch((error: any) => {
          console.warn(`Failed to update API key usage for ${apiKey.id}:`, error);
        });
      });

      return { valid: true, apiKey, user };

    } catch (error) {
      console.error('API key validation error:', error);
      return { valid: false, error: 'Internal validation error' };
    }
  }

  /**
   * Create a new API key for a user
   */
  public static async createApiKey(
    user: User,
    request: CreateApiKeyRequest
  ): Promise<CreateApiKeyResponse> {
    const { fullKey, keyPrefix, keyHash } = this.generateApiKey();

    const apiKeyData: InsertApiKey & { keyHash: string } = {
      userId: user.id,
      tenantId: user.tenantId!,
      name: request.name,
      keyPrefix,
      keyHash,
      scopes: request.scopes || [],
      expiresAt: request.expiresAt,
    };

    const createdKey = await storage.createApiKey(apiKeyData);

    return {
      id: createdKey.id,
      name: createdKey.name,
      keyPrefix: createdKey.keyPrefix,
      fullKey, // Only returned on creation
      scopes: createdKey.scopes || [],
      expiresAt: createdKey.expiresAt || undefined,
      createdAt: createdKey.createdAt!
    };
  }

  /**
   * List API keys for a user (without the full key)
   */
  public static async listUserApiKeys(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const apiKeys = await storage.getUserApiKeys(userId);
    
    // Remove sensitive keyHash from the response
    return apiKeys.map(({ keyHash, ...apiKey }: any) => apiKey);
  }

  /**
   * List API keys for a tenant (Admin+ only)
   */
  public static async listTenantApiKeys(tenantId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const apiKeys = await storage.getTenantApiKeys(tenantId);
    
    // Remove sensitive keyHash from the response
    return apiKeys.map(({ keyHash, ...apiKey }: any) => apiKey);
  }

  /**
   * Update an API key
   */
  public static async updateApiKey(
    keyId: string,
    updates: Partial<Pick<InsertApiKey, 'name' | 'scopes' | 'isActive' | 'expiresAt'>>
  ): Promise<ApiKey> {
    return await storage.updateApiKey(keyId, updates);
  }

  /**
   * Deactivate an API key
   */
  public static async deactivateApiKey(keyId: string): Promise<void> {
    await storage.deactivateApiKey(keyId);
  }

  /**
   * Delete an API key
   */
  public static async deleteApiKey(keyId: string): Promise<void> {
    await storage.deleteApiKey(keyId);
  }

  /**
   * Get API key statistics
   */
  public static async getApiKeyStats(tenantId?: string) {
    const apiKeys = tenantId 
      ? await storage.getTenantApiKeys(tenantId)
      : []; // For now, only support tenant-specific stats

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: apiKeys.length,
      active: apiKeys.filter((key: any) => key.isActive).length,
      expired: apiKeys.filter((key: any) => key.expiresAt && key.expiresAt <= new Date()).length,
      recentlyUsed: apiKeys.filter((key: any) => key.lastUsed && key.lastUsed.getTime() > oneWeekAgo).length,
      totalUsage: apiKeys.reduce((sum: any, key: any) => sum + (key.usageCount || 0), 0),
      byScope: {} as Record<string, number>,
    };

    // Count by scope
    apiKeys.forEach((key: any) => {
      key.scopes?.forEach((scope: any) => {
        stats.byScope[scope] = (stats.byScope[scope] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Validate API key scopes for specific operations
   */
  public static validateScopes(apiKey: ApiKey, requiredScopes: string[]): boolean {
    if (!requiredScopes.length) return true; // No scopes required
    
    const userScopes = apiKey.scopes || [];
    
    // Check if user has all required scopes
    return requiredScopes.every(scope => userScopes.includes(scope));
  }

  /**
   * Get available scopes (for UI)
   */
  public static getAvailableScopes(): Array<{ scope: string; description: string }> {
    return [
      { scope: 'probes:read', description: 'Read access to probes' },
      { scope: 'probes:write', description: 'Create and modify probes' },
      { scope: 'probes:delete', description: 'Delete probes' },
      { scope: 'results:read', description: 'Read probe results and statistics' },
      { scope: 'alerts:read', description: 'Read alerts' },
      { scope: 'alerts:write', description: 'Acknowledge and manage alerts' },
      { scope: 'notifications:read', description: 'Read notification groups' },
      { scope: 'notifications:write', description: 'Manage notification groups' },
      { scope: 'gateways:read', description: 'Read gateway information' },
      { scope: 'gateways:write', description: 'Manage custom gateways' },
      { scope: 'admin:read', description: 'Read tenant administration data' },
      { scope: 'admin:write', description: 'Manage tenant settings' },
    ];
  }
}