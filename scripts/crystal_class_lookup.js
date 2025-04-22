/**
 * A script to generate a crystal class lookup by using our existing mindat-api.js file
 * This script will query minerals to extract crystal class information
 */

import * as mindatApi from '../server/mindat-api.js';

async function buildCrystalClassLookup() {
  try {
    console.log('Building crystal class lookup from mineral data...');
    
    // Get a diverse set of minerals to ensure we cover all crystal classes
    const minerals = await mindatApi.searchMinerals({ limit: 100 });
    
    if (!minerals || !minerals.results || minerals.results.length === 0) {
      console.error('Failed to retrieve mineral data');
      return;
    }
    
    console.log(`Retrieved ${minerals.results.length} minerals for analysis`);
    
    // Extract unique cclass values and associated minerals
    const cclassMap = new Map();
    
    minerals.results.forEach(mineral => {
      if (mineral.cclass !== null && mineral.cclass !== undefined) {
        if (!cclassMap.has(mineral.cclass)) {
          cclassMap.set(mineral.cclass, []);
        }
        cclassMap.get(mineral.cclass).push({
          id: mineral.id,
          name: mineral.name,
          formula: mineral.formula
        });
      }
    });
    
    console.log(`Found ${cclassMap.size} unique crystal class values`);
    
    // For each crystal class, get a representative mineral and examine its complete data
    const crystalClassLookup = {};
    let count = 0;
    
    for (const [classId, mineralList] of cclassMap.entries()) {
      if (mineralList.length > 0) {
        try {
          // Get detailed data for the first mineral in this class
          const mineralId = mineralList[0].id;
          const mineralData = await mindatApi.getMineralById(mineralId);
          
          console.log(`[${++count}/${cclassMap.size}] Examining crystal class ${classId} using mineral: ${mineralList[0].name}`);
          
          if (mineralData) {
            // Extract crystal system information
            const crystalSystem = mineralData.crystal_system || 'Unknown';
            
            crystalClassLookup[classId] = {
              crystalSystem,
              sampleMineral: mineralList[0].name,
              formula: mineralList[0].formula,
              mineralCount: mineralList.length
            };
          }
        } catch (error) {
          console.error(`Error getting data for crystal class ${classId}:`, error.message);
        }
      }
    }
    
    // Output the final lookup table
    console.log('\nCRYSTAL CLASS LOOKUP TABLE:');
    console.log(JSON.stringify(crystalClassLookup, null, 2));
    
    // Generate Python code
    console.log('\nPYTHON CODE FOR CRYSTAL CLASS LOOKUP:');
    let pythonCode = 'CRYSTAL_CLASS_LOOKUP = {\n';
    
    Object.entries(crystalClassLookup).forEach(([classId, info]) => {
      pythonCode += `    ${classId}: "${info.crystalSystem}", # Example: ${info.sampleMineral}\n`;
    });
    
    pythonCode += '}\n\n';
    pythonCode += 'def get_crystal_class_name(class_id):\n';
    pythonCode += '    """Convert crystal class ID to human-readable name"""\n';
    pythonCode += '    return CRYSTAL_CLASS_LOOKUP.get(class_id, f"Unknown Crystal Class ({class_id})")\n';
    
    console.log(pythonCode);
    
  } catch (error) {
    console.error('Error building crystal class lookup:', error);
  }
}

// Execute the function
buildCrystalClassLookup();