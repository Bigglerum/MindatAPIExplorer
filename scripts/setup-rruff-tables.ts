/**
 * Script to set up RRUFF database tables
 * Run this script to initialize the database schema for RRUFF data
 */

import { db } from '../server/db';
import { 
  rruffMinerals,
  rruffSpectra,
  rruffApiKeys,
  rruffDataImportLogs 
} from '../shared/rruff-schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

async function main() {
  console.log('Setting up RRUFF database tables...');

  try {
    // Check if tables already exist
    const tablesExist = await checkTablesExist();
    
    if (tablesExist) {
      console.log('RRUFF tables already exist. Skipping creation.');
      return;
    }

    // Create schema using SQL for better control
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rruff_minerals (
        id SERIAL PRIMARY KEY,
        rruff_id VARCHAR(50) UNIQUE,
        ima_status VARCHAR(50),
        mineral_name VARCHAR(255) NOT NULL,
        chemical_formula TEXT,
        crystal_system VARCHAR(50),
        crystal_class VARCHAR(100),
        space_group VARCHAR(50),
        unit_cell JSONB DEFAULT '{}',
        color TEXT,
        density VARCHAR(50),
        hardness VARCHAR(50),
        optical_properties JSONB DEFAULT '{}',
        element_composition JSONB DEFAULT '{}',
        year_first_published INTEGER,
        ideal_chemistry TEXT,
        comments TEXT,
        url TEXT,
        structure_refs JSONB DEFAULT '[]',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_version INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS rruff_spectra (
        id SERIAL PRIMARY KEY,
        mineral_id INTEGER NOT NULL REFERENCES rruff_minerals(id),
        spectra_type VARCHAR(50) NOT NULL,
        sample_id VARCHAR(100),
        orientation VARCHAR(50),
        wavelength VARCHAR(50),
        temperature VARCHAR(50),
        pressure VARCHAR(50),
        data_url TEXT,
        data_points JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rruff_api_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        last_used TIMESTAMP,
        usage_count INTEGER DEFAULT 0,
        rate_limit INTEGER DEFAULT 100
      );

      CREATE TABLE IF NOT EXISTS rruff_data_import_logs (
        id SERIAL PRIMARY KEY,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR(50) NOT NULL,
        minerals_imported INTEGER DEFAULT 0,
        spectra_imported INTEGER DEFAULT 0,
        errors JSONB DEFAULT '[]',
        details JSONB DEFAULT '{}'
      );

      -- Create indexes
      CREATE INDEX idx_rruff_minerals_name ON rruff_minerals(mineral_name);
      CREATE INDEX idx_rruff_minerals_system ON rruff_minerals(crystal_system);
      CREATE INDEX idx_rruff_spectra_mineral_id ON rruff_spectra(mineral_id);
      CREATE INDEX idx_rruff_spectra_type ON rruff_spectra(spectra_type);
    `);

    console.log('RRUFF tables created successfully!');

    // Create initial admin API key
    await createInitialApiKey();

  } catch (error: any) {
    console.error('Error setting up RRUFF tables:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    const pool = db.$client;
    if (pool && typeof pool.end === 'function') {
      pool.end().catch(console.error);
    }
  }
}

async function checkTablesExist(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rruff_minerals'
      );
    `);
    
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error('Error checking if tables exist:', error);
    return false;
  }
}

async function createInitialApiKey(): Promise<void> {
  try {
    // Check if we already have API keys
    const existingKeys = await db.select().from(rruffApiKeys).limit(1);
    
    if (existingKeys.length > 0) {
      console.log('API keys already exist. Skipping creation of initial key.');
      return;
    }
    
    // Generate a random API key
    const key = crypto.randomBytes(24).toString('hex');
    
    // Insert the initial admin API key
    const [apiKey] = await db.insert(rruffApiKeys)
      .values({
        name: 'Admin API Key',
        key: key,
        description: 'Initial API key for administrative access',
        isActive: true,
        rateLimit: 1000, // Higher rate limit for admin
      })
      .returning();
    
    console.log('Created initial admin API key:', apiKey.key);
    console.log('Please store this key securely as it will not be shown again.');
    
  } catch (error) {
    console.error('Error creating initial API key:', error);
  }
}

// Execute main function
main().catch(console.error);