/**
 * Script to extract crystal class information from mineral data
 * using the API proxy in our application
 */

import fetch from 'node-fetch';
 
async function extractCrystalClasses() {
  try {
    console.log('Extracting crystal class information from mineral data...');
    
    // Use our app's proxy API endpoint to query minerals
    const proxyUrl = 'http://localhost:5000/api/proxy';
    const mineralsData = [];
    
    // List of common minerals with various crystal systems
    const minerals = [
      'Quartz',      // Trigonal
      'Calcite',     // Trigonal
      'Fluorite',    // Isometric/Cubic
      'Pyrite',      // Isometric/Cubic
      'Corundum',    // Trigonal
      'Orthoclase',  // Monoclinic
      'Beryl',       // Hexagonal
      'Gypsum',      // Monoclinic
      'Halite',      // Isometric/Cubic
      'Topaz',       // Orthorhombic
      'Apatite',     // Hexagonal
      'Kyanite',     // Triclinic
      'Diamond',     // Isometric/Cubic
      'Galena',      // Isometric/Cubic
      'Sphalerite',  // Isometric/Cubic
    ];
    
    // Fetch data for each mineral
    for (const mineralName of minerals) {
      console.log(`\nQuerying data for ${mineralName}...`);
      
      try {
        // Use the proxy endpoint to search for the mineral by name
        const searchResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: '/geomaterials/',
            method: 'GET',
            parameters: { name: mineralName, limit: 1 }
          })
        });
        
        if (!searchResponse.ok) {
          console.error(`Failed to search for ${mineralName}: ${searchResponse.status}`);
          continue;
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
          console.log(`No results found for ${mineralName}`);
          continue;
        }
        
        // Get the first result (most relevant)
        const mineral = searchData.results[0];
        console.log(`Found ${mineralName} (ID: ${mineral.id})`);
        
        // Extract crystal system information directly from the search result
        const mineralInfo = {
          id: mineral.id,
          name: mineral.name,
          formula: mineral.formula || 'Unknown',
          cclass: mineral.cclass,
          crystal_system: mineral.crystal_system || 'Unknown'
        };
        
        // Add to our collection
        mineralsData.push(mineralInfo);
        
        // Display what we found
        console.log(`  Crystal Class: ${mineralInfo.cclass}`);
        console.log(`  Crystal System: ${mineralInfo.crystal_system}`);
        
      } catch (error) {
        console.error(`Error processing ${mineralName}:`, error.message);
      }
    }
    
    // Now build a lookup table from the collected data
    console.log('\n\nCREATING CRYSTAL CLASS LOOKUP TABLE');
    console.log('=================================');
    
    const crystalClasses = new Map();
    
    // Group by cclass value
    mineralsData.forEach(mineral => {
      if (mineral.cclass !== undefined && mineral.cclass !== null) {
        if (!crystalClasses.has(mineral.cclass)) {
          crystalClasses.set(mineral.cclass, {
            examples: [],
            crystal_system: mineral.crystal_system
          });
        }
        
        // Add this mineral as an example
        crystalClasses.get(mineral.cclass).examples.push({
          name: mineral.name,
          formula: mineral.formula
        });
      }
    });
    
    // Display the lookup table
    console.log('\nCRYSTAL CLASS LOOKUP TABLE:');
    console.log('--------------------------');
    
    for (const [classId, data] of crystalClasses.entries()) {
      console.log(`Class ID ${classId}: ${data.crystal_system}`);
      console.log(`  Examples: ${data.examples.map(ex => ex.name).join(', ')}`);
    }
    
    // Generate Python code for the lookup table
    console.log('\nPYTHON CODE FOR CRYSTAL CLASS LOOKUP:');
    console.log('----------------------------------');
    
    let pythonCode = 'CRYSTAL_CLASS_LOOKUP = {\n';
    
    for (const [classId, data] of crystalClasses.entries()) {
      pythonCode += `    ${classId}: "${data.crystal_system}", # Examples: ${data.examples.map(ex => ex.name).join(', ')}\n`;
    }
    
    pythonCode += '}\n\n';
    pythonCode += 'def get_crystal_class_name(class_id):\n';
    pythonCode += '    """Convert crystal class ID to human-readable name"""\n';
    pythonCode += '    return CRYSTAL_CLASS_LOOKUP.get(class_id, f"Unknown Crystal Class ({class_id})")\n';
    
    console.log(pythonCode);
    
  } catch (error) {
    console.error('Error extracting crystal classes:', error);
  }
}

// Run the function
extractCrystalClasses();