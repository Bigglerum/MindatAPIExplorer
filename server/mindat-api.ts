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
  
  try {
    // Make the request without timeout to avoid type issues
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      console.error(`API search failed with status ${response.status} for URL: ${url.toString()}`);
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    // If it's an abort error (timeout), provide a clearer message
    if (error.name === 'AbortError') {
      console.error(`API request timed out for URL: ${url.toString()}`);
      throw new Error('API request timed out');
    }
    
    // Otherwise, rethrow the original error
    throw error;
  }
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
    
    // APPROACH 1: Using locentries with filtering
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
    
    // Initialize arrays for all mineral finding approaches
    let approachOneMineralIds: number[] = [];
    let approachTwoMineralIds: number[] = [];
    
    // Process locentries approach
    if (locentriesResponse.ok) {
      const locentriesData = await locentriesResponse.json();
      console.log(`Found ${locentriesData?.results?.length || 0} mineral entries for locality ID: ${localityId}`);
      
      if (locentriesData.results && locentriesData.results.length > 0) {
        // Filter entries where the locality ID actually matches our target
        const filteredEntries = locentriesData.results.filter((entry: any) => entry.loc === localityId);
        console.log(`Filtered to ${filteredEntries.length} entries that actually match locality ID ${localityId}`);
        
        if (filteredEntries.length > 0) {
          // Extract mineral IDs from filtered entries
          approachOneMineralIds = filteredEntries.map((entry: any) => entry.min);
          console.log(`Approach 1: Found ${approachOneMineralIds.length} mineral IDs directly associated with locality`);
        }
      }
    } else {
      console.log(`Locentries API request failed with status ${locentriesResponse.status}`);
    }
    
    // APPROACH 2: Try more direct approaches to find minerals at a locality
    console.log("Trying direct locality-mineral associations");
    
    // Get locality details which might include mineral lists
    const localityDetailsUrl = `${BASE_URL}/localities/${localityId}/`;
    try {
      const detailsResponse = await fetch(localityDetailsUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (detailsResponse.ok) {
        const localityDetails = await detailsResponse.json();
        
        // ----- APPROACH 2.1: Check minerals directly listed in locality details -----
        // Some localities have direct mineral listings
        if (localityDetails.minerals && Array.isArray(localityDetails.minerals) && localityDetails.minerals.length > 0) {
          console.log(`Found ${localityDetails.minerals.length} minerals directly listed in locality details`);
          localityDetails.minerals.forEach((mineralId: number) => {
            if (!approachTwoMineralIds.includes(mineralId)) {
              approachTwoMineralIds.push(mineralId);
            }
          });
        }
        
        // ----- APPROACH 2.2: Check the related_minerals field -----
        if (localityDetails.related_minerals && Array.isArray(localityDetails.related_minerals) && localityDetails.related_minerals.length > 0) {
          console.log(`Found ${localityDetails.related_minerals.length} related minerals in locality details`);
          localityDetails.related_minerals.forEach((mineral: any) => {
            if (mineral.id && !approachTwoMineralIds.includes(mineral.id)) {
              approachTwoMineralIds.push(mineral.id);
            }
          });
        }
        
        // ----- APPROACH 2.3: Use minextnt endpoint to find minerals by locality -----
        try {
          const minextntUrl = `${BASE_URL}/minextnt/`;
          const minextntParams = {
            locality: localityId.toString(),
            limit: '100'
          };
          
          const minextntQueryString = new URLSearchParams(minextntParams).toString();
          console.log(`Trying minextnt endpoint: ${minextntUrl}?${minextntQueryString}`);
          
          const minextntResponse = await fetch(`${minextntUrl}?${minextntQueryString}`, {
            method: 'GET',
            headers: getAuthHeaders()
          });
          
          if (minextntResponse.ok) {
            const minextntData = await minextntResponse.json();
            
            if (minextntData.results && minextntData.results.length > 0) {
              console.log(`Found ${minextntData.results.length} minerals via minextnt endpoint`);
              
              minextntData.results.forEach((entry: any) => {
                if (entry.min && !approachTwoMineralIds.includes(entry.min)) {
                  approachTwoMineralIds.push(entry.min);
                }
              });
            }
          }
        } catch (err) {
          console.log("Error with minextnt approach:", err);
        }
        
        // ----- APPROACH 2.4: Use website data to extract manually listed minerals -----
        if (localityDetails.txt) {
          try {
            // Request full locality page that might have mineral listings
            const localityPageUrl = `${BASE_URL}/localities-detail/${localityId}/`;
            console.log(`Trying localities-detail endpoint: ${localityPageUrl}`);
            
            const pageResponse = await fetch(localityPageUrl, {
              method: 'GET',
              headers: getAuthHeaders()
            });
            
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              
              if (pageData.minerals && Array.isArray(pageData.minerals) && pageData.minerals.length > 0) {
                console.log(`Found ${pageData.minerals.length} minerals in locality-detail data`);
                
                pageData.minerals.forEach((mineral: any) => {
                  if (mineral.id && !approachTwoMineralIds.includes(mineral.id)) {
                    approachTwoMineralIds.push(mineral.id);
                  }
                });
              }
            }
          } catch (err) {
            console.log("Error with locality-detail approach:", err);
          }
        }
        
        // ----- APPROACH 2.5: Use element filtering to find potential minerals -----
        if (localityDetails.elements) {
          const elementsStr = localityDetails.elements.replace(/-/g, ',').replace(/,,/g, ',');
          const elements = elementsStr.split(',').filter(Boolean);
          
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements at this locality: ${elements.join(', ')}`);
            
            // Search for minerals containing these elements
            // We'll limit to 3 key elements to avoid too many results
            const keyElements = elements.slice(0, Math.min(3, elements.length));
            
            // Call the minerals API with element filtering
            const mineralsUrl = `${BASE_URL}/minerals-ima/`;
            const mineralsParams = {
              elements: keyElements.join(','),
              limit: '50'
            };
            
            const mineralsQueryString = new URLSearchParams(mineralsParams).toString();
            console.log(`Searching for minerals with elements: ${keyElements.join(', ')}`);
            
            const mineralsResponse = await fetch(`${mineralsUrl}?${mineralsQueryString}`, {
              method: 'GET',
              headers: getAuthHeaders()
            });
            
            if (mineralsResponse.ok) {
              const mineralsData = await mineralsResponse.json();
              
              if (mineralsData.results && mineralsData.results.length > 0) {
                console.log(`Found ${mineralsData.results.length} minerals containing the elements ${keyElements.join(', ')}`);
                
                // For each mineral, check if it's found at this locality using locentries
                const potentialMineralIds = mineralsData.results.map((mineral: any) => mineral.id);
                
                // Check each mineral to see if it's at this locality
                for (const mineralId of potentialMineralIds) {
                  try {
                    const mineralLocUrl = `${BASE_URL}/locentries/`;
                    const params = {
                      min: mineralId.toString(),
                      limit: '20'
                    };
                    
                    const queryString = new URLSearchParams(params).toString();
                    const response = await fetch(`${mineralLocUrl}?${queryString}`, {
                      method: 'GET',
                      headers: getAuthHeaders()
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      
                      if (data.results) {
                        // Check if any of the results match our locality
                        const matchingEntry = data.results.find((entry: any) => entry.loc === localityId);
                        
                        if (matchingEntry) {
                          if (!approachTwoMineralIds.includes(mineralId)) {
                            approachTwoMineralIds.push(mineralId);
                            console.log(`Found mineral ${mineralId} at locality ${localityId}`);
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.log(`Error checking if mineral ${mineralId} is at locality ${localityId}:`, err);
                  }
                }
              }
            }
          }
        }
        
        console.log(`APPROACH 2: Found ${approachTwoMineralIds.length} minerals at locality through direct approaches`);
      }
    } catch (err) {
      console.log("Error with direct approaches:", err);
    }
    
    // Combine unique mineral IDs from both approaches
    const uniqueIds = new Set([...approachOneMineralIds, ...approachTwoMineralIds]);
    const allMineralIds = Array.from(uniqueIds);
    console.log(`Total unique mineral IDs found: ${allMineralIds.length}`);
    
    if (allMineralIds.length === 0) {
      console.log(`No minerals found at locality ID ${localityId} through any approach`);
      return {
        error: 'No minerals found',
        details: `No minerals found at ${matchedLocality.txt} through API`
      };
    }
    
    // Fetch details for each mineral
    const mineralDetails: any[] = [];
    
    // Process in batches to avoid making too many requests at once
    const batchSize = 10;
    for (let i = 0; i < allMineralIds.length; i += batchSize) {
      const batchIds = allMineralIds.slice(i, i + batchSize);
      
      // Fetch details for these minerals
      await Promise.all(batchIds.map(async (mineralId: number) => {
        try {
          // Try multiple endpoints to get full mineral information
          let mineralData: any = {};
          let foundData = false;
          
          // First try minerals-ima endpoint
          try {
            const imaUrl = `${BASE_URL}/minerals-ima/${mineralId}/`;
            const imaResponse = await fetch(imaUrl, {
              method: 'GET',
              headers: getAuthHeaders()
            });
            
            if (imaResponse.ok) {
              mineralData = await imaResponse.json();
              foundData = true;
              
              // Get formula if available
              if (!mineralData.formula_html && mineralData.id) {
                try {
                  // Try getting detailed formula from geomaterials
                  const detailUrl = `${BASE_URL}/geomaterials/${mineralId}/`;
                  const detailResponse = await fetch(detailUrl, {
                    method: 'GET',
                    headers: getAuthHeaders()
                  });
                  
                  if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    if (detailData.formula_html) {
                      mineralData.formula_html = detailData.formula_html;
                    }
                  }
                } catch (err) {
                  console.log(`Error getting formula for mineral ${mineralId}:`, err);
                }
              }
            }
          } catch (err) {
            console.log(`Error getting IMA data for mineral ${mineralId}:`, err);
          }
          
          // If IMA data not found, try geomaterials
          if (!foundData) {
            try {
              const geoUrl = `${BASE_URL}/geomaterials/${mineralId}/`;
              const geoResponse = await fetch(geoUrl, {
                method: 'GET',
                headers: getAuthHeaders()
              });
              
              if (geoResponse.ok) {
                mineralData = await geoResponse.json();
                foundData = true;
              }
            } catch (err) {
              console.log(`Error getting geomaterial data for mineral ${mineralId}:`, err);
            }
          }
          
          // If we found mineral data, add it to our results
          if (foundData && (mineralData.name || mineralData.title)) {
            // Use title as name if name is not available
            if (!mineralData.name && mineralData.title) {
              mineralData.name = mineralData.title;
            }
            
            // Use name as title if title is not available
            if (!mineralData.title && mineralData.name) {
              mineralData.title = mineralData.name;
            }
            
            mineralDetails.push(mineralData);
          }
        } catch (mineralError) {
          console.error(`Error processing mineral ${mineralId}:`, mineralError);
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