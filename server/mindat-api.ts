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
    console.log('Searching minerals with params:', JSON.stringify(params));
    
    const queryParams: Record<string, any> = {
      limit: params.limit || 10,
      offset: params.offset || 0
    };
    
    // Add search parameters if provided
    // For name search, try different approaches - some endpoints use 'q', some use 'name'
    if (params.name) {
      // Try multiple approaches in separate calls
      try {
        // First try: Using 'q' parameter (general search)
        console.log(`Trying mineral search with q=${params.name}`);
        const nameSearch1 = await executeSearch('/geomaterials/', { 
          q: params.name,
          limit: queryParams.limit,
          offset: queryParams.offset
        });
        
        if (nameSearch1?.results && nameSearch1.results.length > 0) {
          console.log(`Found ${nameSearch1.results.length} results using 'q' parameter`);
          return { data: nameSearch1 };
        }
        
        // Second try: Using 'name' parameter
        console.log(`Trying mineral search with name=${params.name}`);
        const nameSearch2 = await executeSearch('/geomaterials/', { 
          name: params.name,
          limit: queryParams.limit,
          offset: queryParams.offset
        });
        
        if (nameSearch2?.results && nameSearch2.results.length > 0) {
          console.log(`Found ${nameSearch2.results.length} results using 'name' parameter`);
          return { data: nameSearch2 };
        }
        
        // Third try: Using 'txt' parameter (works for localities, might work for minerals)
        console.log(`Trying mineral search with txt=${params.name}`);
        const nameSearch3 = await executeSearch('/geomaterials/', { 
          txt: params.name,
          limit: queryParams.limit,
          offset: queryParams.offset
        });
        
        if (nameSearch3?.results && nameSearch3.results.length > 0) {
          console.log(`Found ${nameSearch3.results.length} results using 'txt' parameter`);
          return { data: nameSearch3 };
        }
        
        console.log('No results found for mineral search using name variations');
        return { data: { results: [] } };
      } catch (nameError) {
        console.error('Error in mineral name search variations:', nameError);
        // Continue with the fallback approach below if all name searches fail
      }
    }
    
    // If name search variations failed or weren't attempted, try the standard search
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
    
    // If we got here, try a standard search with whatever parameters we have
    console.log('Trying standard mineral search with parameters:', queryParams);
    const data = await executeSearch('/geomaterials/', queryParams);
    return { data };
  } catch (error: any) {
    console.error('Error searching minerals:', error);
    return { 
      error: 'Failed to search minerals', 
      details: error.message || 'Unknown error' 
    };
  }
}

/**
 * Helper function to execute an API search
 */
async function executeSearch(endpoint: string, params: Record<string, any>) {
  // Construct the URL with query parameters
  const url = new URL(endpoint, BASE_URL);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  console.log('Executing API search:', url.toString());
  
  // Make the request
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    console.error(`API search failed with status ${response.status} for URL: ${url.toString()}`);
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Search for localities in the Mindat database
 * @param params Search parameters
 * @returns API response data
 */
export async function searchLocalities(params: LocalitySearchParams) {
  try {
    console.log('Searching localities with params:', JSON.stringify(params));
    
    const queryParams: Record<string, any> = {
      limit: params.limit || 10,
      offset: params.offset || 0
    };

    // Try multiple approaches for locality searches
    // The API seems to prefer 'txt' parameter but we'll try alternatives too
    if (params.name || params.country || params.region) {
      // Create the search text - prioritize name, then country, then region
      const searchText = params.name || params.country || params.region;
      
      try {
        // Primary try: Using 'txt' parameter (most reliable for localities)
        console.log(`Trying locality search with txt=${searchText}`);
        const search1 = await executeSearch('/localities/', { 
          txt: searchText,
          limit: queryParams.limit,
          offset: queryParams.offset
        });
        
        if (search1?.results && search1.results.length > 0) {
          console.log(`Found ${search1.results.length} results using 'txt' parameter`);
          
          // Filter out problematic results
          if (search1.results) {
            search1.results = search1.results.filter((loc: any) => {
              // Filter out the problematic Afghanistan result
              if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
                  loc.country && loc.country === "Afghanistan") {
                return false;
              }
              
              // If searching for a specific country, filter by that country
              if (params.country && loc.country && 
                  loc.country.toLowerCase() !== params.country.toLowerCase()) {
                return false;
              }
              
              // If searching for a specific region, filter by that region
              if (params.region && loc.region && 
                  !loc.region.toLowerCase().includes(params.region.toLowerCase())) {
                return false;
              }
              
              return true;
            });
          }
          
          // If we still have results after filtering
          if (search1.results.length > 0) {
            return { data: search1 };
          }
        }
        
        // Second try: Using 'q' parameter
        console.log(`Trying locality search with q=${searchText}`);
        const search2 = await executeSearch('/localities/', { 
          q: searchText,
          limit: queryParams.limit,
          offset: queryParams.offset
        });
        
        if (search2?.results && search2.results.length > 0) {
          console.log(`Found ${search2.results.length} results using 'q' parameter`);
          
          // Apply the same filtering
          if (search2.results) {
            search2.results = search2.results.filter((loc: any) => {
              if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
                  loc.country && loc.country === "Afghanistan") {
                return false;
              }
              
              if (params.country && loc.country && 
                  loc.country.toLowerCase() !== params.country.toLowerCase()) {
                return false;
              }
              
              if (params.region && loc.region && 
                  !loc.region.toLowerCase().includes(params.region.toLowerCase())) {
                return false;
              }
              
              return true;
            });
          }
          
          if (search2.results.length > 0) {
            return { data: search2 };
          }
        }
        
        // Third try: Using separate parameters
        console.log('Trying locality search with separate parameters');
        const search3Params: Record<string, any> = {
          limit: queryParams.limit,
          offset: queryParams.offset
        };
        
        // Add parameters separately
        if (params.name) search3Params.name = params.name;
        if (params.country) search3Params.country = params.country;
        if (params.region) search3Params.region = params.region;
        
        const search3 = await executeSearch('/localities/', search3Params);
        
        if (search3?.results && search3.results.length > 0) {
          console.log(`Found ${search3.results.length} results using separate parameters`);
          
          // Apply the same filtering
          if (search3.results) {
            search3.results = search3.results.filter((loc: any) => {
              if (loc.txt && loc.txt.includes("Jegdalek ruby deposit") && 
                  loc.country && loc.country === "Afghanistan") {
                return false;
              }
              return true;
            });
          }
          
          if (search3.results.length > 0) {
            return { data: search3 };
          }
        }
        
        console.log('No results found for locality search using any variation');
        return { data: { results: [] } };
      } catch (searchError) {
        console.error('Error in locality search variations:', searchError);
      }
    }
    
    // If all specific searches failed or weren't attempted, try a simple search with whatever parameters
    console.log('Trying basic locality search with minimum parameters');
    const data = await executeSearch('/localities/', { limit: queryParams.limit, offset: queryParams.offset });
    
    // Filter out problematic results
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
  } catch (error: any) {
    console.error('Error searching localities:', error);
    return { 
      error: 'Failed to search localities', 
      details: error.message || 'Unknown error' 
    };
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
  } catch (error: any) {
    console.error(`Error getting mineral #${id}:`, error);
    return { 
      error: `Failed to get mineral #${id}`, 
      details: error.message || 'Unknown error' 
    };
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
  } catch (error: any) {
    console.error(`Error getting locality #${id}:`, error);
    return { 
      error: `Failed to get locality #${id}`, 
      details: error.message || 'Unknown error'
    };
  }
}