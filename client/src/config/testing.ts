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
 * This configuration provides an Owner user with tenant 1 access
 * which matches the mock user data in the backend
 */
export const testingConfig: TestingConfig = {
  enabled: true, // Set to false to disable testing mode
  
  user: {
    email: 'owner@demo.com',
    tenantId: '1',
    role: 'Owner',
    firstName: 'Owner',
    lastName: 'Demo'
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
  // Core Tenant (-919) - System users
  /** SuperAdmin with Core tenant access */
  coreSuperAdmin: {
    enabled: true,
    user: {
      email: 'superadmin@core.com',
      tenantId: '-919',
      role: 'SuperAdmin',
      firstName: 'Super',
      lastName: 'Admin'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Admin with Core tenant access */
  coreAdmin: {
    enabled: true,
    user: {
      email: 'admin@core.com',
      tenantId: '-919',
      role: 'Admin',
      firstName: 'Admin',
      lastName: 'Core'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  // Demo Tenant (1) - All roles (except SuperAdmin)
  /** Owner with Demo tenant access */
  owner1: {
    enabled: true,
    user: {
      email: 'owner@demo.com',
      tenantId: '1',
      role: 'Owner',
      firstName: 'Owner',
      lastName: 'Demo'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Admin with Demo tenant access */
  admin1: {
    enabled: true,
    user: {
      email: 'admin@demo.com',
      tenantId: '1',
      role: 'Admin',
      firstName: 'Admin',
      lastName: 'Demo'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Editor with Demo tenant access */
  editor1: {
    enabled: true,
    user: {
      email: 'editor@demo.com',
      tenantId: '1',
      role: 'Editor',
      firstName: 'Editor',
      lastName: 'Demo'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Viewer with Demo tenant access */
  viewer1: {
    enabled: true,
    user: {
      email: 'viewer@demo.com',
      tenantId: '1',
      role: 'Viewer',
      firstName: 'Viewer',
      lastName: 'Demo'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  // Enterprise Tenant (2) - All roles (except SuperAdmin)
  /** Owner with Enterprise tenant access */
  owner2: {
    enabled: true,
    user: {
      email: 'owner@enterprise.com',
      tenantId: '2',
      role: 'Owner',
      firstName: 'Owner',
      lastName: 'Enterprise'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Admin with Enterprise tenant access */
  admin2: {
    enabled: true,
    user: {
      email: 'admin@enterprise.com',
      tenantId: '2',
      role: 'Admin',
      firstName: 'Admin',
      lastName: 'Enterprise'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Editor with Enterprise tenant access */
  editor2: {
    enabled: true,
    user: {
      email: 'editor@enterprise.com',
      tenantId: '2',
      role: 'Editor',
      firstName: 'Editor',
      lastName: 'Enterprise'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  },
  
  /** Viewer with Enterprise tenant access */
  viewer2: {
    enabled: true,
    user: {
      email: 'viewer@enterprise.com',
      tenantId: '2',
      role: 'Viewer',
      firstName: 'Viewer',
      lastName: 'Enterprise'
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
