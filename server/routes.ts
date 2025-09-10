import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchSwaggerDocs, parseSwaggerDoc } from "./services/swagger-parser";
import { generateCode } from "./services/code-generator";
import secureApiProxy from "./services/secure-api-proxy";
import { registerRruffRoutes } from "./routes/rruff-routes";
import { 
  configureSecurity, 
  apiProxyRateLimit, 
  authRateLimit, 
  healthCheck, 
  readinessCheck 
} from "./middleware/security";
import { configureSession } from "./middleware/session";
import { sessionMiddleware } from "./middleware/auth";
import { registerAuthRoutes } from "./routes/auth-routes";
import { MineralsApiService } from './services/minerals-api-service.js';
import { CronService } from './services/cron-service.js';
import { MineralSyncService } from './services/mineral-sync-service.js';
import { validateMineralApiKey, createPreAuthRateLimit, createPostAuthRateLimit, requireAdminPermissions } from './middleware/minerals-auth.js';
import { logApiUsage } from './middleware/api-usage-logger.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for proper IP detection in production environments
  app.set('trust proxy', 1);
  
  // Configure security middleware
  configureSecurity(app);
  
  // Configure session middleware
  configureSession(app);
  
  // Apply session validation middleware
  app.use(sessionMiddleware);
  
  // Health endpoints (bypass rate limiting)
  app.get('/health', healthCheck);
  app.get('/ready', readinessCheck);
  
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Initialize mineral services
  const mineralsApiService = MineralsApiService.getInstance();
  const cronService = CronService.getInstance();
  const mineralSyncService = MineralSyncService.getInstance();
  
  // Start cron jobs for daily mineral data sync (idempotent)
  try {
    cronService.start();
  } catch (error) {
    console.log('Cron service already started or error:', error);
  }
  
  // API Routes
  
  // Validate credentials (rate limited)
  app.post('/api/validate-key', authRateLimit, async (req: Request, res: Response) => {
    try {
      // Check for Mindat API key
      if (!process.env.MINDAT_API_KEY) {
        return res.status(401).json({ valid: false, error: 'Missing Mindat API key in environment' });
      }
      
      // Try to fetch something simple from the API to validate the credentials
      const isValid = await storage.validateApiKey(process.env.MINDAT_API_KEY);
      
      if (isValid) {
        return res.status(200).json({ valid: true });
      } else {
        return res.status(401).json({ valid: false, error: 'Invalid API key' });
      }
    } catch (error) {
      console.error('Error validating API credentials:', error);
      return res.status(500).json({ error: 'Failed to validate API credentials' });
    }
  });

  // Fetch and parse Swagger documentation
  app.get('/api/docs/fetch', async (req: Request, res: Response) => {
    try {
      // Check for Mindat API key
      if (!process.env.MINDAT_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Missing Mindat API key' });
      }
      
      // Pass the API key for Token authentication
      const swaggerDoc = await fetchSwaggerDocs(process.env.MINDAT_API_KEY);
      return res.status(200).json(swaggerDoc);
    } catch (error) {
      console.error('Error fetching Swagger docs:', error);
      return res.status(500).json({ error: 'Failed to fetch API documentation' });
    }
  });

  // Get API categories
  app.get('/api/docs/categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getApiCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching API categories:', error);
      return res.status(500).json({ error: 'Failed to fetch API categories' });
    }
  });

  // Get endpoint by ID
  app.get('/api/docs/endpoints/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const endpoint = await storage.getApiEndpoint(parseInt(id));
      
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      
      return res.status(200).json(endpoint);
    } catch (error) {
      console.error('Error fetching endpoint:', error);
      return res.status(500).json({ error: 'Failed to fetch endpoint details' });
    }
  });

  // Search endpoints
  app.get('/api/docs/search', async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const results = await storage.searchApiEndpoints(q);
      return res.status(200).json(results);
    } catch (error) {
      console.error('Error searching endpoints:', error);
      return res.status(500).json({ error: 'Failed to search endpoints' });
    }
  });

  // Generate code sample
  app.post('/api/generate-code', async (req: Request, res: Response) => {
    try {
      const { endpoint, parameters, language } = req.body;
      
      if (!endpoint || !language) {
        return res.status(400).json({ error: 'Endpoint and language are required' });
      }
      
      const code = await generateCode(endpoint, parameters || {}, language);
      return res.status(200).json({ code });
    } catch (error) {
      console.error('Error generating code:', error);
      return res.status(500).json({ error: 'Failed to generate code sample' });
    }
  });

  // Secure proxy API request (rate limited)
  app.post('/api/proxy', apiProxyRateLimit, async (req: Request, res: Response) => {
    try {
      // Never accept API key from request body - use server environment only
      const { path, method, parameters } = req.body;
      
      if (!process.env.MINDAT_API_KEY) {
        return res.status(401).json({ 
          error: 'Unauthorized: Server API key not configured.' 
        });
      }
      
      // Use the secure proxy service
      const response = await secureApiProxy.proxyRequest(
        { path, method, parameters },
        process.env.MINDAT_API_KEY
      );
      
      return res.status(response.status).json({
        data: response.data,
        cached: response.cached
      });
      
    } catch (error: any) {
      console.error('Secure proxy error:', {
        requestId: req.id,
        error: error.message,
        path: req.body?.path
      });
      
      // Return standardized error responses
      if (error.message.includes('Invalid API path')) {
        return res.status(400).json({ error: 'Invalid API endpoint' });
      }
      
      if (error.message.includes('Request timeout')) {
        return res.status(504).json({ error: 'API request timeout' });
      }
      
      if (error.message.includes('API key not configured')) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      // Generic error for other cases
      return res.status(502).json({ error: 'External API unavailable' });
    }
  });

  // Saved requests
  app.get('/api/saved-requests', async (req: Request, res: Response) => {
    try {
      const savedRequests = await storage.getSavedRequests();
      return res.status(200).json(savedRequests);
    } catch (error) {
      console.error('Error fetching saved requests:', error);
      return res.status(500).json({ error: 'Failed to fetch saved requests' });
    }
  });

  app.post('/api/saved-requests', async (req: Request, res: Response) => {
    try {
      const { name, endpointId, parameters } = req.body;
      
      if (!name || !endpointId) {
        return res.status(400).json({ error: 'Name and endpointId are required' });
      }
      
      const savedRequest = await storage.saveRequest({
        name,
        endpointId,
        parameters: parameters || {},
        userId: 1, // Default user ID for now
      });
      
      return res.status(201).json(savedRequest);
    } catch (error) {
      console.error('Error saving request:', error);
      return res.status(500).json({ error: 'Failed to save request' });
    }
  });

  app.delete('/api/saved-requests/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteSavedRequest(parseInt(id));
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting saved request:', error);
      return res.status(500).json({ error: 'Failed to delete saved request' });
    }
  });

  // Chat API
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = await storage.generateChatResponse(message, history);
      return res.status(200).json({ response });
    } catch (error) {
      console.error('Error generating chat response:', error);
      return res.status(500).json({ error: 'Failed to generate response' });
    }
  });

  // Minerals API middleware
  const preAuthRateLimit = createPreAuthRateLimit();
  const postAuthRateLimit = createPostAuthRateLimit();
  
  // Apply usage logging to all mineral API routes (captures all responses including auth failures)
  app.use('/api/minerals', logApiUsage);
  
  // Minerals API Routes - For integration with Periodic Table search app
  
  // Search minerals by elements (main endpoint for Periodic Table app)
  app.get('/api/minerals/search/elements', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const { elements, includeAll, limit, offset, sortBy, sortOrder } = req.query;
      
      if (!elements) {
        return res.status(400).json({ 
          error: 'Elements parameter is required. Provide comma-separated element symbols (e.g., "Si,O")' 
        });
      }
      
      const elementArray = (elements as string).split(',').map(el => el.trim());
      
      const results = await mineralsApiService.searchByElements(elementArray, {
        includeAll: includeAll === 'true',
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
        sortBy: (sortBy as any) || 'name',
        sortOrder: (sortOrder as any) || 'asc'
      });
      
      return res.status(200).json(results);
    } catch (error: any) {
      console.error('Error searching minerals by elements:', error);
      return res.status(500).json({ error: error.message || 'Failed to search minerals' });
    }
  });

  // Search minerals by name or formula
  app.get('/api/minerals/search', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const { q, limit, offset, includeFormula } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query (q) is required' });
      }
      
      const results = await mineralsApiService.searchByName(q as string, {
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
        includeFormula: includeFormula !== 'false'
      });
      
      return res.status(200).json(results);
    } catch (error: any) {
      console.error('Error searching minerals by name:', error);
      return res.status(500).json({ error: error.message || 'Failed to search minerals' });
    }
  });

  // Get mineral by ID
  app.get('/api/minerals/:id', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mineral = await mineralsApiService.getMineralById(parseInt(id));
      
      if (!mineral) {
        return res.status(404).json({ error: 'Mineral not found' });
      }
      
      return res.status(200).json(mineral);
    } catch (error: any) {
      console.error('Error getting mineral by ID:', error);
      return res.status(500).json({ error: error.message || 'Failed to get mineral' });
    }
  });

  // Get minerals by crystal system
  app.get('/api/minerals/crystal-system/:system', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const { system } = req.params;
      const { limit, offset } = req.query;
      
      const results = await mineralsApiService.getMineralsByCrystalSystem(system, {
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      });
      
      return res.status(200).json(results);
    } catch (error: any) {
      console.error('Error getting minerals by crystal system:', error);
      return res.status(500).json({ error: error.message || 'Failed to get minerals' });
    }
  });

  // Get all unique elements in the database
  app.get('/api/minerals/elements', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const elements = await mineralsApiService.getAllElements();
      return res.status(200).json({ elements });
    } catch (error: any) {
      console.error('Error getting elements:', error);
      return res.status(500).json({ error: error.message || 'Failed to get elements list' });
    }
  });

  // Get database statistics
  app.get('/api/minerals/stats', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const stats = await mineralsApiService.getStats();
      return res.status(200).json(stats);
    } catch (error: any) {
      console.error('Error getting database stats:', error);
      return res.status(500).json({ error: error.message || 'Failed to get database statistics' });
    }
  });

  // Manual sync triggers (for administrative use)
  app.post('/api/minerals/sync', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, requireAdminPermissions, async (req: Request, res: Response) => {
    try {
      const { type = 'incremental' } = req.body;
      
      if (type !== 'full' && type !== 'incremental') {
        return res.status(400).json({ error: 'Sync type must be "full" or "incremental"' });
      }
      
      const result = await cronService.triggerMineralSync(type);
      return res.status(200).json({ success: true, result });
    } catch (error: any) {
      console.error('Error triggering mineral sync:', error);
      if (error.message.includes('already running')) {
        return res.status(409).json({ error: 'Sync is already in progress' });
      }
      return res.status(500).json({ error: error.message || 'Failed to trigger sync' });
    }
  });

  // Get sync status
  app.get('/api/minerals/sync/status', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, async (req: Request, res: Response) => {
    try {
      const status = cronService.getSyncStatus();
      return res.status(200).json(status);
    } catch (error: any) {
      console.error('Error getting sync status:', error);
      return res.status(500).json({ error: error.message || 'Failed to get sync status' });
    }
  });

  // API key management for the minerals API
  app.post('/api/minerals/api-keys', preAuthRateLimit, validateMineralApiKey, postAuthRateLimit, requireAdminPermissions, async (req: Request, res: Response) => {
    try {
      const { name, permissions, rateLimit, expiresAt } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'API key name is required' });
      }
      
      const result = await mineralsApiService.generateApiKey(
        name,
        undefined, // userId - could be added later for user association
        permissions || ['read'],
        rateLimit || 1000,
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      return res.status(201).json({
        keyId: result.keyId,
        apiKey: result.apiKey,
        message: 'API key created successfully. Store this key securely - it will not be shown again.'
      });
    } catch (error: any) {
      console.error('Error generating API key:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate API key' });
    }
  });

  // Register RRUFF routes
  registerRruffRoutes(app);
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
