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

export interface CrystalClass {
  id: number;
  system: string;
  symbol: string;
  name: string;
}

export interface CrystalClassResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CrystalClass[];
}

export interface SpaceGroup {
  id: number;
  system: string;
  setting?: string;
  symbol_h_m?: string;
  symbol_hall?: string;
  symbol_schoenflies?: string;
  symbol_cctbx?: string;
  number?: number;
  name?: string;
}

export interface SpaceGroupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SpaceGroup[];
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
  if (params.type) queryParams.locality_type = params.type;

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
    // Use the localities endpoint with txt parameter (works correctly)
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { txt: country, limit: 20 }
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

    const result = await response.json();
    
    // Extract data from the nested response structure
    if (result?.data) {
      return result.data;
    }
    
    throw new Error('Invalid response format from Mindat API');
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
      path: `/localities/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const result = await response.json();
    
    // Extract data from the nested response structure
    if (result?.data) {
      return result.data;
    }
    
    throw new Error('Invalid response format from Mindat API');
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
 * Search for mineral species in the Mindat database
 * @param searchTerm The mineral name or partial name to search for
 * @returns Search results with mineral details
 */
export async function searchMineralSpecies(searchTerm: string) {
  try {
    // Use the direct mineral search with the 'q' parameter
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: { 
        q: searchTerm,
        limit: 25 
      }
    });
    
    const data = await response.json();
    
    // Transform the response to a consistent format
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error searching mineral species:', error);
    // Return empty result rather than crashing
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Get coordinates for a locality by name
 * @param name The name of the locality or ID as a string
 * @returns The coordinates if found
 */
/**
 * Search for minerals by crystal system or class
 * @param params Parameters for the search
 * @returns Search results with minerals matching the crystal system
 */
export async function searchMineralsByCrystalSystem(params: {
  name?: string;
  crystal_system?: string;
  crystal_class?: string;
  crystal_class_number?: number; // Parameter for crystal class number (1-32)
  limit?: number;
  page?: number;
}): Promise<any> {
  try {
    // Build search parameters for the mineral search
    const searchParams: Record<string, any> = {
      limit: params.limit || 10,
      page: params.page || 1
    };
    
    // Add the mineral name if provided
    if (params.name) {
      searchParams.name = params.name; // Use 'name' instead of 'q' parameter
      searchParams.exact_match = true; // Use exact matching for keyword search
    }
    
    // If crystal system or class specified, include as part of search
    if (params.crystal_system) {
      searchParams.crystal_system = params.crystal_system;
    }
    
    if (params.crystal_class) {
      searchParams.crystal_class = params.crystal_class;
    }
    
    // Handle crystal class number (1-32) if provided
    if (params.crystal_class_number !== undefined && params.crystal_class_number >= 1 && params.crystal_class_number <= 32) {
      searchParams.cclass = params.crystal_class_number;
      console.log(`Adding cclass parameter: ${params.crystal_class_number}`);
    }
    
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: searchParams
    });
    
    const data = await response.json();
    
    // Transform the response format to be consistent
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error searching minerals by crystal system:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Search for minerals by space group
 * @param params Parameters for the search
 * @returns Search results with minerals matching the space group
 */
export async function searchMineralsBySpaceGroup(params: {
  name?: string;
  space_group?: string;
  crystal_system?: string;
  limit?: number;
  page?: number;
}): Promise<any> {
  try {
    // Build search parameters for the mineral search
    const searchParams: Record<string, any> = {
      limit: params.limit || 10,
      page: params.page || 1
    };
    
    // Add the mineral name if provided
    if (params.name) {
      searchParams.name = params.name; // Use 'name' instead of 'q' parameter
      searchParams.exact_match = true; // Use exact matching for keyword search
    }
    
    // If space group specified, include as part of search
    if (params.space_group) {
      searchParams.space_group = params.space_group;
    }
    
    // If crystal system specified, include as part of search
    if (params.crystal_system) {
      searchParams.crystal_system = params.crystal_system;
    }
    
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: searchParams
    });
    
    const data = await response.json();
    
    // Transform the response format to be consistent
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error searching minerals by space group:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Search for minerals by Dana classification or name
 * Uses the geomaterials endpoint and filters by Dana class parameters
 * 
 * @param params Search parameters including Dana classification and mineral name
 * @returns Mineral search results
 */
export async function searchMineralsByDanaClass(params: {
  name?: string;
  dana_class?: string;
  limit?: number;
  page?: number;
}): Promise<any> {
  try {
    // Build search parameters for the mineral search
    const searchParams: Record<string, any> = {
      limit: params.limit || 10,
      page: params.page || 1
    };
    
    // Add the mineral name if provided
    if (params.name) {
      searchParams.name = params.name; // Use 'name' instead of 'q' parameter
      searchParams.exact_match = "true"; // Use exact matching as string, not boolean
    }
    
    // If Dana class specified, parse it to extract components and add them as search parameters
    if (params.dana_class) {
      console.log(`Searching for minerals with Dana class: ${params.dana_class}`);
      
      // Split the Dana code into components
      const parts = params.dana_class.split('.');
      
      // Add each component as a separate parameter
      if (parts.length > 0 && parts[0]) {
        searchParams.dana8ed1 = parts[0];
      }
      if (parts.length > 1 && parts[1]) {
        searchParams.dana8ed2 = parts[1];
      }
      if (parts.length > 2 && parts[2]) {
        searchParams.dana8ed3 = parts[2];
      }
      if (parts.length > 3 && parts[3]) {
        searchParams.dana8ed4 = parts[3];
      }
      
      console.log("Dana search parameters:", searchParams);
    }
    
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: searchParams
    });
    
    const data = await response.json();
    
    // Add a 'dana_code' property to each result for consistent access
    const enhancedResults = data?.data?.results?.map((mineral: any) => {
      // Construct Dana code from mineral data if available
      if (mineral.dana8ed1) {
        const danaCode = [
          mineral.dana8ed1,
          mineral.dana8ed2,
          mineral.dana8ed3,
          mineral.dana8ed4
        ].filter(Boolean).join('.');
        
        // Add the Dana code for consistent access in components
        return {
          ...mineral,
          dana_code: danaCode
        };
      }
      return mineral;
    }) || [];
    
    // Transform the response format to be consistent
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: enhancedResults
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error searching minerals by Dana class:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Search for minerals by Strunz classification or name
 * Uses the geomaterials endpoint and filters by Strunz class parameters
 * 
 * @param params Search parameters including Strunz classification and mineral name
 * @returns Mineral search results
 */
export async function searchMineralsByStrunzClass(params: {
  name?: string;
  strunz_class?: string;
  limit?: number;
  page?: number;
}): Promise<any> {
  try {
    // Build search parameters for the mineral search
    const searchParams: Record<string, any> = {
      limit: params.limit || 10,
      page: params.page || 1
    };
    
    // Add the mineral name if provided
    if (params.name) {
      searchParams.name = params.name; // Use 'name' instead of 'q' parameter
      searchParams.exact_match = "true"; // Use exact matching as string, not boolean
    }
    
    // If Strunz class specified, parse it to extract components and add them as search parameters
    if (params.strunz_class) {
      console.log(`Searching for minerals with Strunz class: ${params.strunz_class}`);
      
      // Split the Strunz code into components
      const parts = params.strunz_class.split('.');
      
      // Add each component as a separate parameter
      if (parts.length > 0 && parts[0]) {
        searchParams.strunz10ed1 = parts[0];
      }
      if (parts.length > 1 && parts[1]) {
        searchParams.strunz10ed2 = parts[1];
      }
      if (parts.length > 2 && parts[2]) {
        searchParams.strunz10ed3 = parts[2];
      }
      if (parts.length > 3 && parts[3]) {
        searchParams.strunz10ed4 = parts[3];
      }
      
      console.log("Strunz search parameters:", searchParams);
    }
    
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: searchParams
    });
    
    const data = await response.json();
    
    // Add a 'strunz_code' property to each result for consistent access
    const enhancedResults = data?.data?.results?.map((mineral: any) => {
      // Construct Strunz code from mineral data if available
      if (mineral.strunz10ed1) {
        const strunzCode = [
          mineral.strunz10ed1,
          mineral.strunz10ed2,
          mineral.strunz10ed3,
          mineral.strunz10ed4
        ].filter(Boolean).join('.');
        
        // Add the Strunz code for consistent access in components
        return {
          ...mineral,
          strunz_code: strunzCode
        };
      }
      return mineral;
    }) || [];
    
    // Transform the response format to be consistent
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: enhancedResults
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error searching minerals by Strunz class:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

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
    
    // Using name parameter with exact matching for more precise results
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/localities/',
      method: 'GET',
      parameters: { 
        name: name,
        exact_match: "true" 
      }
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
 * Get crystal classes from the Mindat API
 * 
 * @param params Optional parameters for filtering crystal classes
 * @returns Crystal class data
 */
export async function getCrystalClasses(params?: {
  system?: string; // Filter by crystal system (case-insensitive)
  symbol?: string; // Filter by symbol (case-insensitive)
  id_in?: number[]; // Filter by a list of IDs
  page?: number;
  pageSize?: number;
}): Promise<CrystalClassResponse> {
  const queryParams: Record<string, any> = {
    limit: params?.pageSize || 50,
    page: params?.page || 1
  };

  // Add optional filters
  if (params?.system) queryParams.system = params.system;
  if (params?.symbol) queryParams.symbol = params.symbol;
  if (params?.id_in && params.id_in.length > 0) queryParams.id_in = params.id_in.join(',');

  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/crystalclasses/', // Will be handled by the API proxy
      method: 'GET',
      parameters: queryParams
    });

    const data = await response.json();
    
    // Transform the response to match our interface
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error fetching crystal classes:', error);
    throw error;
  }
}

/**
 * Get a specific crystal class by ID
 * 
 * @param id The ID of the crystal class to retrieve
 * @returns The crystal class data
 */
export async function getCrystalClassById(id: number): Promise<CrystalClass> {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/crystalclasses/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    // Return the crystal class data
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Crystal class with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching crystal class #${id}:`, error);
    throw error;
  }
}

