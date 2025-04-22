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
 * Get minerals found at a specific locality by name
 * @param localityName The name of the locality to search for
 * @returns List of minerals found at the locality
 */
export async function getMineralsAtLocality(localityName: string) {
  try {
    console.log(`Looking for minerals at locality: ${localityName}`);
    
    // First, search for the locality by name to get its ID
    const localitySearchResult = await searchLocalities({ name: localityName, limit: 5 });
    
    if (!localitySearchResult?.data?.results || localitySearchResult.data.results.length === 0) {
      console.log(`No locality found with name: ${localityName}`);
      return { error: 'Locality not found', details: `No locality found with name ${localityName}` };
    }
    
    // Look for the best match (exact or closest match)
    let matchedLocality = null;
    const normalizedSearchName = localityName.toLowerCase().trim();
    
    // Try for exact match first
    for (const loc of localitySearchResult.data.results) {
      if (loc.txt && loc.txt.toLowerCase().includes(normalizedSearchName)) {
        matchedLocality = loc;
        console.log(`Using exact match: ${loc.txt} (ID: ${loc.id})`);
        break;
      }
    }
    
    // If no exact match, use the first result
    if (!matchedLocality && localitySearchResult.data.results.length > 0) {
      matchedLocality = localitySearchResult.data.results[0];
      console.log(`Using closest match: ${matchedLocality.txt} (ID: ${matchedLocality.id})`);
    }
    
    if (!matchedLocality) {
      return { error: 'No matching locality found', details: `Couldn't find a clear match for ${localityName}` };
    }
    
    // Now get the minerals at this locality
    const localityId = matchedLocality.id;
    
    // First approach: Directly use the locentries endpoint which has mineral-locality relationships
    console.log(`Getting mineral entries for locality ID: ${localityId} using locentries endpoint`);
    const locentriesUrl = `${BASE_URL}/locentries/`;
    const locentriesParams: Record<string, string> = { 
      locality: localityId.toString(),
      limit: '100' // Get a larger number to ensure we get all minerals
    };
    
    const locentriesQueryString = new URLSearchParams(locentriesParams).toString();
    console.log(`Making request to: ${locentriesUrl}?${locentriesQueryString}`);
    
    const locentriesResponse = await fetch(`${locentriesUrl}?${locentriesQueryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!locentriesResponse.ok) {
      console.log(`API request failed with status ${locentriesResponse.status}`);
      
      // Fall back to the pattern from the example code
      console.log('Trying fallback approach using geomaterials endpoint');
      
      // Use the locality parameter with geomaterials endpoint
      const url = `${BASE_URL}/geomaterials/`;
      const params: Record<string, string> = {
        locality: localityId.toString(),
        fields: "id,name,ima_formula,ima_status,mindat_formula,formula,description"
      };
      
      const queryString = new URLSearchParams(params).toString();
      console.log(`Making request to: ${url}?${queryString}`);
      
      const response = await fetch(`${url}?${queryString}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.log(`Alternative API request also failed with status ${response.status}`);
        throw new Error(`Failed to retrieve minerals. API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data?.results?.length || 0} minerals at locality ID: ${localityId}`);
      
      if (!data.results || data.results.length === 0) {
        return {
          error: 'No minerals found',
          details: `No minerals found at locality ${matchedLocality.txt} through API`
        };
      }
      
      return { 
        data: {
          locality: matchedLocality,
          minerals: data.results
        }
      };
    }
    
    const locentriesData = await locentriesResponse.json();
    console.log(`Found ${locentriesData?.results?.length || 0} mineral entries for locality ID: ${localityId}`);
    
    if (!locentriesData.results || locentriesData.results.length === 0) {
      return {
        error: 'No minerals found',
        details: `No minerals found at locality ${matchedLocality.txt} through API`
      };
    }
    
    // Extract the mineral IDs from the locentries
    const mineralIds: number[] = locentriesData.results.map((entry: any) => entry.min);
    console.log(`Extracted ${mineralIds.length} mineral IDs: ${mineralIds.slice(0, 5).join(', ')}...`);
    
    // Fetch details for each mineral
    const mineralDetails: any[] = [];
    
    // Process in batches to avoid making too many requests at once
    const batchSize = 10;
    for (let i = 0; i < mineralIds.length; i += batchSize) {
      const batchIds = mineralIds.slice(i, i + batchSize);
      
      // Fetch details for these minerals
      await Promise.all(batchIds.map(async (mineralId: number) => {
        try {
          const url = `${BASE_URL}/geomaterials/${mineralId}/`;
          const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
          });
          
          if (response.ok) {
            const mineralData = await response.json();
            mineralDetails.push(mineralData);
          } else {
            console.log(`Failed to retrieve details for mineral ID: ${mineralId}`);
          }
        } catch (mineralError) {
          console.error(`Error fetching mineral ${mineralId}:`, mineralError);
        }
      }));
    }
    
    console.log(`Successfully retrieved details for ${mineralDetails.length} minerals`);
    
    if (mineralDetails.length === 0) {
      return {
        error: 'Failed to get mineral details',
        details: `Couldn't retrieve details for minerals at ${matchedLocality.txt}`
      };
    }
    
    return { 
      data: {
        locality: matchedLocality,
        minerals: mineralDetails
      }
    };
  } catch (error: any) {
    const localityIdStr = typeof localityName === 'string' ? localityName : 'unknown locality';
    console.error(`Error finding minerals at ${localityIdStr}:`, error);
    return {
      error: `Failed to find minerals at ${localityIdStr}`,
      details: error.message || 'Unknown error'
    };
  }
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
 * @returns Mineral details with enhanced information
 */
