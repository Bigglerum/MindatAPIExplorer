"""
Utility for converting Mindat API crystal class IDs to human-readable names
"""

# Crystal class ID to name mapping
CRYSTAL_CLASS_LOOKUP = {
    1: "Isometric (Cubic)",
    2: "Hexagonal",
    3: "Tetragonal", 
    4: "Orthorhombic",
    5: "Monoclinic",
    6: "Triclinic",
    7: "Trigonal",
    8: "Amorphous"
}

def get_crystal_class_name(class_id):
    """
    Convert a crystal class ID to a human-readable crystal system name
    
    Args:
        class_id: The numeric crystal class ID from the Mindat API
        
    Returns:
        str: The human-readable crystal system name
    """
    if class_id is None:
        return "Unknown"
    
    return CRYSTAL_CLASS_LOOKUP.get(class_id, f"Unknown Crystal Class ({class_id})")

# Additional information about crystal systems
CRYSTAL_SYSTEM_INFO = {
    "Isometric (Cubic)": {
        "description": "Has three equal axes at right angles. Characterized by high symmetry and includes common minerals like pyrite, halite, and fluorite.",
        "examples": ["Pyrite", "Halite", "Fluorite", "Galena", "Diamond"]
    },
    "Hexagonal": {
        "description": "Has three equal axes in one plane at 120° angles, and a fourth axis perpendicular to this plane. Includes minerals like beryl and apatite.",
        "examples": ["Beryl", "Apatite", "Vanadinite"]
    },
    "Tetragonal": {
        "description": "Has three axes at right angles, with two being equal in length. Includes minerals like zircon and rutile.",
        "examples": ["Zircon", "Rutile", "Vesuvianite"]
    },
    "Orthorhombic": {
        "description": "Has three unequal axes at right angles. Includes minerals like olivine and topaz.",
        "examples": ["Olivine", "Topaz", "Baryte", "Aragonite"]
    },
    "Monoclinic": {
        "description": "Has three unequal axes with one oblique intersection. Includes minerals like gypsum and orthoclase.",
        "examples": ["Gypsum", "Orthoclase", "Hornblende", "Malachite"]
    },
    "Triclinic": {
        "description": "Has three unequal axes with oblique intersections. The least symmetrical system, including minerals like plagioclase and kyanite.",
        "examples": ["Plagioclase", "Kyanite", "Turquoise", "Microcline"]
    },
    "Trigonal": {
        "description": "Previously considered part of the hexagonal system, it has three equal axes at 120° angles. Includes quartz and calcite.",
        "examples": ["Quartz", "Calcite", "Corundum", "Tourmaline"]
    },
    "Amorphous": {
        "description": "No definite crystalline structure. Includes minerals like opal which lack a regular internal atomic arrangement.",
        "examples": ["Opal", "Obsidian", "Limonite"]
    }
}

def get_crystal_system_info(class_id):
    """
    Get detailed information about a crystal system
    
    Args:
        class_id: The numeric crystal class ID
        
    Returns:
        dict: Dictionary containing crystal system name, description, and examples
    """
    name = get_crystal_class_name(class_id)
    info = CRYSTAL_SYSTEM_INFO.get(name, {
        "description": "No additional information available for this crystal system.",
        "examples": []
    })
    
    return {
        "name": name,
        "description": info["description"],
        "examples": info["examples"]
    }


# Example usage
if __name__ == "__main__":
    # Test with a few class IDs
    for class_id in [1, 2, 3, 4, 5, 6, 7, 8, None, 99]:
        name = get_crystal_class_name(class_id)
        info = get_crystal_system_info(class_id)
        
        print(f"Class ID {class_id} -> {name}")
        print(f"  Description: {info['description']}")
        print(f"  Examples: {', '.join(info['examples'])}")
        print()