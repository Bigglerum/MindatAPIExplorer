/**
 * Script to extract detailed crystal class information
 * to map cclass values to their actual crystal class notation (not just the system)
 */

import fetch from 'node-fetch';

// Define a set of minerals with known crystal class notations
const KNOWN_MINERALS_WITH_CLASSES = [
  // Monoclinic minerals with different crystal classes
  { name: "Liroconite", expectedClass: "2/m - Prismatic", expectedSystem: "Monoclinic" },
  { name: "Gypsum", expectedClass: "2/m - Prismatic", expectedSystem: "Monoclinic" },
  { name: "Clinozoisite", expectedClass: "2/m - Prismatic", expectedSystem: "Monoclinic" },
  
  // Triclinic minerals
  { name: "Kyanite", expectedClass: "1̄ - Pinacoidal", expectedSystem: "Triclinic" },
  { name: "Plagioclase", expectedClass: "1̄ - Pinacoidal", expectedSystem: "Triclinic" },
  
  // Orthorhombic minerals
  { name: "Topaz", expectedClass: "mmm - Orthorhombic-Dipyramidal", expectedSystem: "Orthorhombic" },
  { name: "Andalusite", expectedClass: "mmm - Orthorhombic-Dipyramidal", expectedSystem: "Orthorhombic" },
  
  // Tetragonal minerals
  { name: "Zircon", expectedClass: "4/mmm - Ditetragonal-Dipyramidal", expectedSystem: "Tetragonal" },
  { name: "Rutile", expectedClass: "4/mmm - Ditetragonal-Dipyramidal", expectedSystem: "Tetragonal" },
  
  // Hexagonal minerals
  { name: "Beryl", expectedClass: "6/mmm - Dihexagonal-Dipyramidal", expectedSystem: "Hexagonal" },
  { name: "Apatite", expectedClass: "6/m - Hexagonal-Dipyramidal", expectedSystem: "Hexagonal" },
  
  // Trigonal minerals
  { name: "Quartz", expectedClass: "32 - Trigonal-Trapezohedral", expectedSystem: "Trigonal" },
  { name: "Calcite", expectedClass: "3̄m - Rhombohedral", expectedSystem: "Trigonal" },
  { name: "Corundum", expectedClass: "3̄m - Rhombohedral", expectedSystem: "Trigonal" },
  
  // Cubic/Isometric minerals
  { name: "Pyrite", expectedClass: "m3̄ - Dyakisdodecahedral", expectedSystem: "Isometric" },
  { name: "Fluorite", expectedClass: "m3̄m - Hexoctahedral", expectedSystem: "Isometric" },
  { name: "Halite", expectedClass: "m3̄m - Hexoctahedral", expectedSystem: "Isometric" },
  { name: "Diamond", expectedClass: "m3̄m - Hexoctahedral", expectedSystem: "Isometric" },
  
  // Amorphous/special cases
  { name: "Opal", expectedClass: "Amorphous", expectedSystem: "Amorphous" }
];

/**
 * Uses our app's proxy API to query the Mindat API
 */
