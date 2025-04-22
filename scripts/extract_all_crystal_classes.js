/**
 * Script to extract ALL 32 crystal class values from the Mindat API
 * This performs a comprehensive scan of many minerals to capture
 * all possible crystal class IDs and their notations
 */

import fetch from 'node-fetch';

// Crystal systems (from crystallography) and their known class notations
const CRYSTAL_CLASS_NOTATIONS = {
  "Triclinic": [
    "1 - Pedial",
    "1̄ - Pinacoidal"
  ],
  "Monoclinic": [
    "2 - Sphenoidal",
    "m - Domatic",
    "2/m - Prismatic"
  ],
  "Orthorhombic": [
    "222 - Rhombic-Disphenoidal",
    "mm2 - Rhombic-Pyramidal",
    "mmm - Orthorhombic-Dipyramidal"
  ],
  "Tetragonal": [
    "4 - Tetragonal-Pyramidal",
    "4̄ - Tetragonal-Disphenoidal",
    "4/m - Tetragonal-Dipyramidal",
    "422 - Tetragonal-Trapezohedral",
    "4mm - Ditetragonal-Pyramidal",
    "4̄2m - Tetragonal-Scalenohedral",
    "4/mmm - Ditetragonal-Dipyramidal"
  ],
  "Trigonal": [
    "3 - Trigonal-Pyramidal",
    "3̄ - Rhombohedral",
    "32 - Trigonal-Trapezohedral",
    "3m - Ditrigonal-Pyramidal",
    "3̄m - Rhombohedral"
  ],
  "Hexagonal": [
    "6 - Hexagonal-Pyramidal",
    "6̄ - Trigonal-Dipyramidal",
    "6/m - Hexagonal-Dipyramidal",
    "622 - Hexagonal-Trapezohedral",
    "6mm - Dihexagonal-Pyramidal",
    "6̄m2 - Ditrigonal-Dipyramidal",
    "6/mmm - Dihexagonal-Dipyramidal"
  ],
  "Isometric": [
    "23 - Tetrahedral",
    "m3̄ - Dyakisdodecahedral",
    "432 - Gyroidal",
    "4̄3m - Hextetrahedral",
    "m3̄m - Hexoctahedral"
  ]
};

// Known minerals for each crystal class notation
// This list helps us find examples of each crystal class
// Focused to only include the most representative minerals for each class
const KNOWN_MINERALS_WITH_CLASSES = [
  // Triclinic system
  { name: "Kyanite", expectedClass: "1̄ - Pinacoidal", expectedSystem: "Triclinic" },
  
  // Monoclinic system
  { name: "Gypsum", expectedClass: "2/m - Prismatic", expectedSystem: "Monoclinic" },
  
  // Orthorhombic system
  { name: "Topaz", expectedClass: "mmm - Orthorhombic-Dipyramidal", expectedSystem: "Orthorhombic" },
  { name: "Enargite", expectedClass: "mm2 - Rhombic-Pyramidal", expectedSystem: "Orthorhombic" },
  
  // Tetragonal system
  { name: "Zircon", expectedClass: "4/mmm - Ditetragonal-Dipyramidal", expectedSystem: "Tetragonal" },
  { name: "Wulfenite", expectedClass: "4/m - Tetragonal-Dipyramidal", expectedSystem: "Tetragonal" },
  { name: "Chalcopyrite", expectedClass: "4̄2m - Tetragonal-Scalenohedral", expectedSystem: "Tetragonal" },
  
  // Hexagonal system
  { name: "Beryl", expectedClass: "6/mmm - Dihexagonal-Dipyramidal", expectedSystem: "Hexagonal" },
  { name: "Vanadinite", expectedClass: "6/m - Hexagonal-Dipyramidal", expectedSystem: "Hexagonal" },
  { name: "Nepheline", expectedClass: "6 - Hexagonal-Pyramidal", expectedSystem: "Hexagonal" },
  
  // Trigonal system
  { name: "Quartz", expectedClass: "32 - Trigonal-Trapezohedral", expectedSystem: "Trigonal" },
  { name: "Calcite", expectedClass: "3̄m - Rhombohedral", expectedSystem: "Trigonal" },
  { name: "Ilmenite", expectedClass: "3̄ - Rhombohedral", expectedSystem: "Trigonal" },
  { name: "Tourmaline", expectedClass: "3m - Ditrigonal-Pyramidal", expectedSystem: "Trigonal" },
  { name: "Pyrargyrite", expectedClass: "3 - Trigonal-Pyramidal", expectedSystem: "Trigonal" },
  
  // Isometric/Cubic system
  { name: "Pyrite", expectedClass: "m3̄ - Dyakisdodecahedral", expectedSystem: "Isometric" },
  { name: "Sphalerite", expectedClass: "4̄3m - Hextetrahedral", expectedSystem: "Isometric" },
  { name: "Fluorite", expectedClass: "m3̄m - Hexoctahedral", expectedSystem: "Isometric" },
  { name: "Galena", expectedClass: "m3̄m - Hexoctahedral", expectedSystem: "Isometric" },
  
  // Amorphous/Special cases
  { name: "Opal", expectedClass: "Amorphous", expectedSystem: "Amorphous" }
];

