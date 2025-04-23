import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { InsertRruffMineral, InsertRruffSpectra, RruffMineral, RruffSpectra } from '@shared/rruff-schema';
import { db } from '../db';
import { rruffDataImportLogs, rruffMinerals, rruffSpectra } from '@shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Service responsible for extracting data from RRUFF IMA database
 * and storing it in our local database
 */
export class RruffExtractor {
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
   * Extract the list of all IMA-approved minerals from RRUFF
   */
  async getMineralList(): Promise<string[]> {
    console.log('Fetching mineral list from RRUFF...');
    try {
      // We need to fetch the HTML page and extract mineral names
      const response = await fetch(`${this.baseUrl}`);
      const html = await response.text();
      
      // Parse HTML and extract mineral names from the dropdown or list
      const $ = cheerio.load(html);
      const mineralNames: string[] = [];
      
      // This selector might need adjustment based on actual RRUFF HTML structure
      $('select[name="mineral_name"] option').each((_, element) => {
        const name = $(element).val()?.toString();
        if (name && name !== '') {
          mineralNames.push(name);
        }
      });
      
      console.log(`Found ${mineralNames.length} minerals`);
      return mineralNames;
    } catch (error) {
      console.error('Error fetching mineral list:', error);
      throw new Error(`Failed to fetch mineral list: ${error.message}`);
    }
  }

  /**
   * Extract detailed data for a specific mineral
   */
  async getMineralData(mineralName: string): Promise<InsertRruffMineral> {
    console.log(`Fetching data for ${mineralName}...`);
    try {
      const url = `${this.baseUrl}display.php?mineral_name=${encodeURIComponent(mineralName)}`;
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse the HTML to extract mineral data
      const $ = cheerio.load(html);
      
      // Extract data from the page - these selectors will need to be adjusted
      // based on the actual HTML structure of RRUFF's mineral pages
      const rruffId = $('.rruff_id').text().trim();
      const imaStatus = $('.ima_status').text().trim();
      const chemicalFormula = $('.chemical_formula').text().trim();
      const crystalSystem = $('.crystal_system').text().trim();
      const crystalClass = $('.crystal_class').text().trim();
      const spaceGroup = $('.space_group').text().trim();
      
      // Extract unit cell parameters
      const unitCellA = parseFloat($('.unit_cell_a').text().trim()) || undefined;
      const unitCellB = parseFloat($('.unit_cell_b').text().trim()) || undefined;
      const unitCellC = parseFloat($('.unit_cell_c').text().trim()) || undefined;
      const unitCellAlpha = parseFloat($('.unit_cell_alpha').text().trim()) || undefined;
      const unitCellBeta = parseFloat($('.unit_cell_beta').text().trim()) || undefined;
      const unitCellGamma = parseFloat($('.unit_cell_gamma').text().trim()) || undefined;
      const unitCellZ = parseFloat($('.unit_cell_z').text().trim()) || undefined;
      const unitCellVolume = parseFloat($('.unit_cell_volume').text().trim()) || undefined;
      
      const color = $('.color').text().trim();
      const density = $('.density').text().trim();
      const hardness = $('.hardness').text().trim();
      
      // Extract optical properties
      const opticalType = $('.optical_type').text().trim();
      const opticalSign = $('.optical_sign').text().trim();
      const opticalIndices = $('.optical_indices')
        .text()
        .trim()
        .split(',')
        .map(index => index.trim())
        .filter(index => index !== '');
      const opticalBirefringence = $('.optical_birefringence').text().trim();
      
      // Extract element composition
      const elementComposition: Record<string, number> = {};
      $('.element_composition tr').each((_, row) => {
        const element = $(row).find('td:first-child').text().trim();
        const percentage = parseFloat($(row).find('td:last-child').text().trim());
        if (element && !isNaN(percentage)) {
          elementComposition[element] = percentage;
        }
      });
      
      const yearFirstPublished = parseInt($('.year_first_published').text().trim()) || undefined;
      const idealChemistry = $('.ideal_chemistry').text().trim();
      const comments = $('.comments').text().trim();
      
      // Extract structure references
      const structureRefs: string[] = [];
      $('.structure_refs li').each((_, ref) => {
        const refText = $(ref).text().trim();
        if (refText) {
          structureRefs.push(refText);
        }
      });
      
      return {
        rruffId,
        imaStatus,
        mineralName,
        chemicalFormula,
        crystalSystem,
        crystalClass,
        spaceGroup,
        unitCell: {
          a: unitCellA,
          b: unitCellB,
          c: unitCellC,
          alpha: unitCellAlpha,
          beta: unitCellBeta,
          gamma: unitCellGamma,
          z: unitCellZ,
          volume: unitCellVolume
        },
        color,
        density,
        hardness,
        opticalProperties: {
          type: opticalType,
          sign: opticalSign,
          indices: opticalIndices,
          birefringence: opticalBirefringence
        },
        elementComposition,
        yearFirstPublished,
        idealChemistry,
        comments,
        url,
        structureRefs
      };
    } catch (error) {
      console.error(`Error fetching data for ${mineralName}:`, error);
      throw new Error(`Failed to fetch data for ${mineralName}: ${error.message}`);
    }
  }

