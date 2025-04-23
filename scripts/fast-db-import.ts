/**
 * Fast, direct import using database COPY command 
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function fastDbImport() {
  console.log('Starting ultra-fast direct import of all minerals...');
  console.log(`Reading from ${MINERALS_CSV_PATH}`);
  
  try {
    // Get database connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verify the CSV file exists
    if (!fs.existsSync(MINERALS_CSV_PATH)) {
      throw new Error(`CSV file not found at path: ${MINERALS_CSV_PATH}`);
    }
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.execute(sql`TRUNCATE TABLE rruff_minerals CASCADE`);
    
    // Process all records into a format for direct insertion
    console.log('Processing records for direct insert...');
    
    // Create a temporary CSV file that matches the database schema
    const tempCsvPath = '/home/runner/workspace/tmp/processed_minerals.csv';
    const writeStream = fs.createWriteStream(tempCsvPath);
    
    // Read and process the CSV
    const fileContent = fs.readFileSync(MINERALS_CSV_PATH, 'utf8');
    console.log(`File read complete. Processing ${fileContent.length} bytes...`);
    
    const parser = parse(fileContent, {
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    let count = 0;
    for await (const record of parser) {
      count++;
      
      if (count % 1000 === 0) {
        console.log(`Processed ${count} records...`);
      }
      
      // Basic field extraction
      const mineralName = record["Mineral Name"] || '';
      const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
      const crystalSystem = record["Crystal Systems"] ? record["Crystal Systems"].split('|')[0].trim() : '';
      const imaStatus = (record["IMA Status"] || '').substring(0, 45);
      const rruffId = record["RRUFF IDs"] ? record["RRUFF IDs"].split(/\s+/)[0] : `GEN-${count}`;
      const spaceGroup = record["Space Groups"] ? record["Space Groups"].split('|')[0].trim() : '';
      
      // Simple element extraction
      const elements = {};
      if (record["Chemistry Elements"]) {
        record["Chemistry Elements"].split(' ').forEach(el => {
          if (el.trim()) elements[el.trim()] = 1;
        });
      }
      
      // Format line for the CSV file (database import format)
      // mineral_name,chemical_formula,crystal_system,ima_status,rruff_id,space_group,element_composition,is_active
      const line = [
        csvEscape(mineralName),
        csvEscape(chemicalFormula),
        csvEscape(crystalSystem),
        csvEscape(imaStatus),
        csvEscape(rruffId),
        csvEscape(spaceGroup),
        csvEscape(JSON.stringify(elements)),
        'true'
      ].join(',');
      
      writeStream.write(line + '\n');
    }
    
    // Close the write stream
    writeStream.end();
    console.log(`Created temporary CSV with ${count} records at ${tempCsvPath}`);
    
    // Now do a direct, fast import with COPY FROM
    console.log('Performing direct database import...');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Create a prepared statement for the import
      const copyStatement = `
        COPY rruff_minerals(
          mineral_name, chemical_formula, crystal_system, ima_status, 
          rruff_id, space_group, element_composition, is_active
        ) 
        FROM '${tempCsvPath}' 
        WITH (FORMAT csv, DELIMITER ',', QUOTE '"')
      `;
      
      // Execute the COPY command - SIMPLIFIED VERSION
      // Instead of using COPY which requires file system access from Postgres,
      // let's use a direct INSERT approach
      
      // Read the processed CSV and execute INSERT statements in batches
      const processedContent = fs.readFileSync(tempCsvPath, 'utf8');
      const lines = processedContent.split('\n').filter(line => line.trim());
      
      console.log(`Inserting ${lines.length} records in batches...`);
      
      // Insert in batches of 100
      const BATCH_SIZE = 100;
      const batches = Math.ceil(lines.length / BATCH_SIZE);
      
      let successCount = 0;
      
      for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, lines.length);
        const batchLines = lines.slice(start, end);
        
        let valuesSql = '';
        
        for (const line of batchLines) {
          const values = line.split(',');
          if (values.length < 7) continue; // Skip invalid lines
          
          // Add comma if not the first entry
          if (valuesSql.length > 0) {
            valuesSql += ',';
          }
          
          valuesSql += `(
            ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]},
            ${values[4]}, ${values[5]}, ${values[6]}, ${values[7]}
          )`;
        }
        
        if (valuesSql.length > 0) {
          try {
            const insertQuery = `
              INSERT INTO rruff_minerals(
                mineral_name, chemical_formula, crystal_system, ima_status,
                rruff_id, space_group, element_composition, is_active
              )
              VALUES ${valuesSql}
            `;
            
            await client.query(insertQuery);
            successCount += batchLines.length;
            
            console.log(`Imported batch ${i+1}/${batches}, ${successCount}/${lines.length} total`);
          } catch (error) {
            console.error(`Error inserting batch ${i+1}: ${error.message}`);
            
            // Try one by one
            for (const line of batchLines) {
              const values = line.split(',');
              if (values.length < 7) continue;
              
              try {
                const singleInsertQuery = `
                  INSERT INTO rruff_minerals(
                    mineral_name, chemical_formula, crystal_system, ima_status,
                    rruff_id, space_group, element_composition, is_active
                  )
                  VALUES (
                    ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]},
                    ${values[4]}, ${values[5]}, ${values[6]}, ${values[7]}
                  )
                `;
                
                await client.query(singleInsertQuery);
                successCount++;
              } catch (singleError) {
                console.error(`Error inserting record: ${singleError.message}`);
              }
            }
          }
        }
      }
      
      console.log(`Fast import completed. Inserted ${successCount} records.`);
      
      // Get final count
      const result = await client.query('SELECT COUNT(*) FROM rruff_minerals');
      console.log(`Total minerals in database: ${result.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
    // Clean up
    try {
      fs.unlinkSync(tempCsvPath);
      console.log(`Removed temporary file ${tempCsvPath}`);
    } catch (cleanupError) {
      console.error(`Error cleaning up: ${cleanupError.message}`);
    }
    
  } catch (error) {
    console.error(`Fast import failed: ${error.message}`);
  }
}

// Helper for CSV escaping
function csvEscape(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  // Convert to string and escape quotes
  let str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// Run the import
fastDbImport().catch(console.error);