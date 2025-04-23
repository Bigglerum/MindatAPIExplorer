/**
 * Script to run the RRUFF data import process
 * This will download and import real data from the RRUFF database
 */

import { rruffCsvImporter } from '../server/services/rruff-csv-importer';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting RRUFF data import process...');
  
  // Create tmp directory if it doesn't exist
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    console.log('Creating tmp directory for downloads...');
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  try {
    // Run the data import
    const result = await rruffCsvImporter.downloadAndImportData();
    
    // Log results
    console.log('RRUFF data import completed successfully!');
    console.log(`Imported ${result.mineralsCount} minerals and ${result.spectraCount} spectra.`);
    
    if (result.errors.length > 0) {
      console.log(`Encountered ${result.errors.length} errors during import:`);
      result.errors.forEach(err => console.log(`- ${err}`));
    }
    
    console.log('Start time:', result.startTime);
    console.log('End time:', result.endTime);
    console.log('Duration:', (result.endTime.getTime() - result.startTime.getTime()) / 1000, 'seconds');
    
  } catch (error) {
    console.error('Error running RRUFF data import:', error);
    process.exit(1);
  }
}

// Execute main function
main().catch(console.error);