/**
 * Get space groups from the Mindat API
 * 
 * @param params Optional parameters for filtering space groups
 * @returns Space group data
 */
export async function getSpaceGroups(params?: {
  system?: string; // Filter by crystal system
  number?: number; // Filter by space group number
  symbol_h_m?: string; // Filter by Hermann-Mauguin symbol
  page?: number;
  pageSize?: number;
}): Promise<SpaceGroupResponse> {
  const queryParams: Record<string, any> = {
    limit: params?.pageSize || 50,
    page: params?.page || 1
  };

  // Add optional filters
  if (params?.system) queryParams.system = params.system;
  if (params?.number) queryParams.number = params.number;
  if (params?.symbol_h_m) queryParams.symbol_h_m = params.symbol_h_m;

  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/spacegroups/',
      method: 'GET',
      parameters: queryParams
    });

    const data = await response.json();
    
    // Transform the response to match our interface
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error fetching space groups:', error);
    throw error;
  }
}

/**
 * Get a specific space group by ID
 * 
 * @param id The ID of the space group to retrieve
 * @returns The space group data
 */
export async function getSpaceGroupById(id: number): Promise<SpaceGroup> {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/spacegroups/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    // Return the space group data
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Space group with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching space group #${id}:`, error);
    throw error;
  }
}

