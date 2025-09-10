import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request interface to include request ID
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Rate limiting configurations
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiProxyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 API proxy requests per minute
  message: 'Too many API requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Configure security middleware for the Express app
 */
export function configureSecurity(app: Express, allowedOrigins: string[] = []) {
  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.mindat.org"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some React dev tools
  }));

  // CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (origin && (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('.replit.app') ||
        origin.includes('.replit.dev')
      )) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    } else {
      // In production, use strict allowlist
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Request ID middleware for tracing
  app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Body size limits
  app.use((req, res, next) => {
    // Limit request body size to 1MB
    const maxSize = 1024 * 1024; // 1MB
    
    if (req.headers['content-length']) {
      const size = parseInt(req.headers['content-length'], 10);
      if (size > maxSize) {
        return res.status(413).json({ error: 'Request entity too large' });
      }
    }
    
    next();
  });

  // Global rate limiting
  app.use(globalRateLimit);

  // Remove X-Powered-By header
  app.disable('x-powered-by');

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(JSON.stringify({
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }));
    });
    
    next();
  });
}

// Health check endpoint that bypasses rate limiting
export const healthCheck = (req: any, res: any) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Readiness check endpoint
export const readinessCheck = (req: any, res: any) => {
  // Check if we have the required environment variables
  const hasApiKey = !!process.env.MINDAT_API_KEY;
  const hasDatabase = !!process.env.DATABASE_URL;
  
  if (hasApiKey && hasDatabase) {
    res.json({ 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({ 
      status: 'not ready',
      missing: {
        apiKey: !hasApiKey,
        database: !hasDatabase
      }
    });
  }
};