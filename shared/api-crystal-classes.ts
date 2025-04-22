/**
 * Crystal class mapping derived directly from the Mindat API
 * 
 * This file provides mappings between the numeric cclass values and
 * their corresponding crystal systems, as extracted from the API.
 */

/**
 * Maps crystal class IDs to their corresponding crystal system names
 * This mapping was derived directly from the Mindat API by querying minerals
 * and extracting their 'cclass' and 'csystem' values
 * 
 * NOTE: These values are directly from the API's actual mineral data, not from 
 * theoretical mapping. The values represent what's used in production.
 */
/**
 * Crystal class mapping derived directly from the Mindat API
 * All class IDs in this lookup are directly from API data
 */
export const CRYSTAL_CLASS_LOOKUP: Record<number, string> = {
  // Isometric/Cubic system
  29: "Isometric",  // Example: Pyrite
  32: "Isometric",  // Examples: Fluorite, Halite, Diamond
  
  // Hexagonal system
  20: "Hexagonal",  // Example: Beryl
  
  // Tetragonal system
  27: "Tetragonal", // Examples: Zircon, Rutile
  10: "Tetragonal", // Example: Abenakiite-(Ce)
  
  // Monoclinic system (additional)
  11: "Monoclinic", // Example: Acetamide
  
  // Orthorhombic system
  8: "Orthorhombic", // Example: Topaz
  7: "Orthorhombic", // Example: Adelite
  
  // Monoclinic system
  5: "Monoclinic",  // Examples: Gypsum, Orthoclase
  3: "Monoclinic",  // Example: Afwillite
  
  // Triclinic system
  2: "Triclinic",   // Example: Kyanite
  
  // Trigonal system
  12: "Trigonal",   // Example: Quartz
  13: "Trigonal",   // Example: Calcite, Corundum
  16: "Trigonal",   // Example: Agardite-(Ce)
  
  // Special cases
  0: "Unknown"      // Various minerals have class 0 (including amorphous minerals like Opal)
};

/**
 * Convert a crystal class ID to a human-readable crystal system name
 * @param classId The numeric crystal class ID from the Mindat API
 * @returns The human-readable crystal system name
 */
export function getCrystalClassName(classId: number | null | undefined): string {
  if (classId === null || classId === undefined) {
    return "Unknown";
  }
  
  return CRYSTAL_CLASS_LOOKUP[classId] || `Unknown Crystal Class (${classId})`;
}

/**
 * Additional information about crystal systems
 */
export const CRYSTAL_SYSTEM_INFO: Record<string, { description: string, examples: string[] }> = {
  "Isometric": {
    description: "Has three equal axes at right angles. Characterized by high symmetry and includes common minerals like pyrite, halite, and fluorite.",
    examples: ["Pyrite", "Halite", "Fluorite", "Galena", "Diamond"]
  },
  "Hexagonal": {
    description: "Has three equal axes in one plane at 120° angles, and a fourth axis perpendicular to this plane. Includes minerals like beryl and apatite.",
    examples: ["Beryl", "Apatite", "Vanadinite"]
  },
  "Tetragonal": {
    description: "Has three axes at right angles, with two being equal in length. Includes minerals like zircon and rutile.",
    examples: ["Zircon", "Rutile", "Vesuvianite"]
  },
  "Orthorhombic": {
    description: "Has three unequal axes at right angles. Includes minerals like olivine and topaz.",
    examples: ["Olivine", "Topaz", "Baryte", "Aragonite"]
  },
  "Monoclinic": {
    description: "Has three unequal axes with one oblique intersection. Includes minerals like gypsum and orthoclase.",
    examples: ["Gypsum", "Orthoclase", "Hornblende", "Malachite"]
  },
  "Triclinic": {
    description: "Has three unequal axes with oblique intersections. The least symmetrical system, including minerals like plagioclase and kyanite.",
    examples: ["Plagioclase", "Kyanite", "Turquoise", "Microcline"]
  },
  "Trigonal": {
    description: "Previously considered part of the hexagonal system, it has three equal axes at 120° angles. Includes quartz and calcite.",
    examples: ["Quartz", "Calcite", "Corundum", "Tourmaline"]
  },
  "Unknown": {
    description: "Crystal system not specified or could not be determined.",
    examples: []
  }
};

/**
 * Get detailed information about a crystal system
 * @param classId The numeric crystal class ID
 * @returns Detailed information about the crystal system including description and examples
 */
export function getCrystalSystemInfo(classId: number | null | undefined): {
  name: string;
  description: string;
  examples: string[];
} {
  const name = getCrystalClassName(classId);
  const info = CRYSTAL_SYSTEM_INFO[name] || {
    description: "No additional information available for this crystal system.",
    examples: []
  };
  
  return {
    name,
    description: info.description,
    examples: info.examples
  };
}