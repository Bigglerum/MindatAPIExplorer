import { apiRequest } from './queryClient';

/**
 * Service for interacting with the RRUFF API
 */

export interface RruffMineralSearchParams {
  name?: string;
  elements?: string; // comma-separated string
  crystalSystem?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UnitCell {
  a?: number;
  b?: number;
  c?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  z?: number;
  volume?: number;
}

export interface RruffMineral {
  id: number;
  rruffId: string | null;
  mineralName: string;
  chemicalFormula: string | null;
  imaStatus: string | null;
  crystalSystem: string | null;
  crystalClass: string | null;
  spaceGroup: string | null;
  unitCell: UnitCell | null;
  color: string | null;
  density: string | null;
  hardness: string | null;
  elementComposition: Record<string, number> | null;
  yearFirstPublished: number | null;
  comments: string | null;
  url: string | null;
  isActive: boolean | null;
}

export interface RruffMineralResponse {
  minerals: RruffMineral[];
  pagination: Pagination;
}

export interface RruffSpectra {
  id: number;
  mineralId: number;
  spectraType: string;
  sampleId: string | null;
  orientation: string | null;
  wavelength: string | null;
  temperature: string | null;
  pressure: string | null;
  dataUrl: string | null;
  dataPoints: Array<[number, number]> | null;
}

export interface RruffMineralDetailResponse {
  mineral: RruffMineral;
  spectra: RruffSpectra[];
}

/**
 * Search for minerals in the RRUFF database
 * @param params Search parameters
 * @returns Search results with pagination
 */
export async function searchRruffMinerals(params: RruffMineralSearchParams = {}): Promise<RruffMineralResponse> {
  try {
    // Create a URLSearchParams object for the query string
    const searchParams = new URLSearchParams();
    
    // Add all params that are defined
    if (params.name) searchParams.append('name', params.name);
    if (params.elements) searchParams.append('elements', params.elements);
    if (params.crystalSystem && params.crystalSystem !== 'any') {
      searchParams.append('crystalSystem', params.crystalSystem);
    }
    searchParams.append('page', String(params.page || 1));
    searchParams.append('limit', String(params.limit || 20));
    
    // Make the API request
    const response = await fetch(`/api/rruff/minerals?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching RRUFF minerals:', error);
    throw error;
  }
}

/**
 * Get details for a specific mineral by ID
 * @param id Mineral ID
 * @returns Mineral details with spectra
 */
export async function getRruffMineralById(id: number): Promise<RruffMineralDetailResponse> {
  try {
    const response = await fetch(`/api/rruff/minerals/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting RRUFF mineral #${id}:`, error);
    throw error;
  }
}

/**
 * Search for minerals by keyword(s)
 * @param query Search query
 * @param page Page number
 * @param limit Results per page
 * @returns Search results with pagination
 */
export async function searchRruffByKeyword(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<RruffMineralResponse> {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit)
    });
    
    const response = await fetch(`/api/rruff/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error searching RRUFF with query "${query}":`, error);
    throw error;
  }
}

/**
 * Get spectra for a specific mineral
 * @param mineralId Mineral ID
 * @param type Optional spectra type filter
 * @returns Spectra data
 */
export async function getMineralSpectra(
  mineralId: number,
  type?: string
): Promise<{ spectra: RruffSpectra[] }> {
  try {
    const searchParams = new URLSearchParams();
    if (type) searchParams.append('type', type);
    
    const response = await fetch(`/api/rruff/minerals/${mineralId}/spectra?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting spectra for mineral #${mineralId}:`, error);
    throw error;
  }
}