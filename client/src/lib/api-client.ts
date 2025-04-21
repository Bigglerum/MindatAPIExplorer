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
  // Using our server proxy to handle authentication and URL issues
  const proxyUrl = '/api/proxy';
  
  // Prepare the proxy request
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    body: JSON.stringify({
      path: path,
      method: options.method || 'GET',
      parameters: options.body || {}
    })
  };
  
  // Make the request through our proxy
  const response = await fetch(proxyUrl, requestOptions);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
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
  apiKey: string = ''
): Promise<any> {
  try {
    // Use our proxy endpoint directly
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: endpoint,
        method: method,
        parameters: params
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
