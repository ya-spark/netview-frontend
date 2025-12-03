// Auth API service functions for authentication and user management

import { apiRequest } from '../lib/queryClient';

/**
 * Send verification code to email address
 * Email is extracted from Firebase token, so no email parameter needed
 * @returns Promise that resolves when code is sent
 */
export async function sendVerificationCode(): Promise<void> {
  console.log('📧 Sending verification code...');
  await apiRequest('POST', '/api/auth/send-verification-code', {});
  console.log('✅ Verification code sent successfully');
}

/**
 * Verify the code sent to email address
 * Email is extracted from Firebase token, so only code is needed
 * @param code - 6-digit verification code
 * @returns Promise that resolves when code is verified
 */
export async function verifyCode(code: string): Promise<void> {
  console.log('🔐 Verifying code...');
  await apiRequest('POST', '/api/auth/verify-code', { code });
  console.log('✅ Code verified successfully');
}

/**
 * Get current authenticated user from backend
 * @returns Promise that resolves with User object
 */
export async function getCurrentUser(): Promise<any> {
  console.log('👤 Fetching current user from backend...');
  const response = await apiRequest('GET', '/api/auth/me');
  const responseData = await response.json();
  
  // Handle different response formats
  // Some APIs wrap the user in a 'data' field, others return it directly
  const user = responseData.data || responseData;
  
  // Validate that we have a valid user object
  if (!user || (!user.id && !user.email)) {
    console.error('❌ Invalid user response:', responseData);
    throw new Error('Invalid response from /api/auth/me. User data is missing.');
  }
  
  console.log('✅ User fetched successfully:', { id: user.id, email: user.email, role: user.role });
  return user;
}

/**
 * Register a new user with backend
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param company - User's company (optional)
 * @param region - User's region (optional)
 * @returns Promise that resolves with User object
 */
export async function registerUser(
  firstName: string,
  lastName: string,
  company?: string,
  region?: string
): Promise<any> {
  console.log('📝 Registering new user with backend...');
  const response = await apiRequest('POST', '/api/auth/register', {
    firstName,
    lastName,
    ...(company && { company }),
    ...(region && { region }),
  });
  
  const responseData = await response.json();
  
  // Handle different response formats
  // Some APIs wrap the user in a 'data' field, others return it directly
  const user = responseData.data || responseData;
  
  if (!user || !user.id) {
    console.error('❌ Invalid registration response:', responseData);
    throw new Error('Invalid response from registration endpoint. User data is missing.');
  }
  
  console.log('✅ User registered successfully:', { id: user.id, email: user.email, role: user.role });
  return user;
}

