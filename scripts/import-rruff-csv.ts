/**
 * Script to import RRUFF IMA minerals from a provided CSV file
 * This script reads the minerals data and loads it into the database
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

/**
 * Main function to import IMA mineral data from CSV
 */
async function importMineralsFromCsv(csvPath: string = MINERALS_CSV_PATH) {
  console.log('Starting COMPLETE RRUFF IMA minerals import process for ALL 5997 MINERALS...');
  
  const startTime = new Date();
  const errors: string[] = [];
  let importedCount = 0;
  
  try {
    // Verify the CSV file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at path: ${csvPath}`);
    }
    
    console.log(`Reading minerals data from ${csvPath}...`);
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    console.log(`File read complete. Content length: ${fileContent.length} bytes`);
    
    // Step 1: Parse the CSV data - ALL records
    console.log('Parsing ALL CSV data...');
    const records: any[] = [];
    
    // Set up the CSV parser
    const parser = parse(fileContent, {
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    // Process each row
    for await (const record of parser) {
      records.push(record);
    }
    
    console.log(`Parsed ${records.length} mineral records from CSV - importing ALL of them`);
    
    // Step 2: First, delete any existing spectra and minerals (with safe transaction)
    console.log('Preparing to clean existing data...');
    
    // Use a transaction to ensure data integrity
    await db.transaction(async (tx) => {
      try {
        // First try to delete any spectra that might reference minerals
        console.log('Clearing existing spectra links...');
        await tx.execute(sql`TRUNCATE TABLE rruff_spectra CASCADE`);
      } catch (error) {
        console.log('No spectra table or data to clear.');
      }
      
      // Then delete the minerals
      console.log('Clearing existing minerals data...');
      await tx.execute(sql`TRUNCATE TABLE rruff_minerals CASCADE`);
    });
    
    console.log('All existing mineral data cleared successfully');
    
    // Step 4: Import ALL data - no slicing or limiting
    const totalRecords = records.length;
    console.log(`Beginning import of ALL ${totalRecords} minerals with ALL available columns...`);
    
    for (let i = 0; i < totalRecords; i++) {
      const record = records[i];
      try {
        // Only log every 500 minerals to reduce console output
        if (i % 500 === 0) {
          console.log(`Processing mineral ${i + 1} of ${totalRecords}: ${record["Mineral Name"]}...`);
        }
        
        // Extract ALL data from every field in the CSV
        const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
        
        // Use the Elements column for more accurate element composition
        const elements = record["Chemistry Elements"] ? record["Chemistry Elements"].split(' ') : 
                          extractElementsFromFormula(chemicalFormula);
        
        // Create element composition object for DB
        const elementComposition: Record<string, number> = {};
        elements.forEach(element => {
          if (element && element.trim()) {
            elementComposition[element.trim()] = 1; // Simple presence indicator
          }
        });
        
        // Extract unit cell parameters if available
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
        
        // Try to extract unit cell data from various fields
        try {
          if (record["Unit Cell A"]) unitCell.a = parseFloat(record["Unit Cell A"]);
          if (record["Unit Cell B"]) unitCell.b = parseFloat(record["Unit Cell B"]);
          if (record["Unit Cell C"]) unitCell.c = parseFloat(record["Unit Cell C"]);
          if (record["Unit Cell Alpha"]) unitCell.alpha = parseFloat(record["Unit Cell Alpha"]);
          if (record["Unit Cell Beta"]) unitCell.beta = parseFloat(record["Unit Cell Beta"]);
          if (record["Unit Cell Gamma"]) unitCell.gamma = parseFloat(record["Unit Cell Gamma"]);
          if (record["Unit Cell Z"]) unitCell.z = parseFloat(record["Unit Cell Z"]);
          if (record["Unit Cell Volume"]) unitCell.volume = parseFloat(record["Unit Cell Volume"]);
        } catch (e) {
          // Silently continue if unit cell data can't be parsed
        }
        
        // Prepare RRUFF URL
        let rruffUrl = '';
        if (record["RRUFF IDs"]) {
          const rruffIds = record["RRUFF IDs"].split(/\s+/);
          if (rruffIds.length > 0 && rruffIds[0]) {
            rruffUrl = `https://rruff.info/ima/${rruffIds[0]}`;
          }
        }
        
        // Parse year if available
        let yearPublished: number | null = null;
        if (record["Year First Published"]) {
          const yearMatch = record["Year First Published"].match(/\d{4}/);
          if (yearMatch) {
            yearPublished = parseInt(yearMatch[0], 10);
          }
        }
        
        // Create a unique RRUFF ID or generate one if necessary
        let rruffId = '';
        if (record["RRUFF IDs"]) {
          // Take just the first ID if there are multiple
          const ids = record["RRUFF IDs"].split(/\s+/);
          rruffId = ids[0] || `GEN-${i + 1}`;
        } else {
          // Generate a unique ID if none exists
          rruffId = `GEN-${i + 1}`;
        }
        
        // Get crystal system (using the first entry if multiple are listed)
        let crystalSystem = '';
        if (record["Crystal Systems"]) {
          crystalSystem = record["Crystal Systems"].split('|')[0].trim().substring(0, 45);
        }
        
        // Get crystal class if available
        let crystalClass = '';
        if (record["Crystal Classes"]) {
          crystalClass = record["Crystal Classes"].split('|')[0].trim().substring(0, 45);
        }
        
        // Get space group (using the first entry if multiple are listed)
        let spaceGroup = '';
        if (record["Space Groups"]) {
          spaceGroup = record["Space Groups"].split('|')[0].trim().substring(0, 45);
        }
        
        // Extract physical properties
        const color = record["Color"] || '';
        const density = record["Density"] || '';
        const hardness = record["Hardness"] || '';
        
        // Extract structural information
        const structuralGroup = record["Structural Groupname"] || '';
        const fleischersGroup = record["Fleischers Groupname"] || '';
        
        // Extract other useful fields
        const imaNumber = record["IMA Number"] || '';
        const typeLocality = record["Country of Type Locality"] || '';
        const paragenesis = record["Paragenetic Modes"] || '';
        
        // Combine notes for rich comments field - ALL available data
        const combinedComments = [
          record["Status Notes"] || '',
          structuralGroup !== 'Not in a structural group' ? `Structural Group: ${structuralGroup}` : '',
          fleischersGroup ? `Fleischer's Group: ${fleischersGroup}` : '',
          imaNumber ? `IMA Number: ${imaNumber}` : '',
          typeLocality ? `Type Locality: ${typeLocality}` : '',
          paragenesis ? `Paragenesis: ${paragenesis}` : '',
          record["Description"] ? `Description: ${record["Description"]}` : '',
          record["Other IMA Chemistry"] ? `Other Chemical Formulas: ${record["Other IMA Chemistry"]}` : '',
          record["Discovery Year"] ? `Discovery Year: ${record["Discovery Year"]}` : '',
          record["IMA Footnote"] ? `IMA Footnote: ${record["IMA Footnote"]}` : '',
          record["Common Name"] ? `Common Name: ${record["Common Name"]}` : '',
          record["Polytype"] ? `Polytype: ${record["Polytype"]}` : '',
          record["Dimorph"] ? `Dimorph: ${record["Dimorph"]}` : '',
          record["Polymorph"] ? `Polymorph: ${record["Polymorph"]}` : '',
          record["Variety"] ? `Variety: ${record["Variety"]}` : '',
          record["Parent Species"] ? `Parent Species: ${record["Parent Species"]}` : '',
          record["Related To"] ? `Related To: ${record["Related To"]}` : '',
          record["Group"] ? `Group: ${record["Group"]}` : '',
          record["Status"] ? `Status: ${record["Status"]}` : '',
          record["Polytypes"] ? `Polytypes: ${record["Polytypes"]}` : ''
        ].filter(Boolean).join('\n');
        
        // Import ALL the mineral data
        await db.insert(rruffMinerals).values({
          rruffId: rruffId,
          mineralName: record["Mineral Name"] || '',
          chemicalFormula: chemicalFormula,
          imaStatus: (record["IMA Status"] || 'unknown').substring(0, 45),
          crystalSystem: crystalSystem,
          crystalClass: crystalClass,
          spaceGroup: spaceGroup,
          unitCell: unitCell,
          color: color,
          density: density,
          hardness: hardness,
          elementComposition: elementComposition,
          yearFirstPublished: yearPublished,
          comments: combinedComments,
          url: rruffUrl,
          isActive: true,
        });
        
        importedCount++;
        
        // Log progress for large imports
        if (importedCount % 500 === 0) {
          console.log(`Imported ${importedCount} of ${totalRecords} minerals (${Math.round(importedCount/totalRecords*100)}% complete)`);
        }
      } catch (error: any) {
        const errorMsg = `Error importing mineral ${record["Mineral Name"]}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Step 5: Log the import
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    
    await db.insert(rruffDataImportLogs).values({
      status: 'completed',
      startTime,
      endTime,
      mineralsImported: importedCount,
      spectraImported: 0,
      errors: errors.length > 0 ? errors : [],
      details: {
        source: 'RRUFF_Export_CSV',
        importType: 'COMPLETE_IMPORT_ALL_DATA',
        duration: `${durationSeconds} seconds`,
        totalRecords: totalRecords
      },
    });
    
    console.log(`Import complete! Successfully imported ${importedCount} of ${totalRecords} minerals (${Math.round(importedCount/totalRecords*100)}%)`);
    console.log(`Import took ${durationSeconds} seconds`);
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during import`);
    }
    
    return {
      mineralsCount: importedCount,
      totalRecords,
      errors,
      startTime,
      endTime,
      durationSeconds
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
        source: 'RRUFF_Export_CSV',
        importType: 'ima_minerals'
      },
    });
    
    throw error;
  }
}

/**
 * Helper function to extract elements from a chemical formula
 */
function extractElementsFromFormula(formula: string): string[] {
  if (!formula) return [];
  
  // Pattern to match element symbols (e.g., H, He, Li, etc.)
  const elementRegex = /[A-Z][a-z]?/g;
  const matches = formula.match(elementRegex);
  
  if (!matches) return [];
  
  // Remove duplicates and filter out non-element symbols like "O" in H2O
  return [...new Set(matches)].filter(element => {
    // Check if this is an actual element symbol (basic check)
    // This would benefit from a comprehensive list of valid element symbols
    return !/^[^A-Za-z]/.test(element); // Filter out entries that don't start with a letter
  });
}

// Run the main function
importMineralsFromCsv()
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

export { importMineralsFromCsv };