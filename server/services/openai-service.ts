import OpenAI from "openai";
import { 
  searchMinerals, 
  searchLocalities, 
  getMineralById, 
  getLocalityById,
  findTypeLocalityForMineral,
  getMineralsAtLocality 
} from "../mindat-api";
import { db } from '../db';
import { rruffMinerals, rruffSpectra } from '@shared/rruff-schema';
import { eq, ilike, and, or, sql } from 'drizzle-orm';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface SearchParams {
  type: 'mineral' | 'locality' | 'rruff';
  searchTerms: {
    name?: string;
    formula?: string;
    elements?: string[];
    country?: string;
    region?: string;
    id?: number;
    crystalSystem?: string;
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
      content: "You are a tool that extracts search parameters from user questions about minerals, localities, and crystallography. " +
      "Given a question about mineralogical data, extract parameters for searching either the Mindat API or the RRUFF database. " +
      "Response format must be valid JSON with the following structure:\n" +
      "{\n" +
      "  \"type\": \"mineral\" or \"locality\" or \"rruff\",\n" +
      "  \"searchTerms\": {\n" +
      "    \"name\": optional string,\n" +
      "    \"formula\": optional string,\n" +
      "    \"elements\": optional array of strings,\n" +
      "    \"country\": optional string,\n" +
      "    \"region\": optional string,\n" +
      "    \"id\": optional number,\n" +
      "    \"crystalSystem\": optional string\n" +
      "  },\n" +
      "  \"action\": \"search\" or \"details\"\n" +
      "}\n" +
      "If the user is asking about a specific mineral, set type to \"mineral\".\n" +
      "If the user is asking about a specific location, set type to \"locality\".\n" +
      "If the user is specifically asking about spectral data, crystallographic data, crystal classes, space groups, crystal systems, Dana classification, or Nickel-Strunz classification, set type to \"rruff\".\n" +
      "If the user mentions crystal systems (cubic/isometric, tetragonal, hexagonal, trigonal, orthorhombic, monoclinic, triclinic), include crystalSystem field.\n" +
      "Note that 'cubic' and 'isometric' refer to the same crystal system - use 'cubic' for consistency.\n" +
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
    
    // Check for RRUFF database specific questions or crystal classification systems
    const rruffRegex = /(?:what|where|how|can you).*(?:rruff|spectral|spectroscopy|crystal system|crystal class|space group|dana|strunz|symmetry|crystallography).*(?:\?)?/i;
    if (rruffRegex.test(message)) {
      console.log('Detected RRUFF database or crystallography question');
      const rruffParams = await determineSearchParams(message);
      
      if (rruffParams && (rruffParams.type === 'rruff' || rruffParams.searchTerms.crystalSystem)) {
        return await searchRruffDatabase(message, rruffParams);
      }
    }

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
      context += "Here's the data from the Mindat API:\n" + JSON.stringify(apiData, null, 2);
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
 * Search the RRUFF database for mineral information
 * @param message - User's original question
 * @param searchParams - Extracted search parameters
 * @returns AI-generated response with RRUFF data
 */
async function searchRruffDatabase(message: string, searchParams: SearchParams): Promise<string> {
  try {
    console.log('Searching RRUFF database with params:', searchParams);
    
    // Build query conditions
    const conditions = [];
    
    if (searchParams.searchTerms.name) {
      conditions.push(ilike(rruffMinerals.mineralName, `%${searchParams.searchTerms.name}%`));
    }
    
    if (searchParams.searchTerms.formula) {
      conditions.push(ilike(rruffMinerals.chemicalFormula, `%${searchParams.searchTerms.formula}%`));
    }
    
    if (searchParams.searchTerms.elements && searchParams.searchTerms.elements.length > 0) {
      // Handle element filtering
      searchParams.searchTerms.elements.forEach(element => {
        // Using a simpler approach for element filtering
        conditions.push(ilike(sql`${rruffMinerals.elementComposition}::text`, `%${element}%`));
      });
    }
    
    if (searchParams.searchTerms.crystalSystem) {
      conditions.push(ilike(rruffMinerals.crystalSystem, `%${searchParams.searchTerms.crystalSystem}%`));
    }
    
    // Execute the database query
    let minerals;
    
    if (conditions.length > 0) {
      minerals = await db.select()
        .from(rruffMinerals)
        .where(and(...conditions))
        .limit(10);
    } else {
      // If no specific conditions, return top minerals
      minerals = await db.select()
        .from(rruffMinerals)
        .limit(10);
    }
    
    if (!minerals || minerals.length === 0) {
      return "I couldn't find any minerals in the RRUFF database matching your criteria. The RRUFF database may not have this information, or there might be an alternative spelling.";
    }
    
    // If we're looking for details about a specific mineral
    if (searchParams.action === 'details' && searchParams.searchTerms.name && minerals.length > 0) {
      // Find the closest match for the mineral name
      const closestMatch = minerals.find(m => 
        m.mineralName.toLowerCase() === searchParams.searchTerms.name?.toLowerCase()
      ) || minerals[0];
      
      // Get spectra for this mineral
      const spectra = await db.select()
        .from(rruffSpectra)
        .where(eq(rruffSpectra.mineralId, closestMatch.id));
      
      // Enhanced mineral data with RRUFF information
      return await generateRruffMineralResponse(message, closestMatch, spectra);
    }
    
    // For search results, generate a summary response
    return await generateRruffSearchResponse(message, minerals);
  } catch (error) {
    console.error("Error searching RRUFF database:", error);
    return "I encountered an error while searching the RRUFF database. Please try again with a more specific query.";
  }
}

/**
 * Generate a detailed response for a specific mineral from RRUFF data
 */
async function generateRruffMineralResponse(message: string, mineral: any, spectra: any[]): Promise<string> {
  // Create a system prompt for crafting mineral details
  const systemPrompt = {
    role: "system",
    content: "You are a mineralogist specializing in spectroscopy and crystallography. " +
    "Create a detailed, informative response about this mineral using the RRUFF database information provided. " +
    "Format the response nicely with proper headers, emphasis, and structure. " +
    "Focus on crystallographic data and any spectroscopic information. " +
    "If the mineral has spectral data available, highlight this fact. " +
    "Be scientific but accessible in your explanation."
  };
  
  // Create a detailed description of the mineral and its spectra
  let mineralDetails = `
## ${mineral.mineralName}

**Chemical Formula**: ${mineral.chemicalFormula || 'Not specified'}
**Crystal System**: ${mineral.crystalSystem || 'Not specified'}
**Crystal Class**: ${mineral.crystalClass || 'Not specified'}
**Space Group**: ${mineral.spaceGroup || 'Not specified'}
**Color**: ${mineral.color || 'Not specified'}
**Density**: ${mineral.density || 'Not specified'}
**Hardness**: ${mineral.hardness || 'Not specified'}
**Year First Published**: ${mineral.yearFirstPublished || 'Not specified'}

### Unit Cell Parameters
${mineral.unitCell ? JSON.stringify(mineral.unitCell, null, 2) : 'No unit cell data available'}

### Spectral Data
${spectra.length > 0 ? 
  `This mineral has ${spectra.length} spectra available in the RRUFF database:\n` + 
  spectra.map(s => `- ${s.spectraType} spectrum (Sample ID: ${s.sampleId}, Orientation: ${s.orientation || 'Not specified'}, Wavelength: ${s.wavelength || 'Not specified'})`).join('\n')
  : 
  'No spectral data available in the RRUFF database for this mineral.'}

### Elements
${mineral.elementComposition ? 'Contains: ' + mineral.elementComposition.join(', ') : 'Element composition not specified'}
`;

  try {
    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt.content },
        { role: "user", content: `Question: ${message}\n\nRRUFF Database Information:\n${mineralDetails}` }
      ],
      temperature: 0.7,
      max_tokens: 600,
    });
    
    return completion.choices[0].message.content || "I couldn't generate a detailed response about this mineral.";
  } catch (error) {
    console.error("Error generating RRUFF mineral response:", error);
    return mineralDetails; // Fallback to the raw data if AI generation fails
  }
}

