import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth-service';
import { type User } from '@shared/schema';

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    sessionId?: string;
    userId?: number;
  }
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      clientIp?: string;
      clientUserAgent?: string;
    }
  }
}

/**
 * Middleware to validate session and attach user to request
 */
export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for session cookie
    const sessionId = req.session?.sessionId;
    
    if (!sessionId) {
      return next(); // No session, continue without user
    }

    // Validate session
    const result = await authService.validateSession(sessionId);
    
    if (result) {
      req.user = result.user;
      req.sessionId = result.session.id;
    } else {
      // Invalid session, clear it
      if (req.session) {
        req.session.sessionId = undefined;
        req.session.userId = undefined;
      }
    }
    
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    next(); // Continue without user on error
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!authService.hasRole(req.user, role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to extract client information
 */
export function extractClientInfo(req: Request, res: Response, next: NextFunction) {
  // Add client IP and user agent to request for audit logging
  req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  req.clientUserAgent = req.get('User-Agent') || 'unknown';
  next();
}