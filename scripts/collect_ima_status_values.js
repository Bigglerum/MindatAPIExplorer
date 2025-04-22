/**
 * Script to collect all possible values of the IMA status field
 * from minerals in the Mindat API
 */

import fetch from 'node-fetch';

/**
 * Query the Mindat API through our proxy
 */
async function fetchFromAPI(path, parameters = {}) {
  try {
    const response = await fetch('http://localhost:5000/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        method: 'GET',
        parameters
      })
    });

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from API: ${error.message}`);
    return null;
  }
}

/**
 * Search for minerals
 */
async function searchMinerals(query, limit = 15) {
  console.log(`Searching for minerals with query: ${query}`);
  
  const searchResponse = await fetchFromAPI('/geomaterials/', { 
    name: query,
    limit 
  });
  
  if (!searchResponse || !searchResponse.data || !searchResponse.data.results) {
    console.error(`Failed to search for minerals with query: ${query}`);
    return [];
  }
  
  return searchResponse.data.results;
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
 * Main function to collect ima_status values
 */
async function collectImaStatusValues() {
  console.log('Collecting IMA status values from the Mindat API...');
  
  // Set of unique IMA status values
  const imaStatusValues = new Set();
  
  // Map of IMA status values to example minerals
  const imaStatusExamples = {};
  
  // Search queries designed to find minerals with different IMA statuses
  const searchQueries = [
    "quartz", "gold", "diamond", "fluorite", "calcite",  // Common minerals
    "apatite", "beryl", "corundum", "topaz", "sulfur",   // More common minerals
    "pyrite", "galena", "sphalerite", "magnetite",       // Common ore minerals
    "hemimorphite", "azurite", "malachite", "cuprite",   // Copper minerals
    "tourmaline", "garnet", "spinel", "feldspar",        // Mineral groups
    "anorthite", "albite", "oligoclase", "labradorite",  // Feldspars
    "hornblende", "augite", "biotite", "muscovite",      // Rock-forming minerals
    "zircon", "rutile", "ilmenite", "stibnite",          // Accessories
    "chalcopyrite", "bornite", "covellite", "tennantite", // Sulfides
    "cinnabar", "realgar", "orpiment", "millerite",      // Unusual sulfides
    "ulexite", "colemanite", "borax", "kernite",         // Borates
    "vanadinite", "descloizite", "carnotite", "tyuyamunite", // Vanadium minerals
    // Recently named minerals that might have different statuses
    "ognitite", "dzierżanowskite", "grootfonteinite", "bluelizardite"
  ];
  
  // Process each search query
  for (const query of searchQueries) {
    const searchResults = await searchMinerals(query);
    
    // Process each search result
    for (const mineral of searchResults) {
      if (!mineral.id) continue;
      
      // Get detailed information
      const details = await getMineralDetails(mineral.id);
      if (!details) continue;
      
      const imaStatus = details.ima_status;
      
      // If we have a valid IMA status, add it to our collection
      if (imaStatus) {
        console.log(`${mineral.name} (ID: ${mineral.id}) has IMA status: ${imaStatus}`);
        
        imaStatusValues.add(imaStatus);
        
        // Track an example mineral for each status
        if (!imaStatusExamples[imaStatus]) {
          imaStatusExamples[imaStatus] = mineral.name;
        }
      }
    }
  }
  
  // Output the results
  console.log('\n\nCOMPLETE LIST OF IMA STATUS VALUES:');
  console.log('==================================');
  
  const sortedStatusValues = Array.from(imaStatusValues).sort();
  
  for (const status of sortedStatusValues) {
    console.log(`"${status}" - Example: ${imaStatusExamples[status]}`);
  }
  
  // Generate a TypeScript mapping for the IMA status values
  console.log('\n\nTYPESCRIPT CODE FOR IMA STATUS MAPPING:');
  console.log('======================================');
  
  let tsCode = `
/**
 * Mapping of IMA (International Mineralogical Association) approval status codes
 * as used in the Mindat API's ima_status field
 */
export const IMA_STATUS_MAPPING: Record<string, { 
  description: string, 
  example: string 
}> = {`;
  
  for (const status of sortedStatusValues) {
    // Generate a description based on the status code
    let description = status;
    
    // Special handling for known status values to make descriptions more readable
    if (status === 'APPROVED,GRANDFATHERED') {
      description = 'Mineral approved by the IMA and grandfathered (existed before modern approval process)';
    } else if (status === 'APPROVED') {
      description = 'Mineral approved by the IMA';
    } else if (status === 'PENDING') {
      description = 'Mineral with pending IMA approval';
    } else if (status === 'REJECTED') {
      description = 'Mineral rejected by the IMA';
    } else if (status === 'GRANDFATHERED') {
      description = 'Mineral grandfathered in (recognized before modern IMA approval process)';
    } else if (status === 'DISCREDITED') {
      description = 'Mineral discredited by the IMA';
    } else if (status === 'QUESTIONABLE') {
      description = 'Mineral with questionable IMA status';
    }
    
    tsCode += `
  "${status}": {
    description: "${description}",
    example: "${imaStatusExamples[status]}"
  },`;
  }
  
  tsCode += `
};

/**
 * Get a human-readable description of an IMA status code
 * @param status The IMA status code from the Mindat API
 * @returns A human-readable description of the status
 */
export function getImaStatusDescription(status: string | null | undefined): string {
  if (!status) return "Unknown IMA Status";
  
  return IMA_STATUS_MAPPING[status]?.description || \`Unknown IMA Status: \${status}\`;
}
`;
  
  console.log(tsCode);
}

// Run the main function
collectImaStatusValues();