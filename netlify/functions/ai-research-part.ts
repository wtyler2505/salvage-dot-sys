import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { 
    description, 
    mode = 'research', 
    context = {},
    imageUrl = null 
  } = body;

  console.log('🔍 AI Research Request:', { 
    description: description?.substring(0, 100), 
    mode, 
    hasImage: !!imageUrl,
    userId: user.id 
  });

  // Validate required inputs
  if (!description && !imageUrl) {
    return { 
      success: false,
      error: 'Either description or image is required for part research' 
    };
  }

  // Check for required API keys
  if (!process.env.ANTHROPIC_API_KEY && !process.env.PERPLEXITY_API_KEY) {
    console.error('❌ Missing both ANTHROPIC_API_KEY and PERPLEXITY_API_KEY');
    return { 
      success: false,
      error: 'AI service not configured', 
      details: 'API keys are missing. Please check your environment configuration.' 
    };
  }

  try {
    // Determine which AI service to use and research approach
    let researchResult;
    
    if (imageUrl) {
      // Image-based identification using Claude Vision
      researchResult = await researchPartFromImage(imageUrl, description, mode);
    } else {
      // Text-based research using Perplexity or Claude
      researchResult = await researchPartFromText(description, mode);
    }

    // Validate the AI response structure
    const validatedResult = validateAndEnhanceResult(researchResult, description, imageUrl);

    console.log('✅ AI research completed:', {
      name: validatedResult.name,
      confidence: validatedResult.confidence,
      hasImage: !!imageUrl,
      mode
    });

    return {
      success: true,
      research: validatedResult
    };

  } catch (error) {
    console.error('💥 AI research error:', error);
    
    // Return structured error response
    return {
      success: false,
      error: 'AI research failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      fallback: createFallbackResult(description, imageUrl)
    };
  }
});

// Text-based research using Perplexity (preferred) or Claude
async function researchPartFromText(description: string, mode: 'quick' | 'research'): Promise<any> {
  // Try Perplexity first for better web search results
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      return await callPerplexityAPI(description, mode);
    } catch (error) {
      console.warn('⚠️ Perplexity failed, falling back to Claude:', error.message);
    }
  }

  // Fallback to Claude
  if (process.env.ANTHROPIC_API_KEY) {
    return await callClaudeAPI(description, mode, false);
  }

  throw new Error('No AI service available for text research');
}

// Image-based research using Claude Vision
async function researchPartFromImage(imageUrl: string, description: string = '', mode: 'quick' | 'research'): Promise<any> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key required for image identification');
  }

  return await callClaudeAPI(description, mode, true, imageUrl);
}

// Perplexity API call with robust prompt engineering
async function callPerplexityAPI(description: string, mode: 'quick' | 'research'): Promise<any> {
  const systemPrompt = createSystemPrompt(mode, false);
  const userPrompt = `Research this electronic component: "${description}"`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: mode === 'quick' ? 1000 : 2000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from Perplexity API');
  }

  return parseAIResponse(content);
}

// Claude API call with vision support
async function callClaudeAPI(description: string, mode: 'quick' | 'research', hasImage: boolean, imageUrl?: string): Promise<any> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = createSystemPrompt(mode, hasImage);

  // Build messages array
  const messages: any[] = [];
  
  if (hasImage && imageUrl) {
    // Image + text message
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: await fetchImageAsBase64(imageUrl)
          }
        },
        {
          type: 'text',
          text: description 
            ? `Identify this electronic component. Additional context: ${description}`
            : 'Identify this electronic component from the image.'
        }
      ]
    });
  } else {
    // Text-only message
    messages.push({
      role: 'user',
      content: `Research this electronic component: "${description}"`
    });
  }

  const response = await anthropic.messages.create({
    model: hasImage ? 'claude-3-sonnet-20240229' : 'claude-3-haiku-20240307',
    max_tokens: mode === 'quick' ? 1000 : 2000,
    system: systemPrompt,
    messages: messages
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return parseAIResponse(content.text);
}

// Create system prompt based on mode and capabilities
function createSystemPrompt(mode: 'quick' | 'research', hasImage: boolean): string {
  const basePrompt = `You are an expert electronics researcher. Your task is to identify and provide information about electronic components.

CRITICAL: You MUST respond with ONLY a valid JSON object. No conversational text, explanations, or preambles.

Required JSON structure:
{
  "name": "Component name with part number",
  "description": "Technical description",
  "category": "Primary category (resistor, capacitor, IC, etc.)",
  "subcategory": "Specific subcategory if applicable",
  "manufacturer": "Manufacturer name or null",
  "part_number": "Official part number or null",
  "specifications": {
    "voltage": "Operating voltage",
    "current": "Current rating",
    "power": "Power rating",
    "package": "Package type",
    "pins": "Pin count",
    "tolerance": "Tolerance if applicable"
  },
  "typical_quantity": 1,
  "estimated_value": 5.99,
  "current_price_usd": null,
  "tags": ["relevant", "searchable", "tags"],
  "safety_warnings": ["Any safety considerations"],
  "common_uses": ["Typical applications"],
  "datasheet_url": null,
  "image_urls": [],
  "confidence": 0.85
}

${mode === 'quick' 
  ? 'QUICK MODE: Focus on basic identification - name, category, basic specs only.'
  : 'RESEARCH MODE: Provide comprehensive details including specifications, applications, and safety info.'
}

${hasImage 
  ? 'IMAGE MODE: Analyze the provided image to identify the component. Look for markings, package type, pin count, and any visible text.'
  : 'TEXT MODE: Research based on the text description provided.'
}

If you cannot identify the component, still return valid JSON with:
- name: "Unknown Component"
- description: "Could not identify from provided information"
- confidence: 0.1

REMEMBER: Respond with ONLY the JSON object. No other text.`;

  return basePrompt;
}

// Parse AI response and extract JSON
function parseAIResponse(content: string): any {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks if present
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Try to find JSON object in the text
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanContent = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleanContent);
    return parsed;
  } catch (parseError) {
    console.error('❌ JSON parsing failed:', parseError);
    console.error('📝 Content that failed to parse:', cleanContent.substring(0, 200));
    
    // Try to extract basic info if JSON parsing fails
    return createFallbackFromText(content);
  }
}

