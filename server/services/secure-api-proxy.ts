import { z } from 'zod';
import NodeCache from 'node-cache';

// Cache for API responses (TTL: 5 minutes)
const responseCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Allowlisted Mindat API paths
const ALLOWED_PATHS = /^\/(?:geomaterials|localities|crystalclasses|spacegroups|nickel-strunz-10|dana-8)(?:\/|$)/;

// Only allow the primary Mindat API base URL
const MINDAT_BASE_URL = 'https://api.mindat.org';

// Request validation schema
const ProxyRequestSchema = z.object({
  path: z.string().regex(ALLOWED_PATHS, 'Invalid API path'),
  method: z.enum(['GET']), // Only allow GET requests for security
  parameters: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .default({})
});

interface ProxyResponse {
  data: any;
  status: number;
  cached?: boolean;
}

export class SecureApiProxy {
  private static instance: SecureApiProxy;
  private readonly timeout = 8000; // 8 second timeout
  private readonly maxRetries = 2;

  private constructor() {}

  static getInstance(): SecureApiProxy {
    if (!SecureApiProxy.instance) {
      SecureApiProxy.instance = new SecureApiProxy();
    }
    return SecureApiProxy.instance;
  }

  /**
   * Secure proxy request to Mindat API
   * @param request - Validated request parameters
   * @param apiKey - Server-side API key from environment
   * @returns Standardized response
   */
  async proxyRequest(request: unknown, apiKey?: string): Promise<ProxyResponse> {
    // Validate input with Zod
    const validatedRequest = ProxyRequestSchema.parse(request);
    
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const { path, method, parameters = {} } = validatedRequest;

    // Generate cache key for GET requests
    const cacheKey = `${method}:${path}:${JSON.stringify(parameters)}`;
    
    // Check cache for GET requests
    if (method === 'GET') {
      const cached = responseCache.get<any>(cacheKey);
      if (cached) {
        return {
          data: cached,
          status: 200,
          cached: true
        };
      }
    }

    // Sanitize path - remove any path traversal attempts
    const sanitizedPath = path.replace(/\.\./g, '').replace(/\/+/g, '/');
    
    // Build URL
    let url = `${MINDAT_BASE_URL}${sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`}`;

    // Prepare headers with secure authentication
    const headers: Record<string, string> = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json',
      'User-Agent': 'MindatExplorer/2.0'
    };

    // Prepare request options
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Add query parameters for GET requests
      if (method === 'GET' && Object.keys(parameters).length > 0) {
        const queryParams = new URLSearchParams();
        
        for (const [key, value] of Object.entries(parameters)) {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        }
        
        url += `?${queryParams.toString()}`;
      }

      const response = await this.makeRequestWithRetry(url, {
        method,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mindat API error: ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET responses
      if (method === 'GET' && data) {
        responseCache.set(cacheKey, data);
      }

      return {
        data: data,
        status: response.status
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // Log error without exposing sensitive information
      console.error('Secure proxy error:', {
        path: sanitizedPath,
        status: error.status || 'unknown',
        message: error.message
      });
      
      throw new Error('External API request failed');
    }
  }

  /**
   * Make HTTP request with exponential backoff retry
   */
  private async makeRequestWithRetry(
    url: string, 
    options: RequestInit, 
    attempt: number = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      // Retry on 5xx errors or network issues
      if (response.status >= 500 && attempt <= this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await this.sleep(delay);
        return this.makeRequestWithRetry(url, options, attempt + 1);
      }
      
      return response;
    } catch (error: any) {
      if (attempt <= this.maxRetries && (
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND'
      )) {
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
        return this.makeRequestWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache - useful for testing or manual cache invalidation
   */
  clearCache(): void {
    responseCache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: responseCache.keys().length,
      hits: responseCache.getStats().hits,
      misses: responseCache.getStats().misses
    };
  }
}

export default SecureApiProxy.getInstance();