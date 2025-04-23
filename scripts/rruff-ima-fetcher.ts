/**
 * Script to fetch IMA-approved minerals from the RRUFF database
 * This script handles downloading and parsing the HTML from RRUFF.info
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';

// URL for the IMA minerals list
const IMA_MINERALS_URL = 'https://rruff.info/ima/';

// Temporary file path
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const MINERALS_HTML_PATH = path.join(TEMP_DIR, 'ima_minerals.html');

/**
 * Main function to download and import IMA mineral data
 */
async function downloadAndImportImaMinerals() {
  console.log('Starting IMA minerals download process...');
  
  // Create tmp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    console.log('Creating tmp directory...');
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  const startTime = new Date();
  const errors: string[] = [];
  
  try {
    // Step 1: Download the HTML page with mineral list
    console.log(`Downloading IMA minerals data from ${IMA_MINERALS_URL}...`);
    const response = await fetch(IMA_MINERALS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to download IMA minerals: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Download complete. Content length: ${html.length} bytes`);
    
    // Save the HTML to a file for debugging if needed
    fs.writeFileSync(MINERALS_HTML_PATH, html);
    console.log(`Saved HTML file to ${MINERALS_HTML_PATH}`);
    
    // Step 2: Parse the HTML to extract mineral data
    console.log('Parsing IMA minerals data from HTML...');
    const minerals = await parseImaHtml(html);
    
    console.log(`Parsed ${minerals.length} minerals from HTML`);
    
    // Step 3: Import to database
    // First, clear existing minerals table
    await db.delete(rruffMinerals);
    console.log('Cleared existing minerals data');
    
    // Now insert the new data
    let importedCount = 0;
    for (const mineral of minerals) {
      try {
        // Extract elements from chemical formula
        const elements = extractElementsFromFormula(mineral.chemicalFormula || '');
        
        // Create element composition object for DB
        const elementComposition: Record<string, number> = {};
        elements.forEach(element => {
          elementComposition[element] = 1; // Simple presence indicator
        });
        
        // Extract unit cell properties if available
        const unitCell: {
          a?: number;
          b?: number;
          c?: number;
          alpha?: number;
          beta?: number;
          gamma?: number;
          z?: number;
          volume?: number;
        } = {};
        
        if (mineral.unitCell) {
          const parts = mineral.unitCell.split(/;\s*/);
          for (const part of parts) {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                if (key === 'a') unitCell.a = numValue;
                else if (key === 'b') unitCell.b = numValue;
                else if (key === 'c') unitCell.c = numValue;
                else if (key === 'alpha') unitCell.alpha = numValue;
                else if (key === 'beta') unitCell.beta = numValue;
                else if (key === 'gamma') unitCell.gamma = numValue;
                else if (key === 'Z') unitCell.z = numValue;
                else if (key === 'V') unitCell.volume = numValue;
              }
            }
          }
        }
        
        await db.insert(rruffMinerals).values({
          rruffId: mineral.rruffId || '',
          mineralName: mineral.name,
          chemicalFormula: mineral.chemicalFormula || '',
          imaStatus: 'approved', // Since these are from IMA list
          crystalSystem: mineral.crystalSystem || '',
          crystalClass: mineral.crystalClass || '',
          spaceGroup: mineral.spaceGroup || '',
          unitCell: Object.keys(unitCell).length > 0 ? unitCell : {},
          color: mineral.color || '',
          density: mineral.density || '',
          hardness: mineral.hardness || '',
          elementComposition: elementComposition,
          yearFirstPublished: mineral.yearFirstPublished,
          comments: mineral.comments || '',
          url: mineral.url,
          isActive: true,
        });
        
        importedCount++;
      } catch (error: any) {
        const errorMsg = `Error importing mineral ${mineral.name}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Step 4: Log the import
    const endTime = new Date();
    
    await db.insert(rruffDataImportLogs).values({
      status: 'completed',
      startTime,
      endTime,
      mineralsImported: importedCount,
      spectraImported: 0,
      errors: errors.length > 0 ? errors : [],
      details: {
        source: IMA_MINERALS_URL,
        importType: 'ima_minerals'
      },
    });
    
    console.log(`Import complete! Successfully imported ${importedCount} minerals`);
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during import`);
    }
    
    return {
      mineralsCount: importedCount,
      errors,
      startTime,
      endTime
    };
    
  } catch (error: any) {
    const errorMsg = `Error during IMA minerals import: ${error.message}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    // Log error to database
    const endTime = new Date();
    await db.insert(rruffDataImportLogs).values({
      status: 'failed',
      startTime,
      endTime,
      mineralsImported: 0,
      spectraImported: 0,
      errors: errors,
      details: {
        source: IMA_MINERALS_URL,
        importType: 'ima_minerals'
      },
    });
    
    throw error;
  }
}

interface MineralData {
  name: string;
  rruffId?: string;
  chemicalFormula?: string;
  crystalSystem?: string;
  crystalClass?: string;
  spaceGroup?: string;
  unitCell?: string;
  color?: string;
  density?: string;
  hardness?: string;
  yearFirstPublished?: number;
  comments?: string;
  url: string;
}

/**
 * Parse the IMA HTML page to extract mineral data
 */
async function parseImaHtml(html: string): Promise<MineralData[]> {
  const $ = cheerio.load(html);
  const minerals: MineralData[] = [];
  
  // Find the main table with mineral data
  const mineralRows = $('table.main_table tr').filter((_, element) => {
    // Skip header rows
    return !$(element).find('th').length;
  });
  
  console.log(`Found ${mineralRows.length} potential mineral entries in the HTML table`);
  
  mineralRows.each((_, row) => {
    try {
      const cols = $(row).find('td');
      if (cols.length < 4) return; // Skip rows without enough columns
      
      // Extract basic mineral info
      const nameCol = $(cols[2]);
      const nameLink = nameCol.find('a.page_link_2');
      
      if (!nameLink.length) return; // Skip if no name link found
      
      const name = nameLink.text().trim();
      const url = nameLink.attr('href') || '';
      let rruffId = '';
      
      // Extract RRUFF ID from URL if present
      const idMatch = url.match(/\/([^\/]+)$/);
      if (idMatch) {
        rruffId = idMatch[1];
      }
      
      // Extract chemical formula
      const chemistryCol = $(cols[3]);
      const chemicalFormula = chemistryCol.text().trim();
      
      // Initialize mineral data
      const mineral: MineralData = {
        name,
        rruffId,
        chemicalFormula,
        url: `https://rruff.info${url}`
      };
      
      // For more detailed info, we'd need to visit each mineral's page
      // This would slow down the import but provide more comprehensive data
      // For now, we'll just use the basic data available in the table
      
      minerals.push(mineral);
    } catch (error: any) {
      console.error(`Error parsing row: ${error.message}`);
    }
  });
  
  console.log(`Successfully parsed ${minerals.length} minerals`);
  
  // Optional: Enhance with details from individual pages
  if (minerals.length > 0) {
    console.log('Enhancing mineral data with details from individual pages...');
    const enhancedMinerals: MineralData[] = [];
    
    // Process in batches to avoid overloading the server
    const batchSize = 5;
    for (let i = 0; i < minerals.length; i += batchSize) {
      const batch = minerals.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(minerals.length/batchSize)}...`);
      
      // Process each mineral in the batch in parallel
      const enhancedBatch = await Promise.all(
        batch.map(mineral => enhanceMineralWithDetails(mineral))
      );
      
      enhancedMinerals.push(...enhancedBatch);
    }
    
    return enhancedMinerals;
  }
  
  return minerals;
}

/**
 * Enhance a mineral with details from its individual page
 */
async function enhanceMineralWithDetails(mineral: MineralData): Promise<MineralData> {
  try {
    if (!mineral.url) return mineral;
    
    console.log(`Fetching details for ${mineral.name} from ${mineral.url}`);
    
    const response = await fetch(mineral.url);
    if (!response.ok) {
      console.warn(`Failed to fetch details for ${mineral.name}: ${response.statusText}`);
      return mineral;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract crystal system
    const crystalSystemRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Crystal System')
    );
    if (crystalSystemRow.length) {
      mineral.crystalSystem = crystalSystemRow.find('td').last().text().trim();
    }
    
    // Extract crystal class
    const crystalClassRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Crystal Class')
    );
    if (crystalClassRow.length) {
      mineral.crystalClass = crystalClassRow.find('td').last().text().trim();
    }
    
    // Extract space group
    const spaceGroupRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Space Group')
    );
    if (spaceGroupRow.length) {
      mineral.spaceGroup = spaceGroupRow.find('td').last().text().trim();
    }
    
    // Extract unit cell
    const unitCellRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Unit Cell')
    );
    if (unitCellRow.length) {
      mineral.unitCell = unitCellRow.find('td').last().text().trim();
    }
    
    // Extract color
    const colorRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Color')
    );
    if (colorRow.length) {
      mineral.color = colorRow.find('td').last().text().trim();
    }
    
    // Extract density
    const densityRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Density')
    );
    if (densityRow.length) {
      mineral.density = densityRow.find('td').last().text().trim();
    }
    
    // Extract hardness
    const hardnessRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Hardness')
    );
    if (hardnessRow.length) {
      mineral.hardness = hardnessRow.find('td').last().text().trim();
    }
    
    // Extract year
    const yearRow = $('tr').filter((_, el) => 
      $(el).find('td').first().text().trim().includes('Year')
    );
    if (yearRow.length) {
      const yearText = yearRow.find('td').last().text().trim();
      const yearMatch = yearText.match(/\d{4}/);
      if (yearMatch) {
        mineral.yearFirstPublished = parseInt(yearMatch[0]);
      }
    }
    
    // Sleep briefly to avoid hammering the server
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mineral;
  } catch (error: any) {
    console.error(`Error enhancing mineral ${mineral.name}: ${error.message}`);
    return mineral;
  }
}

/**
 * Helper function to extract elements from a chemical formula
 */
function extractElementsFromFormula(formula: string): string[] {
  if (!formula) return [];
  
  const elementRegex = /[A-Z][a-z]?/g;
  const matches = formula.match(elementRegex);
  
  if (!matches) return [];
  
  // Remove duplicates
  return [...new Set(matches)];
}

// Run the main function
downloadAndImportImaMinerals()
  .then(result => {
    console.log('Script completed successfully');
    console.log(`Imported ${result.mineralsCount} minerals`);
    console.log(`Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000} seconds`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

export { downloadAndImportImaMinerals };