// Auth API service functions for authentication and user management

import { apiRequest } from '../lib/queryClient';

/**
 * Send verification code to email address
 * @param email - Email address to send verification code to
 * @returns Promise that resolves when code is sent
 */
export async function sendVerificationCode(email: string): Promise<void> {
  console.log('📧 Sending verification code to:', email);
  await apiRequest('POST', '/api/auth/send-verification-code', { email });
  console.log('✅ Verification code sent successfully');
}

/**
 * Verify the code sent to email address
 * @param email - Email address that received the code
 * @param code - 6-digit verification code
 * @returns Promise that resolves when code is verified
 */
export async function verifyCode(email: string, code: string): Promise<void> {
  console.log('🔐 Verifying code for:', email);
  await apiRequest('POST', '/api/auth/verify-code', { email, code });
  console.log('✅ Code verified successfully');
}

/**
 * Get current authenticated user from backend
 * @returns Promise that resolves with User object
 */
export async function getCurrentUser(): Promise<any> {
  console.log('👤 Fetching current user from backend...');
  const response = await apiRequest('GET', '/api/auth/me');
  const user = await response.json();
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
  const user = await response.json();
  console.log('✅ User registered successfully:', { id: user.id, email: user.email, role: user.role });
  return user;
}

