import { eq, and, sql, desc, asc, or, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { minerals, apiKeys, apiUsageEvents, type Mineral } from '@shared/schema';
import argon2 from 'argon2';
import crypto from 'crypto';

export class MineralsApiService {
  private static instance: MineralsApiService;

  private constructor() {}

  static getInstance(): MineralsApiService {
    if (!MineralsApiService.instance) {
      MineralsApiService.instance = new MineralsApiService();
    }
    return MineralsApiService.instance;
  }

  /**
   * Search minerals by elements (main use case for Periodic Table app)
   */
  async searchByElements(
    elements: string[],
    options: {
      includeAll?: boolean; // If true, mineral must contain ALL elements
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'discovery_year' | 'hardness';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ minerals: Mineral[]; total: number }> {
    const {
      includeAll = false,
      limit = 100,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    // Validate elements array
    if (!elements || elements.length === 0) {
      throw new Error('At least one element must be specified');
    }

    // Clean and validate element symbols (1-2 uppercase letters)
    const validElements = elements
      .map(el => el.trim())
      .filter(el => /^[A-Z][a-z]?$/.test(el));

    if (validElements.length === 0) {
      throw new Error('No valid element symbols provided');
    }

    try {
      // Build the query based on includeAll option
      let whereCondition;
      
      if (includeAll) {
        // Mineral must contain ALL specified elements using Postgres array containment
        whereCondition = and(
          eq(minerals.isActive, true),
          sql`${minerals.elements} @> ${validElements}`
        );
      } else {
        // Mineral must contain ANY of the specified elements
        whereCondition = and(
          eq(minerals.isActive, true),
          sql`${minerals.elements} && ${validElements}`
        );
      }

      // Determine sort column
      let sortColumn;
      switch (sortBy) {
        case 'discovery_year':
          sortColumn = minerals.discoveryYear;
          break;
        case 'hardness':
          sortColumn = minerals.hmin;
          break;
        default:
          sortColumn = minerals.name;
      }

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(minerals)
        .where(whereCondition);

      const total = totalResult[0]?.count || 0;

      // Get paginated results
      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);
      
      const results = await db
        .select()
        .from(minerals)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      return {
        minerals: results,
        total
      };

    } catch (error) {
      console.error('Error searching minerals by elements:', error);
      throw new Error('Failed to search minerals by elements');
    }
  }

  /**
   * Search minerals by name or formula
   */
  async searchByName(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      includeFormula?: boolean;
    } = {}
  ): Promise<{ minerals: Mineral[]; total: number }> {
    const { limit = 100, offset = 0, includeFormula = true } = options;

    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    try {
      let whereCondition;
      
      if (includeFormula) {
        whereCondition = and(
          eq(minerals.isActive, true),
          or(
            sql`LOWER(${minerals.name}) LIKE ${searchTerm}`,
            sql`LOWER(${minerals.mindatFormula}) LIKE ${searchTerm}`,
            sql`LOWER(${minerals.imaFormula}) LIKE ${searchTerm}`
          )
        );
      } else {
        whereCondition = and(
          eq(minerals.isActive, true),
          sql`LOWER(${minerals.name}) LIKE ${searchTerm}`
        );
      }

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(minerals)
        .where(whereCondition);

      const total = totalResult[0]?.count || 0;

      // Get results
      const results = await db
        .select()
        .from(minerals)
        .where(whereCondition)
        .orderBy(asc(minerals.name))
        .limit(limit)
        .offset(offset);

      return {
        minerals: results,
        total
      };

    } catch (error) {
      console.error('Error searching minerals by name:', error);
      throw new Error('Failed to search minerals by name');
    }
  }

  /**
   * Get mineral by ID
   */
  async getMineralById(id: number): Promise<Mineral | null> {
    try {
      const results = await db
        .select()
        .from(minerals)
        .where(and(
          eq(minerals.id, id),
          eq(minerals.isActive, true)
        ))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      console.error('Error getting mineral by ID:', error);
      throw new Error('Failed to get mineral');
    }
  }

  /**
   * Get minerals by crystal system
   */
  async getMineralsByCrystalSystem(
    crystalSystem: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ minerals: Mineral[]; total: number }> {
    const { limit = 100, offset = 0 } = options;

    try {
      const whereCondition = and(
        eq(minerals.isActive, true),
        sql`LOWER(${minerals.csystem}) = ${crystalSystem.toLowerCase()}`
      );

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(minerals)
        .where(whereCondition);

      const total = totalResult[0]?.count || 0;

      // Get results
      const results = await db
        .select()
        .from(minerals)
        .where(whereCondition)
        .orderBy(asc(minerals.name))
        .limit(limit)
        .offset(offset);

      return {
        minerals: results,
        total
      };

    } catch (error) {
      console.error('Error getting minerals by crystal system:', error);
      throw new Error('Failed to get minerals by crystal system');
    }
  }

  /**
   * Get all unique elements from minerals database
   */
  async getAllElements(): Promise<string[]> {
    try {
      const results = await db
        .select({ elements: minerals.elements })
        .from(minerals)
        .where(eq(minerals.isActive, true));

      const allElements = new Set<string>();
      
      results.forEach((result: any) => {
        if (result.elements && Array.isArray(result.elements)) {
          result.elements.forEach((element: any) => {
            if (typeof element === 'string' && element.trim()) {
              allElements.add(element.trim());
            }
          });
        }
      });

      return Array.from(allElements).sort();
    } catch (error) {
      console.error('Error getting all elements:', error);
      throw new Error('Failed to get elements list');
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalMinerals: number;
    totalElements: number;
    crystalSystems: Array<{ system: string; count: number }>;
    lastSync: Date | null;
  }> {
    try {
      // Total minerals
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(minerals)
        .where(eq(minerals.isActive, true));

      const totalMinerals = totalResult[0]?.count || 0;

      // Unique elements
      const elements = await this.getAllElements();
      const totalElements = elements.length;

      // Crystal systems
      const crystalSystemsResult = await db
        .select({
          system: minerals.csystem,
          count: sql<number>`COUNT(*)`
        })
        .from(minerals)
        .where(and(
          eq(minerals.isActive, true),
          sql`${minerals.csystem} IS NOT NULL AND ${minerals.csystem} != ''`
        ))
        .groupBy(minerals.csystem)
        .orderBy(desc(sql`COUNT(*)`));

      const crystalSystems = crystalSystemsResult.map((row: any) => ({
        system: row.system || 'Unknown',
        count: row.count
      }));

      // Last sync time
      const lastSyncResult = await db
        .select({ lastSync: minerals.lastSyncAt })
        .from(minerals)
        .orderBy(desc(minerals.lastSyncAt))
        .limit(1);

      const lastSync = lastSyncResult[0]?.lastSync || null;

      return {
        totalMinerals,
        totalElements,
        crystalSystems,
        lastSync
      };

    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error('Failed to get database statistics');
    }
  }

  /**
   * Generate a new API key
   */
  async generateApiKey(
    name: string,
    userId?: number,
    permissions: string[] = ['read'],
    rateLimit: number = 1000,
    expiresAt?: Date
  ): Promise<{ apiKey: string; keyId: number }> {
    try {
      // Generate a secure random API key
      const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex');
      
      // Hash the API key for storage
      const keyHash = await argon2.hash(apiKey);

      // Insert into database
      const result = await db.insert(apiKeys).values({
        keyHash,
        name,
        userId,
        permissions,
        rateLimit,
        expiresAt,
        isActive: true
      }).returning({ id: apiKeys.id });

      return {
        apiKey,
        keyId: result[0].id
      };

    } catch (error) {
      console.error('Error generating API key:', error);
      throw new Error('Failed to generate API key');
    }
  }

  /**
   * Validate API key and return key info
   */
  async validateApiKey(apiKey: string): Promise<{
    isValid: boolean;
    keyInfo?: {
      id: number;
      name: string;
      userId?: number;
      permissions: string[];
      rateLimit: number;
    };
  }> {
    if (!apiKey || !apiKey.startsWith('mk_')) {
      return { isValid: false };
    }

    try {
      // Get all active API keys
      const activeKeys = await db
        .select()
        .from(apiKeys)
        .where(and(
          eq(apiKeys.isActive, true),
          or(
            sql`${apiKeys.expiresAt} IS NULL`,
            sql`${apiKeys.expiresAt} > NOW()`
          )
        ));

      // Check each key hash (this is not efficient for large numbers of keys,
      // but fine for small-scale usage)
      for (const key of activeKeys) {
        const isMatch = await argon2.verify(key.keyHash, apiKey);
        if (isMatch) {
          // Update last used timestamp
          await db
            .update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, key.id));

          return {
            isValid: true,
            keyInfo: {
              id: key.id,
              name: key.name,
              userId: key.userId || undefined,
              permissions: key.permissions as string[],
              rateLimit: key.rateLimit
            }
          };
        }
      }

      return { isValid: false };

    } catch (error) {
      console.error('Error validating API key:', error);
      return { isValid: false };
    }
  }

  /**
   * Log API usage for rate limiting and analytics
   */
  async logApiUsage(
    keyId: number,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(apiUsageEvents).values({
        userId: null, // Will be set if we have user association
        sessionId: null,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
    } catch (error) {
      // Don't throw on logging errors, just log them
      console.error('Error logging API usage:', error);
    }
  }
}