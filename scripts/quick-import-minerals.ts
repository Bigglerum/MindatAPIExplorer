/**
 * Script to quickly import a sample of RRUFF minerals for testing/demo
 * This imports just enough minerals to demonstrate the functionality
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

// List of important minerals to prioritize import
const PRIORITY_MINERALS = [
  'Quartz', 'Calcite', 'Fluorite', 'Halite', 'Magnetite', 
  'Pyrite', 'Galena', 'Gold', 'Diamond', 'Aragonite',
  'Gypsum', 'Cinnabar', 'Hematite', 'Malachite', 'Azurite',
  'Talc', 'Olivine', 'Garnet', 'Corundum', 'Ruby',
  'Sapphire', 'Emerald', 'Topaz', 'Tourmaline', 'Feldspar',
  'Kaolinite', 'Apatite', 'Zircon', 'Biotite', 'Graphite',
  // Specific user requests
  'Liroconite', 'Actinolite', 'Beryl', 'Barite', 'Celestine',
  'Olivine', 'Forsterite', 'Fayalite', 'Nepheline', 'Sodalite',
  'Periclase', 'Wollastonite', 'Diopside', 'Enstatite', 'Hypersthene'
].map(name => name.toLowerCase());

/**
 * Main function to import IMA mineral data from CSV
 */
async function quickImportMinerals(csvPath: string = MINERALS_CSV_PATH, limit: number = 500) {
  console.log('Starting quick import of IMA minerals process...');
  
  const startTime = new Date();
  const errors: string[] = [];
  
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
    
    // Find priority minerals first
    const prioritizedRecords = [...records];
    
    // Sort so that priority minerals come first
    prioritizedRecords.sort((a, b) => {
      const aIsPriority = PRIORITY_MINERALS.includes((a["Mineral Name"] || '').toLowerCase());
      const bIsPriority = PRIORITY_MINERALS.includes((b["Mineral Name"] || '').toLowerCase());
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });
    
    // Limit to the first N minerals (including all priority ones)
    const selectedRecords = prioritizedRecords.slice(0, limit);
    
    // Import the new data
    console.log(`Importing up to ${limit} minerals with priority for common ones...`);
    let importedCount = 0;
    for (const record of selectedRecords) {
      try {
        // Only log every 100 minerals to reduce console output
        if (importedCount % 100 === 0) {
          console.log(`Processing mineral ${importedCount + 1} of ${selectedRecords.length}: ${record["Mineral Name"]}...`);
        }
        
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
          const ids = record["RRUFF IDs"].split(/\s+/);
          rruffId = ids[0] || `GEN-${importedCount + 1}`;
        } else {
          rruffId = `GEN-${importedCount + 1}`;
        }
        
        // Get crystal system (using the first entry if multiple are listed)
        let crystalSystem = '';
        if (record["Crystal Systems"]) {
          crystalSystem = record["Crystal Systems"].split('|')[0].trim().substring(0, 45);
        }
        
        // Get space group (using the first entry if multiple are listed)
        let spaceGroup = '';
        if (record["Space Groups"]) {
          spaceGroup = record["Space Groups"].split('|')[0].trim().substring(0, 45);
        }
        
        // Extract structural information
        const structuralGroup = record["Structural Groupname"] || '';
        const fleischersGroup = record["Fleischers Groupname"] || '';
        
        // Extract other useful fields
        const imaNumber = record["IMA Number"] || '';
        const typeLocality = record["Country of Type Locality"] || '';
        const paragenesis = record["Paragenetic Modes"] || '';
        
        // Combine notes for rich comments field
        const combinedComments = [
          record["Status Notes"] || '',
          structuralGroup !== 'Not in a structural group' ? `Structural Group: ${structuralGroup}` : '',
          fleischersGroup ? `Fleischer's Group: ${fleischersGroup}` : '',
          typeLocality ? `Type Locality: ${typeLocality}` : '',
          paragenesis ? `Paragenesis: ${paragenesis}` : ''
        ].filter(Boolean).join('\n');
        
        // Import the mineral data
        await db.insert(rruffMinerals).values({
          rruffId: rruffId,
          mineralName: record["Mineral Name"] || '',
          chemicalFormula: chemicalFormula,
          imaStatus: (record["IMA Status"] || 'unknown').substring(0, 45),
          crystalSystem: crystalSystem,
          crystalClass: '', // Not directly extractable without complex parsing
          spaceGroup: spaceGroup,
          unitCell: unitCell,
          color: '', // Not directly in CSV
          density: '', // Not directly in CSV
          hardness: '', // Not directly in CSV
          elementComposition: elementComposition,
          yearFirstPublished: yearPublished,
          comments: combinedComments,
          url: rruffUrl,
          isActive: true,
        });
        
        importedCount++;
        
        // Log progress 
        if (importedCount % 100 === 0) {
          console.log(`Imported ${importedCount} minerals so far...`);
        }
      } catch (error: any) {
        const errorMsg = `Error importing mineral ${record["Mineral Name"]}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Log the import
    const endTime = new Date();
    
    await db.insert(rruffDataImportLogs).values({
      status: 'completed',
      startTime,
      endTime,
      mineralsImported: importedCount,
      spectraImported: 0,
      errors: errors.length > 0 ? errors : [],
      details: {
        source: 'RRUFF_Export_CSV',
        importType: 'ima_minerals_quick'
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
    const errorMsg = `Error during quick IMA minerals import: ${error.message}`;
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
        importType: 'ima_minerals_quick'
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
quickImportMinerals()
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

export { quickImportMinerals };