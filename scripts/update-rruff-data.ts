/**
 * Script to update RRUFF data in the database
 * This script can be run via a cronjob to automatically update the data monthly
 * 
 * Example crontab entry to run on the 1st day of each month at 2 AM:
 * 0 2 1 * * cd /path/to/project && /usr/bin/env node -r tsx scripts/update-rruff-data.ts >> logs/rruff-update.log 2>&1
 */

import { rruffCsvImporter } from '../server/services/rruff-csv-importer';
import { db } from '../server/db';

// Formats a date as YYYY-MM-DD HH:MM:SS
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  console.log(`=== RRUFF Data Update Started at ${formatDate(new Date())} ===`);
  
  try {
    // Run the CSV import process
    const result = await rruffCsvImporter.downloadAndImportData();
    
    console.log(`=== RRUFF Data Update Completed at ${formatDate(new Date())} ===`);
    console.log(`Imported/updated ${result.mineralsCount} minerals`);
    console.log(`Imported/updated ${result.spectraCount} spectra`);
    console.log(`Import took ${Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)} seconds`);
    
    if (result.errors.length > 0) {
      console.log(`Encountered ${result.errors.length} errors during update:`);
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
  } catch (error: any) {
    console.error(`=== RRUFF Data Update Failed at ${formatDate(new Date())} ===`);
    console.error('Error:', error.message || 'Unknown error');
    process.exit(1);
  } finally {
    // Close the database connection
    const pool = db.$client;
    if (pool && typeof pool.end === 'function') {
      await pool.end().catch(console.error);
    }
  }
}

// Execute the main function
main().catch(console.error);