  /**
   * Extract spectral data for a specific mineral
   */
  async getSpectraData(mineralName: string, mineralId: number): Promise<InsertRruffSpectra[]> {
    console.log(`Fetching spectra for ${mineralName}...`);
    try {
      // URL may need to be adjusted based on actual RRUFF structure
      const url = `${this.baseUrl}display.php?mineral_name=${encodeURIComponent(mineralName)}&spectra=1`;
      const response = await fetch(url);
      const html = await response.text();
      
      const $ = cheerio.load(html);
      const spectraList: InsertRruffSpectra[] = [];
      
      // This selector will need to be adjusted based on the RRUFF HTML structure
      $('.spectra_item').each((_, item) => {
        const spectraType = $(item).find('.spectra_type').text().trim();
        const sampleId = $(item).find('.sample_id').text().trim();
        const orientation = $(item).find('.orientation').text().trim();
        const wavelength = $(item).find('.wavelength').text().trim();
        const temperature = $(item).find('.temperature').text().trim();
        const pressure = $(item).find('.pressure').text().trim();
        
        // Data URL for downloading raw spectra data
        const dataUrl = $(item).find('.data_url a').attr('href') || '';
        
        spectraList.push({
          mineralId,
          spectraType,
          sampleId,
          orientation,
          wavelength,
          temperature,
          pressure,
          dataUrl
          // dataPoints will be fetched and processed separately if needed
        });
      });
      
      return spectraList;
    } catch (error) {
      console.error(`Error fetching spectra for ${mineralName}:`, error);
      return []; // Return empty array instead of failing
    }
  }

  /**
   * Extract and store data for all IMA-approved minerals
   */
  async extractAndStoreAllMinerals(): Promise<{ mineralsCount: number, spectraCount: number, errors: string[] }> {
    const errors: string[] = [];
    let mineralsCount = 0;
    let spectraCount = 0;
    
    try {
      // Start the import process
      await this.startImport();
      
      // Get list of all minerals
      const mineralNames = await this.getMineralList();
      
      for (const mineralName of mineralNames) {
        try {
          // Extract and store mineral data
          const mineralData = await this.getMineralData(mineralName);
          
          // Insert into database
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
          
          // Extract and store spectra data
          const spectraList = await this.getSpectraData(mineralName, mineral.id);
          
          if (spectraList.length > 0) {
            // Insert spectra into database
            await db.insert(rruffSpectra)
              .values(spectraList)
              .onConflictDoNothing();
            
            spectraCount += spectraList.length;
          }
          
          // Add a delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing ${mineralName}:`, error);
          errors.push(`Error processing ${mineralName}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in extraction process:', error);
      errors.push(`Error in extraction process: ${error.message}`);
    } finally {
      // Complete the import process
      await this.completeImport(mineralsCount, spectraCount, errors);
    }
    
    return { mineralsCount, spectraCount, errors };
  }
}

// Export a singleton instance
export const rruffExtractor = new RruffExtractor();