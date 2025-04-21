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
    // This is a temporary hardcoded mapping solution since the API doesn't allow proper searching
    console.log(`Looking up coordinates for locality: ${name}`);
    
    // Popular mining localities mapping
    const knownLocalities: Record<string, { lat: number, lng: number, name: string }> = {
      'tsumeb': { lat: -19.2333, lng: 17.7167, name: 'Tsumeb Mine, Namibia' },
      'bisbee': { lat: 31.4479, lng: -109.9282, name: 'Bisbee, Arizona, USA' },
      'hilton': { lat: 54.7639, lng: -2.3761, name: 'Hilton Mine, UK' },
      'blackdene': { lat: 54.7422, lng: -2.1908, name: 'Blackdene Mine, UK' },
      'franklin': { lat: 41.1205, lng: -74.5895, name: 'Franklin Mine, New Jersey, USA' },
      'sterling hill': { lat: 41.0759, lng: -74.5989, name: 'Sterling Hill Mine, New Jersey, USA' },
      'broken hill': { lat: -31.9539, lng: 141.4539, name: 'Broken Hill, Australia' },
      'dalnegorsk': { lat: 44.5583, lng: 135.4608, name: 'Dalnegorsk, Russia' }
    };
    
    // Try to match by name
    const searchTerm = name.toLowerCase().trim();
    
    // Check for exact key match
    if (knownLocalities[searchTerm]) {
      const location = knownLocalities[searchTerm];
      console.log(`Found exact match: ${location.name}`);
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    }
    
    // Check for partial match
    for (const key in knownLocalities) {
      if (key.includes(searchTerm) || searchTerm.includes(key) || 
          knownLocalities[key].name.toLowerCase().includes(searchTerm)) {
        const location = knownLocalities[key];
        console.log(`Found partial match: ${location.name}`);
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      }
    }
    
    // If no match in our known data, still try the API as a fallback
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { search: name, limit: 10 }
    });
    
    const data = await response.json();
    if (data?.data?.results && data.data.results.length > 0) {
      // Try to match the search term in text
      const exactMatch = data.data.results.find((loc: any) => 
        loc.txt && loc.txt.toLowerCase().includes(searchTerm)
      );
      
      const locality = exactMatch || data.data.results[0];
      
      // Only use if the txt property doesn't contain afghanistan (which seems to be the default)
      if (locality.latitude && locality.longitude && 
          (!locality.txt || !locality.txt.toLowerCase().includes('afghanistan'))) {
        console.log(`Using API result: ${locality.txt}`);
        return {
          latitude: locality.latitude,
          longitude: locality.longitude
        };
      }
    }
    
    console.log(`No match found for ${name}`);
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