async function fetchFromAPI(path, parameters = {}) {
  try {
    const response = await fetch('http://localhost:5000/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path,
        method: 'GET',
        parameters
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from API (${path}):`, error.message);
    return null;
  }
}

/**
 * Main function to collect detailed crystal class data
 */
async function collectDetailedCrystalClassData() {
  console.log('Collecting detailed crystal class data...');
  
  const mineralData = [];
  const detailedMapping = new Map();
  
  for (const mineral of KNOWN_MINERALS_WITH_CLASSES) {
    console.log(`\nFetching data for ${mineral.name}...`);
    
    try {
      // Search for the mineral by name
      const searchResponse = await fetchFromAPI('/geomaterials/', { 
        name: mineral.name,
        limit: 5 
      });
      
      if (!searchResponse || !searchResponse.data || !searchResponse.data.results) {
        console.error(`Failed to search for ${mineral.name}`);
        continue;
      }
      
      // Find the best match by name
      const results = searchResponse.data.results;
      let matchedMineral = null;
      
      for (const result of results) {
        if (result.name && result.name.toLowerCase() === mineral.name.toLowerCase()) {
          matchedMineral = result;
          break;
        }
      }
      
      // If no exact match, use the first result
      if (!matchedMineral && results.length > 0) {
        matchedMineral = results[0];
      }
      
      if (!matchedMineral) {
        console.log(`No matches found for ${mineral.name}`);
        continue;
      }
      
      console.log(`Found ${matchedMineral.name} (ID: ${matchedMineral.id})`);
      
      // Try to get more detailed data including the crystal description
      const detailsResponse = await fetchFromAPI(`/geomaterials/${matchedMineral.id}/`);
      let commentCrystal = '';
      
      if (detailsResponse && detailsResponse.data) {
        commentCrystal = detailsResponse.data.commentcrystal || '';
      }
      
      // Extract the crystal class information
      const mineralInfo = {
        name: matchedMineral.name,
        id: matchedMineral.id,
        cclass: matchedMineral.cclass,
        csystem: matchedMineral.csystem,
        expectedSystem: mineral.expectedSystem,
        expectedClass: mineral.expectedClass,
        commentCrystal: commentCrystal
      };
      
      mineralData.push(mineralInfo);
      
      console.log(`  cclass: ${mineralInfo.cclass}`);
      console.log(`  csystem: ${mineralInfo.csystem || 'Not provided'}`);
      console.log(`  Expected System: ${mineralInfo.expectedSystem}`);
      console.log(`  Expected Class: ${mineralInfo.expectedClass}`);
      console.log(`  Crystal Comment: ${mineralInfo.commentCrystal}`);
      
      // Add to our detailed mapping
      if (mineralInfo.cclass !== undefined && mineralInfo.cclass !== null) {
        detailedMapping.set(mineralInfo.cclass, {
          system: mineralInfo.csystem || mineralInfo.expectedSystem,
          class: mineralInfo.expectedClass,
          example: mineralInfo.name
        });
      }
      
    } catch (error) {
      console.error(`Error processing ${mineral.name}:`, error.message);
    }
  }
  
  // Output the detailed crystal class mapping
  console.log('\nDETAILED CRYSTAL CLASS MAPPING:');
  console.log('==============================');
  
  for (const [cclass, info] of detailedMapping.entries()) {
    console.log(`cclass ${cclass}: ${info.class} (${info.system})`);
    console.log(`  Example: ${info.example}`);
  }
  
  // Generate the TypeScript code for the detailed mapping
  console.log('\nTYPESCRIPT CODE FOR CRYSTAL CLASS LOOKUP:');
  console.log('=======================================');
  
  let tsCode = `
/**
 * Maps crystal class IDs (cclass) to their corresponding detailed crystal class information
 * This mapping was derived directly from the Mindat API by querying minerals
 * and correlating their cclass values with known crystal classes
 */
export interface CrystalClassInfo {
  /** The crystal system (e.g., "Monoclinic", "Isometric") */
  system: string;
  /** The detailed crystal class notation (e.g., "2/m - Prismatic") */
  class: string;
  /** Example mineral with this crystal class */
  example: string;
}

export const CRYSTAL_CLASS_LOOKUP: Record<number, CrystalClassInfo> = {`;
  
  for (const [cclass, info] of detailedMapping.entries()) {
    tsCode += `
  ${cclass}: {
    system: "${info.system}",
    class: "${info.class}",
    example: "${info.example}"
  },`;
  }
  
  tsCode += `
};

/**
 * Convert a crystal class ID to human-readable crystal system and class information
 * @param classId The numeric crystal class ID from the Mindat API
 * @returns Detailed information about the crystal class
 */
export function getCrystalClassInfo(classId: number | null | undefined): CrystalClassInfo {
  if (classId === null || classId === undefined || !CRYSTAL_CLASS_LOOKUP[classId]) {
    return {
      system: "Unknown",
      class: "Unknown",
      example: ""
    };
  }
  
  return CRYSTAL_CLASS_LOOKUP[classId];
}

/**
 * Get just the crystal system name from a crystal class ID
 * @param classId The numeric crystal class ID
 * @returns The crystal system name (e.g., "Monoclinic", "Isometric")
 */
export function getCrystalSystemName(classId: number | null | undefined): string {
  return getCrystalClassInfo(classId).system;
}

/**
 * Get just the crystal class notation from a crystal class ID
 * @param classId The numeric crystal class ID
 * @returns The crystal class notation (e.g., "2/m - Prismatic")
 */
export function getCrystalClassName(classId: number | null | undefined): string {
  return getCrystalClassInfo(classId).class;
}`;
  
  console.log(tsCode);
}

// Run the function
collectDetailedCrystalClassData();