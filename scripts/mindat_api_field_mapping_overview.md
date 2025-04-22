# Mindat API Fields Requiring Mapping Tables

This document outlines the various fields in the Mindat API that contain coded values requiring mapping or interpretation to be useful in applications.

## Primary Fields Requiring Mapping

### 1. Crystal Classification (`cclass` and `csystem`)
- `cclass`: Numeric IDs (0-32) representing crystal classes
- `csystem`: Text values representing crystal systems
  - Examples: "Triclinic", "Monoclinic", "Orthorhombic", "Tetragonal", "Trigonal", "Hexagonal", "Isometric"
- **Note**: These fields are fundamental to mineral classification and require comprehensive mapping to be properly understood

### 2. IMA Status (`ima_status`)
- Text values representing approval status by International Mineralogical Association
- Examples: "APPROVED,GRANDFATHERED", "APPROVED", "GRANDFATHERED", "REJECTED", "DISCREDITED", "PENDING"
- **Note**: Some minerals have combined statuses (e.g., "APPROVED,GRANDFATHERED")

### 3. Physical Properties
- **Lustre** (`lustre`): Text values describing mineral's lustre
  - Examples: "Vitreous", "Adamantine", "Metallic", "Resinous", "Pearly"
- **Tenacity** (`tenacity`): Text values describing how mineral responds to deformation
  - Examples: "brittle", "flexible", "malleable", "sectile"
- **Cleavage** (`cleavage`): Text values (often with HTML) describing mineral's cleavage properties
- **Fracture** (`fracture`): Text values describing mineral's fracture type
- **Diaphaneity** (`diaphaneity`): Text values describing mineral's transparency
  - Examples: "Transparent", "Translucent", "Opaque"
- **Streak** (`streak`): Text values describing color of mineral's powder
  - Examples: "White", "Colorless", "Greenish-black"

### 4. Fields with HTML Content
- `formula`: Chemical formula often with HTML formatting (subscripts, etc.)
- `description`: Detailed description with HTML formatting
- `twinning`: Technical description of crystal twinning (often with HTML)
- `crystal_habit`: Description of crystal habit (often with HTML)

### 5. Fields with Units Requiring Standardization
- `thermalbehaviour`: Contains temperature units (e.g., "573° C")
- Various measurement fields containing units like mm, cm, kg, g/cm³, etc.

### 6. Classification Systems
- Strunz classification: `strunz10ed1`, `strunz10ed2`, `strunz10ed3`, `strunz10ed4`
- Dana classification: `dana8ed1`, `dana8ed2`, `dana8ed3`, `dana8ed4`
- These fields represent hierarchical classification numbers

## Implementation Recommendations

### 1. Comprehensive Crystal Class Mapping
Create a complete mapping between `cclass` values (0-32) and:
- The crystal system name (from `csystem`)
- The specific crystal class notation (e.g., "2/m - Prismatic")
- Example minerals for each class

### 2. IMA Status Mapping
Create a mapping of IMA status codes to human-readable descriptions:
- "APPROVED,GRANDFATHERED" → "Approved by IMA and grandfathered (existed before modern approval process)"
- "APPROVED" → "Approved by the IMA"
- etc.

### 3. HTML Rendering Solution
For fields containing HTML:
- Create a consistent HTML sanitization and rendering solution
- Handle special characters and scientific notation in chemical formulas

### 4. Physical Properties Mapping
For each physical property (lustre, tenacity, etc.):
- Create mappings between API values and standardized descriptions
- Include example minerals and images where possible

### 5. Measurement Standardization
For fields with measurements:
- Parse values with units into standardized form
- Provide methods to convert between different unit systems

## Complete List of Fields to Map

1. **Crystal Classification**:
   - `cclass` (0-32 numeric values)
   - `csystem` (Text descriptions of crystal systems)

2. **Approval Status**:
   - `ima_status` (IMA approval status codes)

3. **Physical Properties**:
   - `lustre` (Surface appearance)
   - `tenacity` (Response to deformation)
   - `cleavage` (How crystal breaks along planes)
   - `fracture` (How crystal breaks when not along cleavage planes)
   - `diaphaneity` (Transparency)
   - `streak` (Color of powder)
   - `hardness` (Mohs scale hardness)
   - `specific_gravity` (Relative density)
   - `density` (Measured density)

4. **Optical Properties**:
   - `luminescence` (Response to different light/energy sources)
   - `opticalsign` (Optical character)
   - `opticaltype` (Optical classification)

5. **Classification Systems**:
   - Strunz classification fields (`strunz10ed1`, etc.)
   - Dana classification fields (`dana8ed1`, etc.)

6. **Chemical Properties**:
   - `ima_formula` (IMA-approved chemical formula)
   - `mindat_formula` (Mindat-specific chemical formula)

7. **Other Properties**:
   - `magnetic` (Magnetic properties)
   - `radioactivity` (Radioactive properties)
   - `electrical` (Electrical properties)

## Conclusion

The Mindat API provides rich data about minerals, but many fields contain coded values or specialized notation that requires interpretation. Creating comprehensive mapping tables for these fields will make the API data more accessible and useful for applications.

Each mapping should ideally include:
1. The raw API value
2. A human-readable description/interpretation
3. Example minerals demonstrating the property
4. Additional contextual information where appropriate