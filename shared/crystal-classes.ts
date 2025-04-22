/**
 * Utility for converting crystal class ID values to readable names
 * 
 * The crystal class (cclass) field in Mindat API represents the crystal system of a mineral.
 * This file provides functions to convert these numeric values to human-readable names.
 */

/**
 * Maps crystal class IDs to their corresponding crystal system names
 */
export const CRYSTAL_CLASS_LOOKUP: Record<number, string> = {
  1: "Isometric (Cubic)",
  2: "Hexagonal",
  3: "Tetragonal", 
  4: "Orthorhombic",
  5: "Monoclinic",
  6: "Triclinic",
  7: "Trigonal",
  8: "Amorphous"
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
  "Isometric (Cubic)": {
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
  "Amorphous": {
    description: "No definite crystalline structure. Includes minerals like opal which lack a regular internal atomic arrangement.",
    examples: ["Opal", "Obsidian", "Limonite"]
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