// Additional minerals to search to find missing crystal classes
// Focused list to target specific crystal classes
const ADDITIONAL_MINERALS = [
  "Azurite", "Malachite", "Bornite", "Stibnite", 
  "Cinnabar", "Cuprite", "Cassiterite", "Uraninite", 
  "Magnetite", "Chromite", "Hematite", "Spinel",
  "Diamond", "Halite"
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
 * Search for a mineral by name
 */
async function searchMineral(name) {
  console.log(`Searching for mineral: ${name}`);
  
  const searchResponse = await fetchFromAPI('/geomaterials/', { 
    name: name,
    limit: 5 
  });
  
  if (!searchResponse || !searchResponse.data || !searchResponse.data.results) {
    console.error(`Failed to search for ${name}`);
    return null;
  }
  
  // Find the best match by name
  const results = searchResponse.data.results;
  let matchedMineral = null;
  
  for (const result of results) {
    if (result.name && result.name.toLowerCase() === name.toLowerCase()) {
      matchedMineral = result;
      break;
    }
  }
  
  // If no exact match, use the first result
  if (!matchedMineral && results.length > 0) {
    matchedMineral = results[0];
  }
  
  if (!matchedMineral) {
    console.log(`No matches found for ${name}`);
    return null;
  }
  
  console.log(`Found ${matchedMineral.name} (ID: ${matchedMineral.id})`);
  return matchedMineral;
}

/**
 * Get detailed mineral information
 */
async function getMineralDetails(id) {
  const detailsResponse = await fetchFromAPI(`/geomaterials/${id}/`);
  if (!detailsResponse || !detailsResponse.data) {
    console.error(`Failed to get details for mineral ID ${id}`);
    return null;
  }
  
  return detailsResponse.data;
}

/**
 * Main function to collect comprehensive crystal class data
 */
async function collectAllCrystalClassData() {
  console.log('Collecting ALL crystal class data from the Mindat API...');
  
  // Map to store all discovered crystal classes
  const crystalClassMap = new Map();
  
  // Step 1: Process known minerals with expected crystal classes
  for (const mineral of KNOWN_MINERALS_WITH_CLASSES) {
    try {
      const foundMineral = await searchMineral(mineral.name);
      if (!foundMineral) continue;
      
      // Get detailed information
      const details = await getMineralDetails(foundMineral.id);
      if (!details) continue;
      
      // Extract crystal class information
      const cclass = details.cclass;
      const csystem = details.csystem || mineral.expectedSystem;
      
      if (cclass !== undefined && cclass !== null) {
        console.log(`${mineral.name} has cclass ${cclass} and system ${csystem}`);
        console.log(`Expected class: ${mineral.expectedClass}`);
        
        // Add to our map
        crystalClassMap.set(cclass, {
          system: csystem,
          class: mineral.expectedClass,
          example: mineral.name
        });
      }
    } catch (error) {
      console.error(`Error processing ${mineral.name}:`, error.message);
    }
  }
  
  // Step 2: Search additional minerals to find any missing crystal classes
  for (const mineralName of ADDITIONAL_MINERALS) {
    try {
      const foundMineral = await searchMineral(mineralName);
      if (!foundMineral) continue;
      
      // Get detailed information
      const details = await getMineralDetails(foundMineral.id);
      if (!details) continue;
      
      // Extract crystal class information
      const cclass = details.cclass;
      const csystem = details.csystem;
      
      if (cclass !== undefined && cclass !== null && !crystalClassMap.has(cclass)) {
        console.log(`Found new crystal class: ${mineralName} has cclass ${cclass} and system ${csystem}`);
        
        // Try to guess the class notation based on the crystal system
        let classNotation = "Unknown";
        if (csystem && CRYSTAL_CLASS_NOTATIONS[csystem]) {
          // Just use the first notation for the system as a placeholder
          classNotation = CRYSTAL_CLASS_NOTATIONS[csystem][0] + " (Estimated)";
        }
        
        // Add to our map
        crystalClassMap.set(cclass, {
          system: csystem || "Unknown",
          class: classNotation,
          example: mineralName
        });
      }
    } catch (error) {
      console.error(`Error processing additional mineral ${mineralName}:`, error.message);
    }
  }
  
  // Step 3: Output the comprehensive crystal class mapping
  console.log('\nCOMPREHENSIVE CRYSTAL CLASS MAPPING FROM MINDAT API:');
  console.log('===================================================');
  
  // Sort by crystal class ID for easier reading
  const sortedEntries = Array.from(crystalClassMap.entries()).sort((a, b) => a[0] - b[0]);
  
  for (const [cclass, info] of sortedEntries) {
    console.log(`cclass ${cclass}: ${info.class} (${info.system})`);
    console.log(`  Example: ${info.example}`);
  }
  
  // Generate the TypeScript code
  console.log('\nTYPESCRIPT CODE FOR COMPREHENSIVE CRYSTAL CLASS LOOKUP:');
  console.log('=====================================================');
  
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
  
  for (const [cclass, info] of sortedEntries) {
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
  
  // Also create a mapping table for documentation
  console.log('\nCRYSTAL CLASS MAPPING TABLE (FOR DOCUMENTATION):');
  console.log('=============================================');
  console.log('| cclass | Crystal System | Crystal Class | Example Mineral |');
  console.log('|--------|---------------|--------------|----------------|');
  
  for (const [cclass, info] of sortedEntries) {
    console.log(`| ${cclass} | ${info.system} | ${info.class} | ${info.example} |`);
  }
}

// Run the function
collectAllCrystalClassData();