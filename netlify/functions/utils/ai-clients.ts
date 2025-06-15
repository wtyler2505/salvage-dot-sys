// AI client utilities for Claude and Perplexity
import Anthropic from '@anthropic-ai/sdk';

// Helper function to get Anthropic client for chat (keep Claude for personality)
const getAnthropicClient = (): Anthropic => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable is missing');
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxRetries: 2,
  });
};

// Helper function to get Perplexity client for research
const getPerplexityClient = () => {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY environment variable is missing');
    throw new Error('PERPLEXITY_API_KEY environment variable is required');
  }

  return {
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
  };
};

// System prompt optimized for Perplexity's web search capabilities
const PERPLEXITY_RESEARCH_PROMPT = `You are an expert electronics researcher with access to real-time web search. Research the given electronic component and provide comprehensive, accurate information.

CRITICAL INSTRUCTIONS:
1. Use your web search capabilities to find REAL, working URLs
2. Find actual product images from manufacturer websites, distributors (Digi-Key, Mouser, SparkFun), or reliable sources
3. Locate real datasheet URLs from official manufacturer sites
4. Find actual 3D model download links from CAD libraries, GrabCAD, Thingiverse, or manufacturer sites
5. Get current pricing and availability information
6. Provide accurate specifications from official sources

RESEARCH PRIORITY SOURCES:
- Manufacturer websites (official specs, datasheets, images)
- Electronics distributors (Digi-Key, Mouser, Arrow, Newark)
- Development board vendors (SparkFun, Adafruit, Seeed Studio)
- 3D model libraries (GrabCAD, Thingiverse, KiCad libraries)
- Component databases (Octopart, FindChips)
- GitHub repositories with component libraries

For 3D models, prioritize:
- Official manufacturer CAD downloads (.step, .iges files)
- KiCad 3D model libraries (.wrl files)
- GrabCAD community models
- Thingiverse models for development boards
- GitHub repos with accurate component models

NEVER generate fake URLs or placeholders. If you can't find real URLs, leave those arrays empty.

RESPONSE FORMAT - CRITICAL:
You MUST respond with ONLY a valid JSON object. Do not include any conversational text, explanations, or preambles. Start your response directly with the opening curly brace { and end with the closing curly brace }. No markdown code blocks, no "Here is the information:", no additional text whatsoever.

JSON structure required:
{
  "name": "Exact component name with part number",
  "description": "Detailed technical description",
  "category": "Primary category (microcontroller, sensor, resistor, etc.)",
  "subcategory": "Specific subcategory if applicable", 
  "manufacturer": "Official manufacturer name",
  "part_number": "Official part number/model",
  "specifications": {
    "voltage": "Operating voltage range",
    "current": "Current consumption/rating", 
    "package": "Physical package type",
    "pins": "Pin count",
    "frequency": "Operating frequency if applicable",
    "memory": "Memory specifications if applicable"
  },
  "datasheet_url": "Real datasheet URL from manufacturer",
  "image_urls": ["Array of real product image URLs"],
  "model_3d_urls": ["Array of real 3D model download URLs"],
  "model_formats": ["Available formats: STL, STEP, WRL, etc."],
  "typical_quantity": 1,
  "estimated_value": 25.50,
  "current_price_usd": 27.95,
  "availability": "In stock/Limited/Discontinued",
  "tags": ["relevant", "searchable", "tags"],
  "safety_warnings": ["Any safety considerations"],
  "common_uses": ["Typical applications"],
  "compatible_parts": ["Similar or compatible components"],
  "purchase_urls": ["Where to buy - real URLs"],
  "confidence": 0.95
}

Research thoroughly using web search. Provide only accurate, verified information with real URLs. Remember: ONLY JSON, no other text.`;

export interface PartResearchResult {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  manufacturer?: string;
  part_number?: string;
  specifications: Record<string, any>;
  datasheet_url?: string;
  image_urls: string[];
  model_3d_urls: string[];
  model_formats: string[];
  typical_quantity: number;
  estimated_value?: number;
  current_price_usd?: number;
  availability?: string;
  tags: string[];
  safety_warnings: string[];
  common_uses: string[];
  compatible_parts: string[];
  purchase_urls: string[];
  confidence: number;
}

