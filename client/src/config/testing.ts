/**
 * Testing Configuration
 * 
 * This file contains testing configuration for development and testing environments.
 * It provides mock user data and settings that can be used when authentication is disabled.
 */

export interface TestingConfig {
  /** Enable testing mode (bypasses authentication) */
  enabled: boolean;
  
  /** Mock user data for testing */
  user: {
    email: string;
    tenantId: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  
  /** API configuration */
  api: {
    /** Base URL for API calls */
    baseUrl: string;
    /** Whether to include credentials in requests */
    includeCredentials: boolean;
  };
}

/**
 * Default testing configuration
 * 
 * This configuration provides an Owner user with access to the Core tenant (-919)
 * which matches the mock user data in AuthContext.tsx
 */
export const testingConfig: TestingConfig = {
  enabled: true, // Set to false to disable testing mode
  
  user: {
    email: 'to2@demo.com',
    tenantId: '2',
    role: 'Owner',
    firstName: 'Te',
    lastName: '2'
  },
  
  api: {
    baseUrl: '/api',
    includeCredentials: true
  }
};

/**
 * Alternative testing configurations for different scenarios
 */
export const testingConfigs = {
  /** SuperAdmin with Core tenant access */
  superAdmin: {
    enabled: true,
    user: {
      email: 'suenv@demo.com',
      tenantId: '-919',
      role: 'SuperAdmin',
      firstName: 'Sue',
      lastName: 'Env'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Owner with tenant access */
  owner: {
    enabled: true,
    user: {
      email: 'suenv@demo.com',
      tenantId: '2',
      role: 'Owner',
      firstName: 'Sue',
      lastName: 'Env'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Regular user with specific tenant */
  regularUser: {
    enabled: true,
    user: {
      email: 'user@example.com',
      tenantId: '2',
      role: 'Editor',
      firstName: 'Regular',
      lastName: 'User'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Viewer role for read-only testing */
  viewer: {
    enabled: true,
    user: {
      email: 'viewer@example.com',
      tenantId: '2',
      role: 'Viewer',
      firstName: 'Read',
      lastName: 'Only'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  }
};

/**
 * Get the current testing configuration
 * 
 * @returns The active testing configuration
 */
export function getTestingConfig(): TestingConfig {
  return testingConfig;
}

/**
 * Check if testing mode is enabled
 * 
 * @returns True if testing mode is enabled
 */
export function isTestingModeEnabled(): boolean {
  return testingConfig.enabled;
}

/**
 * Get testing headers for API requests
 * 
 * @returns Headers object with X-User-Email and X-Tenant-ID
 */
export function getTestingHeaders(): Record<string, string> {
  if (!isTestingModeEnabled()) {
    return {};
  }
  
  return {
    'X-User-Email': testingConfig.user.email,
    'X-Tenant-ID': testingConfig.user.tenantId
  };
}

/**
 * Switch to a different testing configuration
 * 
 * @param configName - Name of the configuration to switch to
 */
export function switchTestingConfig(configName: keyof typeof testingConfigs): void {
  const config = testingConfigs[configName];
  if (config) {
    Object.assign(testingConfig, config);
    console.log(`Switched to testing config: ${configName}`, config);
  } else {
    console.warn(`Testing config not found: ${configName}`);
  }
}

/**
 * Toggle testing mode on/off
 * 
 * @param enabled - Optional: specific state to set. If not provided, toggles current state
 */
export function toggleTestingMode(enabled?: boolean): void {
  const newState = enabled !== undefined ? enabled : !testingConfig.enabled;
  testingConfig.enabled = newState;
  
  if (newState) {
    console.log('🧪 Testing mode ENABLED - Using mock user data');
    console.log('👤 Current user:', testingConfig.user.email);
    console.log('🏢 Current tenant:', testingConfig.user.tenantId);
  } else {
    console.log('🔐 Testing mode DISABLED - Using Firebase authentication');
  }
}

/**
 * Enable testing mode
 */
export function enableTestingMode(): void {
  toggleTestingMode(true);
}

/**
 * Disable testing mode
 */
export function disableTestingMode(): void {
  toggleTestingMode(false);
}
