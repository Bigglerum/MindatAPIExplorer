import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { minerals, syncLogs, type InsertMineral, type InsertSyncLog } from '@shared/schema';
import { SecureApiProxy } from './secure-api-proxy.js';

export class MineralSyncService {
  private static instance: MineralSyncService;
  private readonly apiProxy: SecureApiProxy;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 3;

  private constructor() {
    this.apiProxy = SecureApiProxy.getInstance();
  }

  static getInstance(): MineralSyncService {
    if (!MineralSyncService.instance) {
      MineralSyncService.instance = new MineralSyncService();
    }
    return MineralSyncService.instance;
  }

  /**
   * Full sync of all minerals from Mindat API
   */
  async performFullSync(): Promise<SyncResult> {
    const logId = await this.startSyncLog('full', 'running');
    
    try {
      console.log('Starting full mineral sync from Mindat API...');
      let totalProcessed = 0;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          console.log(`Fetching page ${page}...`);
          
          const response = await this.apiProxy.proxyRequest({
            path: '/geomaterials',
            method: 'GET',
            parameters: {
              page,
              limit: this.BATCH_SIZE,
              format: 'json'
            }
          }, process.env.MINDAT_API_KEY!);

          if (!response.data || !response.data.results) {
            console.error('Invalid response structure from Mindat API');
            break;
          }

          const minerals = response.data.results;
          console.log(`Processing ${minerals.length} minerals from page ${page}`);

          for (const mineralData of minerals) {
            try {
              const result = await this.processMineralRecord(mineralData);
              totalProcessed++;
              
              if (result === 'added') {
                totalAdded++;
              } else if (result === 'updated') {
                totalUpdated++;
              }
            } catch (error) {
              console.error(`Error processing mineral ${mineralData.id}:`, error);
              totalErrors++;
            }
          }

          // Check if there are more pages
          hasMore = !!response.data.next;
          page++;
          
          // Progress update
          console.log(`Progress: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors`);
          
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error);
          totalErrors++;
          
          // Stop after too many consecutive errors
          if (totalErrors > 10) {
            throw new Error('Too many consecutive errors, stopping sync');
          }
        }
      }

      await this.completeSyncLog(logId, 'completed', {
        mineralsProcessed: totalProcessed,
        mineralsAdded: totalAdded,
        mineralsUpdated: totalUpdated,
        mineralsErrors: totalErrors
      });

      console.log(`Full sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors`);
      
      return {
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        errors: totalErrors
      };

    } catch (error: any) {
      await this.completeSyncLog(logId, 'failed', {
        errorMessage: error.message,
        mineralsErrors: 1
      });
      
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Incremental sync - only fetch minerals updated since last sync
   */
  async performIncrementalSync(): Promise<SyncResult> {
    const logId = await this.startSyncLog('incremental', 'running');
    
    try {
      console.log('Starting incremental mineral sync...');
      
      // Get the latest update time from our database
      const lastSync = await db
        .select({ updttime: minerals.updttime })
        .from(minerals)
        .orderBy(sql`${minerals.updttime} DESC NULLS LAST`)
        .limit(1);

      const sinceDate = lastSync[0]?.updttime || new Date('2000-01-01');
      console.log(`Fetching minerals updated since: ${sinceDate.toISOString()}`);

      let totalProcessed = 0;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.apiProxy.proxyRequest({
            path: '/geomaterials',
            method: 'GET',
            parameters: {
              page,
              limit: this.BATCH_SIZE,
              updated_since: sinceDate.toISOString().split('T')[0], // YYYY-MM-DD format
              format: 'json'
            }
          }, process.env.MINDAT_API_KEY!);

          if (!response.data || !response.data.results) {
            break;
          }

          const minerals = response.data.results;
          console.log(`Processing ${minerals.length} updated minerals from page ${page}`);

          for (const mineralData of minerals) {
            try {
              const result = await this.processMineralRecord(mineralData);
              totalProcessed++;
              
              if (result === 'added') {
                totalAdded++;
              } else if (result === 'updated') {
                totalUpdated++;
              }
            } catch (error) {
              console.error(`Error processing mineral ${mineralData.id}:`, error);
              totalErrors++;
            }
          }

          hasMore = !!response.data.next;
          page++;
          
        } catch (error) {
          console.error(`Error fetching incremental page ${page}:`, error);
          totalErrors++;
          break;
        }
      }

      await this.completeSyncLog(logId, 'completed', {
        mineralsProcessed: totalProcessed,
        mineralsAdded: totalAdded,
        mineralsUpdated: totalUpdated,
        mineralsErrors: totalErrors
      });

      console.log(`Incremental sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors`);
      
      return {
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        errors: totalErrors
      };

    } catch (error: any) {
      await this.completeSyncLog(logId, 'failed', {
        errorMessage: error.message,
        mineralsErrors: 1
      });
      
      console.error('Incremental sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync a single mineral by ID
   */
  async syncSingleMineral(mineralId: number): Promise<'added' | 'updated' | 'not_found'> {
    try {
      console.log(`Syncing single mineral: ${mineralId}`);
      
      const response = await this.apiProxy.proxyRequest({
        path: `/geomaterials/${mineralId}`,
        method: 'GET',
        parameters: {}
      }, process.env.MINDAT_API_KEY!);

      if (!response.data) {
        return 'not_found';
      }

      return await this.processMineralRecord(response.data);
    } catch (error) {
      console.error(`Error syncing single mineral ${mineralId}:`, error);
      throw error;
    }
  }

  /**
   * Process a single mineral record from Mindat API
   */
  private async processMineralRecord(mineralData: any): Promise<'added' | 'updated' | 'skipped'> {
    if (!mineralData.id || !mineralData.name) {
      console.warn('Skipping mineral with missing ID or name:', mineralData);
      return 'skipped';
    }

    try {
      // Check if mineral exists
      const existing = await db
        .select({ id: minerals.id, updttime: minerals.updttime })
        .from(minerals)
        .where(eq(minerals.id, mineralData.id))
        .limit(1);

      const mineralRecord: InsertMineral = this.transformMineralData(mineralData);

      if (existing.length === 0) {
        // Insert new mineral
        await db.insert(minerals).values(mineralRecord);
        return 'added';
      } else {
        // Update existing mineral if it's newer
        const existingUpdttime = existing[0].updttime;
        const newUpdttime = mineralData.updttime ? new Date(mineralData.updttime) : null;
        
        if (!newUpdttime || !existingUpdttime || newUpdttime > existingUpdttime) {
          await db
            .update(minerals)
            .set({
              ...mineralRecord,
              updatedAt: new Date()
            })
            .where(eq(minerals.id, mineralData.id));
          return 'updated';
        }
        
        return 'skipped';
      }
    } catch (error) {
      console.error(`Error processing mineral record ${mineralData.id}:`, error);
      throw error;
    }
  }

  /**
   * Transform Mindat API data to our database schema
   */
  private transformMineralData(data: any): InsertMineral {
    return {
      id: data.id,
      longid: data.longid || null,
      guid: data.guid || null,
      name: data.name,
      updttime: data.updttime ? new Date(data.updttime) : null,
      
      // Chemical formulas
      mindatFormula: data.mindat_formula || null,
      mindatFormulaNOte: data.mindat_formula_note || null,
      imaFormula: data.ima_formula || null,
      imaStatus: data.ima_status || [],
      imaNotes: data.ima_notes || [],
      elements: data.elements || [],
      sigelements: data.sigelements || [],
      impurities: data.impurities || null,
      
      // Classification
      varietyof: data.varietyof || 0,
      synid: data.synid || 0,
      polytypeof: data.polytypeof || 0,
      groupid: data.groupid || 0,
      entrytype: data.entrytype || 0,
      entrytypeText: data.entrytype_text || null,
      
      // Physical properties
      colour: data.colour || null,
      streak: data.streak || null,
      lustre: data.lustre || null,
      lustretype: data.lustretype || null,
      diapheny: data.diapheny || null,
      hmin: data.hmin || null,
      hmax: data.hmax || null,
      
      // Density
      dmeas: data.dmeas || null,
      dmeas2: data.dmeas2 || null,
      dcalc: data.dcalc || null,
      
      // Crystal structure
      csystem: data.csystem || null,
      a: data.a || null,
      b: data.b || null,
      c: data.c || null,
      alpha: data.alpha || null,
      beta: data.beta || null,
      gamma: data.gamma || null,
      z: data.z || 0,
      
      // Optical and other properties
      occurrence: data.occurrence || null,
      discoveryYear: data.discovery_year || null,
      descriptionShort: data.description_short || null,
    };
  }

  /**
   * Start a sync log entry
   */
  private async startSyncLog(syncType: string, status: string): Promise<number> {
    const result = await db.insert(syncLogs).values({
      syncType,
      status,
      startedAt: new Date()
    }).returning({ id: syncLogs.id });
    
    return result[0].id;
  }

  /**
   * Complete a sync log entry
   */
  private async completeSyncLog(logId: number, status: string, updates: Partial<InsertSyncLog>): Promise<void> {
    await db
      .update(syncLogs)
      .set({
        status,
        completedAt: new Date(),
        ...updates
      })
      .where(eq(syncLogs.id, logId));
  }
}

export interface SyncResult {
  success: boolean;
  processed: number;
  added: number;
  updated: number;
  errors: number;
}