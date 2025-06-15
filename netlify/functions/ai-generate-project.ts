import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { 
    selected_parts = [], 
    preferences = {}, 
    difficulty = 'medium',
    project_type = 'any',
    time_available = 'any'
  } = body;

  console.log('AI Project Generation Request:', { 
    selected_parts, 
    preferences, 
    difficulty, 
    project_type, 
    time_available 
  });

  // Check for required API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY environment variable');
    return { 
      error: 'AI service not configured', 
      details: 'Anthropic API key is missing. Please check your environment configuration.' 
    };
  }

  try {
    // Import Anthropic
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Get detailed info about selected parts
    let partsInfo = [];
    if (selected_parts.length > 0) {
      const { data: parts } = await supabaseAdmin
        .from('parts')
        .select('name, category, description, specifications, quantity, is_available')
        .in('id', selected_parts)
        .eq('user_id', user.id);
      
      partsInfo = parts || [];
    } else {
      // If no parts selected, get all available parts
      const { data: allParts } = await supabaseAdmin
        .from('parts')
        .select('name, category, description, specifications, quantity')
        .eq('user_id', user.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(20);
      
      partsInfo = allParts || [];
    }

    // Get user's previous projects for context
    const { data: previousProjects } = await supabaseAdmin
      .from('projects')
      .select('name, description, status, difficulty_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // System prompt for project generation
    const systemPrompt = `You are an expert electronics project generator with a garage buddy personality. Generate creative, practical project ideas based on the user's available parts.

PERSONALITY:
- Enthusiastic about electronics and making cool shit work
- Practical but encouraging ("fuck it, let's try it" attitude)
- Safety conscious without being preachy
- Knows salvage electronics and creative reuse

GENERATE PROJECT IDEAS that:
- Use the specified parts effectively
- Match the requested difficulty and time constraints
- Are actually buildable and practical
- Include safety considerations
- Provide clear learning opportunities
- Suggest cool extensions or variations

RESPOND IN JSON FORMAT:
{
  "projects": [
    {
      "name": "Project Name",
      "description": "Detailed description of what it does and why it's cool",
      "difficulty": "easy|medium|hard|expert",
      "estimated_time": "2-4 hours",
      "required_parts": ["Part names from their inventory"],
      "optional_parts": ["Additional parts that would enhance it"],
      "skills_learned": ["What they'll learn building this"],
      "safety_notes": ["Important safety considerations"],
      "build_steps": ["High-level build steps"],
      "variations": ["Cool modifications or extensions"],
      "why_cool": "Why this project is awesome and worth building"
    }
  ],
  "general_advice": "Encouraging advice about the projects",
  "parts_shopping": ["Parts they might want to buy to unlock more projects"]
}

Generate 2-3 project ideas that are genuinely exciting and doable.`;

    const userPrompt = `Generate project ideas for me!

AVAILABLE PARTS (${partsInfo.length} parts):
${partsInfo.map(p => `- ${p.name} (${p.category}) - Qty: ${p.quantity}${p.description ? ` - ${p.description}` : ''}`).join('\n')}

PREFERENCES:
- Difficulty: ${difficulty}
- Project type: ${project_type}
- Time available: ${time_available}
- Additional preferences: ${JSON.stringify(preferences)}

MY PREVIOUS PROJECTS:
${previousProjects?.map(p => `- ${p.name} (${p.status}) - ${p.description || 'No description'}`).join('\n') || 'No previous projects'}

I want to build something cool with these parts! Give me some creative ideas that are practical and fun.`;

    // Get response from Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Clean and parse the JSON response
    let cleanText = content.text.trim();
    
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanText);
    
    // Validate the response structure
    if (!result.projects || !Array.isArray(result.projects)) {
      throw new Error('Invalid response: missing projects array');
    }

    // Add metadata about the generation
    result.generation_metadata = {
      parts_used: partsInfo.length,
      selected_parts: selected_parts.length,
      user_preferences: {
        difficulty,
        project_type,
        time_available
      },
      generated_at: new Date().toISOString(),
      model: 'claude-3-sonnet'
    };

    return result;

  } catch (error) {
    console.error('Project generation error:', error);
    
    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return { 
          error: 'AI service authentication failed',
          details: 'Invalid or missing API key. Please check your Anthropic API configuration.'
        };
      }
      if (error.message.includes('rate limit')) {
        return { 
          error: 'AI service rate limit exceeded',
          details: 'Too many requests. Please wait a moment and try again.'
        };
      }
      if (error.message.includes('JSON')) {
        return { 
          error: 'AI response parsing failed',
          details: 'The AI response could not be parsed. Please try again.'
        };
      }
    }
    
    return { 
      error: 'Failed to generate project ideas',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});