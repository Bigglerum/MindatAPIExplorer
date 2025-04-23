/**
 * Script to update RRUFF data in the database
 * This script can be run via a cronjob to automatically update the data monthly
 * 
 * Example crontab entry to run on the 1st day of each month at 2 AM:
 * 0 2 1 * * cd /path/to/project && /usr/bin/env node -r tsx scripts/update-rruff-data.ts >> logs/rruff-update.log 2>&1
 */

import { downloadAndImportImaMinerals } from './fetch-ima-minerals';
import { db } from '../server/db';
import { rruffMinerals, rruffDataImportLogs } from '../shared/rruff-schema';
import { eq, sql, desc, and, count } from 'drizzle-orm';

// Formats a date as YYYY-MM-DD HH:MM:SS
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  console.log(`=== RRUFF IMA Minerals Update Started at ${formatDate(new Date())} ===`);
  const startTime = new Date();
  
  try {
    // Step 1: Get current minerals count for comparison later
    const [currentCount] = await db.select({ count: count() }).from(rruffMinerals);
    console.log(`Current minerals count: ${currentCount.count}`);
    
    // Step 2: Get a snapshot of existing minerals for change tracking
    const existingMinerals = await db.select({
      id: rruffMinerals.id,
      rruffId: rruffMinerals.rruffId,
      mineralName: rruffMinerals.mineralName,
      chemicalFormula: rruffMinerals.chemicalFormula
    }).from(rruffMinerals);
    
    console.log(`Fetched ${existingMinerals.length} existing minerals for change tracking`);
    const existingMineralMap = new Map(existingMinerals.map(m => [m.rruffId, m]));
    
    // Step 3: Run the import process
    console.log('Starting download and import of new IMA minerals data...');
    const result = await downloadAndImportImaMinerals();
    
    // Step 4: Get updated count
    const [updatedCount] = await db.select({ count: count() }).from(rruffMinerals);
    
    // Step 5: Calculate changes
    const added = updatedCount.count - currentCount.count;
    
    // Get list of new minerals for reporting
    const newMinerals = await db.select({
      id: rruffMinerals.id,
      rruffId: rruffMinerals.rruffId,
      mineralName: rruffMinerals.mineralName,
      chemicalFormula: rruffMinerals.chemicalFormula
    })
    .from(rruffMinerals)
    .where(
      sql`${rruffMinerals.id} NOT IN (${existingMinerals.map(m => m.id).join(', ')})`
    );
    
    console.log(`=== RRUFF IMA Minerals Update Completed at ${formatDate(new Date())} ===`);
    console.log(`Total minerals in database: ${updatedCount.count}`);
    console.log(`New minerals added: ${added}`);
    console.log(`Updated minerals: ${result.mineralsCount - added}`);
    console.log(`Update took ${Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)} seconds`);
    
    if (newMinerals.length > 0) {
      console.log(`\nNew minerals added:`);
      newMinerals.forEach((mineral, index) => {
        console.log(`${index + 1}. ${mineral.mineralName} (${mineral.chemicalFormula || 'No formula'})`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log(`\nEncountered ${result.errors.length} errors during update:`);
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
  } catch (error: any) {
    console.error(`=== RRUFF IMA Minerals Update Failed at ${formatDate(new Date())} ===`);
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