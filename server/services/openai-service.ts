import OpenAI from "openai";
import { 
  searchMinerals, 
  searchLocalities, 
  getMineralById, 
  getLocalityById,
  findTypeLocalityForMineral 
} from "../mindat-api";

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

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