// Interface for Dana Classification data
export interface DanaClass {
  id: string; // Store as a concatenated string like "50.4.9.1"
  code: string; // Same as id but formatted for display like "50.4.9.1"
  name: string; // The name associated with this Dana classification
  description?: string;
}

export interface DanaClassResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DanaClass[];
}

// Dana classification mapping - based on standard Dana classes
const danaClassMapping: Record<string, string> = {
  // Class 1: Native Elements
  "1": "Native Elements",
  // Class 2: Sulfides
  "2": "Sulfides",
  // Class 3: Halides
  "3": "Halides",
  // Class 4: Oxides
  "4": "Oxides",
  // Class 5: Carbonates and Nitrates
  "5": "Carbonates and Nitrates",
  // Class 6: Borates
  "6": "Borates",
  // Class 7: Sulfates, Chromates, Molybdates, Tungstates
  "7": "Sulfates, Chromates, Molybdates, Tungstates",
  // Class 8: Phosphates, Arsenates, Vanadates
  "8": "Phosphates, Arsenates, Vanadates",
  // Class 9: Silicates
  "9": "Silicates",
  // Class 10: Organic Minerals
  "10": "Organic Minerals",
  // Class 50: Organic Compounds (special case)
  "50": "Organic Compounds"
};

/**
 * Get Dana Classification entries by searching minerals with that classification
 * 
 * @param params Optional parameters for filtering 
 * @returns Dana Classification data
 */
