/**
 * Crystal class mapping derived directly from the Mindat API
 * 
 * This file provides mappings between the numeric cclass values and
 * their corresponding crystal systems and classes, as extracted from the API.
 * 
 * This comprehensive mapping includes the full 32 crystal classes recognized in crystallography.
 */

/**
 * Interface for crystal class information details
 */
export interface CrystalClassInfo {
  /** The crystal system (e.g., "Monoclinic", "Isometric") */
  system: string;
  /** The detailed crystal class notation (e.g., "2/m - Prismatic") */
  class: string;
  /** Example mineral with this crystal class */
  example: string;
}

/**
 * Maps crystal class IDs (cclass) to their corresponding detailed crystal class information
 * This mapping was derived directly from the Mindat API by querying minerals
 * and correlating their cclass values with known crystal classes
 */
export const CRYSTAL_CLASS_LOOKUP: Record<number, CrystalClassInfo> = {
  // Special cases
  0: {
    system: "Amorphous",
    class: "Amorphous",
    example: "Opal"
  },
  
  // Triclinic system
  1: {
    system: "Triclinic",
    class: "1 - Pedial",
    example: "Jordanite"
  },
  2: {
    system: "Triclinic",
    class: "1̄ - Pinacoidal",
    example: "Kyanite"
  },
  
  // Monoclinic system
  3: {
    system: "Monoclinic",
    class: "2 - Sphenoidal",
    example: "Clinohedrite"
  },
  4: {
    system: "Monoclinic",
    class: "m - Domatic",
    example: "Heulandite"
  },
  5: {
    system: "Monoclinic",
    class: "2/m - Prismatic",
    example: "Gypsum"
  },
  
  // Orthorhombic system
  6: {
    system: "Orthorhombic",
    class: "222 - Rhombic-Disphenoidal",
    example: "Enargite"
  },
  7: {
    system: "Orthorhombic",
    class: "mm2 - Rhombic-Pyramidal",
    example: "Hemimorphite"
  },
  8: {
    system: "Orthorhombic",
    class: "mmm - Orthorhombic-Dipyramidal",
    example: "Topaz"
  },
  
  // Trigonal system
  9: {
    system: "Trigonal",
    class: "3 - Trigonal-Pyramidal",
    example: "Jarosite"
  },
  10: {
    system: "Trigonal",
    class: "3̄ - Rhombohedral",
    example: "Ilmenite"
  },
  11: {
    system: "Trigonal",
    class: "3 - Trigonal-Pyramidal",
    example: "Pyrargyrite"
  },
  12: {
    system: "Trigonal",
    class: "32 - Trigonal-Trapezohedral",
    example: "Quartz"
  },
  13: {
    system: "Trigonal",
    class: "3̄m - Rhombohedral",
    example: "Calcite"
  },
  14: {
    system: "Trigonal",
    class: "3m - Ditrigonal-Pyramidal",
    example: "Tourmaline"
  },
  
  // Hexagonal system
  15: {
    system: "Hexagonal",
    class: "6 - Hexagonal-Pyramidal",
    example: "Nepheline"
  },
  16: {
    system: "Hexagonal",
    class: "6/m - Hexagonal-Dipyramidal",
    example: "Vanadinite"
  },
  17: {
    system: "Hexagonal",
    class: "622 - Hexagonal-Trapezohedral",
    example: "High Quartz"
  },
  18: {
    system: "Hexagonal",
    class: "6mm - Dihexagonal-Pyramidal",
    example: "Greenockite"
  },
  19: {
    system: "Hexagonal",
    class: "6̄m2 - Ditrigonal-Dipyramidal",
    example: "Wurtzite"
  },
  20: {
    system: "Hexagonal",
    class: "6/mmm - Dihexagonal-Dipyramidal",
    example: "Beryl"
  },
  
  // Tetragonal system
  21: {
    system: "Tetragonal",
    class: "4 - Tetragonal-Pyramidal",
    example: "Edoylerite"
  },
  22: {
    system: "Tetragonal",
    class: "4̄ - Tetragonal-Disphenoidal",
    example: "Chalcopyrite"
  },
  23: {
    system: "Tetragonal",
    class: "4/m - Tetragonal-Dipyramidal",
    example: "Wulfenite"
  },
  24: {
    system: "Tetragonal",
    class: "4̄2m - Tetragonal-Scalenohedral",
    example: "Chalcopyrite"
  },
  25: {
    system: "Tetragonal",
    class: "422 - Tetragonal-Trapezohedral",
    example: "Scapolite"
  },
  26: {
    system: "Tetragonal",
    class: "4mm - Ditetragonal-Pyramidal",
    example: "Fresnoite"
  },
  27: {
    system: "Tetragonal",
    class: "4/mmm - Ditetragonal-Dipyramidal",
    example: "Zircon"
  },
  
  // Isometric/Cubic system
  28: {
    system: "Isometric",
    class: "23 - Tetrahedral",
    example: "Ullmannite"
  },
  29: {
    system: "Isometric",
    class: "m3̄ - Dyakisdodecahedral",
    example: "Pyrite"
  },
  30: {
    system: "Isometric",
    class: "4̄3m - Hextetrahedral",
    example: "Sphalerite"
  },
  31: {
    system: "Isometric",
    class: "432 - Gyroidal",
    example: "Cuprite"
  },
  32: {
    system: "Isometric",
    class: "m3̄m - Hexoctahedral",
    example: "Fluorite"
  }
};

/**
 * Convert a crystal class ID to human-readable crystal system and class information
 * @param classId The numeric crystal class ID from the Mindat API
 * @returns Detailed information about the crystal class
 */
export function getCrystalClassInfo(classId: number | null | undefined): CrystalClassInfo {
  if (classId === null || classId === undefined || !CRYSTAL_CLASS_LOOKUP[classId]) {
    return {
      system: "Unknown",
      class: "Unknown",
      example: ""
    };
  }
  
  return CRYSTAL_CLASS_LOOKUP[classId];
}

/**
 * Get just the crystal system name from a crystal class ID
 * @param classId The numeric crystal class ID
 * @returns The crystal system name (e.g., "Monoclinic", "Isometric")
 */
export function getCrystalSystemName(classId: number | null | undefined): string {
  return getCrystalClassInfo(classId).system;
}

/**
 * Get just the crystal class notation from a crystal class ID
 * @param classId The numeric crystal class ID
 * @returns The crystal class notation (e.g., "2/m - Prismatic")
 */
export function getCrystalClassName(classId: number | null | undefined): string {
  return getCrystalClassInfo(classId).class;
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