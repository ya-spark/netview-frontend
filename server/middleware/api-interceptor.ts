import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface ApiRequestLog {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  userAgent: string;
  ipAddress: string;
  userId?: string;
  tenantId?: string;
  responseTime?: number;
  statusCode?: number;
  responseSize?: number;
  errorMessage?: string;
}

export interface RateLimitingContext {
  requestId: string;
  ipAddress: string;
  userId?: string;
  tenantId?: string;
  endpoint: string;
  method: string;
  timestamp: number;
}

class ApiInterceptor {
  private requestLogs: Map<string, ApiRequestLog> = new Map();
  private rateLimitCache: Map<string, number[]> = new Map();
  
  constructor() {
    // Clean old logs every 5 minutes
    setInterval(() => {
      this.cleanOldLogs();
    }, 5 * 60 * 1000);
  }

  /**
   * Main middleware function to intercept API requests
   */
  public intercept = (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startTime = Date.now();
    const ipAddress = this.getClientIpAddress(req);

    // Create request log entry
    const requestLog: ApiRequestLog = {
      id: requestId,
      timestamp: startTime,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent') || 'unknown',
      ipAddress,
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId,
    };

    // Store request in memory for tracking
    this.requestLogs.set(requestId, requestLog);

    // Add request ID to response headers for debugging
    res.setHeader('X-Request-ID', requestId);

    // Create rate limiting context for future use
    const rateLimitContext: RateLimitingContext = {
      requestId,
      ipAddress,
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId,
      endpoint: req.path,
      method: req.method,
      timestamp: startTime,
    };

    // Store context in request for future middleware
    (req as any).rateLimitContext = rateLimitContext;

    // Log the incoming request
    this.logRequest(requestLog);

    // Use finish event to capture response details after all middleware has run
    const self = this;
    let responseLogged = false;
    
    res.on('finish', () => {
      if (!responseLogged) {
        responseLogged = true;
        const responseTime = Date.now() - startTime;
        requestLog.responseTime = responseTime;
        requestLog.statusCode = res.statusCode;
        
        // Capture user/tenant info now that auth middleware has run
        requestLog.userId = (req as any).user?.id;
        requestLog.tenantId = (req as any).user?.tenantId;
        
        // Get response size from Content-Length header or estimate
        const contentLength = res.getHeader('content-length');
        if (contentLength) {
          requestLog.responseSize = parseInt(contentLength as string, 10);
        } else {
          // Fallback estimation - not perfect but safer than JSON.stringify
          requestLog.responseSize = 0;
        }
        
        // Log the response
        self.logResponse(requestLog);
      }
    });

    next();
  };

  /**
   * Rate limiting check (structure for future implementation)
   */
  public checkRateLimit = (context: RateLimitingContext): boolean => {
    // TODO: Implement actual rate limiting logic
    // For now, always allow requests
    
    const key = this.getRateLimitKey(context);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max requests per window
    
    // Get existing requests for this key
    const requests = this.rateLimitCache.get(key) || [];
    
    // Filter out old requests outside the window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if within limit
    if (recentRequests.length >= maxRequests) {
      console.warn(`Rate limit exceeded for ${key}:`, {
        requests: recentRequests.length,
        limit: maxRequests,
        window: windowMs
      });
      return false;
    }
    
    // Add current request timestamp
    recentRequests.push(now);
    this.rateLimitCache.set(key, recentRequests);
    
    return true;
  };

  /**
   * Rate limiting middleware (for future use)
   */
  public rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const context = (req as any).rateLimitContext as RateLimitingContext;
    
    if (!context) {
      console.warn('Rate limit context not found. Ensure API interceptor runs first.');
      return next();
    }

    // Check rate limit (currently always passes)
    const isAllowed = this.checkRateLimit(context);
    
    if (!isAllowed) {
      return res.status(429).json({
        message: 'Too many requests',
        retryAfter: 60,
        requestId: context.requestId
      });
    }
    
    next();
  };

  /**
   * Get API request statistics
   */
  public getStats = () => {
    const logs = Array.from(this.requestLogs.values());
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => log.timestamp > oneHourAgo);
    
    return {
      totalRequests: this.requestLogs.size,
      recentRequests: recentLogs.length,
      averageResponseTime: recentLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / recentLogs.length || 0,
      errorRate: recentLogs.filter(log => log.statusCode && log.statusCode >= 400).length / recentLogs.length || 0,
      topEndpoints: this.getTopEndpoints(recentLogs),
      topIPs: this.getTopIPs(recentLogs)
    };
  };

  private getClientIpAddress(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           (req.headers['x-real-ip'] as string) ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private getRateLimitKey(context: RateLimitingContext): string {
    // Create rate limit key based on user or IP
    if (context.userId) {
      return `user:${context.userId}:${context.endpoint}`;
    } else {
      return `ip:${context.ipAddress}:${context.endpoint}`;
    }
  }

  private logRequest(requestLog: ApiRequestLog) {
    console.log(`[API] ${requestLog.method} ${requestLog.path} - ${requestLog.ipAddress} - ${requestLog.userAgent}`);
  }

  private logResponse(requestLog: ApiRequestLog) {
    const status = requestLog.statusCode || 0;
    const time = requestLog.responseTime || 0;
    const size = requestLog.responseSize || 0;
    
    const logLevel = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    console.log(`[API] ${logLevel} ${requestLog.method} ${requestLog.path} ${status} ${time}ms ${size}b`);
  }

  private cleanOldLogs() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.requestLogs.forEach((log, id) => {
      if (log.timestamp < cutoff) {
        this.requestLogs.delete(id);
      }
    });
    
    // Clean rate limit cache
    this.rateLimitCache.forEach((timestamps, key) => {
      const recent = timestamps.filter((ts: number) => Date.now() - ts < (60 * 1000));
      if (recent.length === 0) {
        this.rateLimitCache.delete(key);
      } else {
        this.rateLimitCache.set(key, recent);
      }
    });
  }

  private getTopEndpoints(logs: ApiRequestLog[]) {
    const endpointCounts = new Map<string, number>();
    
    logs.forEach(log => {
      const count = endpointCounts.get(log.path) || 0;
      endpointCounts.set(log.path, count + 1);
    });
    
    return Array.from(endpointCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private getTopIPs(logs: ApiRequestLog[]) {
    const ipCounts = new Map<string, number>();
    
    logs.forEach(log => {
      const count = ipCounts.get(log.ipAddress) || 0;
      ipCounts.set(log.ipAddress, count + 1);
    });
    
    return Array.from(ipCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }
}

// Export singleton instance
export const apiInterceptor = new ApiInterceptor();

// Export middleware functions for easy use
export const interceptApi = apiInterceptor.intercept;
export const rateLimitApi = apiInterceptor.rateLimitMiddleware;
export const getApiStats = apiInterceptor.getStats;