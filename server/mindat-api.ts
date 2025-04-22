/**
 * Server-side functions for interacting with the Mindat API
 */
import fetch from 'node-fetch';

// Base URL for the Mindat API
const BASE_URL = 'https://api.mindat.org';

// API authentication
const getAuthHeaders = () => {
  // Check for API key first (token auth)
  if (process.env.MINDAT_API_KEY) {
    console.log('Using Mindat API key for Token authentication');
    return {
      'Authorization': `Token ${process.env.MINDAT_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Fall back to Basic auth if username and password are available
  if (process.env.MINDAT_USERNAME && process.env.MINDAT_PASSWORD) {
    console.log('Using Mindat username/password for Basic authentication');
    const credentials = Buffer.from(`${process.env.MINDAT_USERNAME}:${process.env.MINDAT_PASSWORD}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };
  }
  
  console.error('No Mindat API credentials found in environment variables');
  throw new Error('Missing Mindat API credentials');
};

/**
 * Interface for mineral search parameters
 */
interface MineralSearchParams {
  name?: string;
  formula?: string;
  elements?: string[] | string;
  ima_status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Interface for locality search parameters
 */
interface LocalitySearchParams {
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
 * @returns API response data
 */
export async function searchMinerals(params: MineralSearchParams) {
  try {
    const queryParams: Record<string, any> = {
      limit: params.limit || 10,
      offset: params.offset || 0
    };
    
    // Add search parameters if provided
    if (params.name) {
      queryParams.q = params.name;
    }
    
    if (params.formula) {
      queryParams.formula = params.formula;
    }
    
    if (params.elements) {
      if (Array.isArray(params.elements)) {
        queryParams.elements = params.elements.join(',');
      } else {
        queryParams.elements = params.elements;
      }
    }
    
    if (params.ima_status) {
      queryParams.ima_status = params.ima_status;
    }
    
    // Construct the URL with query parameters
    const url = new URL('/geomaterials/', BASE_URL);
    Object.keys(queryParams).forEach(key => {
      url.searchParams.append(key, queryParams[key]);
    });
    
    // Make the request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error searching minerals:', error);
    return { error: 'Failed to search minerals' };
  }
}

/**
 * Search for localities in the Mindat database
 * @param params Search parameters
 * @returns API response data
 */
export async function searchLocalities(params: LocalitySearchParams) {
  try {
    // Construct the proper query parameters for the API
    const queryParams: Record<string, any> = {
      limit: params.limit || 10,
      offset: params.offset || 0
    };

    // Use the 'txt' parameter which works correctly with the localities API
    if (params.name) {
      queryParams.txt = params.name;
    } 
    
    // Add country and region as part of the search text if needed
    if (params.country && !params.name) {
      queryParams.txt = params.country;
    } else if (params.region && !params.name) {
      queryParams.txt = params.region;
    }
    
    // Add type parameter directly if specified
    if (params.type) {
      queryParams.locality_type = params.type;
    }
    
    // Construct the URL with query parameters
    const url = new URL('/localities/', BASE_URL);
    Object.keys(queryParams).forEach(key => {
      url.searchParams.append(key, queryParams[key]);
    });
    
    // Make the request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter out the problematic Afghanistan result
    if (data?.results) {
      data.results = data.results.filter((loc: any) => {
        if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
            loc.country && loc.country === "Afghanistan") {
          return false;
        }
        return true;
      });
    }
    
    return { data };
  } catch (error) {
    console.error('Error searching localities:', error);
    return { error: 'Failed to search localities' };
  }
}

/**
 * Get details for a specific mineral by ID
 * @param id Mineral ID
 * @returns Mineral details
 */
export async function getMineralById(id: number) {
  try {
    const url = `${BASE_URL}/geomaterials/${id}/`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error getting mineral #${id}:`, error);
    return { error: `Failed to get mineral #${id}` };
  }
}

/**
 * Get details for a specific locality by ID
 * @param id Locality ID
 * @returns Locality details
 */
export async function getLocalityById(id: number) {
  try {
    const url = `${BASE_URL}/localities/${id}/`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error getting locality #${id}:`, error);
    return { error: `Failed to get locality #${id}` };
  }
}