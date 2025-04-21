import { 
  users, 
  endpointCategories, 
  apiEndpoints, 
  savedRequests, 
  type User, 
  type InsertUser, 
  type EndpointCategory, 
  type InsertEndpointCategory,
  type ApiEndpoint,
  type InsertApiEndpoint,
  type SavedRequest,
  type InsertSavedRequest
} from "@shared/schema";
import { APICategory, APIEndpoint, Parameter } from "../client/src/types/api";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateApiKey(apiKey: string): Promise<boolean>;
  
  // API Documentation methods
  getApiCategories(): Promise<APICategory[]>;
  getApiEndpoint(id: number): Promise<APIEndpoint | undefined>;
  searchApiEndpoints(query: string): Promise<APIEndpoint[]>;
  addApiEndpoint(endpoint: InsertApiEndpoint): Promise<ApiEndpoint>;
  addApiCategory(category: InsertEndpointCategory): Promise<EndpointCategory>;
  
  // Saved requests methods
  getSavedRequests(): Promise<SavedRequest[]>;
  getSavedRequest(id: number): Promise<SavedRequest | undefined>;
  saveRequest(request: InsertSavedRequest): Promise<SavedRequest>;
  deleteSavedRequest(id: number): Promise<void>;
  
  // Chat/AI methods
  generateChatResponse(message: string, history: any[]): Promise<string>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, EndpointCategory>;
  private endpoints: Map<number, ApiEndpoint>;
  private requests: Map<number, SavedRequest>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private endpointIdCounter: number;
  private requestIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.endpoints = new Map();
    this.requests = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.endpointIdCounter = 1;
    this.requestIdCounter = 1;
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Add a default user
    this.createUser({
      username: 'demo',
      password: 'password',
      apiKey: 'demo_api_key'
    });
    
    // Initialize with default API categories and endpoints
    // These would normally be populated from the Swagger documentation
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories() {
    // Minerals category
    const mineralsCategory = this.addApiCategory({
      name: 'Minerals',
      description: 'Endpoints related to mineral data'
    });
    
    // Add endpoints to Minerals category
    this.addApiEndpoint({
      path: '/minerals',
      method: 'GET',
      summary: 'List Minerals',
      description: 'Returns a paginated list of minerals from the Mindat database.',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          description: 'Page number for paginated results',
          required: false,
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'page_size',
          in: 'query',
          description: 'Number of results per page (max 100)',
          required: false,
          schema: { type: 'integer', default: 20 }
        },
        {
          name: 'fields',
          in: 'query',
          description: 'Comma-separated list of fields to include in response',
          required: false,
          schema: { type: 'string' }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  next: { type: 'string', format: 'uri', nullable: true },
                  previous: { type: 'string', format: 'uri', nullable: true },
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        formula: { type: 'string' },
                        ima_formula: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      categoryId: mineralsCategory.id
    });
    
    this.addApiEndpoint({
      path: '/minerals/{id}',
      method: 'GET',
      summary: 'Mineral Details',
      description: 'Returns detailed information about a specific mineral.',
      parameters: JSON.stringify([
        {
          name: 'id',
          in: 'path',
          description: 'The mineral ID',
          required: true,
          schema: { type: 'integer' }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  formula: { type: 'string' },
                  ima_formula: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }),
      categoryId: mineralsCategory.id
    });
    
    this.addApiEndpoint({
      path: '/minerals/search',
      method: 'POST',
      summary: 'Search Minerals',
      description: 'Search minerals based on various criteria',
      parameters: JSON.stringify([
        {
          name: 'query',
          in: 'body',
          description: 'Search query',
          required: true,
          schema: { 
            type: 'object',
            properties: {
              name: { type: 'string' },
              elements: { type: 'array', items: { type: 'string' } },
              fields: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  results: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      }),
      categoryId: mineralsCategory.id
    });
    
    // Locations category
    const locationsCategory = this.addApiCategory({
      name: 'Locations',
      description: 'Endpoints related to location data'
    });
    
    // Add endpoints to Locations category
    this.addApiEndpoint({
      path: '/locations',
      method: 'GET',
      summary: 'List Locations',
      description: 'Returns a paginated list of locations from the Mindat database.',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          description: 'Page number for paginated results',
          required: false,
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'page_size',
          in: 'query',
          description: 'Number of results per page (max 100)',
          required: false,
          schema: { type: 'integer', default: 20 }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  next: { type: 'string', format: 'uri', nullable: true },
                  previous: { type: 'string', format: 'uri', nullable: true },
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        country: { type: 'string' },
                        region: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      categoryId: locationsCategory.id
    });
    
    this.addApiEndpoint({
      path: '/locations/{id}',
      method: 'GET',
      summary: 'Location Details',
      description: 'Returns detailed information about a specific location.',
      parameters: JSON.stringify([
        {
          name: 'id',
          in: 'path',
          description: 'The location ID',
          required: true,
          schema: { type: 'integer' }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  country: { type: 'string' },
                  region: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }),
      categoryId: locationsCategory.id
    });
    
    // Images category
    const imagesCategory = this.addApiCategory({
      name: 'Images',
      description: 'Endpoints related to image data'
    });
    
    // Add endpoints to Images category
    this.addApiEndpoint({
      path: '/images',
      method: 'GET',
      summary: 'List Images',
      description: 'Returns a paginated list of images from the Mindat database.',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          description: 'Page number for paginated results',
          required: false,
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'page_size',
          in: 'query',
          description: 'Number of results per page (max 100)',
          required: false,
          schema: { type: 'integer', default: 20 }
        },
        {
          name: 'mineral_id',
          in: 'query',
          description: 'Filter by mineral ID',
          required: false,
          schema: { type: 'integer' }
        },
        {
          name: 'location_id',
          in: 'query',
          description: 'Filter by location ID',
          required: false,
          schema: { type: 'integer' }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  next: { type: 'string', format: 'uri', nullable: true },
                  previous: { type: 'string', format: 'uri', nullable: true },
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        thumbnail_url: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      categoryId: imagesCategory.id
    });
    
    this.addApiEndpoint({
      path: '/images/{id}',
      method: 'GET',
      summary: 'Image Details',
      description: 'Returns detailed information about a specific image.',
      parameters: JSON.stringify([
        {
          name: 'id',
          in: 'path',
          description: 'The image ID',
          required: true,
          schema: { type: 'integer' }
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  url: { type: 'string' },
                  thumbnail_url: { type: 'string' },
                  minerals: { type: 'array', items: { type: 'object' } },
                  locations: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      }),
      categoryId: imagesCategory.id
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // In a real implementation, this would make a call to the Mindat API to validate the key
    // For now, we'll just check if any user has this API key or accept a demo key
    if (apiKey === 'demo_api_key') {
      return true;
    }
    
    for (const user of this.users.values()) {
      if (user.apiKey === apiKey) {
        return true;
      }
    }
    
    // For development purposes, assume any non-empty key is valid
    // In production, this would be replaced with actual API validation
    return apiKey.length > 0;
  }

  // API Documentation methods
  async getApiCategories(): Promise<APICategory[]> {
    const categories: APICategory[] = [];
    
    for (const category of this.categories.values()) {
      const endpoints: APIEndpoint[] = [];
      
      for (const endpoint of this.endpoints.values()) {
        if (endpoint.categoryId === category.id) {
          const parameters = endpoint.parameters 
            ? JSON.parse(endpoint.parameters as string) as Parameter[]
            : [];
          
          const responses = endpoint.responses
            ? JSON.parse(endpoint.responses as string)
            : {};
          
          endpoints.push({
            id: endpoint.id,
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.summary || endpoint.path,
            description: endpoint.description,
            parameters,
            responses,
            categoryId: endpoint.categoryId
          });
        }
      }
      
      categories.push({
        id: category.id,
        name: category.name,
        description: category.description || '',
        endpoints
      });
    }
    
    return categories;
  }

  async getApiEndpoint(id: number): Promise<APIEndpoint | undefined> {
    const endpoint = this.endpoints.get(id);
    
    if (!endpoint) {
      return undefined;
    }
    
    const parameters = endpoint.parameters 
      ? JSON.parse(endpoint.parameters as string) as Parameter[]
      : [];
    
    const responses = endpoint.responses
      ? JSON.parse(endpoint.responses as string)
      : {};
    
    return {
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method,
      summary: endpoint.summary || endpoint.path,
      description: endpoint.description,
      parameters,
      responses,
      categoryId: endpoint.categoryId
    };
  }

  async searchApiEndpoints(query: string): Promise<APIEndpoint[]> {
    const results: APIEndpoint[] = [];
    const normalizedQuery = query.toLowerCase();
    
    for (const endpoint of this.endpoints.values()) {
      const matchesPath = endpoint.path.toLowerCase().includes(normalizedQuery);
      const matchesMethod = endpoint.method.toLowerCase().includes(normalizedQuery);
      const matchesSummary = endpoint.summary && endpoint.summary.toLowerCase().includes(normalizedQuery);
      const matchesDescription = endpoint.description && endpoint.description.toLowerCase().includes(normalizedQuery);
      
      if (matchesPath || matchesMethod || matchesSummary || matchesDescription) {
        const parameters = endpoint.parameters 
          ? JSON.parse(endpoint.parameters as string) as Parameter[]
          : [];
        
        const responses = endpoint.responses
          ? JSON.parse(endpoint.responses as string)
          : {};
        
        results.push({
          id: endpoint.id,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary || endpoint.path,
          description: endpoint.description,
          parameters,
          responses,
          categoryId: endpoint.categoryId
        });
      }
    }
    
    return results;
  }

  async addApiEndpoint(endpointData: InsertApiEndpoint): Promise<ApiEndpoint> {
    const id = this.endpointIdCounter++;
    const endpoint: ApiEndpoint = { ...endpointData, id };
    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  async addApiCategory(categoryData: InsertEndpointCategory): Promise<EndpointCategory> {
    const id = this.categoryIdCounter++;
    const category: EndpointCategory = { ...categoryData, id };
    this.categories.set(id, category);
    return category;
  }

  // Saved requests methods
  async getSavedRequests(): Promise<SavedRequest[]> {
    const savedRequests: SavedRequest[] = [];
    
    for (const request of this.requests.values()) {
      const endpoint = await this.getApiEndpoint(request.endpointId);
      
      savedRequests.push({
        ...request,
        endpoint: endpoint ? {
          id: endpoint.id,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          parameters: endpoint.parameters,
          responses: endpoint.responses,
          categoryId: endpoint.categoryId
        } : undefined
      } as SavedRequest);
    }
    
    return savedRequests;
  }

  async getSavedRequest(id: number): Promise<SavedRequest | undefined> {
    return this.requests.get(id);
  }

  async saveRequest(requestData: InsertSavedRequest): Promise<SavedRequest> {
    const id = this.requestIdCounter++;
    const now = new Date();
    const request: SavedRequest = { 
      ...requestData, 
      id,
      createdAt: now.toISOString()
    };
    
    this.requests.set(id, request);
    return request;
  }

  async deleteSavedRequest(id: number): Promise<void> {
    this.requests.delete(id);
  }

  // Chat/AI methods
  async generateChatResponse(message: string, history: any[]): Promise<string> {
    // In a production environment, this would call an AI service like OpenAI
    // For this demo, we'll use hard-coded responses based on keywords
    
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi')) {
      return "Hello! How can I help you with the Mindat API today?";
    }
    
    if (messageLower.includes('api key') || messageLower.includes('apikey')) {
      return "To get an API key for Mindat, you'll need to visit https://api.mindat.org and register for an account. Once you have an account, you can request an API key from your profile.";
    }
    
    if (messageLower.includes('mineral') && (messageLower.includes('list') || messageLower.includes('get'))) {
      return "To list minerals, you can use the GET `/minerals` endpoint. This accepts parameters like `page`, `page_size`, and `fields` to customize your request. Here's a sample code:\n\n```python\nimport requests\n\nurl = \"https://api.mindat.org/minerals\"\nheaders = {\"Authorization\": \"Token YOUR_API_KEY\"}\nparams = {\"page\": 1, \"page_size\": 20}\n\nresponse = requests.get(url, headers=headers, params=params)\ndata = response.json()\n```";
    }
    
    if (messageLower.includes('chemical') && messageLower.includes('element')) {
      return "To filter minerals by chemical element, you can use the `/minerals` endpoint with the `elements` query parameter. For example, to find minerals containing copper (Cu), use: `?elements=Cu`. You can also combine multiple elements like `?elements=Cu,Fe` to find minerals containing both copper and iron.";
    }
    
    if (messageLower.includes('location')) {
      return "The Mindat API provides location data through the `/locations` endpoint. You can list all locations with pagination, or get details for a specific location using `/locations/{id}`. Locations can be filtered by country or region using query parameters.";
    }
    
    if (messageLower.includes('search')) {
      return "To search for minerals in the Mindat API, you can use the POST `/minerals/search` endpoint. This allows more complex searches than the GET endpoint. You can search by name, chemical formula, elements, and more. The request body should be a JSON object with your search criteria.";
    }
    
    if (messageLower.includes('image') || messageLower.includes('photo')) {
      return "The Mindat API provides access to mineral images through the `/images` endpoint. You can get a list of all images, or filter by mineral or location. Each image record includes thumbnail and full-size URLs.";
    }
    
    if (messageLower.includes('pagination')) {
      return "Most list endpoints in the Mindat API support pagination using the `page` and `page_size` parameters. The response includes `count`, `next`, and `previous` fields to help you navigate through the pages. The maximum page size is typically 100 items.";
    }
    
    if (messageLower.includes('python') || messageLower.includes('code')) {
      return "Here's a Python example to get started with the Mindat API:\n\n```python\nimport requests\n\nAPI_KEY = 'your_api_key_here'\nBASE_URL = 'https://api.mindat.org'\n\nheaders = {\n    'Authorization': f'Token {API_KEY}',\n    'Content-Type': 'application/json'\n}\n\n# Get a list of minerals\nresponse = requests.get(f'{BASE_URL}/minerals', headers=headers)\ndata = response.json()\n\nprint(f'Total minerals: {data[\"count\"]}')\nfor mineral in data['results']:\n    print(f'{mineral[\"id\"]}: {mineral[\"name\"]}')\n```";
    }
    
    // Default response
    return "I can help you understand and use the Mindat API. You can ask me about specific endpoints, how to search for minerals or locations, how to filter results, or how to use the API in your code. What would you like to know?";
  }
}

export const storage = new MemStorage();
