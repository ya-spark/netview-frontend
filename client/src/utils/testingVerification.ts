/**
 * Testing Configuration Verification
 * 
 * This file provides a simple way to verify that the testing configuration
 * is working correctly and headers are being set properly.
 */

import { getTestingHeaders, isTestingModeEnabled, getTestingConfig } from '@/config/testing';
import { TestingUtils } from '@/utils/testing';

/**
 * Verify that testing configuration is working correctly
 */
export function verifyTestingConfig(): boolean {
  console.log('🧪 Verifying testing configuration...');
  
  // Check if testing mode is enabled
  if (!isTestingModeEnabled()) {
    console.error('❌ Testing mode is not enabled');
    return false;
  }
  
  // Get current configuration
  const config = getTestingConfig();
  console.log('📋 Current config:', config);
  
  // Get testing headers
  const headers = getTestingHeaders();
  console.log('📤 Testing headers:', headers);
  
  // Verify required headers are present
  const requiredHeaders = ['X-User-Email', 'X-Tenant-ID'];
  const missingHeaders = requiredHeaders.filter(header => !headers[header]);
  
  if (missingHeaders.length > 0) {
    console.error('❌ Missing required headers:', missingHeaders);
    return false;
  }
  
  // Verify header values are not empty
  const emptyHeaders = requiredHeaders.filter(header => !headers[header] || headers[header].trim() === '');
  
  if (emptyHeaders.length > 0) {
    console.error('❌ Empty header values:', emptyHeaders);
    return false;
  }
  
  console.log('✅ Testing configuration is working correctly!');
  console.log(`👤 User: ${headers['X-User-Email']}`);
  console.log(`🏢 Tenant: ${headers['X-Tenant-ID']}`);
  
  return true;
}

/**
 * Test API request with testing headers
 */
export async function testApiRequest(): Promise<boolean> {
  console.log('🌐 Testing API request with testing headers...');
  
  try {
    // Import apiRequest dynamically to avoid circular dependencies
    const { apiRequest } = await import('@/lib/queryClient');
    
    // Make a simple API request (this will use testing headers)
    const response = await apiRequest('GET', '/api/dashboard/stats');
    
    console.log('✅ API request successful:', response.status);
    return true;
  } catch (error) {
    console.error('❌ API request failed:', error);
    return false;
  }
}

/**
 * Run all verification tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 Running testing configuration verification...');
  
  const configTest = verifyTestingConfig();
  
  if (configTest) {
    await testApiRequest();
  }
  
  console.log('🏁 Verification complete');
}

/**
 * Development helper - expose verification functions to window object
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).verifyTestingConfig = verifyTestingConfig;
  (window as any).testApiRequest = testApiRequest;
  (window as any).runAllTests = runAllTests;
  
  console.log('🧪 Testing verification functions available in console:');
  console.log('- verifyTestingConfig()');
  console.log('- testApiRequest()');
  console.log('- runAllTests()');
}

export default {
  verifyTestingConfig,
  testApiRequest,
  runAllTests
};
