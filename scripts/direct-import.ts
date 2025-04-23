/**
 * Extremely simplified and fast mineral import script
 */
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { rruffMinerals } from '../shared/rruff-schema';
import { sql } from 'drizzle-orm';
import { updateImportProgress } from '../server/routes/rruff-routes';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function directImport() {
  console.log('Starting direct CSV import...');
  
  try {
    // Verify the CSV file exists
    if (!fs.existsSync(MINERALS_CSV_PATH)) {
      throw new Error(`CSV file not found at path: ${MINERALS_CSV_PATH}`);
    }
    
    // Read the file synchronously
    const fileContent = fs.readFileSync(MINERALS_CSV_PATH, 'utf8');
    console.log(`File read complete: ${fileContent.length} bytes`);
    
    // Parse CSV with synchronous parser for speed
    console.log('Parsing CSV data...');
    const records = parse(fileContent, {
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    console.log(`CSV parsed: ${records.length} records`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.execute(sql`TRUNCATE TABLE rruff_minerals CASCADE`);
    
    // Start tracking progress
    updateImportProgress(0, true);
    
    // Process in batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    
    console.log(`Importing minerals in ${totalBatches} batches of ${BATCH_SIZE} records each...`);
    
    // Process each batch
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, records.length);
      const batchRecords = records.slice(start, end);
      
      console.log(`Processing batch ${i + 1}/${totalBatches} (records ${start + 1}-${end})`);
      
      // Prepare batch values
      const batchValues = batchRecords.map(record => {
        // Extract only essential fields with simplified processing
        const mineralName = record["Mineral Name"] || '';
        const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
        
        // Simple element extraction
        const elementComposition = {};
        if (record["Chemistry Elements"]) {
          const elements = String(record["Chemistry Elements"]).split(' ');
          for (const el of elements) {
            if (el.trim()) elementComposition[el.trim()] = 1;
          }
        }
        
        return {
          mineralName,
          chemicalFormula,
          crystalSystem: record["Crystal Systems"] ? String(record["Crystal Systems"]).split('|')[0].trim() : null,
          imaStatus: record["IMA Status"] || null,
          elementComposition,
          isActive: true
        };
      });
      
      // Insert batch
      await db.insert(rruffMinerals).values(batchValues);
      
      // Update progress
      updateImportProgress(end);
      console.log(`Imported ${end}/${records.length} minerals (${Math.round(end/records.length*100)}%)`);
    }
    
    // Final count
    const result = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
    const finalCount = parseInt(result.rows[0].count);
    console.log(`Import complete! Database now contains ${finalCount} minerals.`);
    
    // Mark as complete
    updateImportProgress(finalCount, false);
    
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

// Run the import
directImport().catch(error => {
  console.error('Fatal error during import:', error);
});