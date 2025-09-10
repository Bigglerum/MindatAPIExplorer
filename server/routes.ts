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

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure security middleware
  configureSecurity(app);
  
  // Health endpoints (bypass rate limiting)
  app.get('/health', healthCheck);
  app.get('/ready', readinessCheck);
  
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

  // Register RRUFF routes
  registerRruffRoutes(app);
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
