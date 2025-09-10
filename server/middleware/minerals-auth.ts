import type { Request, Response, NextFunction } from "express";
import { MineralsApiService } from '../services/minerals-api-service.js';
import rateLimit from 'express-rate-limit';

// Extend Request type to include mineral API key info
declare global {
  namespace Express {
    interface Request {
      mineralApiKey?: {
        id: number;
        name: string;
        userId?: number;
        permissions: string[];
        rateLimit: number;
      };
    }
  }
}

/**
 * Middleware to validate mineral API keys
 */
export async function validateMineralApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header. Use: Authorization: Bearer <api_key>'
      });
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key is required. Get your API key from /api/minerals/api-keys'
      });
    }

    // Validate the API key
    const mineralsApiService = MineralsApiService.getInstance();
    const validation = await mineralsApiService.validateApiKey(apiKey);
    
    if (!validation.isValid || !validation.keyInfo) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key'
      });
    }

    // Check permissions
    const { keyInfo } = validation;
    const isReadEndpoint = req.method === 'GET';
    const isWriteEndpoint = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    
    if (isReadEndpoint && !keyInfo.permissions.includes('read')) {
      return res.status(403).json({ 
        error: 'API key does not have read permissions'
      });
    }
    
    if (isWriteEndpoint && !keyInfo.permissions.includes('write')) {
      return res.status(403).json({ 
        error: 'API key does not have write permissions'
      });
    }

    // Attach key info to request for logging and rate limiting
    req.mineralApiKey = keyInfo;
    
    // Log API usage
    await mineralsApiService.logApiUsage(
      keyInfo.id,
      req.path,
      req.method,
      200, // Will be updated later
      undefined, // Response time will be calculated later
      req.ip,
      req.get('User-Agent')
    );

    next();
  } catch (error) {
    console.error('Error validating mineral API key:', error);
    return res.status(500).json({ 
      error: 'Internal server error during authentication'
    });
  }
}

/**
 * Create rate limiter for mineral API based on individual key limits
 */
export const createMineralApiRateLimit = () => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req: Request) => {
      // Use the rate limit from the API key, default to 100 if not set
      return req.mineralApiKey?.rateLimit || 100;
    },
    keyGenerator: (req: Request) => {
      // Rate limit per API key
      return req.mineralApiKey?.id?.toString() || req.ip || 'unknown';
    },
    message: (req: Request) => ({
      error: `Rate limit exceeded. Your API key allows ${req.mineralApiKey?.rateLimit || 100} requests per hour.`,
      retryAfter: Math.ceil(60 * 60) // 1 hour in seconds
    }),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  });
};

/**
 * Admin-only middleware for sync endpoints
 */
export function requireAdminPermissions(req: Request, res: Response, next: NextFunction) {
  if (!req.mineralApiKey) {
    return res.status(401).json({ 
      error: 'Authentication required'
    });
  }

  if (!req.mineralApiKey.permissions.includes('admin')) {
    return res.status(403).json({ 
      error: 'Admin permissions required for this endpoint'
    });
  }

  next();
}