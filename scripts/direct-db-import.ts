/**
 * Direct import of all CSV data with minimal processing
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// Path to the CSV file
const MINERALS_CSV_PATH = '/home/runner/workspace/attached_assets/RRUFF_Export_20250423_072811.csv';

async function directImport() {
  console.log('Starting direct import of all minerals...');
  console.log(`Reading from ${MINERALS_CSV_PATH}`);
  
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
    
    // Format the CSV
    const output = [];
    const parser = parse(fileContent, {
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    // Collect the data
    for await (const record of parser) {
      output.push(record);
    }
    
    console.log(`Successfully parsed ${output.length} records`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.execute(sql`TRUNCATE TABLE rruff_minerals CASCADE`);
    
    // Direct insert into database
    for (let i = 0; i < output.length; i++) {
      const record = output[i];
      
      // Only log every 500 records
      if (i % 500 === 0 || i === output.length - 1) {
        console.log(`Processing ${i+1}/${output.length}`);
      }
      
      // Extract basic fields without complex processing
      const mineralName = record["Mineral Name"] || '';
      const chemicalFormula = record["IMA Chemistry (plain)"] || record["RRUFF Chemistry (plain)"] || '';
      const crystalSystem = record["Crystal Systems"] ? record["Crystal Systems"].split('|')[0].trim() : '';
      const imaStatus = (record["IMA Status"] || '').substring(0, 45);
      const rruffId = record["RRUFF IDs"] ? record["RRUFF IDs"].split(/\s+/)[0] : `GEN-${i}`;
      const spaceGroup = record["Space Groups"] ? record["Space Groups"].split('|')[0].trim() : '';
      const yearStr = record["Year First Published"] || '';
      const yearMatch = yearStr.match(/\d{4}/);
      const yearPublished = yearMatch ? parseInt(yearMatch[0], 10) : null;
      const comments = record["Status Notes"] || '';
      const url = rruffId ? `https://rruff.info/ima/${rruffId}` : '';
      
      // Simple element extraction
      const elements = {};
      if (record["Chemistry Elements"]) {
        record["Chemistry Elements"].split(' ').forEach(el => {
          if (el.trim()) elements[el.trim()] = 1;
        });
      }
      
      // Direct insert with minimal fields
      try {
        await db.execute(sql`
          INSERT INTO rruff_minerals (
            mineral_name, chemical_formula, crystal_system, ima_status,
            rruff_id, space_group, year_first_published, comments, url,
            element_composition, is_active
          ) VALUES (
            ${mineralName}, ${chemicalFormula}, ${crystalSystem}, ${imaStatus},
            ${rruffId}, ${spaceGroup}, ${yearPublished}, ${comments}, ${url},
            ${JSON.stringify(elements)}, true
          )
        `);
      } catch (error) {
        console.error(`Error inserting ${mineralName}: ${error.message}`);
      }
    }
    
    console.log('Direct import completed successfully');
    const count = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
    console.log(`Total minerals in database: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
  }
}

directImport().catch(console.error);