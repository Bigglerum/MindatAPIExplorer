/**
 * Script to bulk import ALL minerals from the RRUFF CSV
 * This uses a more efficient approach with batch inserts
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';
import { sql } from 'drizzle-orm';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

// Batch size for inserts
const BATCH_SIZE = 100;

async function bulkImportMinerals(csvPath: string = MINERALS_CSV_PATH) {
  console.log('Starting BULK import of ALL minerals...');
  
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
    
    // Parse the CSV data
    console.log('Parsing CSV data...');
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
    
    console.log(`Parsed ${records.length} mineral records from CSV`);
    
    // Clean existing data
    console.log('Preparing to clean existing data...');
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
    
    // Process in batches
    const totalRecords = records.length;
    const batches = Math.ceil(totalRecords / BATCH_SIZE);
    
    console.log(`Processing ${totalRecords} minerals in ${batches} batches of ${BATCH_SIZE}...`);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalRecords);
      const batch = records.slice(start, end);
      
      console.log(`Processing batch ${batchIndex + 1}/${batches}, minerals ${start + 1}-${end}`);
      
      const batchValues = [];
      
      for (const record of batch) {
        try {
          const mineralName = record["Mineral Name"] || '';
          
          // Extract all available data
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
            rruffId = ids[0] || `GEN-${mineralName}`;
          } else {
            // Generate a unique ID if none exists
            rruffId = `GEN-${mineralName}`;
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
            record["IMA Footnote"] ? `IMA Footnote: ${record["IMA Footnote"]}` : ''
          ].filter(Boolean).join('\n');
          
          // Add to batch values
          batchValues.push({
            rruffId,
            mineralName,
            chemicalFormula,
            imaStatus: (record["IMA Status"] || 'unknown').substring(0, 45),
            crystalSystem,
            crystalClass,
            spaceGroup,
            unitCell,
            color,
            density,
            hardness,
            elementComposition,
            yearFirstPublished: yearPublished,
            comments: combinedComments,
            url: rruffUrl,
            isActive: true,
          });
          
        } catch (error: any) {
          const mineralName = record["Mineral Name"] || '';
          const errorMsg = `Error processing mineral ${mineralName}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      // Bulk insert the batch
      try {
        if (batchValues.length > 0) {
          await db.insert(rruffMinerals).values(batchValues);
          importedCount += batchValues.length;
          console.log(`Successfully imported batch ${batchIndex + 1}/${batches}: ${batchValues.length} minerals`);
        }
      } catch (error: any) {
        const errorMsg = `Error inserting batch ${batchIndex + 1}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        
        // If bulk insert fails, try inserting one by one
        console.log(`Retrying batch ${batchIndex + 1} with individual inserts...`);
        for (const mineralData of batchValues) {
          try {
            await db.insert(rruffMinerals).values(mineralData);
            importedCount++;
          } catch (individualError: any) {
            const errorMsg = `Error inserting mineral ${mineralData.mineralName}: ${individualError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }
      
      // Report progress
      const progress = Math.round((end / totalRecords) * 100);
      console.log(`Progress: ${progress}% (${importedCount}/${totalRecords} minerals imported)`);
    }
    
    // Log the import
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
        importType: 'bulk_import_all',
        duration: `${durationSeconds} seconds`,
        totalRecords
      },
    });
    
    console.log(`Bulk import complete! Successfully imported ${importedCount} of ${totalRecords} minerals`);
    console.log(`Import took ${durationSeconds} seconds (${(durationSeconds / 60).toFixed(2)} minutes)`);
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
    const errorMsg = `Error during bulk import: ${error.message}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    // Log error to database
    const endTime = new Date();
    await db.insert(rruffDataImportLogs).values({
      status: 'failed',
      startTime,
      endTime,
      mineralsImported: importedCount,
      spectraImported: 0,
      errors,
      details: {
        source: 'RRUFF_Export_CSV',
        importType: 'bulk_import_all',
        error: error.message
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
bulkImportMinerals()
  .then(result => {
    console.log('Script completed successfully');
    console.log(`Imported ${result.mineralsCount} out of ${result.totalRecords} minerals`);
    console.log(`Duration: ${result.durationSeconds} seconds (${(result.durationSeconds / 60).toFixed(2)} minutes)`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });