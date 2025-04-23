/**
 * Script to import specific minerals from the RRUFF CSV
 * This is a targeted script to import high-priority minerals immediately
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

// List of specific minerals to import
const TARGET_MINERALS = [
  'Liroconite',
  'Actinolite',
  'Quartz',
  'Calcite',
  'Fluorite',
  'Kernowite',
  'Beryl',
  'Emerald',
  'Diamond'
].map(name => name.toLowerCase());

async function importSpecificMinerals(csvPath: string = MINERALS_CSV_PATH) {
  console.log('Starting targeted import for specific minerals...');
  console.log(`Target minerals: ${TARGET_MINERALS.join(', ')}`);
  
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
      const mineralName = record["Mineral Name"] || '';
      if (TARGET_MINERALS.includes(mineralName.toLowerCase())) {
        records.push(record);
      }
    }
    
    console.log(`Found ${records.length} target minerals in the CSV`);
    
    // Process each targeted mineral record
    for (const record of records) {
      try {
        const mineralName = record["Mineral Name"] || '';
        console.log(`Processing ${mineralName}...`);
        
        // First check if this mineral already exists
        const existingMineral = await db.select().from(rruffMinerals)
          .where(eq(rruffMinerals.mineralName, mineralName))
          .limit(1);
        
        if (existingMineral.length > 0) {
          console.log(`Mineral ${mineralName} already exists in database, skipping.`);
          continue;
        }
        
        // Extract all available data from the record
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
          record["IMA Footnote"] ? `IMA Footnote: ${record["IMA Footnote"]}` : '',
          record["Related To"] ? `Related To: ${record["Related To"]}` : '',
          record["Group"] ? `Group: ${record["Group"]}` : '',
          record["Status"] ? `Status: ${record["Status"]}` : ''
        ].filter(Boolean).join('\n');
        
        // Import the mineral data with all available fields - use proper schema field names
        await db.insert(rruffMinerals).values({
          rruffId: rruffId,
          mineralName: mineralName,
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
        console.log(`Successfully imported ${mineralName}`);
      } catch (error: any) {
        const mineralName = record["Mineral Name"] || '';
        const errorMsg = `Error importing mineral ${mineralName}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Log the import
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    
    await db.insert(rruffDataImportLogs).values({
      status: 'completed',
      startTime: startTime,
      endTime: endTime,
      mineralsImported: importedCount,
      spectraImported: 0,
      errors: errors.length > 0 ? errors : [],
      details: {
        source: 'RRUFF_Export_CSV',
        importType: 'targeted_minerals_import',
        duration: `${durationSeconds} seconds`,
        minerals: TARGET_MINERALS
      },
    });
    
    console.log(`Targeted import complete! Successfully imported ${importedCount} of ${TARGET_MINERALS.length} minerals`);
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during import`);
    }
    
    return {
      mineralsCount: importedCount,
      targetMinerals: TARGET_MINERALS.length,
      errors,
      startTime,
      endTime,
      durationSeconds
    };
    
  } catch (error: any) {
    const errorMsg = `Error during targeted minerals import: ${error.message}`;
    console.error(errorMsg);
    errors.push(errorMsg);
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
importSpecificMinerals()
  .then(result => {
    console.log('Script completed successfully');
    console.log(`Imported ${result.mineralsCount} out of ${result.targetMinerals} targeted minerals`);
    console.log(`Duration: ${result.durationSeconds} seconds`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });