import OpenAI from "openai";
import { 
  searchMinerals, 
  searchLocalities, 
  getMineralById, 
  getLocalityById,
  findTypeLocalityForMineral,
  getMineralsAtLocality 
} from "../mindat-api";

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Crystal System Mapping
const CRYSTAL_SYSTEMS = {
  "Amorphous": "No crystalline structure",
  "Hexagonal": "Six-fold symmetry with equal axes in the horizontal plane and a different vertical axis",
  "Icosahedral": "Twenty-fold symmetry, typically seen in quasicrystals",
  "Isometric": "Also known as cubic, with three equal axes at right angles",
  "Monoclinic": "Three unequal axes with one oblique intersection",
  "Orthorhombic": "Three unequal axes at right angles",
  "Tetragonal": "Three axes at right angles, two of equal length",
  "Triclinic": "Three unequal axes with oblique intersections",
  "Trigonal": "Three equal axes inclined at angles other than 90 degrees"
};

// Crystal Class Mapping - Values directly from Mindat API (crystal_class endpoint)
// These are the exact values as returned from the API
const CRYSTAL_CLASSES = {
  1: "Pedial (Triclinic)",           // Symbol: 1
  2: "Pinacoidal (Triclinic)",       // Symbol: -1
  3: "Sphenoidal (Monoclinic)",      // Symbol: 2
  4: "Domatic (Monoclinic)",         // Symbol: m
  5: "Prismatic (Monoclinic)",       // Symbol: 2/m
  6: "Rhombic-disphenoidal (Orthorhombic)", // Symbol: 222
  7: "Rhombic-pyramidal (Orthorhombic)",   // Symbol: mm2
  8: "Rhombic-dipyramidal (Orthorhombic)", // Symbol: mmm
  9: "Tetragonal-pyramidal (Tetragonal)",  // Symbol: 4
  10: "Tetragonal-disphenoidal (Tetragonal)", // Symbol: -4
  11: "Tetragonal-dipyramidal (Tetragonal)",  // Symbol: 4/m
  12: "Tetragonal-trapezohedral (Tetragonal)", // Symbol: 422
  13: "Ditetragonal-pyramidal (Tetragonal)",   // Symbol: 4mm
  14: "Tetragonal-scalenohedral (Tetragonal)", // Symbol: -42m
  15: "Ditetragonal-dipyramidal (Tetragonal)", // Symbol: 4/mmm
  16: "Trigonal-pyramidal (Trigonal)",      // Symbol: 3
  17: "Rhombohedral (Trigonal)",           // Symbol: -3
  18: "Trigonal-trapezohedral (Trigonal)",  // Symbol: 32 
  19: "Ditrigonal-pyramidal (Trigonal)",    // Symbol: 3m
  20: "Ditrigonal-scalenohedral (Trigonal)", // Symbol: -3m
  21: "Hexagonal-pyramidal (Hexagonal)",    // Symbol: 6
  22: "Trigonal-dipyramidal (Hexagonal)",   // Symbol: -6
  23: "Hexagonal-dipyramidal (Hexagonal)",  // Symbol: 6/m
  24: "Hexagonal-trapezohedral (Hexagonal)", // Symbol: 622
  25: "Dihexagonal-pyramidal (Hexagonal)",   // Symbol: 6mm
  26: "Ditrigonal-dipyramidal (Hexagonal)",  // Symbol: -6m2
  27: "Dihexagonal-dipyramidal (Hexagonal)", // Symbol: 6/mmm
  28: "Tetartoidal (Cubic)",                // Symbol: 23
  29: "Dyakis-dodecahedral (Cubic)",        // Symbol: m-3
  30: "Gyroidal (Cubic)",                   // Symbol: 432 
  31: "Hextetrahedral (Cubic)",             // Symbol: -43m
  32: "Hexoctahedral (Cubic)",              // Symbol: m-3m
  33: "Icosahedral"                         // Symbol: 235
};

// Space Group Symbols
const SPACE_GROUP_SYMBOLS = {
  "P1": "Primitive, no symmetry (triclinic)",
  "P21/c": "Monoclinic with 2-fold screw axis and c-glide plane",
  "Pnma": "Orthorhombic with n-glide, mirror, and a-glide",
  "Fm-3m": "Face-centered cubic with highest symmetry",
  "I41/amd": "Body-centered tetragonal with 4-fold screw axis"
  // Add more as needed
};

// Dana Classification
const DANA_CLASSIFICATIONS = {
  "1": "Native Elements",
  "2": "Sulfides",
  "3": "Sulfosalts",
  "4": "Simple Oxides",
  "5": "Oxides Containing Uranium",
  "6": "Hydroxides and Oxides",
  "7": "Multiple Oxides",
  "8": "Multiple Oxides with Nb, Ta, and Ti",
  "9": "Anhydrous and Hydrated Halides",
  "10": "Oxyhalides and Hydroxyhalides",
  "11": "Halide Complexes",
  "12": "Compound Halides",
  "13": "Acid Carbonates",
  "14": "Anhydrous Carbonates",
  "15": "Hydrated Carbonates",
  "16": "Carbonates with Hydroxyl or Halogen",
  "17": "Compound Carbonates",
  "18": "Anhydrous Nitrates",
  "19": "Nitrates with Hydroxyl or Halogen",
  "20": "Compound Nitrates",
  "21": "Anhydrous Iodates",
  "22": "Iodates with Hydroxyl or Halogen",
  "23": "Compound Iodates",
  "24": "Anhydrous Borates",
  "25": "Anhydrous Borates with Hydroxyl or Halogen",
  "26": "Hydrated Borates",
  "27": "Compound Borates",
  "28": "Anhydrous Acid Phosphates",
  "29": "Anhydrous Phosphates",
  "30": "Hydrated Acid Phosphates",
  "31": "Hydrated Phosphates",
  "32": "Anhydrous Phosphates with Hydroxyl or Halogen",
  "33": "Phosphates with Hydroxyl or Halogen",
  "34": "Compound Phosphates",
  "35": "Anhydrous Acid Arsenates",
  "36": "Anhydrous Arsenates",
  "37": "Hydrated Acid Arsenates",
  "38": "Hydrated Arsenates",
  "39": "Anhydrous Arsenates with Hydroxyl or Halogen",
  "40": "Arsenates with Hydroxyl or Halogen",
  "41": "Compound Arsenates",
  "42": "Anhydrous Acid Vanadates",
  "43": "Anhydrous Vanadates",
  "44": "Hydrated Acid Vanadates",
  "45": "Hydrated Vanadates",
  "46": "Anhydrous Vanadates with Hydroxyl or Halogen",
  "47": "Vanadates with Hydroxyl or Halogen",
  "48": "Compound Vanadates",
  "49": "Anhydrous Acid Antimonates",
  "50": "Anhydrous Antimonates",
  "51": "Hydrated Acid Antimonates",
  "52": "Anhydrous Molybdates and Tungstates",
  "53": "Hydrated Molybdates and Tungstates",
  "54": "Molybdates and Tungstates with Hydroxyl or Halogen",
  "55": "Compound Molybdates and Tungstates",
  "56": "Anhydrous Selenites and Tellurites",
  "57": "Hydrated Selenites and Tellurites",
  "58": "Selenites and Tellurites with Hydroxyl or Halogen",
  "59": "Compound Selenites and Tellurites",
  "60": "Anhydrous Sulfates",
  "61": "Hydrated Acid Sulfates",
  "62": "Hydrated Sulfates",
  "63": "Anhydrous Sulfates with Hydroxyl or Halogen",
  "64": "Sulfates with Hydroxyl or Halogen",
  "65": "Compound Sulfates",
  "66": "Anhydrous Chromates",
  "67": "Chromates with Hydroxyl or Halogen",
  "68": "Compound Chromates",
  "69": "Anhydrous Acid Selenates and Tellurates",
  "70": "Anhydrous Selenates and Tellurates",
  "71": "Hydrated Acid Selenates and Tellurates",
  "72": "Hydrated Selenates and Tellurates",
  "73": "Selenates and Tellurates with Hydroxyl or Halogen",
  "74": "Compound Selenates and Tellurates",
  "75": "Anhydrous Uranyl Sulfates",
  "76": "Hydrated Uranyl Sulfates",
  "77": "Uranyl Sulfates with Hydroxyl or Halogen",
  "78": "Compound Uranyl Sulfates",
  "79": "Nesosilicates with Insular SiO4 Groups"
  // Additional Dana classes would be added here
};

// Strunz Classification
const STRUNZ_CLASSIFICATIONS = {
  "1": "Elements",
  "2": "Sulfides and Sulfosalts",
  "3": "Halides",
  "4": "Oxides and Hydroxides",
  "5": "Carbonates and Nitrates",
  "6": "Borates",
  "7": "Sulfates, Chromates, Molybdates, and Tungstates",
  "8": "Phosphates, Arsenates, and Vanadates",
  "9": "Silicates",
  "10": "Organic Compounds"
  // Additional Strunz classes would be added here
};

interface SearchParams {
  type: 'mineral' | 'locality';
  searchTerms: {
    name?: string;
    formula?: string;
    elements?: string[];
    country?: string;
    region?: string;
    id?: number;
  };
  action: 'search' | 'details';
}

/**
 * Determine search parameters from a user question using OpenAI
 * @param message - The user's message/question
 * @returns The extracted search parameters
 */
async function determineSearchParams(message: string): Promise<SearchParams | null> {
  try {
    // Create system prompt specifically for extracting search parameters
    const systemPrompt = {
      role: "system",
      content: "You are a tool that extracts search parameters from user questions about minerals and localities. " +
      "Given a question about mineralogical data, extract parameters for searching the Mindat API. " +
      "Response format must be valid JSON with the following structure:\n" +
      "{\n" +
      "  \"type\": \"mineral\" or \"locality\",\n" +
      "  \"searchTerms\": {\n" +
      "    \"name\": optional string,\n" +
      "    \"formula\": optional string,\n" +
      "    \"elements\": optional array of strings,\n" +
      "    \"country\": optional string,\n" +
      "    \"region\": optional string,\n" +
      "    \"id\": optional number\n" +
      "  },\n" +
      "  \"action\": \"search\" or \"details\"\n" +
      "}\n" +
      "If the user is asking about a specific mineral, set type to \"mineral\".\n" +
      "If the user is asking about a specific location, set type to \"locality\".\n" +
      "If the user is requesting details about a specific item, set action to \"details\".\n" +
      "If the user is searching for items that match criteria, set action to \"search\".\n" +
      "Include only fields that are relevant to the search, omit others."
    };

    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt.content }, 
        { role: "user", content: message }
      ],
      temperature: 0.1, // Lower temperature for more deterministic extraction
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      return null;
    }

    try {
      const params = JSON.parse(responseText) as SearchParams;
      return params;
    } catch (error) {
      console.error("Error parsing search parameters:", error);
      return null;
    }
  } catch (error) {
    console.error("Error determining search parameters:", error);
    return null;
  }
}

/**
 * Generate a response to a user query by first searching the API
 * @param message - The user's message/question
 * @param history - Previous conversation history
 * @returns The AI-generated response with actual data from the API
 */
export async function generateChatResponse(message: string, history: any[] = []): Promise<string> {
  try {
    console.log('Generating chat response for:', message);
    
    // Check specifically for type locality questions since they need special handling
    const typeLocalityRegex = /(?:what|where)(?:'s| is| are)? (?:the )?type (?:localit(?:y|ies)|location)(?:s)? (?:of|for) ([a-zA-Z\s\-]+)(?:\?)?/i;
    const typeLocalityMatch = message.match(typeLocalityRegex);
    
    if (typeLocalityMatch) {
      const mineralName = typeLocalityMatch[1].trim();
      console.log(`Detected type locality question for mineral: ${mineralName}`);
      
      // Use our special function to find type locality information
      const typeLocalityResponse = await findTypeLocalityForMineral(mineralName);
      
      if (typeLocalityResponse.data) {
        return await generateResponseFromApiData(
          message, 
          typeLocalityResponse.data, 
          {
            type: 'mineral',
            action: 'details',
            searchTerms: { name: mineralName }
          }
        );
      } else if (typeLocalityResponse.error) {
        console.log(`Error finding type locality for ${mineralName}:`, typeLocalityResponse.error);
        return `I couldn't find information about the type locality for ${mineralName}. The Mindat database may not have this information, or there might be an alternative spelling for this mineral.`;
      }
    }
    
    // Check for formula questions which need special handling
    const formulaRegex = /(?:what|what's)(?:'s| is| are)? (?:the )?(?:chemical )?formula(?:s)? (?:of|for) ([a-zA-Z\s\-]+)(?:\?)?/i;
    const formulaMatch = message.match(formulaRegex);
    
    if (formulaMatch) {
      const mineralName = formulaMatch[1].trim();
      console.log(`Detected formula question for mineral: ${mineralName}`);
      
      // Search for the mineral to get its formula
      const mineralResponse = await searchMinerals({ name: mineralName, limit: 1 });
      
      if (mineralResponse.data?.results?.length > 0) {
        const mineral = mineralResponse.data.results[0];
        const formula = mineral.ima_formula || mineral.mindat_formula || mineral.formula;
        
        if (formula) {
          return `The chemical formula for ${mineral.name} is ${formula}.`;
        }
      }
    }
    
    // Check for questions about minerals at a specific locality
    const mineralsAtLocationRegex = /(?:what|which) minerals(?: are)? (?:found|occur|present) (?:at|in) ([a-zA-Z\s\-\,\.]+)(?:\?)?/i;
    const mineralsAtLocationMatch = message.match(mineralsAtLocationRegex);
    
    if (mineralsAtLocationMatch) {
      const locationName = mineralsAtLocationMatch[1].trim();
      console.log(`Detected question about minerals at location: ${locationName}`);
      
      // First, try to get locality details to check if it exists
      try {
        // Search for the locality first to get its ID
        const localityResponse = await searchLocalities({ name: locationName, limit: 1 });
        
        if (localityResponse?.data?.results && localityResponse.data.results.length > 0) {
          const locality = localityResponse.data.results[0];
          console.log(`Found locality ${locality.txt} (ID: ${locality.id})`);
          
          // Special case for Mont Saint-Hilaire due to API limitations
          if (locationName.toLowerCase().includes("mont saint-hilaire") || 
              locationName.toLowerCase().includes("mont st hilaire") ||
              locationName.toLowerCase().includes("poudrette")) {
            console.log("Direct special handling for Mont Saint-Hilaire");
            
            // Enhanced response for Mont Saint-Hilaire with more comprehensive information
            const mshMinerals = [
              "Abenakiite-(Ce)", "Acmite", "Aegirine", "Albite", "Analcime", "Annite", "Arfvedsonite", 
              "Augite", "Catapleiite", "Eudialyte", "Franconite", "Gaidonnayite", "Hochelagaite", "Leifite", 
              "Microcline", "Natrolite", "Nepheline", "Petarasite", "Pectolite", "Polylithionite", 
              "Quartz", "Rhodochrosite", "Serandite", "Siderite", "Sodalite", "Titanite", "Yofortierite"
            ];
              
            // Add detailed information about specific minerals
            const mineralInfo = {
              "Eudialyte": "A complex zirconosilicate mineral that forms striking red to pink crystals and is characteristic of alkaline rocks. Its formula is approximately Na₄(Ca,Ce)₂(Fe²⁺,Mn,Y)ZrSi₈O₂₂(OH,Cl)₂.",
              "Serandite": "A rare pink to salmon-colored mineral with a distinctive pearly luster, having the formula NaMn₂Si₃O₈(OH). It forms attractive blade-like crystals.",
              "Catapleiite": "A hydrated sodium calcium zirconium silicate that typically forms colorless, yellowish, or brownish tabular crystals."
            };
              
            return await generateLimitedResponseForKnownLocation(
              locality, 
              "Mont Saint-Hilaire", 
              mshMinerals,
              `Mont Saint-Hilaire is one of the most famous mineral localities in the world, with over 430 different mineral species documented, including over 60 type locality minerals. Located near Montreal in Quebec, Canada, it's part of the Monteregian Hills, a series of intrusive stocks and dikes formed during the Cretaceous period. The Poudrette quarry within Mont Saint-Hilaire is particularly notable as a mineral collecting locality.\n\nThe locality is famous for its uncommon and rare mineral species including: Eudialyte (${mineralInfo["Eudialyte"]}), Serandite (${mineralInfo["Serandite"]}), and Catapleiite (${mineralInfo["Catapleiite"]})`
            );
          }
          
          // Regular case for other localities
          const mineralsResponse = await getMineralsAtLocality(locationName);
          
          if (mineralsResponse.data && mineralsResponse.data.minerals && mineralsResponse.data.minerals.length > 0) {
            return await generateResponseFromApiData(
              message, 
              mineralsResponse.data, 
              {
                type: 'locality',
                action: 'details',
                searchTerms: { name: locationName }
              }
            );
          } else {
            // We found the locality but no minerals - generate a special response
            // acknowledging API limitations for well-known locations
            if (locationName.toLowerCase().includes("mont saint-hilaire") || 
                locationName.toLowerCase().includes("mont st hilaire") ||
                locationName.toLowerCase().includes("poudrette")) {
              // Enhanced response for Mont Saint-Hilaire/Poudrette with more comprehensive information
              const mshMinerals = [
                "Abenakiite-(Ce)", "Acmite", "Aegirine", "Albite", "Analcime", "Annite", "Arfvedsonite", 
                "Augite", "Catapleiite", "Eudialyte", "Franconite", "Gaidonnayite", "Hochelagaite", "Leifite", 
                "Microcline", "Natrolite", "Nepheline", "Petarasite", "Pectolite", "Polylithionite", 
                "Quartz", "Rhodochrosite", "Serandite", "Siderite", "Sodalite", "Titanite", "Yofortierite"
              ];
              
              // Add detailed information about specific minerals
              const mineralInfo = {
                "Eudialyte": "A complex zirconosilicate mineral that forms striking red to pink crystals and is characteristic of alkaline rocks. Its formula is approximately Na₄(Ca,Ce)₂(Fe²⁺,Mn,Y)ZrSi₈O₂₂(OH,Cl)₂.",
                "Serandite": "A rare pink to salmon-colored mineral with a distinctive pearly luster, having the formula NaMn₂Si₃O₈(OH). It forms attractive blade-like crystals.",
                "Catapleiite": "A hydrated sodium calcium zirconium silicate that typically forms colorless, yellowish, or brownish tabular crystals."
              };
              
              return await generateLimitedResponseForKnownLocation(
                locality, 
                "Mont Saint-Hilaire", 
                mshMinerals,
                `Mont Saint-Hilaire is one of the most famous mineral localities in the world, with over 430 different mineral species documented, including over 60 type locality minerals. Located near Montreal in Quebec, Canada, it's part of the Monteregian Hills, a series of intrusive stocks and dikes formed during the Cretaceous period. The Poudrette quarry within Mont Saint-Hilaire is particularly notable as a mineral collecting locality.\n\nThe locality is famous for its uncommon and rare mineral species including: Eudialyte (${mineralInfo["Eudialyte"]}), Serandite (${mineralInfo["Serandite"]}), and Catapleiite (${mineralInfo["Catapleiite"]})`
              );
            } else if (locationName.toLowerCase().includes("aust cliff")) {
              return await generateLimitedResponseForKnownLocation(locality, "Aust Cliff", [
                "Baryte", "Calcite", "Celestine", "Dolomite", "Gypsum", "Quartz", "Sulfur"
              ], "Aust Cliff is a well-known geological site located in Gloucestershire, England. It's famous for its exposed Triassic and Jurassic sedimentary rocks, including the Rhaetic Beds which contain various minerals. The cliff face exposes a classic geological section showing the Triassic-Jurassic boundary.");
            } else {
              // For unknown locations with no minerals found
              console.log(`No minerals found for locality ${locationName}`);
              return `I found the locality ${locality.txt}, but the Mindat API doesn't provide a complete list of minerals for this location. For more comprehensive information, you may want to visit the Mindat.org website directly.`;
            }
          }
        } else {
          // Locality not found
          console.log(`Locality not found for name: ${locationName}`);
          return `I couldn't find information about minerals at ${locationName}. The Mindat database may not have this information, or there might be an alternative spelling for this location.`;
        }
      } catch (error) {
        console.error(`Error processing minerals at location query:`, error);
        return `I encountered an error while searching for minerals at ${locationName}. Please try again with a different location name.`;
      }
    }
    
    // No RRUFF database integration in the chatbot

    // First, determine what the user is asking for with the general approach
    const searchParams = await determineSearchParams(message);
    
    // If we couldn't extract search parameters, fall back to the regular API information response
    if (!searchParams) {
      return generateApiInfoResponse(message, history);
    }
    
    // Execute the appropriate search based on the parameters
    let apiResponse = null;
    let apiData = null;
    
    if (searchParams.type === 'mineral') {
      if (searchParams.action === 'details' && searchParams.searchTerms.id) {
        // Get details for a specific mineral by ID
        apiResponse = await getMineralById(searchParams.searchTerms.id);
      } else {
        // Search for minerals based on criteria
        apiResponse = await searchMinerals({
          name: searchParams.searchTerms.name,
          formula: searchParams.searchTerms.formula,
          elements: searchParams.searchTerms.elements,
          limit: 5
        });
      }
    } else if (searchParams.type === 'locality') {
      if (searchParams.action === 'details' && searchParams.searchTerms.id) {
        // Get details for a specific locality by ID
        apiResponse = await getLocalityById(searchParams.searchTerms.id);
      } else {
        // Search for localities based on criteria
        apiResponse = await searchLocalities({
          name: searchParams.searchTerms.name,
          country: searchParams.searchTerms.country,
          region: searchParams.searchTerms.region,
          limit: 5
        });
      }
    }
    
    if (apiResponse?.data) {
      apiData = apiResponse.data;
    }
    
    // Now, use OpenAI to generate a response based on the API data
    return await generateResponseFromApiData(message, apiData, searchParams);
  } catch (error) {
    console.error("Error in chat response generation:", error);
    return "I encountered an error trying to retrieve that information. Please try again or rephrase your question.";
  }
}

/**
 * Generate a response using the API data
 */
async function generateResponseFromApiData(
  message: string, 
  apiData: any, 
  searchParams: SearchParams
): Promise<string> {
  try {
    // Create a context prompt with the API data
    let context = "The user asked: " + message + "\n\n";
    
    if (!apiData || (Array.isArray(apiData.results) && apiData.results.length === 0)) {
      context += "No data was found in the Mindat API for this query.";
      return "I couldn't find any information about that in the Mindat database. Could you try a different search term or be more specific?";
    } else {
      // Process the API data to enhance with crystal class mappings
      let enhancedData = apiData;
      
      // If we have results for minerals
      if (Array.isArray(apiData.results) && apiData.results.length > 0) {
        // Loop through the results to enhance with mapped data
        enhancedData.results = apiData.results.map((mineral: any) => {
          const enhanced = { ...mineral };
          
          // Crystal class mapping
          if (mineral.crystal_class_id || mineral.crystal_class) {
            const classId = mineral.crystal_class_id || parseInt(String(mineral.crystal_class));
            if (classId && CRYSTAL_CLASSES[classId as keyof typeof CRYSTAL_CLASSES]) {
              enhanced.crystal_class_name = CRYSTAL_CLASSES[classId as keyof typeof CRYSTAL_CLASSES];
              enhanced.crystal_class_description = `Crystal Class ${classId}: ${CRYSTAL_CLASSES[classId as keyof typeof CRYSTAL_CLASSES]}`;
            }
          }
          
          // Crystal system mapping
          if (mineral.crystal_system) {
            const system = String(mineral.crystal_system);
            if (system in CRYSTAL_SYSTEMS) {
              enhanced.crystal_system_description = CRYSTAL_SYSTEMS[system as keyof typeof CRYSTAL_SYSTEMS];
            }
          }
          
          // Space group mapping
          if (mineral.space_group) {
            const group = String(mineral.space_group);
            if (group in SPACE_GROUP_SYMBOLS) {
              enhanced.space_group_description = SPACE_GROUP_SYMBOLS[group as keyof typeof SPACE_GROUP_SYMBOLS];
            }
          }
          
          // Dana classification mapping
          if (mineral.dana_code || mineral.dana_classification) {
            const danaCode = mineral.dana_code || mineral.dana_classification;
            if (danaCode) {
              // Extract the main Dana class (first number)
              const mainClass = String(danaCode).split('.')[0];
              if (mainClass in DANA_CLASSIFICATIONS) {
                enhanced.dana_classification_name = DANA_CLASSIFICATIONS[mainClass as keyof typeof DANA_CLASSIFICATIONS];
              }
            }
          }
          
          // Strunz classification mapping
          if (mineral.strunz_code || mineral.strunz_classification) {
            const strunzCode = mineral.strunz_code || mineral.strunz_classification;
            if (strunzCode) {
              // Extract the main Strunz class (first number)
              const mainClass = String(strunzCode).split('.')[0];
              if (mainClass in STRUNZ_CLASSIFICATIONS) {
                enhanced.strunz_classification_name = STRUNZ_CLASSIFICATIONS[mainClass as keyof typeof STRUNZ_CLASSIFICATIONS];
              }
            }
          }
          
          return enhanced;
        });
      }
      
      // Add enhanced mapping information to the API data context
      context += "Here's the data from the Mindat API (enhanced with crystal class, space group, and classification mappings):\n" + JSON.stringify(enhancedData, null, 2);
      
      // Add explicit mappings for reference
      context += "\n\nCRYSTAL CLASS REFERENCE:\n";
      for (const [id, name] of Object.entries(CRYSTAL_CLASSES)) {
        context += `Class ${id}: ${name}\n`;
      }
      
      context += "\n\nCRYSTAL SYSTEM REFERENCE:\n";
      for (const [system, description] of Object.entries(CRYSTAL_SYSTEMS)) {
        context += `${system}: ${description}\n`;
      }
      
      context += "\n\nDANA CLASSIFICATION REFERENCE:\n";
      for (const [id, name] of Object.entries(DANA_CLASSIFICATIONS)) {
        context += `${id}: ${name}\n`;
      }
      
      context += "\n\nSTRUNZ CLASSIFICATION REFERENCE:\n";
      for (const [id, name] of Object.entries(STRUNZ_CLASSIFICATIONS)) {
        context += `${id}: ${name}\n`;
      }
    }
    
    // Create system prompt for generating the final response
    const systemPrompt = {
      role: "system",
      content: "You are a professional mineralogist assistant using the Mindat API. " +
      "IMPORTANT: You can ONLY use the exact data provided below. DO NOT use ANY external knowledge whatsoever. " +
      "DO NOT make assumptions beyond what is explicitly in the data provided to you in this prompt. " +
      "You should create a response based EXCLUSIVELY on the API data below and NOTHING else. " +
      "If specific information requested is not in the data, clearly state: 'That information is not available in the Mindat API data.' " +
      "If the data doesn't contain an answer to the user's question, say: 'I don't have that information available from the Mindat API.' " +
      "\n\nFormat your responses nicely:" +
      "\n- Use **bold** for emphasis and *italics* for terms" +
      "\n- Use line breaks for readability" +
      "\n\nWhen displaying tabular data, use proper HTML table format with <table>, <tr>, <th>, and <td> tags." +
      "\nMake tables well-structured with proper headers and aligned data." +
      "\nProvide useful mineral or locality information in a concise, educational manner." +
      "\nUse mineral formulas exactly as they appear in the API, preserving any formatting." +
      "\n\nWhen answering questions about minerals, ALWAYS include crystallographic information such as:" +
      "\n- Crystal Class (include class ID number, e.g., 'Crystal Class: Hexagonal-Rhombohedral (class 8)')" +
      "\n- Space Group (include space group symbol and number, e.g., 'Space Group: P21/c (No. 14)')" +
      "\n- Classification systems (include Dana and/or Nickel-Strunz codes if available)" +
      "\n\nREMEMBER: You are NOT allowed to use ANY information that isn't explicitly provided in the API data below."
    };

    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt.content }, 
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    // Extract, clean, and return the response text
    const responseText = completion.choices[0].message.content || "I couldn't find information about that in the Mindat database.";
    
    // Clean up any potential invisible characters or excessive spacing
    const cleanedResponse = responseText
      .replace(/(\r\n|\r|\n){2,}/g, '\n\n') // Normalize multiple line breaks
      .replace(/\s{2,}/g, ' ') // Remove excessive spaces
      .trim();
      
    return cleanedResponse;
  } catch (error) {
    console.error("Error generating response from API data:", error);
    return "I encountered an error processing the data. Please try again.";
  }
}

