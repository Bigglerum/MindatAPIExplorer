/**
 * Script to examine the structure of a mineral entry from the Mindat API
 * to locate crystal class information
 */

import fetch from 'node-fetch';

const API_KEY = process.env.MINDAT_API_KEY;
const BASE_URL = 'https://api.mindat.org';

async function fetchMineralData() {
  if (!API_KEY) {
    console.error('MINDAT_API_KEY environment variable is not set');
    return;
  }

  try {
    // Fetch a well-known mineral to examine its structure
    const mineralName = 'Quartz'; // Common mineral with well-defined crystal properties
    console.log(`Fetching data for ${mineralName}...`);
    
    // First get the mineral ID
    const searchUrl = `${BASE_URL}/geomaterials/?name=${encodeURIComponent(mineralName)}&limit=1`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Token ${API_KEY}`
      }
    });
    
    if (!searchResponse.ok) {
      console.error(`Failed to search for mineral: ${searchResponse.status}`);
      return;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      console.error('No minerals found in search');
      return;
    }
    
    const mineralId = searchData.results[0].id;
    console.log(`Found mineral ID: ${mineralId}`);
    
    // Now get the full mineral details
    const detailUrl = `${BASE_URL}/minerals/${mineralId}/`;
    const detailResponse = await fetch(detailUrl, {
      headers: {
        'Authorization': `Token ${API_KEY}`
      }
    });
    
    if (!detailResponse.ok) {
      console.error(`Failed to get mineral details: ${detailResponse.status}`);
      return;
    }
    
    const mineralData = await detailResponse.json();
    
    // Look for fields related to crystal class or system
    console.log('\nMINERAL DATA STRUCTURE:');
    console.log('=======================');
    
    // Extract and log specific fields of interest
    const fieldsOfInterest = [
      'id', 'name', 'formula', 'ima_formula', 'cclass', 'crystal_system', 
      'crystal_habit', 'crystal_form', 'class', 'subclass', 'strunz_class'
    ];
    
    const relevantData = {};
    fieldsOfInterest.forEach(field => {
      if (mineralData[field] !== undefined) {
        relevantData[field] = mineralData[field];
      }
    });
    
    console.log(JSON.stringify(relevantData, null, 2));
    
    // Also log all available fields to see if there's anything else useful
    console.log('\nALL AVAILABLE FIELDS:');
    console.log('====================');
    console.log(Object.keys(mineralData).sort().join(', '));
    
    // Check if there are any fields containing "crystal" or "class" in their name
    const crystalRelatedFields = Object.keys(mineralData).filter(key => 
      key.toLowerCase().includes('crystal') || key.toLowerCase().includes('class')
    );
    
    if (crystalRelatedFields.length > 0) {
      console.log('\nCRYSTAL/CLASS RELATED FIELDS:');
      console.log('===========================');
      
      crystalRelatedFields.forEach(field => {
        console.log(`${field}: ${JSON.stringify(mineralData[field])}`);
      });
    }
    
    // Now try a few more common minerals with different crystal classes
    const additionalMinerals = ['Calcite', 'Fluorite', 'Pyrite', 'Corundum', 'Orthoclase'];
    console.log('\nFETCHING CRYSTAL SYSTEM DATA FOR MULTIPLE MINERALS:');
    console.log('================================================');
    
    for (const name of additionalMinerals) {
      try {
        const searchUrl = `${BASE_URL}/geomaterials/?name=${encodeURIComponent(name)}&limit=1`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Token ${API_KEY}`
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          if (searchData.results && searchData.results.length > 0) {
            const mineralId = searchData.results[0].id;
            
            const detailUrl = `${BASE_URL}/minerals/${mineralId}/`;
            const detailResponse = await fetch(detailUrl, {
              headers: {
                'Authorization': `Token ${API_KEY}`
              }
            });
            
            if (detailResponse.ok) {
              const data = await detailResponse.json();
              
              console.log(`\n${name}:`);
              console.log(`  ID: ${data.id}`);
              console.log(`  cclass: ${data.cclass}`);
              console.log(`  crystal_system: ${data.crystal_system}`);
              console.log(`  strunz_class: ${data.strunz_class}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${name}:`, error.message);
      }
    }
    
    // Based on the data gathered, create a lookup table
    console.log('\nSUGGESTED CRYSTAL CLASS LOOKUP TABLE:');
    console.log('==================================');
    
    console.log(`
# Python code for crystal class lookup
CRYSTAL_CLASS_LOOKUP = {
    # To be populated based on the results above
}

def get_crystal_class_name(class_id):
    """Convert crystal class ID to human-readable name"""
    return CRYSTAL_CLASS_LOOKUP.get(class_id, f"Unknown Crystal Class ({class_id})")
`);
    
  } catch (error) {
    console.error('Error fetching mineral data:', error);
  }
}

fetchMineralData();