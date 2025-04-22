/**
 * A script to fetch and display the complete crystal class mapping from the Mindat API
 */

import fetch from 'node-fetch';

async function fetchCrystalClasses() {
  try {
    // Try token authentication first
    const apiKey = process.env.MINDAT_API_KEY;
    
    if (!apiKey) {
      console.error('MINDAT_API_KEY environment variable is not set');
      return;
    }
    
    console.log('Fetching crystal class information from Mindat API...');
    
    // First, try to find the right endpoint by exploring the API
    const baseUrl = 'https://api.mindat.org';
    
    // Option 1: Try the /crystal_systems/ endpoint
    console.log('Attempting to access /crystal_systems/ endpoint...');
    let response = await fetch(`${baseUrl}/crystal_systems/`, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Crystal Systems Endpoint Data:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    // Option 2: Try the /crystal_classes/ endpoint
    console.log('Attempting to access /crystal_classes/ endpoint...');
    response = await fetch(`${baseUrl}/crystal_classes/`, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Crystal Classes Endpoint Data:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    // Option 3: Try to get information from the minerals endpoint which includes cclass
    console.log('Attempting to extract information from /minerals/ endpoint...');
    response = await fetch(`${baseUrl}/minerals/?limit=10`, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract unique cclass values and create a set
      const cclassValues = new Set();
      data.results.forEach(mineral => {
        if (mineral.cclass !== null && mineral.cclass !== undefined) {
          cclassValues.add(mineral.cclass);
        }
      });
      
      console.log('Unique cclass values found in mineral data:');
      console.log(Array.from(cclassValues));
      
      // Try to find additional information about these classes
      console.log('\nAttempting to get more information about each cclass...');
      
      for (const classId of cclassValues) {
        // Look for endpoints that might provide crystal class information
        const endpoints = [
          `/minerals/?cclass=${classId}&limit=1`,
          `/crystal_system/${classId}/`,
          `/crystal_class/${classId}/`
        ];
        
        for (const endpoint of endpoints) {
          try {
            const classResponse = await fetch(`${baseUrl}${endpoint}`, {
              headers: {
                'Authorization': `Token ${apiKey}`
              }
            });
            
            if (classResponse.ok) {
              const classData = await classResponse.json();
              console.log(`Information for cclass ${classId} from ${endpoint}:`);
              console.log(JSON.stringify(classData, null, 2));
              break;
            }
          } catch (error) {
            console.log(`Error accessing ${endpoint}: ${error.message}`);
          }
        }
      }
      
      return;
    }
    
    // If we get here, we couldn't find the right endpoint
    console.error('Could not find a suitable endpoint for crystal class information');
    console.log('Response status:', response.status);
    console.log('Response text:', await response.text());
    
  } catch (error) {
    console.error('Error fetching crystal class information:', error);
  }
}

// Execute the function
fetchCrystalClasses();