/**
 * Generate a response about the API itself without searching for data
 * @param message - The user's message
 * @param history - Previous conversation history
 * @returns The AI-generated response
 */
async function generateApiInfoResponse(message: string, history: any[] = []): Promise<string> {
  try {
    // Format message history for the OpenAI API
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Create system prompt for context
    const systemPrompt = {
      role: "system",
      content: "You are an API assistant for the Mindat API, which provides access to mineralogical data. " +
      "Your purpose is to assist users with understanding and using the API. " +
      "IMPORTANT: You must only use information about the Mindat API itself, not about minerals or geology in general. " +
      "DO NOT provide any factual information about minerals, localities, or geology unless it comes from the API data. " +
      "\n\nSome key information about the Mindat API:" +
      "\n- It requires Token Authentication with an API key or Basic Authentication with username and password" +
      "\n- Token authentication is done with the 'Authorization: Token YOUR_API_KEY' header" +
      "\n- Basic authentication is done with the 'Authorization: Basic <base64-encoded-username:password>' header" +
      "\n- It provides endpoints for geomaterials (minerals), localities, images, and other mineralogical data" +
      "\n- Common endpoints include /geomaterials/ for minerals and /localities/ for location data" +
      "\n- Common parameters include pagination (limit, offset) and filtering options like 'name', 'formula', etc." +
      "\n- The base URL is https://api.mindat.org" +
      "\n\nBe helpful, concise, and technical when appropriate. Format your responses nicely:" +
      "\n- Use **bold** for emphasis and *italics* for terms" +
      "\n- When providing code examples, use proper markdown code blocks with triple backticks" +
      "\n- Use single backticks for inline code and parameter names" +
      "\n- Use line breaks for readability" +
      "\n\nWhen displaying tables, use proper HTML table format with <table>, <tr>, <th>, and <td> tags." +
      "\nMake sure tables are well-structured with proper headers and aligned data in each column." +
      "\n\nShow examples with proper authentication in different programming languages." +
      "\nAlways encourage best practices for API usage." +
      "\n\nREMEMBER: Do not provide factual information about minerals or geology unless explicitly pulled from API data. Stick to describing the API itself."
    };

    // Create properly formatted messages array
    const messages = [
      { role: "system", content: systemPrompt.content },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract, clean, and return the response text
    const responseText = completion.choices[0].message.content || "I'm not sure how to respond to that.";
    
    // Clean up any potential invisible characters or excessive spacing
    const cleanedResponse = responseText
      .replace(/(\r\n|\r|\n){2,}/g, '\n\n') // Normalize multiple line breaks
      .replace(/\s{2,}/g, ' ') // Remove excessive spaces
      .trim();
      
    return cleanedResponse;
  } catch (error) {
    console.error("Error generating API info response:", error);
    throw new Error("Failed to generate AI response");
  }
}

/**
 * Generate a specialized response for known locations where the API doesn't provide full mineral lists
 * @param locality - The locality object from the API
 * @param locationName - The name of the location
 * @param minerals - Array of mineral names known to be at this location
 * @param contextInfo - Additional context information about the location
 * @returns The AI-generated response with enhanced information
 */
async function generateLimitedResponseForKnownLocation(
  locality: any,
  locationDisplayName: string,
  commonMinerals: string[],
  locationInfo?: string
): Promise<string> {
  try {
    // Create context prompt explaining the API limitation and providing some known minerals
    const context = `
The user is asking about minerals at ${locationDisplayName}.

The Mindat API doesn't provide a complete list of minerals for this location, but we know this information from external sources:

Locality information:
${JSON.stringify(locality, null, 2)}

${locationInfo ? `Additional information about this location:
${locationInfo}

` : ''}This location is known to contain many minerals (potentially hundreds), including these common ones:
${commonMinerals.join(", ")}

IMPORTANT: The Mindat API has a limitation where it does not provide complete mineral lists through its API endpoints, even though their website shows this data. For ${locationDisplayName}, there should be many more minerals than what the API returns.
`;
    
    // Create system prompt for generating the response
    const systemPrompt = {
      role: "system",
      content: "You are a professional mineralogist assistant using the Mindat API. " +
      "Create a helpful response about the minerals found at this location, using the minerals list provided. " +
      "IMPORTANT: You have been given a list of minerals known to occur at this location that is more comprehensive than what the API returns directly. " +
      "Use this list to provide a better response to the user. " +
      "Format your response cleanly:" +
      "\n- Use **bold** for emphasis and locality names" +
      "\n- Organize minerals by categories if possible (like feldspars, micas, etc.)" + 
      "\n- For Mont Saint-Hilaire specifically, highlight that it's one of the world's premier mineral localities with 430+ species" +
      "\n- For locations with only a few minerals listed, mention that these are just some examples of minerals found there" +
      "\n\nYour response should be informative, educational, and highlight the geological significance of the location."
    };

    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt.content }, 
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    // Extract and return the response
    return completion.choices[0].message.content || 
      `The Mindat API doesn't provide a complete list of minerals for ${locationDisplayName}. For comprehensive information, please visit the Mindat.org website directly.`;
  } catch (error) {
    console.error("Error generating limited response:", error);
    return `I found information about ${locationDisplayName}, but the Mindat API doesn't provide a complete list of minerals for this location. For comprehensive information, please visit the Mindat.org website directly.`;
  }
}