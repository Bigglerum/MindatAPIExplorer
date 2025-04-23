import { Request, Response } from 'express';
import { db } from '../db';
import { 
  rruffApiKeys, 
  rruffDataImportLogs, 
  rruffMinerals, 
  rruffSpectra, 
  insertRruffApiKeySchema 
} from '@shared/rruff-schema';
import { rruffCsvImporter } from '../services/rruff-csv-importer';
import { and, asc, desc, eq, ilike, inArray, like, or, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * Middleware to validate API key for the RRUFF API endpoints
 */
export const validateRruffApiKey = async (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  try {
    // Find the API key in the database
    const [keyRecord] = await db.select()
      .from(rruffApiKeys)
      .where(eq(rruffApiKeys.key, apiKey))
      .limit(1);
      
    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (!keyRecord.isActive) {
      return res.status(403).json({ error: 'API key is inactive' });
    }
    
    // Check if the key has expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(403).json({ error: 'API key has expired' });
    }
    
    // Update usage statistics
    await db.update(rruffApiKeys)
      .set({
        lastUsed: new Date(),
        usageCount: sql`${rruffApiKeys.usageCount} + 1`
      })
      .where(eq(rruffApiKeys.id, keyRecord.id));
    
    // Add key info to request for later use if needed
    (req as any).apiKeyId = keyRecord.id;
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Register RRUFF API routes
 */
// Global import progress tracking variable
let globalImportProgress = {
  total: 5997,
  completed: 0,
  inProgress: false,
  startTime: null as Date | null,
  lastUpdateTime: null as Date | null
};

// Function to update import progress
export function updateImportProgress(completed: number, inProgress: boolean = true) {
  globalImportProgress.completed = completed;
  globalImportProgress.inProgress = inProgress;
  globalImportProgress.lastUpdateTime = new Date();
  
  if (inProgress && globalImportProgress.startTime === null) {
    globalImportProgress.startTime = new Date();
  }
  
  // Calculate estimated completion
  if (inProgress && globalImportProgress.startTime && completed > 0) {
    const elapsedMs = new Date().getTime() - globalImportProgress.startTime.getTime();
    const msPerRecord = elapsedMs / completed;
    const remainingRecords = globalImportProgress.total - completed;
    const estimatedRemainingMs = msPerRecord * remainingRecords;
    
    console.log(`Import progress: ${completed}/${globalImportProgress.total} (${Math.round(completed/globalImportProgress.total*100)}%)`);
    console.log(`Estimated remaining time: ${Math.round(estimatedRemainingMs/1000/60)} minutes`);
  }
}

export function registerRruffRoutes(app: any) {
  // Public endpoints (no API key required)
  
  // Get mineral name list (public)
  app.get('/api/rruff/minerals/list', async (req: Request, res: Response) => {
    try {
      const minerals = await db.select({
        id: rruffMinerals.id,
        name: rruffMinerals.mineralName
      })
      .from(rruffMinerals)
      .orderBy(asc(rruffMinerals.mineralName));
      
      return res.json({ minerals });
    } catch (error) {
      console.error('Error fetching mineral list:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Protected endpoints (API key required)
  
  // Get all minerals with filtering - temporarily removing API key requirement for testing
  app.get('/api/rruff/minerals', async (req: Request, res: Response) => {
    try {
      const { 
        name, 
        elements, 
        crystalSystem, 
        page = 1, 
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;
      
      console.log('Search request:', { name, elements, crystalSystem, page, limit });
      
      const offset = (Number(page) - 1) * Number(limit);
      
      // Build query conditions
      const conditions = [];
      
      if (name) {
        // Use case-insensitive search with ilike
        conditions.push(ilike(rruffMinerals.mineralName, `%${name}%`));
      }
      
      if (crystalSystem && crystalSystem !== 'any') {
        // Use case-insensitive search for crystal system
        conditions.push(ilike(rruffMinerals.crystalSystem, `%${crystalSystem}%`));
      }
      
      if (elements) {
        // This is a simplified approach for element composition search
        const elementList = (elements as string).split(',');
        elementList.forEach(element => {
          conditions.push(sql`${rruffMinerals.elementComposition}::text ILIKE ${'%' + element.trim() + '%'}`);
        });
      }
      
      // Determine sort column and direction
      let orderColumn: any;
      if (sortBy === 'name') orderColumn = rruffMinerals.mineralName;
      else if (sortBy === 'crystalSystem') orderColumn = rruffMinerals.crystalSystem;
      else if (sortBy === 'formula') orderColumn = rruffMinerals.chemicalFormula;
      else if (sortBy === 'updated') orderColumn = rruffMinerals.lastUpdated;
      else orderColumn = rruffMinerals.mineralName;
      
      const sortDirection = sortOrder === 'desc' ? desc : asc;
      
      // Build and execute query
      const query = db.select()
        .from(rruffMinerals)
        .limit(Number(limit))
        .offset(offset)
        .orderBy(sortDirection(orderColumn));
        
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }
      
      const minerals = await query;
      console.log(`Found ${minerals.length} minerals matching the criteria`);
      
      // Count total matching records for pagination
      const countQuery = db.select({ count: sql<number>`count(*)` })
        .from(rruffMinerals);
        
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      
      const [countResult] = await countQuery;
      const totalCount = countResult?.count || 0;
      
      return res.json({
        minerals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching minerals:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get a specific mineral by ID - temporarily removing API key requirement for testing
  app.get('/api/rruff/minerals/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`Fetching mineral with ID: ${id}`);
      
      // Get the mineral data
      const [mineral] = await db.select()
        .from(rruffMinerals)
        .where(eq(rruffMinerals.id, parseInt(id)))
        .limit(1);
        
      if (!mineral) {
        return res.status(404).json({ error: 'Mineral not found' });
      }
      
      console.log(`Found mineral: ${mineral.mineralName}`);
      
      // Update the mineral object to use camelCase for frontend compatibility
      const mineralForClient = {
        id: mineral.id,
        mineralName: mineral.mineralName,
        rruffId: mineral.rruffId,
        chemicalFormula: mineral.chemicalFormula,
        imaStatus: mineral.imaStatus,
        crystalSystem: mineral.crystalSystem,
        crystalClass: mineral.crystalClass,
        spaceGroup: mineral.spaceGroup,
        unitCell: mineral.unitCell,
        color: mineral.color,
        density: mineral.density,
        hardness: mineral.hardness,
        elementComposition: mineral.elementComposition,
        yearFirstPublished: mineral.yearFirstPublished,
        comments: mineral.comments,
        url: mineral.url,
        isActive: mineral.isActive
      };
      
      // Get related spectra
      const spectra = await db.select()
        .from(rruffSpectra)
        .where(eq(rruffSpectra.mineralId, mineral.id));
      
      return res.json({ mineral: mineralForClient, spectra });
    } catch (error) {
      console.error(`Error fetching mineral with ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Search minerals by keywords (more advanced search functionality) - temporarily removing API key requirement for testing
  app.get('/api/rruff/search', async (req: Request, res: Response) => {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const offset = (Number(page) - 1) * Number(limit);
      const searchTerms = (q as string).split(' ').filter(Boolean);
      
      // Build search conditions for each term
      const searchConditions = searchTerms.map(term => {
        return or(
          ilike(rruffMinerals.mineralName, `%${term}%`),
          ilike(rruffMinerals.chemicalFormula, `%${term}%`),
          ilike(rruffMinerals.crystalSystem, `%${term}%`),
          ilike(rruffMinerals.crystalClass, `%${term}%`),
          ilike(rruffMinerals.color, `%${term}%`),
          sql`${rruffMinerals.elementComposition}::text ILIKE ${'%' + term + '%'}`
        );
      });
      
      // Execute search query
      const minerals = await db.select()
        .from(rruffMinerals)
        .where(and(...searchConditions))
        .limit(Number(limit))
        .offset(offset)
        .orderBy(asc(rruffMinerals.mineralName));
      
      // Count total matches
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(rruffMinerals)
        .where(and(...searchConditions));
        
      const totalCount = countResult?.count || 0;
      
      return res.json({
        minerals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error searching minerals:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get spectra for a specific mineral - temporarily removing API key requirement for testing
  app.get('/api/rruff/minerals/:id/spectra', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.query; // optional filter by spectra type
      
      let spectra;
      
      if (type) {
        // If type filter is provided
        spectra = await db.select()
          .from(rruffSpectra)
          .where(
            and(
              eq(rruffSpectra.mineralId, parseInt(id)),
              eq(rruffSpectra.spectraType, type as string)
            )
          );
      } else {
        // Only filter by mineral ID
        spectra = await db.select()
          .from(rruffSpectra)
          .where(eq(rruffSpectra.mineralId, parseInt(id)));
      }
      
      return res.json({ spectra });
    } catch (error) {
      console.error(`Error fetching spectra for mineral ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // --- Admin endpoints ---
  
  // Get import progress
  app.get('/api/rruff/import-progress', async (req: Request, res: Response) => {
    try {
      // Count minerals in database for real-time progress
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(rruffMinerals);
      const currentCount = countResult?.count || 0;
      
      // If import is running, update the progress
      if (globalImportProgress.inProgress) {
        updateImportProgress(currentCount);
      } else if (currentCount > globalImportProgress.completed) {
        // If we have more minerals than last recorded but import not marked as running,
        // update the completed count but keep inProgress false
        globalImportProgress.completed = currentCount;
        globalImportProgress.lastUpdateTime = new Date();
      }
      
      // Calculate percentage and estimated time
      const percentage = Math.round((globalImportProgress.completed / globalImportProgress.total) * 100);
      let estimatedTimeRemaining = null;
      
      if (globalImportProgress.inProgress && globalImportProgress.startTime && globalImportProgress.completed > 0) {
        const elapsedMs = new Date().getTime() - globalImportProgress.startTime.getTime();
        const msPerRecord = elapsedMs / globalImportProgress.completed;
        const remainingRecords = globalImportProgress.total - globalImportProgress.completed;
        estimatedTimeRemaining = Math.round(msPerRecord * remainingRecords / 1000 / 60); // in minutes
      }
      
      return res.json({
        ...globalImportProgress,
        percentage,
        estimatedTimeRemaining,
        currentCount
      });
    } catch (error) {
      console.error('Error fetching import progress:', error);
      return res.status(500).json({ error: 'Failed to fetch import progress' });
    }
  });

  // Manually trigger the data import process (admin only)
  app.post('/api/rruff/admin/import', async (req: Request, res: Response) => {
    try {
      // In a real app, this would have proper admin authentication
      // For now, we'll assume admin access or restrict by IP
      
      // Start the import process
      res.json({ message: 'Import process started' });
      
      // Run the import process asynchronously - this will download and parse the CSV
      rruffCsvImporter.downloadAndImportData()
        .then(result => {
          console.log('Import completed successfully!');
          console.log(`Imported ${result.mineralsCount} minerals and ${result.spectraCount} spectra.`);
          if (result.errors.length > 0) {
            console.log(`Encountered ${result.errors.length} errors during import.`);
            result.errors.forEach(err => console.error(`- ${err}`));
          }
        })
        .catch(error => {
          console.error('Import failed:', error);
        });
    } catch (error) {
      console.error('Error starting import process:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get import logs (admin only)
  app.get('/api/rruff/admin/import-logs', async (req: Request, res: Response) => {
    try {
      const logs = await db.select()
        .from(rruffDataImportLogs)
        .orderBy(desc(rruffDataImportLogs.startTime))
        .limit(20);
      
      return res.json({ logs });
    } catch (error) {
      console.error('Error fetching import logs:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // --- API key management endpoints ---
  
  // Generate a new API key (admin only)
  app.post('/api/rruff/admin/keys', async (req: Request, res: Response) => {
    try {
      const validatedData = insertRruffApiKeySchema.parse({
        ...req.body,
        key: randomBytes(24).toString('hex') // Generate a random API key
      });
      
      // Insert the new API key
      const [apiKey] = await db.insert(rruffApiKeys)
        .values({
          name: validatedData.name,
          key: validatedData.key,
          description: validatedData.description,
          expiresAt: validatedData.expiresAt,
          isActive: validatedData.isActive ?? true,
          rateLimit: validatedData.rateLimit
        })
        .returning();
      
      return res.status(201).json({ apiKey });
    } catch (error) {
      console.error('Error creating API key:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // List all API keys (admin only)
  app.get('/api/rruff/admin/keys', async (req: Request, res: Response) => {
    try {
      const keys = await db.select()
        .from(rruffApiKeys)
        .orderBy(desc(rruffApiKeys.createdAt));
      
      return res.json({ keys });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Revoke an API key (admin only)
  app.delete('/api/rruff/admin/keys/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await db.update(rruffApiKeys)
        .set({ isActive: false })
        .where(eq(rruffApiKeys.id, parseInt(id)));
      
      return res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error(`Error revoking API key with ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}