/**
 * Generate a response summarizing search results from RRUFF
 */
async function generateRruffSearchResponse(message: string, minerals: any[]): Promise<string> {
  // Create a system prompt for search results
  const systemPrompt = {
    role: "system",
    content: "You are a mineralogist specializing in crystallography. " +
    "Create a response summarizing the mineral search results from the RRUFF database. " +
    "Format the response as a well-structured summary with a table of the minerals found. " +
    "Focus on explaining the crystal systems and properties that are common among the results. " +
    "Be scientific but accessible."
  };
  
  // Create a table of search results
  let mineralTable = "| Mineral | Formula | Crystal System | Class |\n|---------|---------|---------------|-------|\n";
  
  minerals.forEach(m => {
    mineralTable += `| ${m.mineralName} | ${m.chemicalFormula || 'N/A'} | ${m.crystalSystem || 'N/A'} | ${m.crystalClass || 'N/A'} |\n`;
  });
  
  try {
    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt.content },
        { role: "user", content: `Question: ${message}\n\nRRUFF Search Results (${minerals.length} minerals found):\n${mineralTable}` }
      ],
      temperature: 0.7,
      max_tokens: 600,
    });
    
    return completion.choices[0].message.content || "I couldn't generate a summary of the search results.";
  } catch (error) {
    console.error("Error generating RRUFF search response:", error);
    
    // Fallback to basic response if AI generation fails
    return `I found ${minerals.length} minerals in the RRUFF database that match your search criteria:\n\n${mineralTable}`;
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