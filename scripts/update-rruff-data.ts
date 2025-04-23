/**
 * Script to update RRUFF data in the database
 * This script can be run via a cronjob to automatically update the data monthly
 * 
 * Example crontab entry to run on the 1st day of each month at 2 AM:
 * 0 2 1 * * cd /path/to/project && /usr/bin/env node -r tsx scripts/update-rruff-data.ts >> logs/rruff-update.log 2>&1
 */

import { rruffCsvImporter } from '../server/services/rruff-csv-importer';
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { rruffDataImportLogs } from '../shared/rruff-schema';
import { desc } from 'drizzle-orm';

async function main() {
  // Create logs directory if it doesn't exist
  const logsDir = path.resolve('./logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Log file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `rruff-update-${timestamp}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Helper function to log to file and console
  const log = (message: string) => {
    const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
    console.log(timestampedMessage);
    logStream.write(timestampedMessage + '\n');
  };

  try {
    log('Starting RRUFF data update process...');

    // Check when the last successful update was
    const [lastImport] = await db.select()
      .from(rruffDataImportLogs)
      .where(({ status }) => status.equals('completed'))
      .orderBy(desc(rruffDataImportLogs.endTime))
      .limit(1);

    if (lastImport) {
      const daysSinceLastUpdate = Math.floor(
        (Date.now() - new Date(lastImport.endTime!).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      log(`Last successful update was ${daysSinceLastUpdate} days ago on ${lastImport.endTime?.toISOString()}`);
      
      // Skip update if less than 28 days have passed (approximately a month)
      if (daysSinceLastUpdate < 28) {
        log(`Skipping update as it has been less than 28 days since the last update.`);
        logStream.end();
        return;
      }
    }

    log('Downloading and importing data from RRUFF...');
    
    // Download and import data
    const result = await rruffCsvImporter.downloadAndImportData();
    
    // Log results
    log(`Update completed with the following results:`);
    log(`- Minerals imported: ${result.mineralsCount}`);
    log(`- Spectra imported: ${result.spectraCount}`);
    
    if (result.errors.length > 0) {
      log(`- Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error, index) => {
        log(`  [${index + 1}] ${error}`);
      });
    } else {
      log('- No errors encountered.');
    }
    
    log('RRUFF data update process completed successfully.');
  } catch (error: any) {
    log(`ERROR: Update process failed with error: ${error.message}`);
    log(error.stack || 'No stack trace available');
  } finally {
    logStream.end();
  }
}

// Execute main function
main()
  .catch(error => {
    console.error('Unhandled error in main function:', error);
    process.exit(1);
  })
  .finally(() => {
    // Make sure to close any connections
    db.pool.end().catch(console.error);
  });