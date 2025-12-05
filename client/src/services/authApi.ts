// Auth API service functions for authentication and user management

import { apiRequest } from '../lib/queryClient';
import { logger } from '../lib/logger';

/**
 * Send verification code to email address
 * @returns Promise that resolves when code is sent
 */
export async function sendVerificationCode(): Promise<void> {
  logger.info('Sending verification code', {
    component: 'authApi',
    action: 'send_verification_code',
  });
  await apiRequest('POST', '/api/auth/send-verification-code', {});
  logger.info('Verification code sent successfully', {
    component: 'authApi',
    action: 'send_verification_code',
  });
}

/**
 * Verify the code sent to email address
 * @param code - 6-digit verification code
 * @returns Promise that resolves when code is verified
 */
export async function verifyCode(code: string): Promise<void> {
  logger.info('Verifying code', {
    component: 'authApi',
    action: 'verify_code',
  });
  await apiRequest('POST', '/api/auth/verify-code', { code });
  logger.info('Code verified successfully', {
    component: 'authApi',
    action: 'verify_code',
  });
}

/**
 * Get current authenticated user from backend
 * @returns Promise that resolves with User object
 */
export async function getCurrentUser(): Promise<any> {
  logger.debug('Fetching current user from backend', {
    component: 'authApi',
    action: 'get_current_user',
  });
  const response = await apiRequest('GET', '/api/auth/me');
  const responseData = await response.json();
  
  // Handle different response formats
  // Some APIs wrap the user in a 'data' field, others return it directly
  const user = responseData.data || responseData;
  
  // Validate that we have a valid user object
  if (!user || (!user.id && !user.email)) {
    logger.error('Invalid user response from /api/auth/me', new Error('User data is missing'), {
      component: 'authApi',
      action: 'get_current_user',
    }, responseData);
    throw new Error('Invalid response from /api/auth/me. User data is missing.');
  }
  
  logger.info('User fetched successfully', {
    component: 'authApi',
    action: 'get_current_user',
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  });
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
  logger.info('Registering new user with backend', {
    component: 'authApi',
    action: 'register_user',
    firstName,
    lastName,
    hasCompany: !!company,
    hasRegion: !!region,
  });
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
    logger.error('Invalid registration response', new Error('User data is missing'), {
      component: 'authApi',
      action: 'register_user',
    }, responseData);
    throw new Error('Invalid response from registration endpoint. User data is missing.');
  }
  
  logger.info('User registered successfully', {
    component: 'authApi',
    action: 'register_user',
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  });
  return user;
}

/**
 * Logout from the backend system
 * Clears authentication and user-related information on the server
 * @returns Promise that resolves when logout is complete
 */
export async function logout(): Promise<void> {
  try {
    logger.info('Logging out from backend', {
      component: 'authApi',
      action: 'logout',
    });
    await apiRequest('POST', '/api/auth/logout', {});
    logger.info('Backend logout successful', {
      component: 'authApi',
      action: 'logout',
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Backend logout error', err, {
      component: 'authApi',
      action: 'logout',
    });
    // Don't throw - allow logout to proceed even if backend call fails
    // The Firebase logout will still happen on the client side
  }
}

