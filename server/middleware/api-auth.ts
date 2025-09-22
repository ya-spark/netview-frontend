import { Request, Response, NextFunction } from 'express';
import { ApiKeyManager } from '../services/api-key-manager';
import { storage } from '../storage';
import type { User, ApiKey } from '@shared/schema';

// Extend Express Request to include API key principal
declare global {
  namespace Express {
    interface Request {
      apiKeyPrincipal?: {
        user: User;
        apiKey: ApiKey;
        scopes: string[];
      };
    }
  }
}

/**
 * API Key Authentication Middleware
 * Supports both Authorization: Bearer and X-API-Key headers
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract API key from headers
    let apiKeyValue: string | undefined;
    
    // Try Authorization: Bearer format
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKeyValue = authHeader.substring(7);
    }
    
    // Try X-API-Key format
    if (!apiKeyValue) {
      apiKeyValue = req.headers['x-api-key'] as string;
    }

    if (!apiKeyValue) {
      return res.status(401).json({ 
        error: 'API key required', 
        message: 'Provide API key via Authorization: Bearer <key> or X-API-Key header' 
      });
    }

    // Validate the API key
    const validationResult = await ApiKeyManager.validateApiKey(apiKeyValue);
    
    if (!validationResult.valid) {
      return res.status(401).json({ 
        error: 'Invalid API key', 
        message: validationResult.error || 'API key validation failed' 
      });
    }

    // Attach API key principal to request
    req.apiKeyPrincipal = {
      user: validationResult.user!,
      apiKey: validationResult.apiKey!,
      scopes: validationResult.apiKey!.scopes || []
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error', 
      message: 'Internal server error during API key validation' 
    });
  }
};

/**
 * Dual Authentication Middleware
 * Accepts either session authentication OR API key authentication
 * API keys must be provided via X-API-Key header to avoid conflicts with Firebase JWTs
 */
export const authenticateUserOrApiKey = async (req: Request, res: Response, next: NextFunction) => {
  // First try existing session/Firebase authentication
  try {
    const authHeader = req.headers.authorization;
    
    // If there's a Bearer token, try Firebase/session auth first
    if (authHeader && authHeader.startsWith('Bearer ') && req.user) {
      return next();
    }
    
    // If no X-API-Key header, try the existing authenticateUser middleware
    const apiKeyValue = req.headers['x-api-key'] as string;
    if (!apiKeyValue) {
      // Import and run the existing authenticateUser middleware
      const { authenticateUser } = require('../services/auth');
      return authenticateUser(req, res, next);
    }

    // Try API key authentication (only via X-API-Key header)
    const validationResult = await ApiKeyManager.validateApiKey(apiKeyValue);
    
    if (!validationResult.valid) {
      return res.status(401).json({ 
        error: 'Invalid API key', 
        message: validationResult.error || 'API key validation failed' 
      });
    }

    // Attach API key principal to request
    req.apiKeyPrincipal = {
      user: validationResult.user!,
      apiKey: validationResult.apiKey!,
      scopes: validationResult.apiKey!.scopes || []
    };

    // Also set req.user for compatibility with existing middleware
    req.user = validationResult.user!;

    next();
  } catch (error) {
    console.error('Dual authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error', 
      message: 'Internal server error during authentication' 
    });
  }
};

/**
 * Scope Enforcement Middleware
 * Requires specific scopes when using API key authentication
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If authenticated via session, skip scope check (full permissions)
    if (req.user && (!req.apiKeyPrincipal)) {
      return next();
    }

    // If using API key, check scopes
    if (req.apiKeyPrincipal) {
      const hasRequiredScopes = ApiKeyManager.validateScopes(req.apiKeyPrincipal.apiKey, requiredScopes);
      
      if (!hasRequiredScopes) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This operation requires scopes: ${requiredScopes.join(', ')}`,
          requiredScopes,
          userScopes: req.apiKeyPrincipal.scopes
        });
      }

      return next();
    }

    // No valid authentication found
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please login or provide a valid API key with required scopes',
      requiredScopes
    });
  };
};

/**
 * Get the effective user from either session or API key authentication
 */
export const getEffectiveUser = (req: Request): User | undefined => {
  if (req.apiKeyPrincipal) {
    return req.apiKeyPrincipal.user;
  }
  return req.user;
};

/**
 * Get the effective tenant ID from either session or API key authentication
 */
export const getEffectiveTenantId = (req: Request): string | undefined => {
  const user = getEffectiveUser(req);
  return user?.tenantId || undefined;
};

/**
 * Check if the current authentication has a specific role
 */
export const hasRole = (req: Request, roles: string[]): boolean => {
  const user = getEffectiveUser(req);
  return user ? roles.includes(user.role) : false;
};

/**
 * Enhanced role middleware that works with both session and API key auth
 */
export const requireRoleOrScopes = (roles: string[], scopes: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getEffectiveUser(req);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login or provide a valid API key'
      });
    }

    // Check role-based access (session auth or API key with user role)
    if (roles.includes(user.role)) {
      return next();
    }

    // Check scope-based access (API key only)
    if (req.apiKeyPrincipal && scopes.length > 0) {
      const hasRequiredScopes = ApiKeyManager.validateScopes(req.apiKeyPrincipal.apiKey, scopes);
      if (hasRequiredScopes) {
        return next();
      }
    }

    res.status(403).json({
      error: 'Access denied',
      message: `This operation requires role: ${roles.join(' or ')} or scopes: ${scopes.join(', ')}`,
      requiredRoles: roles,
      requiredScopes: scopes,
      userRole: user.role,
      userScopes: req.apiKeyPrincipal?.scopes || []
    });
  };
};