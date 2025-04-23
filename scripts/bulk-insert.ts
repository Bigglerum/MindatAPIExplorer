/**
 * Ultra-fast bulk CSV import script
 * Uses direct CSV parsing and SQL batch insertion for maximum performance
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import { Pool } from '@neondatabase/serverless';
import { updateImportProgress } from '../server/routes/rruff-routes';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function bulkInsert() {
  console.log('Starting ultra-fast bulk import of all minerals...');
  console.time('Total import time');
  
  try {
    // Get direct DB connection for faster operations
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    // Verify the CSV file exists
    if (!fs.existsSync(MINERALS_CSV_PATH)) {
      throw new Error(`CSV file not found at path: ${MINERALS_CSV_PATH}`);
    }
    
    // Read and parse the CSV file directly
    const fileContent = fs.readFileSync(MINERALS_CSV_PATH, 'utf8');
    console.log(`CSV file loaded: ${fileContent.length} bytes`);
    
    // Initialize progress tracking
    updateImportProgress(0, true);
    
    try {
      // Clear existing data
      await client.query('TRUNCATE TABLE rruff_minerals CASCADE');
      console.log('Cleared existing data');
      
      // Parse CSV directly to an array
      console.time('CSV parse time');
      const records = await new Promise<any[]>((resolve, reject) => {
        parse(fileContent, {
          delimiter: ',',
          columns: true,
          skip_empty_lines: true,
          relax_quotes: true,
          trim: true
        }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
      console.timeEnd('CSV parse time');
      console.log(`Parsed ${records.length} minerals`);
      
      // Prepare batch insertion
      console.time('Data preparation time');
      const BATCH_SIZE = 500; // Insert 500 records at a time
      const TOTAL_MINERALS = records.length;
      const batches = Math.ceil(TOTAL_MINERALS / BATCH_SIZE);
      
      console.log(`Will perform ${batches} batch insertions of ${BATCH_SIZE} records each`);
      
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, TOTAL_MINERALS);
        const batchRecords = records.slice(startIdx, endIdx);
        
        console.log(`Processing batch ${batchIndex + 1}/${batches} - records ${startIdx + 1} to ${endIdx}`);
        
        // Prepare value placeholders and parameters
        let values = [];
        let placeholders = [];
        let index = 1; // SQL parameters start at $1
        
        for (const record of batchRecords) {
          // Extract fields with proper error handling
          const mineralName = record["Mineral Name"] || '';
          const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
          const crystalSystem = record["Crystal Systems"] ? String(record["Crystal Systems"]).split('|')[0].trim() : '';
          const crystalClass = record["Crystal Classes"] ? String(record["Crystal Classes"]).split('|')[0].trim() : '';
          const spaceGroup = record["Space Groups"] ? String(record["Space Groups"]).split('|')[0].trim() : '';
          const rruffId = record["RRUFF IDs"] ? String(record["RRUFF IDs"]).split(/\s+/)[0].trim() : null;
          const color = record["Colors"] || null;
          const density = record["Density"] || null;
          const hardness = record["Hardness"] || null;
          const imaStatus = record["IMA Status"] || null;
          const yearFirstPublished = record["Year"] ? parseInt(record["Year"], 10) || null : null;
          
          // Simple element extraction
          const elementComposition = {};
          if (record["Chemistry Elements"]) {
            String(record["Chemistry Elements"]).split(' ').forEach(el => {
              if (el.trim()) elementComposition[el.trim()] = 1;
            });
          }
          
          // Create placeholders for this record
          placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`);
          
          // Add values in the same order
          values.push(
            mineralName,
            chemicalFormula,
            crystalSystem,
            crystalClass,
            spaceGroup,
            rruffId,
            color,
            density,
            hardness,
            imaStatus,
            yearFirstPublished,
            JSON.stringify(elementComposition),
            true // isActive
          );
        }
        
        console.timeEnd('Data preparation time');
        
        // Build the SQL query
        const insertQuery = `
          INSERT INTO rruff_minerals(
            mineral_name, chemical_formula, crystal_system, crystal_class, 
            space_group, rruff_id, color, density, hardness, ima_status, 
            year_first_published, element_composition, is_active
          )
          VALUES ${placeholders.join(',')}
        `;
        
        // Execute the bulk insert
        console.time(`Batch ${batchIndex + 1} insertion time`);
        await client.query(insertQuery, values);
        console.timeEnd(`Batch ${batchIndex + 1} insertion time`);
        
        // Update progress
        const processedCount = endIdx;
        updateImportProgress(processedCount);
        
        console.log(`Inserted ${processedCount}/${TOTAL_MINERALS} minerals (${Math.round(processedCount / TOTAL_MINERALS * 100)}%)`);
      }
      
      // Final count verification
      const countResult = await client.query('SELECT COUNT(*) FROM rruff_minerals');
      const finalCount = parseInt(countResult.rows[0].count);
      console.log(`Import complete! Database now contains ${finalCount} minerals.`);
      
      // Mark import as complete
      updateImportProgress(finalCount, false);
      
    } finally {
      client.release();
    }
    
    console.timeEnd('Total import time');
    
  } catch (error) {
    console.error('Bulk import failed:', error);
  }
}

// Run the import
bulkInsert().catch(console.error);