export async function getMineralById(id: number) {
  try {
    console.log(`Getting detailed information for mineral ID: ${id}`);
    const url = `${BASE_URL}/geomaterials/${id}/`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Enhance data with additional API calls for more details if needed
    if (data) {
      console.log(`Successfully retrieved basic data for mineral ID: ${id}`);
      
      // Get type locality if available (using a separate API call)
      try {
        console.log(`Fetching additional type locality data for mineral ID: ${id}`);
        const typeLocalityUrl = `${BASE_URL}/geomaterials/${id}/type_localities/`;
        
        const typeLocalityResponse = await fetch(typeLocalityUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (typeLocalityResponse.ok) {
          const typeLocalityData = await typeLocalityResponse.json();
          console.log(`Found ${typeLocalityData?.results?.length || 0} type localities for mineral ID: ${id}`);
          
          // Add type locality data to the response
          if (typeLocalityData?.results?.length > 0) {
            data.type_localities = typeLocalityData.results;
          }
        } else {
          console.log(`No type locality endpoint available for mineral ID: ${id}`);
        }
      } catch (typeLocalityError: any) {
        console.error(`Error getting type locality for mineral #${id}:`, typeLocalityError);
        // Continue without type locality data if there's an error
      }
    }
    
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
 * @returns Locality details with enhanced information
 */
export async function getLocalityById(id: number) {
  try {
    console.log(`Getting detailed information for locality ID: ${id}`);
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

/**
 * Find type locality for a mineral by name
 * This special function first finds the mineral ID and then gets its type locality
 * @param mineralName The name of the mineral to find the type locality for
 * @returns The type locality details if found
 */
export async function findTypeLocalityForMineral(mineralName: string) {
  try {
    console.log(`Looking for type locality of mineral: ${mineralName}`);
    
    // First, find the mineral by name
    const mineralSearchResult = await searchMinerals({ name: mineralName, limit: 1 });
    
    if (!mineralSearchResult?.data?.results || mineralSearchResult.data.results.length === 0) {
      console.log(`No mineral found with name: ${mineralName}`);
      return { error: 'Mineral not found', details: `No mineral found with name ${mineralName}` };
    }
    
    // Get the first result (most relevant)
    const mineral = mineralSearchResult.data.results[0];
    console.log(`Found mineral: ${mineral.name} (ID: ${mineral.id})`);
    
    // Now get the mineral details to check for type locality info
    const mineralDetailsResult = await getMineralById(mineral.id);
    
    if (mineralDetailsResult.error) {
      return { error: 'Failed to get mineral details', details: mineralDetailsResult.error };
    }
    
    const mineralDetails = mineralDetailsResult.data;
    
    // Check if type localities are available
    if (!mineralDetails.type_localities || mineralDetails.type_localities.length === 0) {
      console.log(`No type locality information available for ${mineralName}`);
      
      // Try to get type locality through a separate API call
      try {
        console.log(`Trying to get type locality through separate API call for mineral ID: ${mineral.id}`);
        const typeLocalityUrl = `${BASE_URL}/geomaterials/${mineral.id}/type_localities/`;
        
        const typeLocalityResponse = await fetch(typeLocalityUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (!typeLocalityResponse.ok) {
          console.log(`Type locality API request failed with status ${typeLocalityResponse.status}`);
          return { error: 'Type locality not found', details: `No type locality information available for ${mineralName}` };
        }
        
        const typeLocalityData = await typeLocalityResponse.json();
        
        if (!typeLocalityData.results || typeLocalityData.results.length === 0) {
          return { error: 'Type locality not found', details: `No type locality information available for ${mineralName}` };
        }
        
        console.log(`Found ${typeLocalityData.results.length} type localities for ${mineralName}`);
        
        // Try to get locality details for the first type locality
        const firstTypeLocalityId = typeLocalityData.results[0].id;
        const localityDetails = await getLocalityById(firstTypeLocalityId);
        
        if (localityDetails.error) {
          return { error: 'Failed to get locality details', details: localityDetails.error };
        }
        
        return {
          data: {
            mineral,
            type_localities: typeLocalityData.results,
            primary_type_locality: localityDetails.data
          }
        };
      } catch (typeLocalityError: any) {
        console.error(`Error getting type locality for ${mineralName}:`, typeLocalityError);
        return { error: 'Failed to find type locality', details: typeLocalityError.message || 'Unknown error' };
      }
    }
    
    // Type localities are available, get details for the first one
    const firstTypeLocalityId = mineralDetails.type_localities[0].id;
    const localityDetails = await getLocalityById(firstTypeLocalityId);
    
    if (localityDetails.error) {
      return { error: 'Failed to get locality details', details: localityDetails.error };
    }
    
    return {
      data: {
        mineral,
        type_localities: mineralDetails.type_localities,
        primary_type_locality: localityDetails.data
      }
    };
  } catch (error: any) {
    console.error(`Error finding type locality for ${mineralName}:`, error);
    return {
      error: `Failed to find type locality for ${mineralName}`,
      details: error.message || 'Unknown error'
    };
  }
}