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
    
    // First, search for the locality by name
    const localitySearchResult = await searchLocalities({ name: localityName, limit: 10 });
    
    if (!localitySearchResult?.data?.results || localitySearchResult.data.results.length === 0) {
      console.log(`No locality found with name: ${localityName}`);
      return { error: 'Locality not found', details: `No locality found with name ${localityName}` };
    }
    
    console.log(`Found ${localitySearchResult.data.results.length} possible locality matches for ${localityName}`);
    
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
    
    // Now, get the minerals found at this locality
    const localityId = matchedLocality.id;
    console.log(`Getting minerals for locality ID: ${localityId}`);
    
    try {
      // First attempt - get the locality details to extract the elements
      const localityUrl = `${BASE_URL}/localities/${localityId}/`;
      
      let localityDetailsResponse = await fetch(localityUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!localityDetailsResponse.ok) {
        throw new Error(`Locality details API request failed with status ${localityDetailsResponse.status}`);
      }
      
      const localityDetails = await localityDetailsResponse.json();
      console.log(`Got locality details for ID: ${localityId}`);
      
      // Check if we have the elements field which can help us identify minerals
      if (localityDetails && localityDetails.elements) {
        console.log(`Locality has elements data: ${localityDetails.elements}`);
        
        // Parse the elements string - it's in format like "-Ba-O-S-Ca-C-Sr-H-Fe-"
        const elementsStr = localityDetails.elements;
        const elements = elementsStr.split('-').filter(e => e !== '');
        
        if (elements.length > 0) {
          console.log(`Extracted elements from locality: ${elements.join(', ')}`);
          
          // Now try to find minerals with these elements
          const mineralsByElementPromises = elements.map(async (element) => {
            const searchUrl = `${BASE_URL}/geomaterials/?elements=${element}&limit=30`;
            console.log(`Searching minerals with element: ${element}`);
            
            const searchResponse = await fetch(searchUrl, {
              method: 'GET',
              headers: getAuthHeaders()
            });
            
            if (!searchResponse.ok) {
              console.log(`Search for element ${element} failed with status ${searchResponse.status}`);
              return [];
            }
            
            const searchData = await searchResponse.json();
            if (searchData?.results) {
              console.log(`Found ${searchData.results.length} minerals containing element ${element}`);
              return searchData.results;
            }
            return [];
          });
          
          // Wait for all element searches to complete
          const mineralsByElementResults = await Promise.all(mineralsByElementPromises);
          
          // Combine and deduplicate results by ID
          const mineralMap = new Map();
          mineralsByElementResults.flat().forEach(mineral => {
            if (!mineralMap.has(mineral.id)) {
              mineralMap.set(mineral.id, mineral);
            }
          });
          
          const combinedMinerals = Array.from(mineralMap.values());
          console.log(`Found ${combinedMinerals.length} unique minerals with elements at this locality`);
          
          if (combinedMinerals.length > 0) {
            return { 
              data: {
                locality: matchedLocality,
                minerals: combinedMinerals,
                note: "This list of minerals is generated based on elements reported at this locality. The Mindat API doesn't provide a direct list of minerals for this specific location.",
                elements: elements
              }
            };
          }
        }
      }

      // Second attempt - Use the proper geomaterials endpoint with locality parameter
      console.log(`Using geomaterials endpoint with locality ID: ${localityId}`);
      
      // Use the correct endpoint pattern as shown in the example
      const mineralsUrl = `${BASE_URL}/geomaterials/`;
      const searchParams = {
        locality: localityId.toString(),
        fields: "id,name,ima_formula,ima_status,mindat_formula,formula,description,variantof",
        limit: "50"
      };
      
      const queryString = new URLSearchParams(searchParams).toString();
      const fullUrl = `${mineralsUrl}?${queryString}`;
      
      console.log(`Making request to: ${fullUrl}`);
      let mineralsResponse = await fetch(fullUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (mineralsResponse.ok) {
        const mineralsData = await mineralsResponse.json();
        console.log(`Found ${mineralsData?.results?.length || 0} minerals at locality ID: ${localityId}`);
        
        return { 
          data: {
            locality: matchedLocality,
            minerals: mineralsData?.results || []
          }
        };
      } else {
        console.log(`Geomaterials endpoint failed with status ${mineralsResponse.status}, trying alternative approach`);
        
        // Third attempt - try with a different parameter format
        const altParams = {
          locality_ids: localityId.toString(),
          fields: "id,name,ima_formula,ima_status,mindat_formula,formula,description,variantof",
          limit: "50"
        };
        
        const altQueryString = new URLSearchParams(altParams).toString();
        const altUrl = `${mineralsUrl}?${altQueryString}`;
        
        console.log(`Trying alternate parameter format: ${altUrl}`);
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log(`Found ${altData?.results?.length || 0} minerals with alternative approach`);
          
          return { 
            data: {
              locality: matchedLocality,
              minerals: altData?.results || []
            }
          };
        }
        
        console.log(`Alternative approach also failed, trying direct search by locality name`);
        
        // Fourth attempt - try searching for minerals with the locality name in the description
        const localitySearchTerm = matchedLocality.txt.split(',')[0].trim(); // Use just the first part of the locality name
        console.log(`Trying mineral search with locality name: ${localitySearchTerm}`);
        
        // Search for minerals that might be associated with this locality by name
        const nameSearchParams = {
          q: localitySearchTerm,
          limit: "30",
          offset: "0"
        };
        
        console.log(`Performing mineral search with params:`, JSON.stringify(nameSearchParams));
        
        const searchUrl = `${BASE_URL}/geomaterials/?` + new URLSearchParams(nameSearchParams as Record<string, string>);
        const searchResponse = await fetch(searchUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (!searchResponse.ok) {
          throw new Error(`Mineral search API request failed with status ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        console.log(`Found ${searchData?.results?.length || 0} potential minerals through search`);
        
        if (searchData?.results?.length > 0) {
          return { 
            data: {
              locality: matchedLocality,
              minerals: searchData.results,
              note: "This is an approximate list of minerals that might be associated with this locality based on search results. The Mindat API doesn't provide direct locality-mineral association for this location."
            }
          };
        }
      }
      
      throw new Error("No minerals found through any API method");
    } catch (mineralsError: any) {
      console.error(`Error getting minerals for locality #${localityId}:`, mineralsError);
      
      // No special handling - we must only use API data
      console.log("No minerals found through API for this locality");
      
      return { 
        error: 'Failed to get minerals for locality', 
        details: mineralsError.message || 'Unknown error' 
      };
    }
  } catch (error: any) {
    console.error(`Error finding minerals at ${localityName}:`, error);
    return {
      error: `Failed to find minerals at ${localityName}`,
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
      
      // Get mineral relationships if available
      try {
        console.log(`Fetching relationship data for mineral ID: ${id}`);
        const relationshipsUrl = `${BASE_URL}/geomaterials/${id}/relationships/`;
        
        const relationshipsResponse = await fetch(relationshipsUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (relationshipsResponse.ok) {
          const relationshipsData = await relationshipsResponse.json();
          console.log(`Found relationship data for mineral ID: ${id}`);
          
          // Add relationship data to the response
          if (relationshipsData) {
            data.relationships = relationshipsData;
          }
        }
      } catch (relationshipsError: any) {
        console.error(`Error getting relationships for mineral #${id}:`, relationshipsError);
        // Continue without relationship data if there's an error
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
    
    // Enhance data with additional API calls for more details if needed
    if (data) {
      console.log(`Successfully retrieved basic data for locality ID: ${id}`);
      
      // Get minerals found at this locality
      try {
        console.log(`Fetching minerals found at locality ID: ${id}`);
        const mineralsUrl = `${BASE_URL}/localities/${id}/minerals/`;
        
        const mineralsResponse = await fetch(mineralsUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (mineralsResponse.ok) {
          const mineralsData = await mineralsResponse.json();
          console.log(`Found ${mineralsData?.results?.length || 0} minerals at locality ID: ${id}`);
          
          // Add minerals data to the response
          if (mineralsData?.results?.length > 0) {
            data.minerals = mineralsData.results;
          }
        }
      } catch (mineralsError: any) {
        console.error(`Error getting minerals for locality #${id}:`, mineralsError);
        // Continue without minerals data if there's an error
      }
      
      // Get images for this locality if available
      try {
        console.log(`Fetching images for locality ID: ${id}`);
        const imagesUrl = `${BASE_URL}/localities/${id}/images/`;
        
        const imagesResponse = await fetch(imagesUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          console.log(`Found ${imagesData?.results?.length || 0} images for locality ID: ${id}`);
          
          // Add images data to the response
          if (imagesData?.results?.length > 0) {
            data.images = imagesData.results;
          }
        }
      } catch (imagesError: any) {
        console.error(`Error getting images for locality #${id}:`, imagesError);
        // Continue without images data if there's an error
      }
    }
    
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
    
    // First, search for the mineral by name
    const mineralSearchResult = await searchMinerals({ name: mineralName, limit: 10 });
    
    if (!mineralSearchResult?.data?.results || mineralSearchResult.data.results.length === 0) {
      console.log(`No minerals found with name: ${mineralName}`);
      return { error: 'Mineral not found', details: `No minerals found with name ${mineralName}` };
    }
    
    console.log(`Found ${mineralSearchResult.data.results.length} possible matches for ${mineralName}`);
    
    // Look for the best match (exact or closest match)
    let matchedMineral = null;
    const normalizedSearchName = mineralName.toLowerCase().trim();
    
    // Try for exact match first
    matchedMineral = mineralSearchResult.data.results.find((mineral: any) => 
      mineral.name && mineral.name.toLowerCase() === normalizedSearchName
    );
    
    // If no exact match, use the first result
    if (!matchedMineral && mineralSearchResult.data.results.length > 0) {
      matchedMineral = mineralSearchResult.data.results[0];
      console.log(`Using closest match: ${matchedMineral.name} (ID: ${matchedMineral.id})`);
    }
    
    if (!matchedMineral) {
      return { error: 'No matching mineral found', details: `Couldn't find a clear match for ${mineralName}` };
    }
    
    // Now, get the mineral details including type locality
    const mineralId = matchedMineral.id;
    console.log(`Getting details for mineral ID: ${mineralId}`);
    
    const mineralDetails = await getMineralById(mineralId);
    
    if (mineralDetails.error) {
      return mineralDetails;
    }
    
    // Check if we have type locality information
    if (mineralDetails.data?.type_localities && mineralDetails.data.type_localities.length > 0) {
      console.log(`Found ${mineralDetails.data.type_localities.length} type localities for ${mineralName}`);
      // Return success with type locality data
      return {
        data: {
          mineral: matchedMineral,
          type_localities: mineralDetails.data.type_localities
        }
      };
    } else {
      // Try an additional approach - some minerals might list type locality info directly
      if (mineralDetails.data?.type_locality_id || mineralDetails.data?.type_locality) {
        const typeLocalityId = mineralDetails.data.type_locality_id;
        const typeLocalityName = mineralDetails.data.type_locality;
        
        console.log(`Found type locality reference with ID: ${typeLocalityId} and name: ${typeLocalityName}`);
        
        if (typeLocalityId) {
          // If we have the ID, fetch the locality details
          const localityDetails = await getLocalityById(typeLocalityId);
          if (localityDetails.error) {
            return {
              data: {
                mineral: matchedMineral,
                type_localities: [{ name: typeLocalityName }]
              }
            };
          } else {
            return {
              data: {
                mineral: matchedMineral,
                type_localities: [localityDetails.data]
              }
            };
          }
        } else {
          // Just return the name if that's all we have
          return {
            data: {
              mineral: matchedMineral,
              type_localities: [{ name: typeLocalityName }]
            }
          };
        }
      }
      
      // If we get here, we couldn't find explicit type locality information
      console.log(`No type locality information found for ${mineralName}`);
      return {
        data: {
          mineral: matchedMineral,
          type_localities: []
        }
      };
    }
  } catch (error: any) {
    console.error(`Error finding type locality for ${mineralName}:`, error);
    return {
      error: `Failed to find type locality for ${mineralName}`,
      details: error.message || 'Unknown error'
    };
  }
}