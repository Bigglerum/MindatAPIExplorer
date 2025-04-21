/**
 * Proxies requests to the Mindat API
 * @param path - The API path to request
 * @param method - The HTTP method (GET, POST, etc.)
 * @param parameters - The request parameters (query params or body)
 * @param credentials - Either the API key or Basic Auth encoded credentials
 * @param useBasicAuth - If true, use Basic Auth instead of API key
 * @returns The API response data
 */
export async function proxyApiRequest(
  path: string,
  method: string,
  parameters: Record<string, any>,
  credentials: string,
  useBasicAuth: boolean = false
): Promise<any> {
  try {
    // Try several API base URLs
    const baseUrls = [
      'https://api.mindat.org',
      'https://www.mindat.org/api',
      'https://mindat.org/api'
    ];
    
    // Build the URL with base Mindat API endpoint (first try regular api.mindat.org)
    let url = `${baseUrls[0]}${path.startsWith('/') ? path : `/${path}`}`;
    const normalizedMethod = method.toUpperCase();

    // Set up headers with content type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MindatExplorer/1.0'
    };
    
    // Add authentication header
    if (useBasicAuth) {
      // Use pre-encoded credentials (passed from routes.ts)
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      // API key header - try both header formats
      headers['X-Api-Key'] = credentials;
      headers['Authorization'] = `Bearer ${credentials}`;
    }

    // Prepare request options
    const options: RequestInit = {
      method: normalizedMethod,
      headers,
      redirect: 'follow'
    };
    
    // For GET requests, append query parameters to the URL
    if (normalizedMethod === 'GET' && Object.keys(parameters).length > 0) {
      // Replace path parameters first
      if (url.includes('{') && url.includes('}')) {
        for (const [key, value] of Object.entries(parameters)) {
          if (url.includes(`{${key}}`)) {
            url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
            delete parameters[key]; // Remove used path parameter
          }
        }
      }
      
      // Add remaining parameters as query string
      if (Object.keys(parameters).length > 0) {
        const queryParams = new URLSearchParams();
        
        for (const [key, value] of Object.entries(parameters)) {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              // Handle array values
              value.forEach((v) => {
                queryParams.append(key, String(v));
              });
            } else {
              queryParams.append(key, String(value));
            }
          }
        }
        
        url = `${url}?${queryParams.toString()}`;
      }
    } else if (normalizedMethod !== 'GET' && Object.keys(parameters).length > 0) {
      // For non-GET requests, add body
      
      // Replace path parameters first if present
      if (url.includes('{') && url.includes('}')) {
        for (const [key, value] of Object.entries(parameters)) {
          if (url.includes(`{${key}}`)) {
            url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
            delete parameters[key]; // Remove used path parameter
          }
        }
      }
      
      // Add remaining parameters as request body
      if (Object.keys(parameters).length > 0) {
        options.body = JSON.stringify(parameters);
      }
    }

    // Try each base URL until one works
    let lastError: any = null;
    
    for (const baseUrl of baseUrls) {
      // Update URL with current base URL
      url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      
      try {
        // Make the request
        const startTime = Date.now();
        const response = await fetch(url, options);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Check for success
        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(errorText || response.statusText);
          lastError.status = response.status;
          lastError.statusText = response.statusText;
          lastError.url = url;
          
          // If it's a 404, try the next URL
          if (response.status === 404) {
            console.log(`API endpoint not found at ${url}, trying next base URL...`);
            continue;
          }
          
          // For other errors, throw immediately
          throw lastError;
        }
        
        // If we got here, it worked! Parse and return the response
        const data = await response.json();
        
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          duration,
          baseUrl // Include the base URL that worked
        };
      } catch (error: any) {
        if (error.status !== 404) {
          // If it's not a 404, rethrow
          throw error;
        }
        
        // Store this error and try the next URL
        lastError = error;
      }
    }
    
    // If we get here, none of the URLs worked
    throw lastError || new Error('Failed to connect to any Mindat API endpoints');
  } catch (error: any) {
    console.error('API proxy error:', error);
    
    // Enhance error with status information when possible
    if (!error.status) {
      error.status = 500;
      error.statusText = 'Internal Server Error';
    }
    
    throw error;
  }
}
