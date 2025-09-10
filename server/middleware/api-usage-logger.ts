import type { Request, Response, NextFunction } from "express";
import { MineralsApiService } from '../services/minerals-api-service.js';

/**
 * Middleware to log API usage after response is sent
 * This captures the actual response status and timing for all mineral API requests
 */
export function logApiUsage(req: Request, res: Response, next: NextFunction) {
  // Only process mineral API requests
  if (!req.path.startsWith('/api/minerals')) {
    return next();
  }

  const startTime = Date.now();
  
  // Capture the original res.end to log when response is sent
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: any, cb?: (() => void)) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log the API usage with actual status and timing
    const mineralsApiService = MineralsApiService.getInstance();
    // Log all requests including unauthorized ones for complete analytics
    mineralsApiService.logApiUsage(
      req.mineralApiKey?.id || null,
      req.path,
      req.method,
      res.statusCode,
      responseTime,
      req.ip,
      req.get('User-Agent')
    ).catch(error => {
      console.error('Error logging API usage:', error);
    });
    
    // Call the original res.end
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
}