/**
 * Script to examine a complete mineral response
 * to identify all fields that might need mapping
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
 * Print a section of the output
 */
function printSection(title) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
}

/**
 * Examine complete mineral details
 */
async function examineMineralDetails() {
  // Get details for a mineral with a rich data set
  const mineralId = 3337; // Quartz
  console.log(`Fetching complete details for Quartz (ID: ${mineralId})...`);
  
  const response = await fetchFromAPI(`/geomaterials/${mineralId}/`);
  if (!response || !response.data) {
    console.error('Failed to get mineral details');
    return;
  }
  
  const mineral = response.data;
  
  // Print fields that are likely to need mapping
  printSection('Fields Likely Requiring Mapping Tables:');
  
  // These fields likely have coded values that need interpretation
  const codedValueFields = [
    'ima_status', 'cclass', 'csystem', 'crystal_habit',
    'twinning', 'cleavage', 'fracture', 'parting',
    'tenacity', 'hardness', 'diaphaneity', 'lustre',
    'streak', 'luminescence', 'density', 'radioactivity',
    'specific_gravity', 'magnetic'
  ];
  
  for (const field of codedValueFields) {
    if (mineral[field] !== undefined && mineral[field] !== null) {
      console.log(`${field}: ${mineral[field]}`);
    }
  }
  
  // Fields with HTML content that needs rendering/parsing
  printSection('Fields with HTML Content (Need Rendering):');
  
  // Fields that commonly contain HTML or formatted content
  const htmlFields = [
    'formula', 'description', 'description_short', 'colour', 
    'twinning', 'crystal_habit', 'cleavage'
  ];
  
  for (const field of htmlFields) {
    if (mineral[field] && typeof mineral[field] === 'string' && 
        (mineral[field].includes('<') || mineral[field].includes('&lt;'))) {
      console.log(`${field}: Contains HTML that needs rendering`);
      // Print a short sample
      console.log(`  Sample: ${mineral[field].substring(0, 100)}...`);
    }
  }
  
  // Fields with measurement units that need standardization
  printSection('Fields with Measurement Units (Need Standardization):');
  
  // Look for fields with measurement units
  for (const field in mineral) {
    if (typeof mineral[field] === 'string' && 
        (mineral[field].includes('°') || 
         mineral[field].includes('kg') || 
         mineral[field].includes('cm') || 
         mineral[field].includes('mm'))) {
      console.log(`${field}: ${mineral[field]}`);
    }
  }
  
  // Check for other fields that might need special handling
  printSection('Other Fields That Might Need Special Handling:');
  
  // Check for relationship fields or fields with IDs that need resolution
  for (const field in mineral) {
    if (field.endsWith('_id') || field.endsWith('_ids') || 
        field.includes('relation') || field.includes('parent')) {
      console.log(`${field}: ${mineral[field]}`);
    }
  }
  
  // Print a complete list of all mineral fields for reference
  printSection('Complete List of Mineral Fields:');
  
  const allFields = Object.keys(mineral).sort();
  console.log(allFields.join('\n'));
}

// Run the examination
examineMineralDetails();