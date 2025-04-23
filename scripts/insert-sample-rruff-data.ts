/**
 * Script to insert sample RRUFF data for testing
 */

import { db } from '../server/db';
import { rruffMinerals, rruffSpectra } from '../shared/rruff-schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Inserting sample RRUFF data for testing...');

  try {
    // Check if we already have data
    const result = await db.execute(sql`SELECT COUNT(*) FROM rruff_minerals`);
    const count = parseInt(result.rows[0]?.count as string || '0');
    
    if (count > 0) {
      console.log(`Database already has ${count} minerals. Skipping sample data insertion.`);
      return;
    }

    // Insert sample minerals
    const sampleMinerals = [
      {
        rruffId: 'R050031',
        imaStatus: 'approved',
        mineralName: 'Quartz',
        chemicalFormula: 'SiO₂',
        crystalSystem: 'trigonal',
        crystalClass: '32',
        spaceGroup: 'P3₁21 or P3₂21',
        unitCell: JSON.stringify({
          a: 4.9137,
          c: 5.4047,
          alpha: 90,
          beta: 90,
          gamma: 120
        }),
        color: 'Colorless, white, purple (amethyst), pink (rose quartz), brown, black',
        density: '2.65 g/cm³',
        hardness: '7',
        elementComposition: JSON.stringify(['Si', 'O']),
        yearFirstPublished: 1546,
        idealChemistry: 'SiO₂',
        comments: 'One of the most common minerals, occurs in many varieties.',
        url: 'https://rruff.info/Quartz',
        isActive: true
      },
      {
        rruffId: 'R040070',
        imaStatus: 'approved',
        mineralName: 'Calcite',
        chemicalFormula: 'CaCO₃',
        crystalSystem: 'trigonal',
        crystalClass: '32/m',
        spaceGroup: 'R3̄c',
        unitCell: JSON.stringify({
          a: 4.989,
          c: 17.062,
          alpha: 90,
          beta: 90,
          gamma: 120
        }),
        color: 'Colorless, white, yellow, orange, blue, pink, red, brown, green, black',
        density: '2.71 g/cm³',
        hardness: '3',
        elementComposition: JSON.stringify(['Ca', 'C', 'O']),
        yearFirstPublished: 1530,
        idealChemistry: 'CaCO₃',
        comments: 'Very common mineral, forms in many different environments.',
        url: 'https://rruff.info/Calcite',
        isActive: true
      },
      {
        rruffId: 'R070656',
        imaStatus: 'approved',
        mineralName: 'Diamond',
        chemicalFormula: 'C',
        crystalSystem: 'cubic',
        crystalClass: 'm3m',
        spaceGroup: 'Fd3̄m',
        unitCell: JSON.stringify({
          a: 3.5667,
          alpha: 90,
          beta: 90,
          gamma: 90
        }),
        color: 'Colorless, yellow, brown, blue, green, pink, red, black',
        density: '3.51 g/cm³',
        hardness: '10',
        elementComposition: JSON.stringify(['C']),
        yearFirstPublished: 1789,
        idealChemistry: 'C',
        comments: 'Hardest natural material, forms under high pressure.',
        url: 'https://rruff.info/Diamond',
        isActive: true
      },
      {
        rruffId: 'R060149',
        imaStatus: 'approved',
        mineralName: 'Pyrite',
        chemicalFormula: 'FeS₂',
        crystalSystem: 'cubic',
        crystalClass: 'm3̄',
        spaceGroup: 'Pa3̄',
        unitCell: JSON.stringify({
          a: 5.417,
          alpha: 90,
          beta: 90,
          gamma: 90
        }),
        color: 'Pale brass-yellow',
        density: '5.01 g/cm³',
        hardness: '6-6.5',
        elementComposition: JSON.stringify(['Fe', 'S']),
        yearFirstPublished: 1845,
        idealChemistry: 'FeS₂',
        comments: 'Often called "Fool\'s Gold" due to its metallic luster and pale brass-yellow color.',
        url: 'https://rruff.info/Pyrite',
        isActive: true
      },
      {
        rruffId: 'R040046',
        imaStatus: 'approved',
        mineralName: 'Corundum',
        chemicalFormula: 'Al₂O₃',
        crystalSystem: 'trigonal',
        crystalClass: '3̄m',
        spaceGroup: 'R3̄c',
        unitCell: JSON.stringify({
          a: 4.76,
          c: 12.982,
          alpha: 90,
          beta: 90,
          gamma: 120
        }),
        color: 'Colorless, red (ruby), blue (sapphire), yellow, green, purple',
        density: '3.98 g/cm³',
        hardness: '9',
        elementComposition: JSON.stringify(['Al', 'O']),
        yearFirstPublished: 1798,
        idealChemistry: 'Al₂O₃',
        comments: 'Forms the gem varieties ruby and sapphire.',
        url: 'https://rruff.info/Corundum',
        isActive: true
      }
    ];

    // Insert the mineral data
    const minerals = await db.insert(rruffMinerals)
      .values(sampleMinerals)
      .returning();
    
    console.log(`Inserted ${minerals.length} sample minerals.`);

    // Add sample spectra
    const sampleSpectra = [
      {
        mineralId: 1, // Quartz
        spectraType: 'Raman',
        sampleId: 'R050031',
        orientation: 'random',
        wavelength: '780 nm',
      },
      {
        mineralId: 1, // Quartz
        spectraType: 'XRD',
        sampleId: 'R050031-1',
      },
      {
        mineralId: 2, // Calcite
        spectraType: 'Raman',
        sampleId: 'R040070',
        orientation: 'random',
        wavelength: '780 nm',
      },
      {
        mineralId: 3, // Diamond
        spectraType: 'Raman',
        sampleId: 'R070656',
        orientation: 'random',
        wavelength: '532 nm',
      },
      {
        mineralId: 4, // Pyrite
        spectraType: 'Raman',
        sampleId: 'R060149',
        orientation: 'random',
        wavelength: '532 nm',
      }
    ];

    const spectra = await db.insert(rruffSpectra)
      .values(sampleSpectra)
      .returning();
    
    console.log(`Inserted ${spectra.length} sample spectra.`);

  } catch (error) {
    console.error('Error inserting sample data:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const pool = db.$client;
    if (pool && typeof pool.end === 'function') {
      pool.end().catch(console.error);
    }
  }
}

// Execute main function
main().catch(console.error);