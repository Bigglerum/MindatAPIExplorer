import OpenAI from "openai";

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

/**
 * Generate a response from OpenAI based on user message and conversation history
 * @param message - The user's message
 * @param history - Previous conversation history
 * @returns The AI-generated response
 */
export async function generateChatResponse(message: string, history: any[] = []): Promise<string> {
  try {
    // Format message history for the OpenAI API
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Create system prompt for context
    const systemPrompt = {
      role: "system",
      content: `You are an API assistant for the Mindat API, which provides access to mineralogical data.
      Your purpose is to assist users with understanding and using the API. 
      
      Some key information about the Mindat API:
      - It requires Basic Authentication with username and password
      - Authentication is done with the 'Authorization: Basic <base64-encoded-username:password>' header
      - It provides endpoints for minerals, locations, images, and other mineralogical data
      - Common parameters include pagination (page, page_size) and filtering options
      - The base URL is https://api.mindat.org
      
      Be helpful, concise, and technical when appropriate. When providing code examples, use markdown code blocks.
      Show examples with Basic Authentication in different programming languages.
      Always encourage best practices for API usage.`
    };

    // Add the system prompt at the beginning of the messages
    const messages = [systemPrompt, ...formattedHistory, { role: "user", content: message }];

    // Make the request to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages as any[],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and return the response text
    return completion.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Error generating OpenAI response:", error);
    throw new Error("Failed to generate AI response");
  }
}