/**
 * RRUFF CSV Importer Service
 * 
 * This service handles downloading and importing CSV data from the RRUFF database.
 * It provides functions to:
 * 1. Download CSV files from RRUFF source
 * 2. Parse CSV data into structured objects
 * 3. Import data into database tables
 * 4. Track import progress and errors
 */

import { parse } from 'csv-parse';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { rruffMinerals, rruffSpectra, rruffDataImportLogs } from '@shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

// Base URL for RRUFF data downloads
const RRUFF_BASE_URL = 'https://rruff.info/zipped_data_files';

// CSV file downloads
const MINERAL_DATA_URL = `${RRUFF_BASE_URL}/mineral_list.csv`;
const SPECTRA_DATA_URL = `${RRUFF_BASE_URL}/raman_list.csv`;

// Temporary file paths
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const MINERAL_CSV_PATH = path.join(TEMP_DIR, 'mineral_list.csv');
const SPECTRA_CSV_PATH = path.join(TEMP_DIR, 'raman_list.csv');

// Import result interface
interface ImportResult {
  mineralsCount: number;
  spectraCount: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
}

/**
 * RRUFF CSV Importer class
 */
export class RruffCsvImporter {
  /**
   * Main function to download and import all RRUFF data
   */
  async downloadAndImportData(): Promise<ImportResult> {
    const startTime = new Date();
    const errors: string[] = [];
    let mineralsCount = 0;
    let spectraCount = 0;
    
    // Create import log entry
    const [importLog] = await db.insert(rruffDataImportLogs)
      .values({
        status: 'in_progress',
        startTime,
        mineralsImported: 0,
        spectraImported: 0,
        errors: []
      })
      .returning();
    
    try {
      console.log('Starting RRUFF data import process...');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }
      
      // Download CSV files
      console.log('Downloading mineral data CSV...');
      await this.downloadFile(MINERAL_DATA_URL, MINERAL_CSV_PATH);
      
      console.log('Downloading spectral data CSV...');
      await this.downloadFile(SPECTRA_DATA_URL, SPECTRA_CSV_PATH);
      
      // Import minerals
      console.log('Importing mineral data...');
      const mineralResult = await this.importMinerals(MINERAL_CSV_PATH);
      mineralsCount = mineralResult.count;
      errors.push(...mineralResult.errors);
      
      // Import spectra
      console.log('Importing spectral data...');
      const spectraResult = await this.importSpectra(SPECTRA_CSV_PATH);
      spectraCount = spectraResult.count;
      errors.push(...spectraResult.errors);
      
      console.log(`Import complete. Minerals: ${mineralsCount}, Spectra: ${spectraCount}, Errors: ${errors.length}`);
      
      // Update import log
      const endTime = new Date();
      await db.update(rruffDataImportLogs)
        .set({
          status: 'completed',
          endTime,
          mineralsImported: mineralsCount,
          spectraImported: spectraCount,
          errors: errors as any
        })
        .where(eq(rruffDataImportLogs.id, importLog.id));
      
      // Return results
      return {
        mineralsCount,
        spectraCount,
        errors,
        startTime,
        endTime
      };
      
    } catch (error: any) {
      console.error('Error in RRUFF data import:', error);
      
      // Update import log on error
      const endTime = new Date();
      await db.update(rruffDataImportLogs)
        .set({
          status: 'failed',
          endTime,
          mineralsImported: mineralsCount,
          spectraImported: spectraCount,
          errors: [...errors, error.message || 'Unknown error during import'] as any
        })
        .where(eq(rruffDataImportLogs.id, importLog.id));
      
      return {
        mineralsCount,
        spectraCount,
        errors: [...errors, error.message || 'Unknown error during import'],
        startTime,
        endTime
      };
    }
  }
  
  /**
   * Download a file from URL to local path
   */
  private async downloadFile(url: string, filePath: string): Promise<void> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
      }
      
      const fileStream = fs.createWriteStream(filePath);
      if (response.body) {
        response.body.pipe(fileStream);
        
        return new Promise((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });
      } else {
        throw new Error('Response body is null');
      }
    } catch (error: any) {
      throw new Error(`Error downloading file from ${url}: ${error.message}`);
    }
  }
  
  /**
   * Import minerals from CSV file
   */
  private async importMinerals(filePath: string): Promise<{ count: number; errors: string[] }> {
    const minerals: any[] = [];
    const errors: string[] = [];
    
    try {
      // Parse CSV file
      const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }));
      
      for await (const record of parser) {
        try {
          // Process each mineral record
          const mineral = this.processMineralRecord(record);
          minerals.push(mineral);
        } catch (error: any) {
          errors.push(`Error processing mineral record: ${error.message}`);
        }
      }
      
      // Batch insert minerals
      if (minerals.length > 0) {
        try {
          const batchSize = 100;
          for (let i = 0; i < minerals.length; i += batchSize) {
            const batch = minerals.slice(i, i + batchSize);
            await db.insert(rruffMinerals)
              .values(batch)
              .onConflictDoUpdate({
                target: rruffMinerals.rruffId,
                set: {
                  mineralName: sql`excluded.mineral_name`,
                  chemicalFormula: sql`excluded.chemical_formula`,
                  crystalSystem: sql`excluded.crystal_system`,
                  crystalClass: sql`excluded.crystal_class`,
                  spaceGroup: sql`excluded.space_group`,
                  imaStatus: sql`excluded.ima_status`,
                  unitCell: sql`excluded.unit_cell`,
                  color: sql`excluded.color`,
                  density: sql`excluded.density`,
                  hardness: sql`excluded.hardness`,
                  lastUpdated: sql`CURRENT_TIMESTAMP`,
                  dataVersion: sql`${rruffMinerals.dataVersion} + 1`
                }
              });
            
            console.log(`Imported/updated ${batch.length} minerals (batch ${i/batchSize + 1}/${Math.ceil(minerals.length/batchSize)})`);
          }
        } catch (error: any) {
          errors.push(`Error batch inserting minerals: ${error.message}`);
        }
      }
      
      return { count: minerals.length, errors };
    } catch (error: any) {
      errors.push(`Error importing minerals from CSV: ${error.message}`);
      return { count: 0, errors };
    }
  }
  
  /**
   * Process a mineral record from CSV
   */
  private processMineralRecord(record: any): any {
    // Extract and transform data from CSV record to database schema
    return {
      rruffId: record.ID || null,
      mineralName: record.Mineral || '',
      chemicalFormula: record.Formula || null,
      crystalSystem: record['Crystal System'] || null,
      crystalClass: record['Crystal Class'] || null,
      spaceGroup: record['Space Group'] || null,
      imaStatus: record['IMA Status'] || null,
      unitCell: this.parseUnitCell(record),
      color: record.Color || null,
      density: record.Density || null,
      hardness: record.Hardness || null,
      opticalProperties: this.parseOpticalProperties(record),
      elementComposition: this.parseElements(record.Formula || ''),
      yearFirstPublished: record.Year ? parseInt(record.Year) : null,
      url: `https://rruff.info/mineral/${record.ID}`,
      isActive: true
    };
  }
  
  /**
   * Parse unit cell data from record
   */
  private parseUnitCell(record: any): object {
    const unitCell: any = {};
    
    if (record['a (Å)']) unitCell.a = parseFloat(record['a (Å)']);
    if (record['b (Å)']) unitCell.b = parseFloat(record['b (Å)']);
    if (record['c (Å)']) unitCell.c = parseFloat(record['c (Å)']);
    if (record['alpha (°)']) unitCell.alpha = parseFloat(record['alpha (°)']);
    if (record['beta (°)']) unitCell.beta = parseFloat(record['beta (°)']);
    if (record['gamma (°)']) unitCell.gamma = parseFloat(record['gamma (°)']);
    if (record['Volume (Å³)']) unitCell.volume = parseFloat(record['Volume (Å³)']);
    if (record['Z']) unitCell.z = parseInt(record['Z']);
    
    return unitCell;
  }
  
  /**
   * Parse optical properties from record
   */
  private parseOpticalProperties(record: any): object {
    const properties: any = {};
    
    if (record['Optical Sign']) properties.opticalSign = record['Optical Sign'];
    if (record['Refractive Index']) properties.refractiveIndex = record['Refractive Index'];
    if (record['Birefringence']) properties.birefringence = record['Birefringence'];
    
    return properties;
  }
  
  /**
   * Extract elements from chemical formula
   */
  private parseElements(formula: string): string[] {
    // Simple element extraction - would need more sophisticated parsing for complex formulas
    const elementRegex = /([A-Z][a-z]?)(?=[0-9\+\-\(\)]|[A-Z]|$)/g;
    const matches = formula.match(elementRegex) || [];
    // Remove duplicates without using Set spread
    return matches.filter((element, index) => matches.indexOf(element) === index);
  }
  
  /**
   * Import spectra data from CSV
   */
  private async importSpectra(filePath: string): Promise<{ count: number; errors: string[] }> {
    const spectra: any[] = [];
    const errors: string[] = [];
    
    try {
      // Parse CSV file
      const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }));
      
      for await (const record of parser) {
        try {
          // Process each spectral record
          const spectrum = await this.processSpectraRecord(record);
          if (spectrum) {
            spectra.push(spectrum);
          }
        } catch (error: any) {
          errors.push(`Error processing spectra record: ${error.message}`);
        }
      }
      
      // Batch insert spectra
      if (spectra.length > 0) {
        try {
          const batchSize = 100;
          for (let i = 0; i < spectra.length; i += batchSize) {
            const batch = spectra.slice(i, i + batchSize);
            await db.insert(rruffSpectra)
              .values(batch)
              .onConflictDoUpdate({
                target: [rruffSpectra.mineralId, rruffSpectra.sampleId, rruffSpectra.spectraType],
                set: {
                  orientation: sql`excluded.orientation`,
                  wavelength: sql`excluded.wavelength`,
                  temperature: sql`excluded.temperature`,
                  pressure: sql`excluded.pressure`,
                  dataUrl: sql`excluded.data_url`,
                  updatedAt: sql`CURRENT_TIMESTAMP`
                }
              });
            
            console.log(`Imported/updated ${batch.length} spectra (batch ${i/batchSize + 1}/${Math.ceil(spectra.length/batchSize)})`);
          }
        } catch (error: any) {
          errors.push(`Error batch inserting spectra: ${error.message}`);
        }
      }
      
      return { count: spectra.length, errors };
    } catch (error: any) {
      errors.push(`Error importing spectra from CSV: ${error.message}`);
      return { count: 0, errors };
    }
  }
  
  /**
   * Process a spectral record from CSV
   */
  private async processSpectraRecord(record: any): Promise<any | null> {
    try {
      // Find the associated mineral by RRUFF ID
      const [mineral] = await db.select()
        .from(rruffMinerals)
        .where(eq(rruffMinerals.rruffId, record.MineralID))
        .limit(1);
      
      if (!mineral) {
        // Skip spectra for minerals not in our database
        return null;
      }
      
      // Extract and transform data from CSV record to database schema
      return {
        mineralId: mineral.id,
        spectraType: 'raman', // CSV contains Raman data
        sampleId: record.SampleID || '',
        orientation: record.Orientation || null,
        wavelength: record.Wavelength || null,
        temperature: record.Temperature || 'ambient',
        pressure: record.Pressure || 'ambient',
        dataUrl: `https://rruff.info/cgi-bin/download_data.cgi?type=sample&sample_id=${record.SampleID}`,
        dataPoints: [] // Would need separate download for actual spectral data points
      };
    } catch (error: any) {
      throw new Error(`Error processing spectra record: ${error.message}`);
    }
  }
}

// Export singleton instance
export const rruffCsvImporter = new RruffCsvImporter();