/**
 * Proxies requests to the Mindat API
 * @param path - The API path to request
 * @param method - The HTTP method (GET, POST, etc.)
 * @param parameters - The request parameters (query params or body)
 * @param apiKey - The API key for authentication
 * @returns The API response data
 */
export async function proxyApiRequest(
  path: string,
  method: string,
  parameters: Record<string, any>,
  apiKey: string
): Promise<any> {
  try {
    // Build the URL with base Mindat API endpoint
    let url = `https://api.mindat.org${path.startsWith('/') ? path : `/${path}`}`;
    const normalizedMethod = method.toUpperCase();

    // Build headers with Basic authentication
    const authString = `${process.env.MINDAT_USERNAME}:${process.env.MINDAT_PASSWORD}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    const headers: Record<string, string> = {
      'Authorization': `Basic ${base64Auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

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

    // Make the request
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Check for success
    if (!response.ok) {
      const errorText = await response.text();
      const error: any = new Error(errorText || response.statusText);
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    // Parse and return the response
    const data = await response.json();
    
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      duration
    };
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
