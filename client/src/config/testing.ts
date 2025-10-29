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
 * This configuration provides a SuperAdmin user with tenant 1 access
 * which matches the mock user data in the backend
 */
export const testingConfig: TestingConfig = {
  enabled: true, // Set to false to disable testing mode
  
  user: {
    email: 'admin@demo.com',
    tenantId: '1',
    role: 'SuperAdmin',
    firstName: 'Admin',
    lastName: 'User'
  },
  
  api: {
    baseUrl: '/api',
    includeCredentials: true
  }
};

/**
 * Alternative testing configurations for different scenarios
 * These match the users defined in the backend
 */
export const testingConfigs = {
  /** SuperAdmin with tenant 1 access */
  superAdmin: {
    enabled: true,
    user: {
      email: 'admin@demo.com',
      tenantId: '1',
      role: 'SuperAdmin',
      firstName: 'Admin',
      lastName: 'User'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** SuperAdmin with tenant 2 access */
  superAdmin2: {
    enabled: true,
    user: {
      email: 'superadmin@enterprise.com',
      tenantId: '2',
      role: 'SuperAdmin',
      firstName: 'Super',
      lastName: 'Admin'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Owner with tenant 1 access */
  owner1: {
    enabled: true,
    user: {
      email: 'to1@demo.com',
      tenantId: '1',
      role: 'Owner',
      firstName: 'Tenant',
      lastName: 'One Owner'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Owner with tenant 2 access */
  owner: {
    enabled: true,
    user: {
      email: 'to2@demo.com',
      tenantId: '2',
      role: 'Owner',
      firstName: 'Tenant',
      lastName: 'Two Owner'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Enterprise Admin (Owner role) with tenant 2 */
  enterpriseAdmin: {
    enabled: true,
    user: {
      email: 'admin@enterprise.com',
      tenantId: '2',
      role: 'Owner',
      firstName: 'Enterprise',
      lastName: 'Admin'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Admin with tenant 2 access */
  admin: {
    enabled: true,
    user: {
      email: 'ta2@demo.com',
      tenantId: '2',
      role: 'Admin',
      firstName: 'Tenant',
      lastName: 'Two Admin'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Editor with tenant 1 access */
  editor1: {
    enabled: true,
    user: {
      email: 'editor@demo.com',
      tenantId: '1',
      role: 'Editor',
      firstName: 'Editor',
      lastName: 'User'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Editor with tenant 2 access */
  regularUser: {
    enabled: true,
    user: {
      email: 'te2@demo.com',
      tenantId: '2',
      role: 'Editor',
      firstName: 'Tenant',
      lastName: 'Two Editor'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Viewer with tenant 1 access */
  viewer1: {
    enabled: true,
    user: {
      email: 'viewer@demo.com',
      tenantId: '1',
      role: 'Viewer',
      firstName: 'Viewer',
      lastName: 'User'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Viewer with tenant 2 access */
  viewer: {
    enabled: true,
    user: {
      email: 'tv2@demo.com',
      tenantId: '2',
      role: 'Viewer',
      firstName: 'Tenant',
      lastName: 'Two Viewer'
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