export async function getDanaClassification(params?: {
  code?: string; // Filter by Dana code
  name?: string; // Filter by name
  page?: number;
  pageSize?: number;
}): Promise<DanaClassResponse> {
  try {
    // Instead of using a dedicated Dana endpoint, we'll search for minerals
    // using the geomaterials endpoint and extract Dana classification from each mineral
    const queryParams: Record<string, any> = {
      limit: params?.pageSize || 25,
      page: params?.page || 1
    };
    
    // If a name is provided, search for minerals with this name
    if (params?.name) {
      queryParams.name = params.name;
      queryParams.exact_match = "true"; // Use string type for exact_match
    }
    
    // Get mineral data from geomaterials endpoint
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: queryParams
    });

    const data = await response.json();
    
    // Extract Dana classifications from minerals
    if (data?.data?.results) {
      // Create a map to store unique Dana classifications
      const danaMap = new Map<string, DanaClass>();
      
      // Process each mineral to extract Dana classification
      data.data.results.forEach((mineral: any) => {
        if (mineral.dana8ed1) {
          // Construct Dana code components
          const level1 = mineral.dana8ed1;
          const level2 = mineral.dana8ed2 || "0";
          const level3 = mineral.dana8ed3 || "0";
          const level4 = mineral.dana8ed4 || "0";
          
          // Full Dana code (all levels)
          const fullCode = `${level1}.${level2}.${level3}.${level4}`;
          
          // Store each level of Dana classification
          // Level 1
          const level1Key = `${level1}`;
          if (!danaMap.has(level1Key) && danaClassMapping[level1]) {
            danaMap.set(level1Key, {
              id: level1Key,
              code: level1Key,
              name: danaClassMapping[level1] || `Dana Class ${level1}`,
            });
          }
          
          // Level 2
          const level2Key = `${level1}.${level2}`;
          if (!danaMap.has(level2Key)) {
            danaMap.set(level2Key, {
              id: level2Key,
              code: level2Key,
              name: `Subclass ${level2}`,
            });
          }
          
          // Level 3
          const level3Key = `${level1}.${level2}.${level3}`;
          if (!danaMap.has(level3Key)) {
            danaMap.set(level3Key, {
              id: level3Key,
              code: level3Key,
              name: `Group ${level3}`,
            });
          }
          
          // Level 4 (full code)
          if (!danaMap.has(fullCode)) {
            danaMap.set(fullCode, {
              id: fullCode,
              code: fullCode,
              name: `Subgroup ${level4}`,
              description: `Dana Classification for ${mineral.name}`,
            });
          }
        }
      });
      
      // Filter by code if provided
      let results = Array.from(danaMap.values());
      if (params?.code) {
        results = results.filter(item => item.code.startsWith(params.code!));
      }
      
      return {
        count: results.length,
        next: null,
        previous: null,
        results: results
      };
    }
    
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  } catch (error) {
    console.error('Error fetching Dana Classification:', error);
    
    // Return an empty result to avoid breaking the UI
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Get a specific Dana Classification entry by ID
 * 
 * @param id The ID of the Dana entry to retrieve
 * @returns The Dana Classification data
 */
export async function getDanaClassById(id: string): Promise<DanaClass> {
  try {
    // For our implementation, id is the Dana code (e.g., "50.4.9.1")
    // Extract components
    const parts = id.split('.');
    const level1 = parts[0] || "";
    
    // Fetch minerals with this Dana classification to get more information
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/geomaterials/',
      method: 'GET',
      parameters: {
        limit: 10,
        dana8ed1: level1,
        // If we have more levels, add them
        ...(parts.length > 1 && { dana8ed2: parts[1] }),
        ...(parts.length > 2 && { dana8ed3: parts[2] }),
        ...(parts.length > 3 && { dana8ed4: parts[3] })
      }
    });

    const data = await response.json();
    
    // If we found minerals with this Dana classification
    if (data?.data?.results?.length > 0) {
      // Get the first mineral as a reference
      const mineral = data.data.results[0];
      
      // Determine the level name based on how many parts we have
      let levelName = "Class";
      if (parts.length === 2) levelName = "Subclass";
      if (parts.length === 3) levelName = "Group";
      if (parts.length === 4) levelName = "Subgroup";
      
      // Get the class name if it's level 1
      let name = parts.length === 1 && danaClassMapping[level1] 
        ? danaClassMapping[level1] 
        : `Dana ${levelName} ${id}`;
        
      // Add example minerals in the description
      const mineralNames = data.data.results
        .slice(0, 5)
        .map((m: any) => m.name)
        .join(", ");
        
      return {
        id: id,
        code: id,
        name: name,
        description: `Dana Classification ${id}. Example minerals: ${mineralNames}`
      };
    }
    
    // If no minerals found but we have level 1, return basic info
    if (parts.length === 1 && danaClassMapping[level1]) {
      return {
        id,
        code: id,
        name: danaClassMapping[level1],
        description: `Dana Class ${level1}`
      };
    }
    
    // Default fallback
    return {
      id,
      code: id,
      name: `Dana Classification ${id}`,
      description: "No minerals found with this classification"
    };
  } catch (error) {
    console.error(`Error fetching Dana Classification ${id}:`, error);
    
    // Return a basic object to prevent UI errors
    return {
      id,
      code: id,
      name: "Dana Classification",
      description: "Could not fetch details"
    };
  }
}

