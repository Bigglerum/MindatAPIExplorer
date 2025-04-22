/**
 * Script to check the crystal system enum values from the Mindat API schema
 */

import fetch from 'node-fetch';

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
 * Check the API schema for crystal system enum
 */
async function checkCrystalSystemEnum() {
  console.log('Checking crystal system enum in Mindat API schema...');
  
  // Let's try querying the swagger documentation or schema endpoint
  const paths = [
    '/schema/',
    '/swagger/',
    '/openapi.json',
    '/schema/enums/',
    '/schema/CsystemEnum/',
    '/enums/crystal_system/'
  ];
  
  for (const path of paths) {
    console.log(`\nTrying endpoint: ${path}`);
    const response = await fetchFromAPI(path);
    
    if (response) {
      console.log('Response received:');
      console.log(JSON.stringify(response, null, 2).substring(0, 1000) + '...');
      
      // Look for crystal system enum
      if (response.components && response.components.schemas) {
        console.log('\nLooking for enum definitions in schema components...');
        
        for (const [schemaName, schema] of Object.entries(response.components.schemas)) {
          if (schemaName.toLowerCase().includes('crystal') || 
              schemaName.toLowerCase().includes('system') || 
              schemaName.toLowerCase().includes('enum')) {
            
            console.log(`\nFound potential schema: ${schemaName}`);
            console.log(JSON.stringify(schema, null, 2));
            
            if (schema.enum) {
              console.log(`Enum values for ${schemaName}:`);
              console.log(schema.enum);
            }
          }
        }
      }
      
      // Check if response itself is an enum
      if (Array.isArray(response)) {
        console.log('\nResponse is an array, possibly enum values:');
        console.log(response);
      }
      
      // Check for enum properties in the response
      if (response.enum) {
        console.log('\nFound enum property in response:');
        console.log(response.enum);
      }
    }
  }
  
  // Alternatively, check a specific mineral with all details to see crystal system format
  console.log('\nFetching a specific mineral to check crystal system format...');
  const minerals = ['Quartz', 'Fluorite', 'Calcite'];
  
  for (const mineralName of minerals) {
    const searchResponse = await fetchFromAPI('/geomaterials/', { name: mineralName, limit: 1 });
    
    if (searchResponse && searchResponse.data && searchResponse.data.results && searchResponse.data.results.length > 0) {
      const mineral = searchResponse.data.results[0];
      console.log(`\nMineral: ${mineralName} (ID: ${mineral.id})`);
      
      console.log('Crystal class:', mineral.cclass);
      console.log('Crystal system:', mineral.crystal_system);
      
      // Check for any additional crystal-related fields
      const crystalFields = {};
      for (const [key, value] of Object.entries(mineral)) {
        if (key.toLowerCase().includes('crystal') || key.toLowerCase().includes('system') || key.toLowerCase().includes('class')) {
          crystalFields[key] = value;
        }
      }
      
      if (Object.keys(crystalFields).length > 0) {
        console.log('\nCrystal-related fields:');
        console.log(crystalFields);
      }
    }
  }
}

// Run the function
checkCrystalSystemEnum();