// Validate and enhance the AI result
function validateAndEnhanceResult(result: any, originalDescription: string, imageUrl?: string): any {
  // Ensure required fields exist
  const validated = {
    name: result.name || 'Unknown Component',
    description: result.description || 'No description available',
    category: result.category || 'Unknown',
    subcategory: result.subcategory || null,
    manufacturer: result.manufacturer || null,
    part_number: result.part_number || null,
    specifications: result.specifications || {},
    datasheet_url: result.datasheet_url || null,
    image_urls: Array.isArray(result.image_urls) ? result.image_urls : [],
    typical_quantity: Number(result.typical_quantity) || 1,
    estimated_value: result.estimated_value ? Number(result.estimated_value) : null,
    current_price_usd: result.current_price_usd ? Number(result.current_price_usd) : null,
    tags: Array.isArray(result.tags) ? result.tags : [],
    safety_warnings: Array.isArray(result.safety_warnings) ? result.safety_warnings : [],
    common_uses: Array.isArray(result.common_uses) ? result.common_uses : [],
    confidence: Math.min(Math.max(Number(result.confidence) || 0.5, 0), 1),
    
    // Add metadata
    ai_metadata: {
      research_method: imageUrl ? 'image_analysis' : 'text_research',
      original_input: originalDescription,
      has_image: !!imageUrl,
      timestamp: new Date().toISOString()
    }
  };

  // Enhance with default values based on category
  enhanceWithCategoryDefaults(validated);

  return validated;
}

// Enhance result with category-specific defaults
function enhanceWithCategoryDefaults(result: any): void {
  const category = result.category.toLowerCase();
  
  // Add typical quantity based on category
  if (!result.typical_quantity || result.typical_quantity === 1) {
    const quantities: Record<string, number> = {
      'resistor': 10,
      'capacitor': 5,
      'led': 10,
      'diode': 5,
      'transistor': 3,
      'ic': 1,
      'microcontroller': 1,
      'sensor': 1,
      'connector': 2,
      'switch': 2
    };
    
    for (const [cat, qty] of Object.entries(quantities)) {
      if (category.includes(cat)) {
        result.typical_quantity = qty;
        break;
      }
    }
  }

  // Add safety warnings for high-voltage components
  if (category.includes('power') || category.includes('voltage') || category.includes('mains')) {
    if (!result.safety_warnings.includes('High voltage - use caution')) {
      result.safety_warnings.push('High voltage - use caution');
    }
  }
}

// Create fallback result when AI completely fails
function createFallbackResult(description: string, imageUrl?: string): any {
  return {
    name: description || 'Unknown Component',
    description: 'AI identification failed - manual research required',
    category: 'Unknown',
    subcategory: null,
    manufacturer: null,
    part_number: null,
    specifications: {},
    datasheet_url: null,
    image_urls: [],
    typical_quantity: 1,
    estimated_value: null,
    current_price_usd: null,
    tags: ['unidentified'],
    safety_warnings: ['Unknown component - verify specifications before use'],
    common_uses: [],
    confidence: 0.1,
    ai_metadata: {
      research_method: imageUrl ? 'image_analysis' : 'text_research',
      original_input: description,
      has_image: !!imageUrl,
      failed: true,
      timestamp: new Date().toISOString()
    }
  };
}

// Create fallback from unparseable text
function createFallbackFromText(content: string): any {
  // Try to extract basic info from the text
  const name = extractField(content, ['name', 'component', 'part']) || 'Unknown Component';
  const category = extractField(content, ['category', 'type']) || 'Unknown';
  const description = content.substring(0, 200) + '...';

  return {
    name,
    description,
    category,
    subcategory: null,
    manufacturer: null,
    part_number: null,
    specifications: {},
    datasheet_url: null,
    image_urls: [],
    typical_quantity: 1,
    estimated_value: null,
    current_price_usd: null,
    tags: ['ai_parsed'],
    safety_warnings: [],
    common_uses: [],
    confidence: 0.3,
    ai_metadata: {
      research_method: 'text_extraction',
      original_response: content,
      timestamp: new Date().toISOString()
    }
  };
}

// Extract field from unstructured text
function extractField(text: string, fieldNames: string[]): string | null {
  for (const field of fieldNames) {
    const regex = new RegExp(`${field}[:\\s]+"?([^"\\n,]+)"?`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// Fetch image as base64 for Claude Vision
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}