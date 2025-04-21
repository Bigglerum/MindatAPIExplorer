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

  // Use the 'q' parameter which is the correct search parameter according to the API
  if (params.name) {
    queryParams.q = params.name;
  } else if (params.country) {
    queryParams.q = `${params.country} country`;
  } else if (params.region) {
    queryParams.q = `${params.region} region`;
  }

  try {
    // According to docs, the localities endpoint uses 'q' for search
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
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: { name, limit: 1 }
    });
    
    const data = await response.json();
    
    if (data?.data?.results && data.data.results.length > 0) {
      const mineral = data.data.results[0];
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
 * @param name The name of the locality
 * @returns The coordinates if found
 */
export async function getLocalityCoordinates(name: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    console.log(`Looking up coordinates for locality: ${name}`);
    
    // Call the API to search for the locality using the q parameter (correct API parameter)
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { q: name, limit: 10 }
    });
    
    const data = await response.json();
    console.log(`API response for ${name}:`, data?.data?.results?.length || 0, 'results');
    
    if (data?.data?.results && data.data.results.length > 0) {
      // First, filter out the Afghanistan result that appears regardless of search terms
      // This is a data integrity issue in the API
      const filteredResults = data.data.results.filter((loc: any) => {
        if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
            loc.country && loc.country === "Afghanistan") {
          return false; // Remove the problematic default record
        }
        return true;
      });
      
      // If we have no results after filtering, return null
      if (filteredResults.length === 0) {
        console.log(`No non-default results found for ${name}`);
        return null;
      }
      
      // Try to find the best match by checking if the name is contained in the txt field
      const searchTerm = name.toLowerCase().trim();
      const exactMatch = filteredResults.find((loc: any) => 
        loc.txt && loc.txt.toLowerCase().includes(searchTerm)
      );
      
      // Use the exact match if found, otherwise use the first non-Afghanistan result
      const bestMatch = exactMatch || filteredResults[0];
      
      if (bestMatch && bestMatch.latitude && bestMatch.longitude) {
        console.log(`Found match: ${bestMatch.txt}`);
        return {
          latitude: bestMatch.latitude,
          longitude: bestMatch.longitude
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