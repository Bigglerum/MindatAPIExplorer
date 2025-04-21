import { useAuth } from '@/hooks/use-auth';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export async function fetchFromMindatApi(
  path: string,
  options: RequestOptions = {},
  apiKey?: string
): Promise<Response> {
  const baseUrl = 'https://api.mindat.org';
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  
  // Use the apiKey parameter if provided, otherwise get it using the auth hook
  const key = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('mindat_api_key') : null);
  
  if (!key) {
    throw new Error('No API key provided. Please authenticate first.');
  }
  
  const headers = {
    'Authorization': `Token ${key}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    credentials: 'include'
  };
  
  if (options.body) {
    requestOptions.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(url, requestOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText || response.statusText}`);
  }
  
  return response;
}

export async function fetchSwaggerDocs(apiKey: string): Promise<any> {
  try {
    const response = await fetchFromMindatApi('/schema/swagger.json', {}, apiKey);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Swagger docs:', error);
    throw error;
  }
}

export async function executeApiRequest(
  endpoint: string,
  method: string,
  params: Record<string, any> = {},
  apiKey: string
): Promise<any> {
  try {
    // For GET requests, add query parameters to the URL
    let url = endpoint;
    let body = undefined;
    
    if (method.toUpperCase() === 'GET' && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      
      url = `${endpoint}?${queryParams.toString()}`;
    } else if (method.toUpperCase() !== 'GET' && Object.keys(params).length > 0) {
      body = params;
    }
    
    const response = await fetchFromMindatApi(url, {
      method,
      body
    }, apiKey);
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
