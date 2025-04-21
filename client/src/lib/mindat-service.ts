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
  const queryParams = {
    ...params,
    limit: params.limit || 10,
    offset: params.offset || 0
  };

  try {
    // According to docs, the localities endpoint doesn't need /search
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: queryParams
    });

    return await response.json();
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
    // Using the documented endpoint for country-specific localities
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities_list_country/',
      method: 'GET',
      parameters: { country }
    });

    return await response.json();
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
    const searchResults = await searchMinerals({ name, limit: 1 });
    
    if (searchResults?.data?.length > 0) {
      const mineral = searchResults.data[0];
      return mineral.formula || null;
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
    const searchResults = await searchLocalities({ name, limit: 1 });
    
    if (searchResults?.data?.length > 0) {
      const locality = searchResults.data[0];
      
      if (locality.latitude && locality.longitude) {
        return {
          latitude: locality.latitude,
          longitude: locality.longitude
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting coordinates for ${name}:`, error);
    // Return null for API errors so the application can still function
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
      path: '/minerals',
      method: 'GET',
      parameters: { limit: 1 }
    });
    
    // If we get here without an error, the API is available
    const data = await response.json();
    return !!data && !data.error;
  } catch (error) {
    console.error('API availability check failed:', error);
    return false;
  }
}