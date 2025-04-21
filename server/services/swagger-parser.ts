import { APIEndpoint, APICategory, OpenAPIDocument, PathItem, Operation, Parameter } from "../../client/src/types/api";
import { storage } from "../storage";
import { InsertApiEndpoint, InsertEndpointCategory } from "@shared/schema";

/**
 * Fetches the Swagger documentation from the Mindat API
 * @param apiKey - The API key for Token authentication
 * @returns The Swagger documentation as a JSON object
 */
export async function fetchSwaggerDocs(apiKey: string): Promise<OpenAPIDocument> {
  try {
    // Use Token authentication with the API key
    const response = await fetch('https://api.mindat.org/schema/swagger.json', {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MindatExplorer/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Swagger docs: ${response.status} ${response.statusText}`);
    }
    
    return await response.json() as OpenAPIDocument;
  } catch (error) {
    console.error('Error fetching Swagger docs:', error);
    throw error;
  }
}

/**
 * Parses the Swagger documentation and stores it in the database
 * @param swaggerDoc - The Swagger documentation as a JSON object
 */
export async function parseSwaggerDoc(swaggerDoc: OpenAPIDocument): Promise<APICategory[]> {
  try {
    // Group endpoints by tag/category
    const endpointsByTag: Record<string, APIEndpoint[]> = {};
    
    // Process each path and operation in the Swagger doc
    for (const [path, pathItem] of Object.entries(swaggerDoc.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (isOperation(method, operation)) {
          const endpoint = createEndpointFromOperation(path, method, operation);
          
          // Determine which tag/category this endpoint belongs to
          const tag = operation.tags && operation.tags.length > 0 
            ? operation.tags[0] 
            : 'Other';
          
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = [];
          }
          
          endpointsByTag[tag].push(endpoint);
        }
      }
    }
    
    // Create categories and add endpoints
    const categories: APICategory[] = [];
    
    for (const [tagName, endpoints] of Object.entries(endpointsByTag)) {
      // Create or find the category
      const categoryData: InsertEndpointCategory = {
        name: tagName,
        description: `API endpoints related to ${tagName.toLowerCase()}`
      };
      
      const category = await storage.addApiCategory(categoryData);
      
      // Add each endpoint to the database
      const storedEndpoints: APIEndpoint[] = [];
      
      for (const endpoint of endpoints) {
        const endpointData: InsertApiEndpoint = {
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          parameters: JSON.stringify(endpoint.parameters),
          responses: JSON.stringify(endpoint.responses),
          categoryId: category.id
        };
        
        const storedEndpoint = await storage.addApiEndpoint(endpointData);
        
        storedEndpoints.push({
          id: storedEndpoint.id,
          path: storedEndpoint.path,
          method: storedEndpoint.method,
          summary: storedEndpoint.summary || undefined,
          description: storedEndpoint.description || undefined,
          parameters: endpoint.parameters,
          responses: endpoint.responses,
          categoryId: storedEndpoint.categoryId || undefined
        });
      }
      
      categories.push({
        id: category.id,
        name: category.name,
        description: category.description || '',
        endpoints: storedEndpoints
      });
    }
    
    return categories;
  } catch (error) {
    console.error('Error parsing Swagger doc:', error);
    throw error;
  }
}

/**
 * Type guard to check if a method and value from a PathItem is an Operation
 */
function isOperation(method: string, value: any): value is Operation {
  const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'options'];
  return validMethods.includes(method.toLowerCase()) && value !== undefined;
}

/**
 * Creates an APIEndpoint object from a Swagger Operation
 */
function createEndpointFromOperation(path: string, method: string, operation: Operation): APIEndpoint {
  // Combine path parameters and operation parameters
  const parameters: Parameter[] = operation.parameters || [];
  
  return {
    id: 0, // Will be set when stored in the database
    path,
    method: method.toUpperCase(),
    summary: operation.summary || '',
    description: operation.description || '',
    parameters,
    responses: operation.responses || {},
    categoryId: 0 // Will be set when stored in the database
  };
}
