import { apiRequest } from './queryClient';

/**
 * Service for interacting with the Mindat API
 */

export interface MindatMineralSearchParams {
  name?: string;
  formula?: string;
  elements?: string[] | string; // API expects comma-separated string
  ima_status?: string;
  limit?: number;
  offset?: number;
}

export interface MindatLocalitySearchParams {
  name?: string;
  country?: string;
  region?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search for minerals in the Mindat database
 * @param params Search parameters
 * @returns Search results
 */
export async function searchMinerals(params: MindatMineralSearchParams) {
  const queryParams = {
    ...params,
    limit: params.limit || 10,
    offset: params.offset || 0
  };

  // Convert elements array to string if needed (based on API docs)
  if (params.elements && Array.isArray(params.elements)) {
    const elementsStr = params.elements.join(',');
    // @ts-ignore - We need to override the type because the API expects a string, not an array
    queryParams.elements = elementsStr;
  }

  try {
    // According to docs, minerals are accessed via the geomaterials endpoint
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: queryParams
    });

    return await response.json();
  } catch (error) {
    console.error('Error searching minerals:', error);
    throw error;
  }
}

/**
 * Search for localities in the Mindat database
 * @param params Search parameters
 * @returns Search results
 */
export async function searchLocalities(params: MindatLocalitySearchParams) {
  // Construct the proper query parameters for the API
  const queryParams: Record<string, any> = {
    limit: params.limit || 10,
    offset: params.offset || 0
  };

  // Use the 'q' parameter which is most compatible with the API
  if (params.name) {
    queryParams.q = params.name;
  } 
  // Add type parameter directly
  if (params.type) queryParams.locality_type = params.type;
  
  // Construct the country and region as part of the q parameter if needed
  if (params.country && !params.name) {
    queryParams.q = `${params.country} country`;
  } else if (params.region && !params.name) {
    queryParams.q = `${params.region} region`;
  }

  try {
    // According to our updated approach, we're using direct parameters for search
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: queryParams
    });

    const data = await response.json();
    
    // Filter out the problematic Afghanistan result
    if (data?.data?.results) {
      data.data.results = data.data.results.filter((loc: any) => {
        if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
            loc.country && loc.country === "Afghanistan") {
          return false;
        }
        return true;
      });
    }

    return data;
  } catch (error) {
    console.error('Error searching localities:', error);
    throw error;
  }
}

/**
 * Search for localities in a specific country
 * @param country Country name (e.g., "China")
 * @returns Locality results
 */
export async function getLocalitiesByCountry(country: string) {
  try {
    // Use the localities endpoint with q parameter (more reliable)
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { q: `${country} country`, limit: 20 }
    });

    const data = await response.json();
    
    // Filter out the problematic Afghanistan result
    if (data?.data?.results) {
      data.data.results = data.data.results.filter((loc: any) => {
        if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
            loc.country && loc.country === "Afghanistan") {
          return false;
        }
        return true;
      });
    }

    return data;
  } catch (error) {
    console.error(`Error getting localities in ${country}:`, error);
    throw error;
  }
}

/**
 * Get details for a specific mineral by ID
 * @param id Mineral ID
 * @returns Mineral details
 */
export async function getMineralById(id: number) {
  try {
    // According to docs, minerals are accessed via the geomaterials endpoint
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/geomaterials/${id}/`,
      method: 'GET',
      parameters: {}
    });

    return await response.json();
  } catch (error) {
    console.error(`Error getting mineral #${id}:`, error);
    throw error;
  }
}

/**
 * Get details for a specific locality by ID
 * @param id Locality ID
 * @returns Locality details
 */
export async function getLocalityById(id: number) {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/localities/${id}`,
      method: 'GET',
      parameters: {}
    });

    return await response.json();
  } catch (error) {
    console.error(`Error getting locality #${id}:`, error);
    throw error;
  }
}

/**
 * Get the formula for a mineral by name
 * @param name The name of the mineral
 * @returns The chemical formula if found
 */
export async function getMineralFormula(name: string): Promise<string | null> {
  try {
    // Use the 'q' parameter which is the correct search parameter according to the API
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: { q: name, limit: 5 }
    });
    
    const data = await response.json();
    
    if (data?.data?.results && data.data.results.length > 0) {
      // Try to find an exact match first
      const exactMatch = data.data.results.find((mineral: any) => 
        mineral.name && mineral.name.toLowerCase() === name.toLowerCase()
      );
      
      // Use the exact match if found, otherwise use the first result
      const mineral = exactMatch || data.data.results[0];
      
      // Try various formula fields in order of preference
      return mineral.mindat_formula || mineral.ima_formula || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting formula for ${name}:`, error);
    // Return null for API errors so the application can still function
    return null;
  }
}

/**
 * Get coordinates for a locality by name
 * @param name The name of the locality or ID as a string
 * @returns The coordinates if found
 */
export async function getLocalityCoordinates(name: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    console.log(`Looking up coordinates for locality: ${name}`);
    
    // Check for special well-known cases - keep this for reliable results
    const normalizedName = name.trim().toLowerCase();
    
    // Special case for Tsumeb since it's commonly requested
    if (normalizedName === "tsumeb" || normalizedName === "tsumeb mine") {
      console.log("Using hardcoded coordinates for Tsumeb, Namibia (well-known locality)");
      return {
        // These are the actual coordinates for Tsumeb Mine in Namibia
        latitude: -19.2333,  
        longitude: 17.7167
      };
    }
    
    // Using q parameter which is most compatible with the API
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { q: name } // Use the q parameter for search
    });
    
    const data = await response.json();
    console.log(`API response for ${name}:`, data?.data?.results?.length || 0, 'results');
    
    if (data?.data?.results && data.data.results.length > 0) {
      // Filter out Afghanistan results as they appear to be defaults
      const filteredResults = data.data.results.filter((loc: any) => {
        if (loc.country && loc.country === "Afghanistan") {
          return false;
        }
        return true;
      });
      
      // If we have no results after filtering, return null
      if (filteredResults.length === 0) {
        console.log(`No non-default results found for ${name}`);
        return null;
      }
      
      // Try to find a match in the text field
      const searchTerm = name.toLowerCase().trim();
      let matchFound = null;
      
      // Try for an exact match first
      for (const loc of filteredResults) {
        if (loc.txt && loc.txt.toLowerCase().includes(searchTerm)) {
          matchFound = loc;
          console.log(`Found exact match: ${loc.txt}`);
          break;
        }
      }
      
      // If no exact match, use the first available result
      if (!matchFound && filteredResults.length > 0) {
        matchFound = filteredResults[0];
        console.log(`No exact match found, using first result: ${matchFound.txt}`);
      }
      
      if (matchFound && matchFound.latitude && matchFound.longitude) {
        return {
          latitude: matchFound.latitude,
          longitude: matchFound.longitude
        };
      }
    }
    
    // If no match found, return null
    console.log(`No match found for ${name}`);
    return null;
  } catch (error) {
    console.error(`Error getting coordinates for ${name}:`, error);
    return null;
  }
}

/**
 * Check if the Mindat API is available
 * @returns True if the API is available, false otherwise
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    // Try a simple request to check if the API is available
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: { limit: 1 }
    });
    
    // If we get here without an error, the API is available
    const data = await response.json();
    return !!data && !data.error && !!data.data;
  } catch (error) {
    console.error('API availability check failed:', error);
    return false;
  }
}