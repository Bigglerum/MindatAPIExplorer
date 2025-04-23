/**
 * Simplest possible mineral import script
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { rruffMinerals } from '../shared/rruff-schema';
import { sql } from 'drizzle-orm';
import { updateImportProgress } from '../server/routes/rruff-routes';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function simpleImport() {
  console.log('Starting simplest possible mineral import...');
  
  try {
    // Verify the CSV file exists
    if (!fs.existsSync(MINERALS_CSV_PATH)) {
      throw new Error(`CSV file not found at path: ${MINERALS_CSV_PATH}`);
    }
    
    // Read the CSV file
    const fileContent = fs.readFileSync(MINERALS_CSV_PATH, 'utf8');
    console.log(`File read complete. Length: ${fileContent.length} bytes`);
    
    // Parse the CSV
    console.log('Parsing CSV data...');
    
    const records = [];
    const parser = parse(fileContent, {
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    for await (const record of parser) {
      records.push(record);
    }
    
    console.log(`Successfully parsed ${records.length} records`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.execute(sql`TRUNCATE TABLE rruff_minerals CASCADE`);
    
    // Import each record one by one
    console.log('Importing minerals...');
    let successCount = 0;
    
    // Mark import as in progress for the progress tracker
    updateImportProgress(0, true);
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Log progress every 100 records
      if (i % 100 === 0 || i === records.length - 1) {
        console.log(`Processing ${i+1}/${records.length} (${Math.round((i+1)/records.length*100)}%)`);
        // Update the progress counter
        updateImportProgress(successCount);
      }
      
      try {
        // Extract only essential fields
        const mineralName = record["Mineral Name"] || '';
        const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
        const crystalSystem = record["Crystal Systems"] ? record["Crystal Systems"].split('|')[0].trim() : '';
        const imaStatus = record["IMA Status"] || '';
        
        // Simple element extraction
        const elementComposition = {};
        if (record["Chemistry Elements"]) {
          record["Chemistry Elements"].split(' ').forEach(el => {
            if (el.trim()) elementComposition[el.trim()] = 1;
          });
        }
        
        // Insert using the schema
        await db.insert(rruffMinerals).values({
          mineralName,
          chemicalFormula,
          crystalSystem,
          imaStatus,
          elementComposition,
          isActive: true
        });
        
        successCount++;
      } catch (error) {
        console.error(`Error importing ${record["Mineral Name"]}: ${error.message}`);
      }
    }
    
    console.log(`Import complete. Inserted ${successCount} of ${records.length} minerals.`);
    
    // Final count
    const result = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
    console.log(`Total minerals in database: ${result.rows[0].count}`);
    
    // Mark import as complete
    updateImportProgress(successCount, false);
    
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
  }
}

// Run the import
simpleImport().catch(console.error);