// Auth API service functions for email verification

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

