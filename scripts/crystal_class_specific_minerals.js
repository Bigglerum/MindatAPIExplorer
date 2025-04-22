/**
 * Script to extract crystal class data from specific well-known minerals
 * with clearly defined crystal systems
 */

import fetch from 'node-fetch';

// Map of known minerals and their crystal systems
const KNOWN_MINERALS = [
  { name: 'Quartz', expectedSystem: 'Trigonal' },       // class 7
  { name: 'Calcite', expectedSystem: 'Trigonal' },      // class 7
  { name: 'Fluorite', expectedSystem: 'Cubic' },        // class 1 (Isometric/Cubic)
  { name: 'Halite', expectedSystem: 'Cubic' },          // class 1 (Isometric/Cubic)
  { name: 'Pyrite', expectedSystem: 'Cubic' },          // class 1 (Isometric/Cubic)
  { name: 'Beryl', expectedSystem: 'Hexagonal' },       // class 2
  { name: 'Apatite', expectedSystem: 'Hexagonal' },     // class 2
  { name: 'Zircon', expectedSystem: 'Tetragonal' },     // class 3
  { name: 'Rutile', expectedSystem: 'Tetragonal' },     // class 3
  { name: 'Topaz', expectedSystem: 'Orthorhombic' },    // class 4
  { name: 'Olivine', expectedSystem: 'Orthorhombic' },  // class 4
  { name: 'Gypsum', expectedSystem: 'Monoclinic' },     // class 5
  { name: 'Orthoclase', expectedSystem: 'Monoclinic' }, // class 5
  { name: 'Plagioclase', expectedSystem: 'Triclinic' }, // class 6
  { name: 'Kyanite', expectedSystem: 'Triclinic' },     // class 6
  { name: 'Opal', expectedSystem: 'Amorphous' }         // class 8
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
 * Main function to collect crystal class data from specific minerals
 */
async function collectSpecificMineralData() {
  console.log('Collecting crystal class data from specific minerals...');
  
  const mineralData = [];
  
  for (const mineral of KNOWN_MINERALS) {
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
      
      // Extract the crystal class information
      mineralData.push({
        name: matchedMineral.name,
        id: matchedMineral.id,
        cclass: matchedMineral.cclass,
        expectedSystem: mineral.expectedSystem,
        crystal_system: matchedMineral.crystal_system || 'Unknown'
      });
      
      console.log(`  Crystal Class ID: ${matchedMineral.cclass}`);
      console.log(`  Expected System: ${mineral.expectedSystem}`);
      console.log(`  API Crystal System: ${matchedMineral.crystal_system || 'Not provided'}`);
      
    } catch (error) {
      console.error(`Error processing ${mineral.name}:`, error.message);
    }
  }
  
  // Group by crystal class ID
  const crystalClasses = new Map();
  
  for (const mineral of mineralData) {
    if (mineral.cclass !== undefined && mineral.cclass !== null) {
      if (!crystalClasses.has(mineral.cclass)) {
        crystalClasses.set(mineral.cclass, {
          minerals: [],
          expectedSystem: null
        });
      }
      
      crystalClasses.get(mineral.cclass).minerals.push({
        name: mineral.name,
        expectedSystem: mineral.expectedSystem
      });
      
      // Set the expected system if not already set
      if (!crystalClasses.get(mineral.cclass).expectedSystem) {
        crystalClasses.get(mineral.cclass).expectedSystem = mineral.expectedSystem;
      }
    }
  }
  
  // Output the results
  console.log('\nCRYSTAL CLASS MAPPING FROM SPECIFIC MINERALS:');
  console.log('==========================================');
  
  for (const [classId, data] of crystalClasses.entries()) {
    console.log(`Class ID ${classId}: ${data.expectedSystem}`);
    console.log(`  Minerals: ${data.minerals.map(m => m.name).join(', ')}`);
  }
  
  // Generate the crystal class lookup from this data
  console.log('\nGENERATED CRYSTAL CLASS LOOKUP:');
  console.log('=============================');
  
  console.log('// JavaScript/TypeScript:');
  let jsCode = 'export const CRYSTAL_CLASS_LOOKUP: Record<number, string> = {\n';
  
  for (const [classId, data] of crystalClasses.entries()) {
    jsCode += `  ${classId}: "${data.expectedSystem}", // Examples: ${data.minerals.map(m => m.name).join(', ')}\n`;
  }
  
  jsCode += '};\n';
  console.log(jsCode);
  
  console.log('\n# Python:');
  let pyCode = 'CRYSTAL_CLASS_LOOKUP = {\n';
  
  for (const [classId, data] of crystalClasses.entries()) {
    pyCode += `    ${classId}: "${data.expectedSystem}", # Examples: ${data.minerals.map(m => m.name).join(', ')}\n`;
  }
  
  pyCode += '}\n';
  console.log(pyCode);
}

// Run the function
collectSpecificMineralData();