/**
 * Proxies requests to the Mindat API
 * @param path - The API path to request
 * @param method - The HTTP method (GET, POST, etc.)
 * @param parameters - The request parameters (query params or body)
 * @param credentials - API key for Token authentication
 * @param useBasicAuth - No longer used, maintained for backwards compatibility
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
    // Try several API base URLs based on the updated documentation
    const baseUrls = [
      'https://api.mindat.org',
      'https://www.mindat.org/api',
      'https://mindat.org/api',
      'https://147.135.28.115' // Alternate URL during migration (per documentation) - Try last as it may be offline
    ];
    
    // Adjusting path if needed, mapping traditional paths to documented endpoints
    let adjustedPath = path;
    
    // Map our standard paths to the actual API endpoints based on documentation
    if (path.startsWith('/minerals')) {
      adjustedPath = path.replace('/minerals', '/geomaterials');
    } else if (path === '/minerals/search') {
      adjustedPath = '/geomaterials/';
    } else if (path.startsWith('/localities') && !path.includes('list')) {
      adjustedPath = path.replace('/localities', '/localities');
    }
    
    // Build the URL with base Mindat API endpoint
    let url = `${baseUrls[0]}${adjustedPath.startsWith('/') ? adjustedPath : `/${adjustedPath}`}`;
    const normalizedMethod = method.toUpperCase();

    // Set up headers with content type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MindatExplorer/1.0'
    };
    
    // Set the appropriate authentication header based on the method
    if (useBasicAuth) {
      // Basic Auth is used when we have username/password
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      // Token authentication is used when we have an API key
      headers['Authorization'] = `Token ${credentials}`;
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
      // Update URL with current base URL, keeping any query parameters that were already added
      const pathWithoutQuery = path.split('?')[0];
      const queryString = url.includes('?') ? url.substring(url.indexOf('?')) : '';
      
      // Construct URL with the current base URL
      url = `${baseUrl}${pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`}${queryString}`;
      
      console.log(`Trying API URL: ${url}`);
      
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
        console.log(`Error connecting to ${baseUrl}: ${error.message}`);
        
        // Check if it's a network error (connection refused, etc)
        const isNetworkError = error.cause && (
          error.cause.code === 'ECONNREFUSED' || 
          error.cause.code === 'ETIMEDOUT' ||
          error.cause.code === 'ENOTFOUND'
        );
        
        // Store this error but continue to the next URL
        if (isNetworkError || error.status === 404) {
          lastError = error;
          continue;
        }
        
        // For other types of errors, throw them immediately
        throw error;
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