// Interface for Nickel-Strunz Classification data
export interface StrunzClass {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface StrunzClassResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StrunzClass[];
}

/**
 * Get Nickel-Strunz Classification entries from the Mindat API
 * 
 * @param params Optional parameters for filtering 
 * @returns Nickel-Strunz Classification data
 */
export async function getStrunzClassification(params?: {
  code?: string; // Filter by Strunz code
  name?: string; // Filter by name
  page?: number;
  pageSize?: number;
}): Promise<StrunzClassResponse> {
  const queryParams: Record<string, any> = {
    limit: params?.pageSize || 25,
    page: params?.page || 1
  };

  // Add optional filters
  if (params?.code) queryParams.code = params.code;
  if (params?.name) queryParams.name = params.name;

  try {
    // Use the correct Strunz endpoint
    const response = await apiRequest('POST', '/api/proxy', {
      path: '/nickel-strunz-10/', // Correct path for Nickel-Strunz classification
      method: 'GET',
      parameters: queryParams
    });

    const data = await response.json();
    
    // Transform the response to match our interface
    if (data?.data) {
      return {
        count: data.data.count || 0,
        next: data.data.next,
        previous: data.data.previous,
        results: data.data.results || []
      };
    }
    
    throw new Error('Invalid response format from Mindat API');
  } catch (error) {
    console.error('Error fetching Nickel-Strunz Classification:', error);
    
    // Return an empty result to avoid breaking the UI
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}

/**
 * Get a specific Nickel-Strunz Classification entry by ID
 * 
 * @param id The ID of the Strunz entry to retrieve
 * @returns The Nickel-Strunz Classification data
 */
export async function getStrunzClassById(id: number): Promise<StrunzClass> {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/nickel-strunz-10/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Nickel-Strunz Classification with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching Nickel-Strunz Classification #${id}:`, error);
    
    // Return a basic object to prevent UI errors
    return {
      id: id,
      code: "Unknown",
      name: "Not Found",
      description: "Could not fetch details"
    };
  }
}

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