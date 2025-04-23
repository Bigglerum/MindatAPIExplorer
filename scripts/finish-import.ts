/**
 * Script to finish the import from where it left off
 */
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { rruffMinerals } from '../shared/rruff-schema';
import { eq, sql } from 'drizzle-orm';
import { updateImportProgress } from '../server/routes/rruff-routes';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function finishImport() {
  console.log('Continuing mineral import...');
  
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
    
    // Get current count
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`Current database has ${currentCount} minerals. Continuing from there...`);
    
    // Start tracking progress
    updateImportProgress(currentCount, true);
    
    // Skip records we've already imported
    const remainingRecords = records.slice(currentCount);
    console.log(`Will import remaining ${remainingRecords.length} records...`);
    
    // Process in batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(remainingRecords.length / BATCH_SIZE);
    
    console.log(`Importing minerals in ${totalBatches} batches of ${BATCH_SIZE} records each...`);
    
    // Process each batch
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, remainingRecords.length);
      const batchRecords = remainingRecords.slice(start, end);
      
      console.log(`Processing batch ${i + 1}/${totalBatches} (records ${start + 1}-${end})`);
      
      // Prepare batch values
      const batchValues = batchRecords.map(record => {
        // Extract only essential fields with simplified processing
        const mineralName = record["Mineral Name"] || '';
        const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
        
        // Get crystal system but truncate to fit in field
        let crystalSystem = null;
        if (record["Crystal Systems"]) {
          crystalSystem = String(record["Crystal Systems"]).split('|')[0].trim();
          // Ensure it fits in the varchar(50) field
          if (crystalSystem.length > 49) {
            crystalSystem = crystalSystem.substring(0, 49);
          }
        }
        
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
          crystalSystem,
          imaStatus: record["IMA Status"] ? String(record["IMA Status"]).substring(0, 49) : null,
          elementComposition,
          isActive: true
        };
      });
      
      try {
        // Insert batch
        await db.insert(rruffMinerals).values(batchValues);
      } catch (error) {
        console.error(`Error during batch ${i + 1} insert:`, error.message);
        
        // Try inserting one by one
        console.log('Falling back to one-by-one insertion...');
        for (const record of batchValues) {
          try {
            await db.insert(rruffMinerals).values(record);
          } catch (individualError) {
            console.error(`Failed to import mineral ${record.mineralName}:`, individualError.message);
          }
        }
      }
      
      // Get new count
      const newCountResult = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
      const newCount = parseInt(newCountResult.rows[0].count);
      
      // Update progress
      updateImportProgress(newCount);
      console.log(`Imported ${newCount}/${records.length} minerals (${Math.round(newCount/records.length*100)}%)`);
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
finishImport().catch(error => {
  console.error('Fatal error during import:', error);
});