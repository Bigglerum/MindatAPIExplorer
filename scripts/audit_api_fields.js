/**
 * Script to audit Mindat API fields to identify those requiring mapping tables
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
    console.error(`Error fetching from API (${path}): ${error.message}`);
    return null;
  }
}

/**
 * Retrieve detailed mineral information by ID
 */
async function getMineralDetails(id) {
  console.log(`Fetching details for mineral ID ${id}...`);
  const detailsResponse = await fetchFromAPI(`/geomaterials/${id}/`);
  if (!detailsResponse || !detailsResponse.data) {
    console.error(`Failed to get details for mineral ID ${id}`);
    return null;
  }
  
  return detailsResponse.data;
}

/**
 * Main audit function to analyze Mindat API fields
 */
async function auditMineralApiFields() {
  console.log('Auditing Mindat API fields for coded/numeric values...\n');
  
  // Representative minerals from different crystal systems
  const mineralSamples = [
    { id: 3337, name: 'Quartz' },     // Trigonal
    { id: 859, name: 'Calcite' },     // Trigonal 
    { id: 1784, name: 'Gypsum' },     // Monoclinic
    { id: 2303, name: 'Kyanite' },    // Triclinic
    { id: 3996, name: 'Topaz' },      // Orthorhombic
    { id: 4421, name: 'Zircon' },     // Tetragonal
    { id: 3314, name: 'Pyrite' },     // Isometric
    { id: 1576, name: 'Fluorite' },   // Isometric
    { id: 819, name: 'Beryl' },       // Hexagonal
    { id: 3004, name: 'Opal' }        // Amorphous
  ];
  
  // Fields that likely contain coded values
  const suspectFields = [
    'cclass', 'csystem', 'ima_status', 'hardness', 'specific_gravity',
    'luminescence', 'lustre', 'colour', 'streak', 'diaphaneity',
    'cleavage', 'fracture', 'tenacity', 'density', 'crystal_habit',
    'type_localities', 'twinning'
  ];

  // Data structures to track our findings
  const numericCodeFields = {};  // Fields with numeric codes (like cclass)
  const textCodeFields = {};     // Fields with text codes (like csystem)
  const fieldsWithUnits = {};    // Fields with measurement units
  const allFieldTypes = {};      // Track all field data types
  const fieldSamples = {};       // Sample values for each field
  
  // Process each mineral
  for (const mineral of mineralSamples) {
    console.log(`\nAnalyzing ${mineral.name} (ID: ${mineral.id})...`);
    
    const details = await getMineralDetails(mineral.id);
    if (!details) continue;
    
    // First capture all available fields
    for (const field in details) {
      if (!allFieldTypes[field]) {
        allFieldTypes[field] = new Set();
      }
      
      const value = details[field];
      const valueType = value === null ? 'null' : typeof value;
      allFieldTypes[field].add(valueType);
      
      // Store sample values for each field
      if (!fieldSamples[field]) {
        fieldSamples[field] = [];
      }
      
      if (value !== null && fieldSamples[field].length < 3) {
        if (Array.isArray(value)) {
          // For arrays, store a sample entry if possible
          if (value.length > 0) {
            fieldSamples[field].push(`[${typeof value[0]} array with ${value.length} items]`);
          } else {
            fieldSamples[field].push('[]');
          }
        } else if (typeof value === 'object') {
          // For objects, store the keys
          fieldSamples[field].push(`{${Object.keys(value).join(', ')}}`);
        } else {
          // For simple values, store the actual value
          fieldSamples[field].push(String(value));
        }
      }
    }
    
    // Now look for fields with coded values
    for (const field in details) {
      const value = details[field];
      
      // Skip non-simple values
      if (value === null || Array.isArray(value) || typeof value === 'object') {
        continue;
      }
      
      // Check for numeric codes (like cclass)
      if (typeof value === 'number' && suspectFields.includes(field)) {
        if (!numericCodeFields[field]) {
          numericCodeFields[field] = new Set();
        }
        numericCodeFields[field].add(value);
        console.log(`  ${field}: ${value}`);
      }
      
      // Check for text codes (like csystem)
      if (typeof value === 'string' && suspectFields.includes(field)) {
        if (!textCodeFields[field]) {
          textCodeFields[field] = new Set();
        }
        textCodeFields[field].add(value);
        
        // Log specific fields of interest
        if (field === 'csystem' || field === 'ima_status' || field === 'lustre') {
          console.log(`  ${field}: "${value}"`);
        }
      }
      
      // Check for fields with units that might need standardization
      if (typeof value === 'string' && (
          value.includes('kg') || 
          value.includes('g/cm') || 
          value.includes('°') || 
          value.includes('mm') || 
          value.includes('µm'))) {
        if (!fieldsWithUnits[field]) {
          fieldsWithUnits[field] = new Set();
        }
        fieldsWithUnits[field].add(value);
      }
    }
  }
  
  // Output our findings
  console.log('\n\nFIELDS REQUIRING MAPPING TABLES:');
  console.log('===============================');
  
  // Fields with numeric codes
  console.log('\nFields with numeric codes:');
  for (const field in numericCodeFields) {
    const values = Array.from(numericCodeFields[field]).sort((a, b) => a - b);
    console.log(`- ${field}: Found values: ${values.join(', ')}`);
  }
  
  // Fields with text codes
  console.log('\nFields with text codes that may need mapping:');
  for (const field in textCodeFields) {
    const values = Array.from(textCodeFields[field]).sort();
    if (values.length > 0 && values.length < 10) {
      console.log(`- ${field}: Found values: "${values.join('", "')}"`);
    } else if (values.length >= 10) {
      console.log(`- ${field}: Found ${values.length} different text values (too many to list)`);
    }
  }
  
  // Fields with unit measurements
  console.log('\nFields with units that might need standardization:');
  for (const field in fieldsWithUnits) {
    const values = Array.from(fieldsWithUnits[field]).slice(0, 3);
    console.log(`- ${field}: Examples: "${values.join('", "')}"`);
  }
  
  // All field types summary
  console.log('\n\nALL FIELD TYPES SUMMARY:');
  console.log('=======================');
  
  for (const field in allFieldTypes) {
    const types = Array.from(allFieldTypes[field]).join(', ');
    const samples = fieldSamples[field] || [];
    console.log(`${field}:`);
    console.log(`  Types: ${types}`);
    if (samples.length > 0) {
      console.log(`  Examples: ${samples.join(' | ')}`);
    }
    console.log();
  }
}

// Run the audit
auditMineralApiFields();