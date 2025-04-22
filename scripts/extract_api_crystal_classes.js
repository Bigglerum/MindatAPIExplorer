/**
 * Script to extract crystal class data directly from the Mindat API
 * by querying minerals and examining the 'cclass' and 'crystal_system' fields
 */

import fetch from 'node-fetch';

/**
 * Uses our app's proxy API to query the Mindat API
 * This ensures we're using the same authentication method as our application
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
 * Main function to collect crystal class data
 */
async function collectCrystalClassData() {
  console.log('Collecting crystal class data from Mindat API...');
  
  // Step 1: Query multiple pages of minerals to get diverse data
  const crystalClassMap = new Map();
  let nextPage = '/geomaterials/?limit=100';
  let pageCount = 0;
  
  while (nextPage && pageCount < 5) { // Limit to 5 pages to avoid excessive requests
    console.log(`\nFetching page ${pageCount + 1} of minerals: ${nextPage}`);
    
    const response = await fetchFromAPI(nextPage);
    if (!response || !response.data || !response.data.results) {
      console.error('Failed to fetch minerals data');
      break;
    }
    
    const data = response.data;
    
    // Process minerals on this page
    console.log(`Processing ${data.results.length} minerals...`);
    
    for (const mineral of data.results) {
      if (mineral.cclass !== null && mineral.cclass !== undefined) {
        // We're interested in the relationship between cclass and crystal_system
        const cclass = mineral.cclass;
        const crystalSystem = mineral.crystal_system;
        
        if (!crystalClassMap.has(cclass)) {
          crystalClassMap.set(cclass, {
            crystal_system: crystalSystem,
            minerals: []
          });
        }
        
        // Add this mineral as an example (but limit examples to avoid too much data)
        const examples = crystalClassMap.get(cclass).minerals;
        if (examples.length < 5) {
          examples.push({
            id: mineral.id,
            name: mineral.name,
            formula: mineral.formula
          });
        }
      }
    }
    
    // Move to next page if available
    if (data.next) {
      try {
        const nextUrl = new URL(data.next);
        nextPage = nextUrl.pathname + nextUrl.search;
      } catch (error) {
        console.log('Error parsing next URL:', data.next);
        nextPage = null;
      }
    } else {
      nextPage = null;
    }
    pageCount++;
  }
  
  // Display the results
  console.log('\nCRYSTAL CLASS DATA FROM MINDAT API:');
  console.log('=================================');
  
  for (const [cclass, data] of crystalClassMap.entries()) {
    console.log(`Class ID ${cclass}: ${data.crystal_system || 'Unknown'}`);
    console.log(`  Example minerals: ${data.minerals.map(m => m.name).join(', ')}`);
  }
  
  // Generate code for crystal class lookup
  console.log('\nGENERATED CRYSTAL CLASS LOOKUP:');
  console.log('=============================');
  
  console.log('// JavaScript/TypeScript:');
  let jsCode = 'export const CRYSTAL_CLASS_LOOKUP: Record<number, string> = {\n';
  
  for (const [cclass, data] of crystalClassMap.entries()) {
    jsCode += `  ${cclass}: "${data.crystal_system || 'Unknown'}", // Examples: ${data.minerals.map(m => m.name).join(', ')}\n`;
  }
  
  jsCode += '};\n';
  console.log(jsCode);
  
  console.log('\n# Python:');
  let pyCode = 'CRYSTAL_CLASS_LOOKUP = {\n';
  
  for (const [cclass, data] of crystalClassMap.entries()) {
    pyCode += `    ${cclass}: "${data.crystal_system || 'Unknown'}", # Examples: ${data.minerals.map(m => m.name).join(', ')}\n`;
  }
  
  pyCode += '}\n';
  console.log(pyCode);
}

// Run the function
collectCrystalClassData();