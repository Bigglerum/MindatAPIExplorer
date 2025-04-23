import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchSwaggerDocs, parseSwaggerDoc } from "./services/swagger-parser";
import { generateCode } from "./services/code-generator";
import { proxyApiRequest } from "./services/api-proxy";
import { registerRruffRoutes } from "./routes/rruff-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Validate credentials
  app.post('/api/validate-key', async (req: Request, res: Response) => {
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

  // Proxy API request
  app.post('/api/proxy', async (req: Request, res: Response) => {
    try {
      const { path, method, parameters, apiKey } = req.body;
      
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }
      
      let credentials: string;
      let useBasicAuth: boolean = false;
      
      // Prioritize API key authentication as per Mindat documentation
      if (process.env.MINDAT_API_KEY) {
        // Use Token auth with API key
        console.log('Using Mindat API key for Token authentication');
        // Make sure to trim any whitespace that might be in the API key
        credentials = process.env.MINDAT_API_KEY.trim();
        useBasicAuth = false;
      } else if (process.env.MINDAT_USERNAME && process.env.MINDAT_PASSWORD) {
        // Fallback to Basic auth if API key not available
        console.log('Using username/password with Basic Auth');
        const username = process.env.MINDAT_USERNAME.trim();
        const password = process.env.MINDAT_PASSWORD.trim();
        credentials = Buffer.from(`${username}:${password}`).toString('base64');
        useBasicAuth = true;
      } else {
        // If no credentials are available, return an error
        return res.status(401).json({ 
          error: 'Unauthorized: Missing credentials. The Mindat API requires valid authentication.' 
        });
      }
      
      // Call the proxy with the selected authentication method
      const response = await proxyApiRequest(
        path, 
        method || 'GET', 
        parameters || {}, 
        credentials,
        useBasicAuth
      );
      
      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error proxying API request:', error);
      
      // Return a user-friendly error message
      const errorMessage = error.message || 'Failed to execute API request';
      const statusCode = error.status || 500;
      
      // For connection issues, provide a more helpful message
      const isConnectionError = 
        errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('not found') ||
        statusCode === 404;
      
      if (isConnectionError) {
        return res.status(statusCode).json({
          error: 'Unable to connect to the Mindat API. The API might be temporarily unavailable or the URL structure may have changed.',
          details: errorMessage,
          status: statusCode
        });
      }
      
      // For authentication issues
      const isAuthError = statusCode === 401 || statusCode === 403;
      if (isAuthError) {
        return res.status(statusCode).json({
          error: 'Authentication failed. Please check your Mindat API credentials.',
          details: errorMessage,
          status: statusCode
        });
      }
      
      // For other errors
      return res.status(statusCode).json({ 
        error: errorMessage,
        status: statusCode
      });
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
