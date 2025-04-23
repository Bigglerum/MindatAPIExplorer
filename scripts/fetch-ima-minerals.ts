/**
 * Script to fetch IMA mineral data from RRUFF
 * This script downloads the IMA-approved minerals list with basic properties
 * from the RRUFF website and saves it to the database.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '@shared/rruff-schema';
import { sql } from 'drizzle-orm';

// URL for the IMA minerals CSV export
const IMA_MINERALS_URL = 'https://rruff.info/ima/download_csv.php';

// Temporary file path
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const MINERALS_CSV_PATH = path.join(TEMP_DIR, 'ima_minerals.csv');

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
    // Step 1: Download the CSV file
    console.log(`Downloading IMA minerals data from ${IMA_MINERALS_URL}...`);
    const response = await fetch(IMA_MINERALS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to download IMA minerals: ${response.statusText}`);
    }
    
    const fileContent = await response.text();
    console.log(`Download complete. Content length: ${fileContent.length} bytes`);
    
    // Check if the response is actually a CSV or an error page (HTML)
    if (fileContent.includes('<!DOCTYPE html>') || fileContent.includes('<html')) {
      throw new Error('Received HTML instead of CSV data. The website may have changed its format or requires authentication.');
    }
    
    // Save the CSV to a file
    fs.writeFileSync(MINERALS_CSV_PATH, fileContent);
    console.log(`Saved CSV file to ${MINERALS_CSV_PATH}`);
    
    // Step 2: Parse and import the CSV data
    console.log('Parsing and importing IMA minerals data...');
    const records: any[] = [];
    
    // Set up the CSV parser
    const parser = fs.createReadStream(MINERALS_CSV_PATH)
      .pipe(parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true
      }));
      
    // Process each row
    for await (const record of parser) {
      records.push(record);
    }
    
    console.log(`Parsed ${records.length} mineral records from CSV`);
    
    // Step 3: Import to database
    // First, clear existing minerals table (careful with this in production!)
    await db.delete(rruffMinerals);
    console.log('Cleared existing minerals data');
    
    // Now insert the new data
    let importedCount = 0;
    for (const record of records) {
      try {
        const unitCell = {};
        
        // Extract unit cell parameters if available
        if (record.a) unitCell.a = parseFloat(record.a);
        if (record.b) unitCell.b = parseFloat(record.b);
        if (record.c) unitCell.c = parseFloat(record.c);
        if (record.alpha) unitCell.alpha = parseFloat(record.alpha);
        if (record.beta) unitCell.beta = parseFloat(record.beta);
        if (record.gamma) unitCell.gamma = parseFloat(record.gamma);
        if (record.z) unitCell.z = parseFloat(record.z);
        if (record.v) unitCell.volume = parseFloat(record.v);
        
        // Extract elements from chemical formula
        const elements = extractElementsFromFormula(record.Chemistry);
        
        await db.insert(rruffMinerals).values({
          rruffId: record.Id || '',
          mineralName: record.Mineral || '',
          chemicalFormula: record.Chemistry || '',
          imaStatus: 'approved', // Since these are from IMA list
          crystalSystem: record['Crystal System'] || '',
          crystalClass: record['Crystal Class'] || '',
          spaceGroup: record['Space Group'] || '',
          unitCell: Object.keys(unitCell).length > 0 ? unitCell : null,
          color: record.Color || '',
          density: record.Density || '',
          hardness: record.Hardness || '',
          elementComposition: elements,
          yearFirstPublished: record.Year ? parseInt(record.Year) : null,
          comments: record.Note || '',
          url: `https://rruff.info/ima/${record.Id}`,
          isActive: true,
        });
        
        importedCount++;
      } catch (error) {
        const errorMsg = `Error importing mineral ${record.Mineral}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Step 4: Log the import
    const endTime = new Date();
    
    await db.insert(rruffDataImportLogs).values({
      importType: 'ima_minerals',
      startTime,
      endTime,
      recordsImported: importedCount,
      errors: errors.length > 0 ? errors : null,
      dataSource: IMA_MINERALS_URL,
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
    
  } catch (error) {
    const errorMsg = `Error during IMA minerals import: ${error.message}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    // Log error to database
    const endTime = new Date();
    await db.insert(rruffDataImportLogs).values({
      importType: 'ima_minerals',
      startTime,
      endTime,
      recordsImported: 0,
      errors,
      dataSource: IMA_MINERALS_URL,
    });
    
    throw error;
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

// Run the function if this script is executed directly
if (require.main === module) {
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
}

export { downloadAndImportImaMinerals };