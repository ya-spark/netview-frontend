// Probe template definitions with descriptions, why needed, and how it works

import type { ProbeCategory, ProbeType } from '@/types/probe';

export interface ProbeTemplate {
  id: string;
  name: string;
  category: ProbeCategory;
  type: ProbeType;
  description: string;
  whyNeeded: string;
  howItWorks: string;
}

export const probeTemplates: ProbeTemplate[] = [
  // Uptime Category
  {
    id: 'uptime-icmp-ping',
    name: 'Network Connectivity Monitor',
    category: 'Uptime',
    type: 'ICMP/Ping',
    description: 'Monitors network connectivity by sending ICMP ping packets to a target host and measuring response times. Detects if a host is reachable and measures latency.',
    whyNeeded: 'Essential for monitoring server availability, network infrastructure health, and detecting connectivity issues before they impact services.',
    howItWorks: 'The probe sends ICMP echo request packets to the specified target host. It waits for ICMP echo reply packets and measures the round-trip time. If replies are received within the timeout period, the probe reports success. It can send multiple packets to calculate average latency and packet loss.'
  },
  {
    id: 'uptime-http-https',
    name: 'Website Uptime Monitor',
    category: 'Uptime',
    type: 'HTTP/HTTPS',
    description: 'Monitors website availability by making HTTP/HTTPS requests to web endpoints. Checks response status codes and measures response times.',
    whyNeeded: 'Critical for ensuring websites and web services remain accessible to users. Helps detect downtime and performance degradation.',
    howItWorks: 'The probe makes an HTTP/HTTPS request to the specified URL using the configured method (GET, POST, etc.). It measures the time taken to establish connection, send request, and receive response. The probe validates the response status code matches the expected value. It can follow redirects if configured and verify SSL certificates for HTTPS endpoints.'
  },
  {
    id: 'uptime-dns-resolution',
    name: 'DNS Health Check',
    category: 'Uptime',
    type: 'DNS Resolution',
    description: 'Verifies DNS resolution by querying DNS servers for specific domain records. Ensures DNS infrastructure is functioning correctly.',
    whyNeeded: 'DNS failures can make entire services unreachable. Monitoring DNS health prevents service outages caused by DNS issues.',
    howItWorks: 'The probe runs a DNS query for the given domain name using the specified record type (A, AAAA, MX, etc.). It queries either the default DNS servers or a specific nameserver if configured. The probe checks if the DNS resolution is happening correctly by verifying that valid records are returned. It measures the DNS query response time and validates the returned record data.'
  },
  // API Category
  {
    id: 'api-http-https',
    name: 'API Endpoint Monitor',
    category: 'API',
    type: 'HTTP/HTTPS',
    description: 'Monitors REST API endpoints for availability and correct responses. Validates API functionality and response times.',
    whyNeeded: 'APIs are critical for application functionality. Monitoring ensures APIs respond correctly and maintain acceptable performance.',
    howItWorks: 'The probe makes HTTP/HTTPS requests to the API endpoint using the specified HTTP method and optional headers. It validates the response status code matches the expected value (typically 200 for success). The probe measures response time and can parse response body if needed. It can include authentication headers or API keys in the request for protected endpoints.'
  },
  {
    id: 'api-authentication',
    name: 'API Authentication Test',
    category: 'API',
    type: 'Authentication',
    description: 'Tests API authentication mechanisms by attempting to authenticate with provided credentials. Verifies authentication endpoints are working.',
    whyNeeded: 'Authentication failures can lock out users or break integrations. Monitoring ensures authentication systems remain operational.',
    howItWorks: 'The probe sends authentication requests to the specified authentication endpoint using the configured method (POST, GET, etc.). It includes credentials (username/password, API key, or token) in the request based on the credential type. The probe validates that the authentication endpoint returns the expected status code (typically 200 for success, 401 for failure). It measures response time and can verify the response contains expected authentication tokens or session data.'
  },
  // Security Category
  {
    id: 'security-ssl-tls',
    name: 'Certificate Expiry Monitor',
    category: 'Security',
    type: 'SSL/TLS',
    description: 'Monitors SSL/TLS certificates for expiration dates and validity. Checks certificate chain and security configuration.',
    whyNeeded: 'Expired certificates cause service outages and security warnings. Early detection prevents certificate-related incidents.',
    howItWorks: 'The probe establishes an SSL/TLS connection to the specified hostname and port. It retrieves the server\'s certificate chain and extracts the certificate expiration date. The probe calculates days until expiration and compares against the warning threshold. It validates the certificate chain, checks for valid certificate authority signatures, and verifies the certificate matches the hostname. It can also check for weak cipher suites or security misconfigurations.'
  },
  {
    id: 'security-authentication',
    name: 'Security Authentication Check',
    category: 'Security',
    type: 'Authentication',
    description: 'Tests security authentication systems to ensure they\'re functioning correctly and detecting unauthorized access attempts.',
    whyNeeded: 'Security authentication is the first line of defense. Monitoring ensures security systems are operational and effective.',
    howItWorks: 'The probe attempts authentication using the configured credentials (username/password, API key, or token). It sends authentication requests to the security endpoint and validates the response. It can test both successful authentication (valid credentials) and failed authentication (invalid credentials) scenarios. The probe measures response time and validates that security mechanisms like rate limiting, account lockout, and proper error handling are functioning.'
  },
  // Browser Category
  {
    id: 'browser-http-https',
    name: 'Web Performance Monitor',
    category: 'Browser',
    type: 'HTTP/HTTPS',
    description: 'Monitors web page performance from a browser perspective, measuring load times, rendering performance, and user experience metrics.',
    whyNeeded: 'Web performance directly impacts user experience. Monitoring helps maintain fast page loads and optimal user experience.',
    howItWorks: 'The probe makes HTTP/HTTPS requests to the web page URL and measures various performance metrics. It tracks time to first byte (TTFB), total page load time, and response size. The probe can parse HTML to check for critical resources and measure their load times. It validates response status codes and can follow redirects. For HTTPS, it verifies SSL certificate validity and measures SSL handshake time.'
  }
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ProbeTemplate | undefined {
  return probeTemplates.find(template => template.id === id);
}

/**
 * Get templates by category and type
 */
export function getTemplatesByCategoryAndType(
  category: ProbeCategory,
  type: ProbeType
): ProbeTemplate[] {
  return probeTemplates.filter(
    template => template.category === category && template.type === type
  );
}

/**
 * Get first template matching category and type (for backward compatibility)
 */
export function getTemplateByCategoryAndType(
  category: ProbeCategory,
  type: ProbeType
): ProbeTemplate | undefined {
  return probeTemplates.find(
    template => template.category === category && template.type === type
  );
}

/**
 * Get all templates
 */
export function getAllTemplates(): ProbeTemplate[] {
  return probeTemplates;
}
