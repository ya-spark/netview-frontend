/**
 * Business email validation utility
 * Blocks common public email domains and allows business email providers and custom domains
 */

// List of blocked public email domains
const BLOCKED_PUBLIC_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'yandex.com',
  'mail.com',
  'gmx.com',
  'zoho.com',
  'live.com',
  'msn.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.it',
  'yahoo.es',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'outlook.fr',
  'outlook.de',
  'outlook.co.uk',
  'proton.me',
  'protonmail.ch',
  'tutanota.com',
  'mail.ru',
  'yandex.ru',
  'qq.com',
  '163.com',
  'sina.com',
  'rediffmail.com',
  'inbox.com',
  'fastmail.com',
  'hushmail.com',
];

/**
 * Checks if an email address is a business email (not a public email domain)
 * @param email - The email address to validate
 * @returns true if the email is a business email, false if it's a public email domain
 */
export function isBusinessEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Extract domain from email
  const emailParts = email.toLowerCase().trim().split('@');
  if (emailParts.length !== 2) {
    return false;
  }

  const domain = emailParts[1];

  // Check if domain is in blocked list
  return !BLOCKED_PUBLIC_DOMAINS.includes(domain);
}