// Enhanced JSON extraction with better error handling and logging
const extractJSON = (text: string): any => {
  let cleanText = text.trim();
  
  console.log('🔍 Raw AI response length:', text.length);
  console.log('🔍 First 200 chars:', text.substring(0, 200));
  console.log('🔍 Last 200 chars:', text.substring(Math.max(0, text.length - 200)));
  
  // Remove markdown code blocks if present
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    console.log('✂️ Removed json markdown blocks');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    console.log('✂️ Removed generic markdown blocks');
  }
  
  // Try to find JSON object in the text if there's conversational text
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
    console.log('🎯 Extracted JSON from larger text');
  }
  
  // If the text doesn't start with { but contains JSON, try to extract it
  if (!cleanText.startsWith('{')) {
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleanText = cleanText.substring(startIndex, endIndex + 1);
      console.log('🔧 Extracted JSON by finding braces');
    }
  }
  
  // Clean up common JSON formatting issues
  try {
    // Fix trailing commas before closing braces/brackets
    cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix single quotes to double quotes (common AI mistake)
    cleanText = cleanText.replace(/'/g, '"');
    
    // Fix unescaped quotes in strings
    cleanText = cleanText.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
    
    // Fix missing quotes around keys (another common mistake)
    cleanText = cleanText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    console.log('✨ Applied JSON cleanup');
    console.log('🧹 Cleaned text (first 300 chars):', cleanText.substring(0, 300));
  } catch (cleanupError) {
    console.warn('⚠️ JSON cleanup failed:', cleanupError);
  }
  
  try {
    const parsed = JSON.parse(cleanText);
    console.log('✅ JSON parsed successfully');
    return parsed;
  } catch (parseError) {
    console.error('❌ JSON parsing failed:', parseError);
    console.error('📝 Failed text (first 500 chars):', cleanText.substring(0, 500));
    console.error('📝 Failed text (around error position):', cleanText.substring(Math.max(0, 680), 720));
    
    // Try one more time with more aggressive cleaning
    try {
      // Remove any remaining non-JSON text before the opening brace
      const match = cleanText.match(/\{.*\}/s);
      if (match) {
        const lastAttempt = match[0];
        console.log('🔥 Last attempt with regex extraction');
        return JSON.parse(lastAttempt);
      }
    } catch (finalError) {
      console.error('💀 Final JSON parsing attempt failed:', finalError);
    }
    
    throw new Error(`Invalid JSON from AI response: ${parseError.message}. Raw response: ${cleanText.substring(0, 200)}...`);
  }
};

// Add retry logic for API calls
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
};

export const researchPartWithPerplexity = async (description: string): Promise<PartResearchResult> => {
  return retryWithBackoff(async () => {
    const client = getPerplexityClient();
    
    console.log('🔍 Using Perplexity for part research:', description);
    
    const response = await fetch(`${client.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online', // Best model for research with web search
        messages: [
          {
            role: 'system',
            content: PERPLEXITY_RESEARCH_PROMPT
          },
          {
            role: 'user', 
            content: `Research this electronic component: "${description}". Respond with only the JSON object as specified, no additional text.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for factual research
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('🎯 Perplexity research response received');
    
    // Extract and parse the JSON response
    const result = extractJSON(content);
    
    // Validate required fields
    if (!result.name || !result.category) {
      throw new Error('Invalid response: missing required fields (name or category)');
    }

    // Ensure all arrays exist and remove any obviously fake URLs
    result.image_urls = (result.image_urls || []).filter((url: string) => 
      url && 
      typeof url === 'string' &&
      url.startsWith('http') && 
      !url.includes('placeholder') && 
      !url.includes('example.com') &&
      !url.includes('via.placeholder')
    );
    
    result.model_3d_urls = (result.model_3d_urls || []).filter((url: string) => 
      url && 
      typeof url === 'string' &&
      url.startsWith('http') && 
      !url.includes('example.com')
    );
    
    result.purchase_urls = (result.purchase_urls || []).filter((url: string) => 
      url && 
      typeof url === 'string' &&
      url.startsWith('http') && 
      !url.includes('example.com')
    );

    // Ensure all required arrays exist
    result.model_formats = result.model_formats || [];
    result.tags = result.tags || [];
    result.safety_warnings = result.safety_warnings || [];
    result.common_uses = result.common_uses || [];
    result.compatible_parts = result.compatible_parts || [];
    result.specifications = result.specifications || {};

    console.log('✅ Perplexity research completed:', {
      name: result.name,
      images: result.image_urls.length,
      models: result.model_3d_urls.length,
      confidence: result.confidence
    });

    return result as PartResearchResult;
  }, 2, 2000); // 2 retries with 2 second base delay
};

// Keep original Claude-based research as fallback
export const researchPart = async (description: string): Promise<PartResearchResult> => {
  console.log('🚀 Starting part research for:', description);
  
  // Try Perplexity first for better web search results
  try {
    const result = await researchPartWithPerplexity(description);
    console.log('✅ Perplexity research successful');
    return result;
  } catch (perplexityError) {
    console.warn('⚠️ Perplexity research failed, falling back to Claude:', perplexityError.message);
    
    // Fallback to Claude if Perplexity fails
    try {
      const result = await retryWithBackoff(async () => {
        const anthropic = getAnthropicClient();
        
        console.log('🧭 Attempting Claude fallback research');
        
        const response = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `Research this electronic component: "${description}"

You MUST respond with ONLY a valid JSON object. Do not include any conversational text, explanations, or preambles. Start your response directly with the opening curly brace { and end with the closing curly brace }. No markdown code blocks, no "Here is the information:", no additional text whatsoever.

Use this exact JSON structure:
{
  "name": "Component name",
  "description": "Technical description", 
  "category": "Primary category",
  "subcategory": "Specific subcategory",
  "manufacturer": "Manufacturer name",
  "part_number": "Part number",
  "specifications": {},
  "datasheet_url": null,
  "image_urls": [],
  "model_3d_urls": [],
  "model_formats": [],
  "typical_quantity": 1,
  "estimated_value": 10.0,
  "current_price_usd": null,
  "availability": "Unknown",
  "tags": [],
  "safety_warnings": [],
  "common_uses": [],
  "compatible_parts": [],
  "purchase_urls": [],
  "confidence": 0.5
}

Remember: ONLY JSON, no other text.`
            }
          ]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        // Parse Claude response using the same extraction logic
        const result = extractJSON(content.text);
        
        // Validate required fields
        if (!result.name || !result.category) {
          throw new Error('Invalid Claude response: missing required fields');
        }
        
        // Add fallback indicators and ensure arrays exist
        result.image_urls = result.image_urls || [];
        result.model_3d_urls = result.model_3d_urls || [];
        result.model_formats = result.model_formats || [];
        result.purchase_urls = result.purchase_urls || [];
        result.tags = result.tags || [];
        result.safety_warnings = result.safety_warnings || [];
        result.common_uses = result.common_uses || [];
        result.compatible_parts = result.compatible_parts || [];
        result.specifications = result.specifications || {};
        result.datasheet_url = result.datasheet_url || null;
        result.confidence = Math.max(0.3, (result.confidence || 0.5) - 0.2); // Lower confidence for fallback
        
        console.log('✅ Claude fallback research completed');
        return result as PartResearchResult;
      }, 2, 1500); // 2 retries with 1.5 second base delay
      
      return result;
    } catch (claudeError) {
      console.error('💀 Both Perplexity and Claude research failed');
      console.error('🔥 Perplexity error:', perplexityError.message);
      console.error('🔥 Claude error:', claudeError.message);
      throw new Error(`Failed to research part information. Perplexity: ${perplexityError.message}. Claude: ${claudeError.message}`);
    }
  }
};

