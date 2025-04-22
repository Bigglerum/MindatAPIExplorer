/**
 * Maps crystal class IDs (cclass) to their corresponding detailed crystal class information
 * This mapping was derived directly from the Mindat API by querying minerals
 * and correlating their cclass values with known crystal classes
 */
export interface CrystalClassInfo {
  /** The crystal system (e.g., "Monoclinic", "Isometric") */
  system: string;
  /** The detailed crystal class notation (e.g., "2/m - Prismatic") */
  class: string;
  /** Example mineral with this crystal class */
  example: string;
}

export const CRYSTAL_CLASS_LOOKUP: Record<number, CrystalClassInfo> = {
  // Triclinic system
  2: {
    system: "Triclinic",
    class: "1̄ - Pinacoidal",
    example: "Kyanite"
  },
  
  // Monoclinic system
  5: {
    system: "Monoclinic",
    class: "2/m - Prismatic",
    example: "Gypsum"
  },
  
  // Orthorhombic system
  8: {
    system: "Orthorhombic",
    class: "mmm - Orthorhombic-Dipyramidal",
    example: "Topaz"
  },
  
  // Trigonal system
  12: {
    system: "Trigonal",
    class: "32 - Trigonal-Trapezohedral",
    example: "Quartz"
  },
  13: {
    system: "Trigonal",
    class: "3̄m - Rhombohedral",
    example: "Corundum"
  },
  
  // Hexagonal system
  20: {
    system: "Hexagonal",
    class: "6/mmm - Dihexagonal-Dipyramidal",
    example: "Beryl"
  },
  
  // Tetragonal system
  27: {
    system: "Tetragonal",
    class: "4/mmm - Ditetragonal-Dipyramidal",
    example: "Zircon"
  },
  
  // Isometric/Cubic system
  29: {
    system: "Isometric",
    class: "m3̄ - Dyakisdodecahedral",
    example: "Pyrite"
  },
  32: {
    system: "Isometric",
    class: "m3̄m - Hexoctahedral",
    example: "Diamond"
  },
  
  // Special cases and unknown classes
  0: {
    system: "Unknown",
    class: "Unknown",
    example: "Various minerals"
  },
  7: {
    system: "Unknown",
    class: "Unknown",
    example: "Adelite"
  },
  10: {
    system: "Unknown",
    class: "Unknown",
    example: "Abenakiite-(Ce)"
  },
  11: {
    system: "Unknown",
    class: "Unknown",
    example: "Acetamide"
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