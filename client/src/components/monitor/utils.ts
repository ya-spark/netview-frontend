/**
 * Utility functions for monitor components
 */

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp?: string): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format a timestamp to a relative time string (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Get probe status color class (for text)
 */
export function getProbeStatusColor(status?: string, isActive?: boolean): string {
  if (!isActive) return 'text-gray-500 dark:text-gray-400';
  if (status === 'Success') return 'text-green-600 dark:text-green-400';
  if (status === 'Failure') return 'text-red-600 dark:text-red-400';
  if (status === 'Warning') return 'text-amber-600 dark:text-amber-400';
  if (status === 'Pending') return 'text-gray-500 dark:text-gray-400';
  if (status === 'Unknown') return 'text-blue-600 dark:text-blue-400';
  return 'text-gray-500 dark:text-gray-400';
}

/**
 * Get probe status background color class (for badges)
 */
export function getProbeStatusBgColor(status?: string, isActive?: boolean): string {
  if (!isActive) return 'bg-gray-500 dark:bg-gray-400 text-white';
  if (status === 'Success') return 'bg-green-600 dark:bg-green-400 text-white';
  if (status === 'Failure') return 'bg-red-600 dark:bg-red-400 text-white';
  if (status === 'Warning') return 'bg-amber-600 dark:bg-amber-400 text-white';
  if (status === 'Pending') return 'bg-gray-500 dark:bg-gray-400 text-white';
  if (status === 'Unknown') return 'bg-blue-600 dark:bg-blue-400 text-white';
  return 'bg-gray-500 dark:bg-gray-400 text-white';
}

/**
 * Get gateway status color class (for text)
 */
export function getGatewayStatusColor(isOnline: boolean, status: string): string {
  if (status === 'pending') return 'text-amber-600 dark:text-amber-400';
  if (isOnline) return 'text-green-600 dark:text-green-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get gateway status background color class (for badges) - based on online/offline
 */
export function getGatewayStatusBgColor(isOnline: boolean, status: string): string {
  if (isOnline) return 'bg-green-600 dark:bg-green-400 text-white';
  return 'bg-red-600 dark:bg-red-400 text-white';
}

/**
 * Get gateway registration status background color class (for badges)
 */
export function getGatewayRegistrationStatusBgColor(status: string): string {
  if (status === 'revoked') return 'bg-gray-500 dark:bg-gray-400 text-white';
  if (status === 'pending') return 'bg-amber-600 dark:bg-amber-400 text-white';
  if (status === 'active' || status === 'registered') return 'bg-green-600 dark:bg-green-400 text-white';
  return 'bg-gray-500 dark:bg-gray-400 text-white';
}

/**
 * Get probe status label
 */
export function getProbeStatusLabel(status?: string): string {
  if (status === 'Success') return 'Success';
  if (status === 'Failure') return 'Failure';
  if (status === 'Warning') return 'Warning';
  if (status === 'Pending') return 'Pending';
  if (status === 'Unknown') return 'Unknown';
  return 'Unknown';
}

/**
 * Determine probe status based on latest result and time threshold
 * Returns 'Pending' if no result (probe has never been started)
 * Returns 'Unknown' if result is older than 1 hour (stale result)
 */
export function getProbeStatus(latestResult: { status: string; checked_at: string } | null | undefined): string {
  // If no result exists, probe has never been started, so status should be 'Pending'
  if (!latestResult || !latestResult.checked_at) return 'Pending';
  
  try {
    const checkedAt = new Date(latestResult.checked_at);
    const now = new Date();
    const diffMs = now.getTime() - checkedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // If result is older than 1 hour, consider it Unknown (stale)
    if (diffHours > 1) {
      return 'Unknown';
    }
    
    return latestResult.status;
  } catch (error) {
    // If date parsing fails, return Unknown
    return 'Unknown';
  }
}

/**
 * Format response time in milliseconds to a human-readable string
 * If less than 1000ms: "112 ms"
 * If 1000ms or more: "12 sec 234 ms"
 */
export function formatResponseTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return 'N/A';
  }
  
  // Round to nearest integer
  const milliseconds = Math.round(ms);
  
  // If less than 1000ms, show as milliseconds only
  if (milliseconds < 1000) {
    return `${milliseconds} ms`;
  }
  
  // If 1000ms or more, show as seconds and milliseconds
  const seconds = Math.floor(milliseconds / 1000);
  const remainingMs = milliseconds % 1000;
  
  return `${seconds} sec ${remainingMs} ms`;
}
