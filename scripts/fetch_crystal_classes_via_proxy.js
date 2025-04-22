/**
 * A script to fetch crystal class information using our application's proxy service
 */

import fetch from 'node-fetch';

async function fetchCrystalClassesViaProxy() {
  try {
    console.log('Fetching crystal class information via proxy API...');
    
    // Use our application's proxy endpoint
    const proxyUrl = 'http://localhost:5000/api/proxy';
    
    // First, let's try to get a sample of minerals to extract cclass values
    const mineralsResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: '/minerals/',
        method: 'GET',
        parameters: { limit: 50 }
      })
    });
    
    if (!mineralsResponse.ok) {
      console.error('Failed to fetch minerals data');
      console.log('Response status:', mineralsResponse.status);
      console.log('Response text:', await mineralsResponse.text());
      return;
    }
    
    const mineralsData = await mineralsResponse.json();
    
    // Extract unique cclass values
    const cclassValues = new Set();
    let cclassInfo = {};
    
    // Look for any descriptions or names that might be associated with the cclass values
    mineralsData.results.forEach(mineral => {
      if (mineral.cclass !== null && mineral.cclass !== undefined) {
        cclassValues.add(mineral.cclass);
        
        // Look for any fields that might contain crystal system information
        if (mineral.crystal_system && !cclassInfo[mineral.cclass]) {
          cclassInfo[mineral.cclass] = mineral.crystal_system;
        }
      }
    });
    
    console.log('Unique cclass values found:', Array.from(cclassValues));
    
    if (Object.keys(cclassInfo).length > 0) {
      console.log('Crystal system information found:');
      console.log(cclassInfo);
    } else {
      console.log('No crystal system information found in mineral data');
    }
    
    // Get more detailed mineral data for a few minerals to see if we can find more information
    console.log('\nFetching detailed information for specific minerals...');
    
    // Get some sample mineral IDs from the first response
    const mineralIds = mineralsData.results.slice(0, 3).map(m => m.id);
    
    for (const id of mineralIds) {
      const detailResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: `/minerals/${id}/`,
          method: 'GET',
          parameters: {}
        })
      });
      
      if (detailResponse.ok) {
        const mineralDetail = await detailResponse.json();
        console.log(`Detailed information for mineral ID ${id}:`);
        
        // Extract and log fields that might be related to crystal classification
        const relevantFields = {};
        ['name', 'cclass', 'crystal_system', 'crystal_habit', 'crystal_form'].forEach(field => {
          if (mineralDetail[field] !== undefined) {
            relevantFields[field] = mineralDetail[field];
          }
        });
        
        console.log(relevantFields);
      } else {
        console.log(`Failed to get details for mineral ID ${id}`);
      }
    }
    
  } catch (error) {
    console.error('Error fetching crystal class information:', error);
  }
}

// Execute the function
fetchCrystalClassesViaProxy();