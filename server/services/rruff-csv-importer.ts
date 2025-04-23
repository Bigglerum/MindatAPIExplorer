import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { rruffDataImportLogs, rruffMinerals, rruffSpectra } from '@shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Service to handle importing RRUFF data from CSV files
 * This service downloads the CSV data from the RRUFF website
 * and imports it into our database
 */
export class RruffCsvImporter {
  private baseUrl = 'https://rruff.info/ima/';
  private importLogId: number | null = null;
  
  /**
   * Initialize a new import process and log it
   */
  async startImport(): Promise<number> {
    const [importLog] = await db.insert(rruffDataImportLogs)
      .values({
        status: 'running',
      })
      .returning();
    
    this.importLogId = importLog.id;
    return importLog.id;
  }

  /**
   * Complete the import process and update the log
   */
  async completeImport(mineralsCount: number, spectraCount: number, errors: string[] = []) {
    if (!this.importLogId) return;

    await db.update(rruffDataImportLogs)
      .set({
        endTime: new Date(),
        status: errors.length > 0 ? 'failed' : 'completed',
        mineralsImported: mineralsCount,
        spectraImported: spectraCount,
        errors: errors,
      })
      .where(eq(rruffDataImportLogs.id, this.importLogId));
  }

  /**
   * Download the CSV file from the RRUFF website
   * @returns Path to the downloaded file
   */
  async downloadCsvData(): Promise<string> {
    console.log('Downloading CSV data from RRUFF...');
    
    // Create the downloads directory if it doesn't exist
    const downloadDir = path.resolve('./downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // File path for the downloaded CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(downloadDir, `rruff_minerals_${timestamp}.csv`);
    
    try {
      // We need to handle the CSV export properly
      // This may require a session-based interaction with the RRUFF website
      
      // Step 1: Visit the IMA page to get necessary cookies/session
      const initialResponse = await fetch(this.baseUrl);
      const cookies = initialResponse.headers.get('set-cookie') || '';
      
      // Step 2: Request the CSV download with the proper parameters
      // Note: The actual URL and parameters may need adjustment based on RRUFF's actual export mechanism
      const csvUrl = `${this.baseUrl}export.php?format=csv`;
      const csvResponse = await fetch(csvUrl, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!csvResponse.ok) {
        throw new Error(`Failed to download CSV: ${csvResponse.status} ${csvResponse.statusText}`);
      }
      
      // Step 3: Save the CSV file
      const fileStream = fs.createWriteStream(filePath);
      await new Promise<void>((resolve, reject) => {
        csvResponse.body.pipe(fileStream);
        csvResponse.body.on('error', (err) => {
          reject(err);
        });
        fileStream.on('finish', function() {
          resolve();
        });
      });
      
      console.log(`CSV downloaded to ${filePath}`);
      return filePath;
      
    } catch (error: any) {
      console.error('Error downloading CSV:', error);
      throw new Error(`Failed to download CSV: ${error.message}`);
    }
  }
  
  /**
   * Parse the CSV file and import the data into the database
   * @param filePath Path to the CSV file
   */
  async importCsvData(filePath: string): Promise<{ mineralsCount: number, spectraCount: number, errors: string[] }> {
    console.log(`Importing data from ${filePath}...`);
    const errors: string[] = [];
    let mineralsCount = 0;
    let spectraCount = 0;
    
    try {
      // Start the import process
      await this.startImport();
      
      // Read the CSV file
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
      
      // Parse CSV data
      const records: any[] = await new Promise((resolve, reject) => {
        parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });
      
      console.log(`Found ${records.length} records in CSV`);
      
      // Process each record and insert into database
      for (const record of records) {
        try {
          // Map CSV fields to our database schema
          // Note: Field names may need adjustment based on the actual CSV structure
          const mineralData = {
            mineralName: record.mineral_name || record.name,
            rruffId: record.rruff_id || record.id,
            imaStatus: record.ima_status,
            chemicalFormula: record.chemical_formula || record.formula,
            crystalSystem: record.crystal_system,
            crystalClass: record.crystal_class,
            spaceGroup: record.space_group,
            unitCell: {
              a: parseFloat(record.a) || undefined,
              b: parseFloat(record.b) || undefined,
              c: parseFloat(record.c) || undefined,
              alpha: parseFloat(record.alpha) || undefined,
              beta: parseFloat(record.beta) || undefined,
              gamma: parseFloat(record.gamma) || undefined,
              z: parseFloat(record.z) || undefined,
              volume: parseFloat(record.volume) || undefined
            },
            color: record.color,
            density: record.density,
            hardness: record.hardness,
            opticalProperties: {
              type: record.optical_type,
              sign: record.optical_sign,
              indices: record.optical_indices ? record.optical_indices.split(',').map((i: string) => i.trim()) : [],
              birefringence: record.birefringence
            },
            elementComposition: {}, // This would need special handling based on CSV structure
            yearFirstPublished: parseInt(record.year_first_published) || undefined,
            idealChemistry: record.ideal_chemistry,
            comments: record.comments,
            url: `https://rruff.info/ima/display.php?mineral_name=${encodeURIComponent(record.mineral_name || record.name)}`
          };
          
          // Insert mineral into database
          const [mineral] = await db.insert(rruffMinerals)
            .values(mineralData)
            .onConflictDoUpdate({
              target: rruffMinerals.mineralName,
              set: {
                ...mineralData,
                lastUpdated: new Date()
              }
            })
            .returning();
          
          mineralsCount++;
          
          // If the CSV contains spectra data, process that too
          if (record.spectra_data) {
            // Handle spectra data if available in the CSV
            // This is a simplified example and would need to be adjusted based on actual data structure
            const spectraData = {
              mineralId: mineral.id,
              spectraType: record.spectra_type || 'Raman',
              sampleId: record.sample_id,
              dataUrl: record.spectra_url
            };
            
            await db.insert(rruffSpectra)
              .values(spectraData)
              .onConflictDoNothing();
            
            spectraCount++;
          }
          
        } catch (error: any) {
          const mineralName = record.mineral_name || record.name || 'unknown';
          console.error(`Error processing mineral ${mineralName}:`, error);
          errors.push(`Error processing mineral ${mineralName}: ${error.message}`);
        }
      }
      
      console.log(`Successfully imported ${mineralsCount} minerals and ${spectraCount} spectra`);
      
    } catch (error: any) {
      console.error('Error importing CSV data:', error);
      errors.push(`Error importing CSV data: ${error.message}`);
    } finally {
      // Complete the import process
      await this.completeImport(mineralsCount, spectraCount, errors);
    }
    
    return { mineralsCount, spectraCount, errors };
  }
  
  /**
   * The main process to download and import RRUFF data
   */
  async downloadAndImportData(): Promise<{ mineralsCount: number, spectraCount: number, errors: string[] }> {
    try {
      // Download the CSV file
      const filePath = await this.downloadCsvData();
      
      // Import the data from the CSV
      return await this.importCsvData(filePath);
      
    } catch (error: any) {
      console.error('Error in download and import process:', error);
      return { mineralsCount: 0, spectraCount: 0, errors: [error.message] };
    }
  }
}

// Export a singleton instance
export const rruffCsvImporter = new RruffCsvImporter();