// Enhanced image search - now uses Perplexity's web search capabilities
export const findPartImages = async (partName: string, manufacturer?: string): Promise<string[]> => {
  try {
    console.log(`🔍 Searching for images: ${partName} by ${manufacturer || 'unknown'}`);
    
    // Use Perplexity to find real images
    const searchQuery = manufacturer 
      ? `${partName} ${manufacturer} product images datasheet`
      : `${partName} electronic component product images`;
      
    const result = await researchPartWithPerplexity(searchQuery);
    return result.image_urls;
  } catch (error) {
    console.error('Image search error:', error);
    return []; // Return empty array instead of broken placeholders
  }
};

// Natural language processing - keep Claude for this since it's good at understanding
export const parseNaturalLanguage = async (input: string): Promise<{
  action: 'add_part' | 'search_part' | 'identify_part';
  part_description: string;
  quantity?: number;
  location?: string;
  additional_context?: string;
}> => {
  try {
    const result = await retryWithBackoff(async () => {
      const anthropic = getAnthropicClient();
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Faster model for parsing
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Parse this natural language input about electronic parts and determine the user's intent:

"${input}"

You MUST respond with ONLY a valid JSON object. No conversational text, explanations, or preambles. Start directly with { and end with }.

JSON format:
{
  "action": "add_part" | "search_part" | "identify_part",
  "part_description": "Clean description of the part",
  "quantity": number (if mentioned),
  "location": "storage location (if mentioned)",
  "additional_context": "any extra details"
}

Examples:
- "Add 5 Arduino Nanos to drawer A" → {"action": "add_part", "part_description": "Arduino Nano", "quantity": 5, "location": "drawer A"}
- "I have this mystery IC with 8 pins" → {"action": "identify_part", "part_description": "mystery IC with 8 pins"}
- "Find all my resistors" → {"action": "search_part", "part_description": "resistors"}

Remember: ONLY JSON, no other text.`
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return extractJSON(content.text);
    }, 2, 1000);
    
    return result;
  } catch (error) {
    console.error('Natural language parsing error:', error);
    // Fallback to simple add_part action
    return {
      action: 'add_part',
      part_description: input,
    };
  }
};