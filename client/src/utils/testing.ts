/**
 * Testing Utilities
 * 
 * This file provides utilities for managing testing configurations and switching
 * between different user roles and tenants during development and testing.
 */

import { switchTestingConfig, getTestingConfig, testingConfigs, toggleTestingMode, enableTestingMode, disableTestingMode, isTestingModeEnabled } from '@/config/testing';

/**
 * Testing utility functions for easy configuration switching
 */
export const TestingUtils = {
  /**
   * Switch to SuperAdmin configuration
   */
  useSuperAdmin: () => {
    switchTestingConfig('superAdmin');
    console.log('🔑 Switched to SuperAdmin testing config');
  },

  /**
   * Switch to regular user configuration
   */
  useRegularUser: () => {
    switchTestingConfig('regularUser');
    console.log('👤 Switched to regular user testing config');
  },

  /**
   * Switch to viewer configuration
   */
  useViewer: () => {
    switchTestingConfig('viewer');
    console.log('👁️ Switched to viewer testing config');
  },

  /**
   * Get current testing configuration
   */
  getCurrentConfig: () => {
    const config = getTestingConfig();
    console.log('📋 Current testing config:', config);
    return config;
  },

  /**
   * List all available testing configurations
   */
  listConfigs: () => {
    console.log('📋 Available testing configurations:', Object.keys(testingConfigs));
    return Object.keys(testingConfigs);
  },

  /**
   * Log current user info for debugging
   */
  logUserInfo: () => {
    const config = getTestingConfig();
    console.log('👤 Current testing user:', {
      email: config.user.email,
      tenantId: config.user.tenantId,
      role: config.user.role,
      name: `${config.user.firstName} ${config.user.lastName}`
    });
  },

  /**
   * Toggle testing mode on/off
   */
  toggle: () => {
    toggleTestingMode();
  },

  /**
   * Enable testing mode
   */
  enable: () => {
    enableTestingMode();
  },

  /**
   * Disable testing mode
   */
  disable: () => {
    disableTestingMode();
  },

  /**
   * Check if testing mode is currently enabled
   */
  isEnabled: () => {
    const enabled = isTestingModeEnabled();
    console.log(`🧪 Testing mode is ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return enabled;
  }
};

/**
 * Development helper - expose testing utilities to window object for console access
 * 
 * Usage in browser console:
 * - TestingUtils.useSuperAdmin()
 * - TestingUtils.useRegularUser()
 * - TestingUtils.useViewer()
 * - TestingUtils.logUserInfo()
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).TestingUtils = TestingUtils;
  console.log('🧪 Testing utilities available in console as window.TestingUtils');
  console.log('📋 Available commands:');
  console.log('  TestingUtils.toggle() - Toggle testing mode on/off');
  console.log('  TestingUtils.enable() - Enable testing mode');
  console.log('  TestingUtils.disable() - Disable testing mode');
  console.log('  TestingUtils.isEnabled() - Check if testing mode is enabled');
  console.log('  TestingUtils.useSuperAdmin() - Switch to SuperAdmin');
  console.log('  TestingUtils.useRegularUser() - Switch to regular user');
  console.log('  TestingUtils.useViewer() - Switch to viewer');
  console.log('  TestingUtils.logUserInfo() - Show current user info');
}

export default TestingUtils;
