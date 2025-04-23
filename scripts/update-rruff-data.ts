/**
 * Script to update RRUFF data in the database
 * This script can be run via a cronjob to automatically update the data monthly
 * 
 * Example crontab entry to run on the 1st day of each month at 2 AM:
 * 0 2 1 * * cd /path/to/project && /usr/bin/env node -r tsx scripts/update-rruff-data.ts >> logs/rruff-update.log 2>&1
 */

import { rruffExtractor } from '../server/services/rruff-extractor';

async function main() {
  console.log(`Starting RRUFF data update at ${new Date().toISOString()}`);
  
  try {
    const result = await rruffExtractor.extractAndStoreAllMinerals();
    
    console.log(`
RRUFF data update completed successfully:
- Minerals processed: ${result.mineralsCount}
- Spectra processed: ${result.spectraCount}
- Total errors: ${result.errors.length}
`);

    if (result.errors.length > 0) {
      console.log('Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  } catch (error) {
    console.error('RRUFF data update failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly (not imported)
if (require.main === module) {
  main()
    .then(() => {
      console.log('RRUFF update script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error in RRUFF update script:', error);
      process.exit(1);
    });
}