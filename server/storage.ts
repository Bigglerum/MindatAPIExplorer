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
import { generateChatResponse as generateOpenAIResponse } from "./services/openai-service";

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
    try {
      // We're now using Basic Auth with environment variables
      const username = process.env.MINDAT_USERNAME;
      const password = process.env.MINDAT_PASSWORD;
      
      // Check if environment credentials are available
      if (username && password) {
        // Create Basic Auth header
        const base64Auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        // Try to make a simple request to validate credentials
        const response = await fetch('https://api.mindat.org/minerals/search?name=quartz&limit=1', {
          headers: {
            'Authorization': `Basic ${base64Auth}`,
            'Content-Type': 'application/json'
          }
        });
        
        return response.ok;
      }
      
      // Fallback for development without environment variables
      if (apiKey === 'demo_api_key') {
        return true;
      }
      
      for (const user of this.users.values()) {
        if (user.apiKey === apiKey) {
          return true;
        }
      }
      
      // For development without environment variables, assume any non-empty key is valid
      return apiKey.length > 0;
    } catch (error) {
      console.error('Error validating API credentials:', error);
      return false;
    }
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
    try {
      // Use the OpenAI service to generate a response
      return await generateOpenAIResponse(message, history);
    } catch (error) {
      console.error("Error generating chat response with OpenAI:", error);
      
      // Fallback responses if OpenAI call fails
      const messageLower = message.toLowerCase();
      
      if (messageLower.includes('hello') || messageLower.includes('hi')) {
        return "Hello! How can I help you with the Mindat API today?";
      }
      
      if (messageLower.includes('api key') || messageLower.includes('apikey')) {
        return "To get an API key for Mindat, you'll need to visit https://api.mindat.org and register for an account. Once you have an account, you can request an API key from your profile.";
      }
      
      // Default fallback response
      return "I'm currently experiencing some technical difficulties. Please try again with your question about the Mindat API.";
    }
  }
}

// Import DatabaseStorage for use with the PostgreSQL database
import { DatabaseStorage } from './storage-db';

// Use the database storage instead of in-memory storage
export const storage = new DatabaseStorage();
