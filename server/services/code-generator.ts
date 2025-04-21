import { APIEndpoint } from "../../client/src/types/api";

/**
 * Generates code for a given API endpoint in the specified language
 * @param endpoint - The API endpoint
 * @param parameters - The parameters to use in the code
 * @param language - The programming language to generate code for
 * @returns The generated code as a string
 */
export async function generateCode(
  endpoint: APIEndpoint, 
  parameters: Record<string, any>, 
  language: string
): Promise<string> {
  switch (language.toLowerCase()) {
    case 'python':
      return generatePythonCode(endpoint, parameters);
    case 'javascript':
      return generateJavaScriptCode(endpoint, parameters);
    case 'curl':
      return generateCurlCommand(endpoint, parameters);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

/**
 * Generates Python code for a given API endpoint
 */
function generatePythonCode(endpoint: APIEndpoint, parameters: Record<string, any>): string {
  const url = `https://api.mindat.org${endpoint.path}`;
  const method = endpoint.method.toLowerCase();
  const hasPathParams = endpoint.path.includes('{');
  
  let code = `import requests

url = "${url}"
headers = {
    "Authorization": "Token YOUR_API_KEY",
    "Content-Type": "application/json"
}
`;

  // Replace path parameters in the URL
  if (hasPathParams) {
    code += '\n# Replace path parameters in the URL\n';
    for (const param of endpoint.parameters || []) {
      if (param.in === 'path') {
        const value = parameters[param.name] || `{${param.name}}`;
        code += `url = url.replace("{${param.name}}", str(${JSON.stringify(value)}))\n`;
      }
    }
  }

  // Handle query or body parameters based on method
  if (method === 'get') {
    // For GET requests, use query parameters
    const queryParams = getQueryParams(endpoint, parameters);
    if (Object.keys(queryParams).length > 0) {
      code += `
params = {
${Object.entries(queryParams)
  .map(([key, value]) => `    "${key}": ${JSON.stringify(value)}`)
  .join(',\n')}
}

response = requests.get(url, headers=headers, params=params)
`;
    } else {
      code += `
response = requests.get(url, headers=headers)
`;
    }
  } else {
    // For non-GET requests, use request body
    const bodyParams = getBodyParams(endpoint, parameters);
    if (Object.keys(bodyParams).length > 0) {
      code += `
data = {
${Object.entries(bodyParams)
  .map(([key, value]) => `    "${key}": ${JSON.stringify(value)}`)
  .join(',\n')}
}

response = requests.${method}(url, headers=headers, json=data)
`;
    } else {
      code += `
response = requests.${method}(url, headers=headers)
`;
    }
  }

  // Add code to handle the response
  code += `
# Handle the response
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"Error: {response.status_code}")
    print(response.text)
`;

  return code;
}

/**
 * Generates JavaScript code for a given API endpoint
 */
function generateJavaScriptCode(endpoint: APIEndpoint, parameters: Record<string, any>): string {
  const url = `https://api.mindat.org${endpoint.path}`;
  const method = endpoint.method.toLowerCase();
  const hasPathParams = endpoint.path.includes('{');
  
  let code = `// Using fetch API
const headers = {
    "Authorization": "Token YOUR_API_KEY",
    "Content-Type": "application/json"
};

let url = "${url}";
`;

  // Replace path parameters in the URL
  if (hasPathParams) {
    code += '\n// Replace path parameters in the URL\n';
    for (const param of endpoint.parameters || []) {
      if (param.in === 'path') {
        const value = parameters[param.name] || `{${param.name}}`;
        code += `url = url.replace("{${param.name}}", ${JSON.stringify(value)});\n`;
      }
    }
  }

  // Handle query or body parameters based on method
  if (method === 'get') {
    // For GET requests, use query parameters
    const queryParams = getQueryParams(endpoint, parameters);
    if (Object.keys(queryParams).length > 0) {
      code += `
// Create query string
const queryParams = new URLSearchParams();
${Object.entries(queryParams)
  .map(([key, value]) => `queryParams.append("${key}", ${JSON.stringify(value)});`)
  .join('\n')}

fetch(\`\${url}?\${queryParams.toString()}\`, {
    method: "${method.toUpperCase()}",
    headers
})
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
`;
    } else {
      code += `
fetch(url, {
    method: "${method.toUpperCase()}",
    headers
})
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
`;
    }
  } else {
    // For non-GET requests, use request body
    const bodyParams = getBodyParams(endpoint, parameters);
    if (Object.keys(bodyParams).length > 0) {
      code += `
// Request body
const data = ${JSON.stringify(bodyParams, null, 2)};

fetch(url, {
    method: "${method.toUpperCase()}",
    headers,
    body: JSON.stringify(data)
})
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
`;
    } else {
      code += `
fetch(url, {
    method: "${method.toUpperCase()}",
    headers
})
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
`;
    }
  }

  return code;
}

/**
 * Generates a cURL command for a given API endpoint
 */
function generateCurlCommand(endpoint: APIEndpoint, parameters: Record<string, any>): string {
  let url = `https://api.mindat.org${endpoint.path}`;
  const method = endpoint.method.toUpperCase();
  
  // Replace path parameters in the URL
  for (const param of endpoint.parameters || []) {
    if (param.in === 'path') {
      const value = parameters[param.name] || `{${param.name}}`;
      url = url.replace(`{${param.name}}`, encodeURIComponent(String(value)));
    }
  }
  
  // Build the cURL command
  let curlCommand = `curl -X ${method} \\`;
  
  // Add query parameters for GET requests
  if (method === 'GET') {
    const queryParams = getQueryParams(endpoint, parameters);
    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
      
      url += `?${queryString}`;
    }
  }
  
  // Add the URL
  curlCommand += `\n  "${url}" \\`;
  
  // Add headers
  curlCommand += `\n  -H "Authorization: Token YOUR_API_KEY" \\`;
  curlCommand += `\n  -H "Content-Type: application/json"`;
  
  // Add request body for non-GET requests
  if (method !== 'GET') {
    const bodyParams = getBodyParams(endpoint, parameters);
    if (Object.keys(bodyParams).length > 0) {
      curlCommand += ` \\\n  -d '${JSON.stringify(bodyParams, null, 2)}'`;
    }
  }
  
  return curlCommand;
}

/**
 * Extracts query parameters for an endpoint
 */
function getQueryParams(endpoint: APIEndpoint, parameters: Record<string, any>): Record<string, any> {
  const queryParams: Record<string, any> = {};
  
  for (const param of endpoint.parameters || []) {
    if (param.in === 'query' && parameters[param.name] !== undefined) {
      queryParams[param.name] = parameters[param.name];
    }
  }
  
  return queryParams;
}

/**
 * Extracts body parameters for an endpoint
 */
function getBodyParams(endpoint: APIEndpoint, parameters: Record<string, any>): Record<string, any> {
  const bodyParams: Record<string, any> = {};
  
  // Handle request body parameters
  for (const param of endpoint.parameters || []) {
    if (param.in === 'body' && parameters[param.name] !== undefined) {
      return parameters[param.name]; // Return the entire body object
    }
  }
  
  // If no specific body parameter is found, collect all non-path, non-query parameters
  for (const [key, value] of Object.entries(parameters)) {
    const isPathParam = (endpoint.parameters || []).some(
      p => p.in === 'path' && p.name === key
    );
    
    const isQueryParam = (endpoint.parameters || []).some(
      p => p.in === 'query' && p.name === key
    );
    
    if (!isPathParam && !isQueryParam) {
      bodyParams[key] = value;
    }
  }
  
  return bodyParams;
}
