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
import { db } from "./db";
import { eq, like, or } from "drizzle-orm";
import { IStorage } from "./storage";
import { APICategory, APIEndpoint, Parameter } from "../client/src/types/api";
import { generateChatResponse as generateOpenAIResponse } from "./services/openai-service";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Make a simple request to the Mindat API to check if the key is valid
      // Use a simple endpoint like /status or just fetch the base URL
      const response = await fetch('https://api.mindat.org/status', {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }
  
  // API Documentation methods
  async getApiCategories(): Promise<APICategory[]> {
    const categories = await db.select().from(endpointCategories);
    const result: APICategory[] = [];
    
    for (const category of categories) {
      const endpointResults = await db
        .select()
        .from(apiEndpoints)
        .where(eq(apiEndpoints.categoryId, category.id));
      
      const endpointList: APIEndpoint[] = endpointResults.map(endpoint => {
        // Handle parameters based on type
        let parameters: Parameter[] = [];
        if (endpoint.parameters) {
          if (typeof endpoint.parameters === 'string') {
            try {
              parameters = JSON.parse(endpoint.parameters) as Parameter[];
            } catch (e) {
              console.error('Error parsing parameters:', e);
            }
          } else {
            // If already an object, use directly
            parameters = endpoint.parameters as unknown as Parameter[];
          }
        }
        
        // Handle responses based on type
        let responses = {};
        if (endpoint.responses) {
          if (typeof endpoint.responses === 'string') {
            try {
              responses = JSON.parse(endpoint.responses);
            } catch (e) {
              console.error('Error parsing responses:', e);
            }
          } else {
            // If already an object, use directly
            responses = endpoint.responses;
          }
        }
        
        return {
          id: endpoint.id,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary || endpoint.path,
          description: endpoint.description || undefined,
          parameters,
          responses,
          categoryId: endpoint.categoryId || undefined
        };
      });
      
      result.push({
        id: category.id,
        name: category.name,
        description: category.description || undefined,
        endpoints: endpointList
      });
    }
    
    return result;
  }

  async getApiEndpoint(id: number): Promise<APIEndpoint | undefined> {
    const [endpoint] = await db.select().from(apiEndpoints).where(eq(apiEndpoints.id, id));
    
    if (!endpoint) {
      return undefined;
    }
    
    // Handle parameters based on type
    let parameters: Parameter[] = [];
    if (endpoint.parameters) {
      if (typeof endpoint.parameters === 'string') {
        try {
          parameters = JSON.parse(endpoint.parameters) as Parameter[];
        } catch (e) {
          console.error('Error parsing parameters:', e);
        }
      } else {
        // If already an object, use directly
        parameters = endpoint.parameters as unknown as Parameter[];
      }
    }
    
    // Handle responses based on type
    let responses = {};
    if (endpoint.responses) {
      if (typeof endpoint.responses === 'string') {
        try {
          responses = JSON.parse(endpoint.responses);
        } catch (e) {
          console.error('Error parsing responses:', e);
        }
      } else {
        // If already an object, use directly
        responses = endpoint.responses;
      }
    }
    
    return {
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method,
      summary: endpoint.summary || endpoint.path,
      description: endpoint.description || undefined,
      parameters,
      responses,
      categoryId: endpoint.categoryId || undefined
    };
  }

  async searchApiEndpoints(query: string): Promise<APIEndpoint[]> {
    const normalizedQuery = query.toLowerCase();
    
    const endpoints = await db
      .select()
      .from(apiEndpoints)
      .where(
        or(
          like(apiEndpoints.path, `%${normalizedQuery}%`),
          like(apiEndpoints.method, `%${normalizedQuery}%`),
          like(apiEndpoints.summary, `%${normalizedQuery}%`),
          like(apiEndpoints.description, `%${normalizedQuery}%`)
        )
      );
    
    return endpoints.map(endpoint => {
      // Handle parameters based on type
      let parameters: Parameter[] = [];
      if (endpoint.parameters) {
        if (typeof endpoint.parameters === 'string') {
          try {
            parameters = JSON.parse(endpoint.parameters) as Parameter[];
          } catch (e) {
            console.error('Error parsing parameters:', e);
          }
        } else {
          // If already an object, use directly
          parameters = endpoint.parameters as unknown as Parameter[];
        }
      }
      
      // Handle responses based on type
      let responses = {};
      if (endpoint.responses) {
        if (typeof endpoint.responses === 'string') {
          try {
            responses = JSON.parse(endpoint.responses);
          } catch (e) {
            console.error('Error parsing responses:', e);
          }
        } else {
          // If already an object, use directly
          responses = endpoint.responses;
        }
      }
      
      return {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary || endpoint.path,
        description: endpoint.description || undefined,
        parameters,
        responses,
        categoryId: endpoint.categoryId || undefined
      };
    });
  }

  async addApiEndpoint(endpointData: InsertApiEndpoint): Promise<ApiEndpoint> {
    const [endpoint] = await db.insert(apiEndpoints).values(endpointData).returning();
    return endpoint;
  }

  async addApiCategory(categoryData: InsertEndpointCategory): Promise<EndpointCategory> {
    const [category] = await db.insert(endpointCategories).values(categoryData).returning();
    return category;
  }
  
  // Saved requests methods
  async getSavedRequests(): Promise<SavedRequest[]> {
    return db.select().from(savedRequests);
  }

  async getSavedRequest(id: number): Promise<SavedRequest | undefined> {
    const [request] = await db.select().from(savedRequests).where(eq(savedRequests.id, id));
    return request;
  }

  async saveRequest(requestData: InsertSavedRequest): Promise<SavedRequest> {
    const [request] = await db.insert(savedRequests).values(requestData).returning();
    return request;
  }

  async deleteSavedRequest(id: number): Promise<void> {
    await db.delete(savedRequests).where(eq(savedRequests.id, id));
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