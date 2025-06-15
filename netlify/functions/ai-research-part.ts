import { withAuth } from './utils/auth';
import { researchPart, findPartImages, parseNaturalLanguage } from './utils/ai-clients';

export const handler = withAuth(async (req) => {
  const { description, mode = 'research', context = {} } = req.body;

  console.log('AI Research Request:', { description, mode, context });

  // Check for required API key first - now checking for Perplexity
  if (!process.env.PERPLEXITY_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('Missing both PERPLEXITY_API_KEY and ANTHROPIC_API_KEY environment variables');
    return { 
      error: 'AI service not configured', 
      details: 'Perplexity API key is missing. Please check your environment configuration.' 
    };
  }

  if (!description || typeof description !== 'string') {
    return { error: 'Description is required' };
  }

  try {
    switch (mode) {
      case 'parse':
        // Parse natural language input to determine intent
        const parsed = await parseNaturalLanguage(description);
        return { parsed };

      case 'research':
        // Full research mode - get comprehensive part information using Perplexity
        console.log('🚀 Using Perplexity for enhanced research with web search');
        const research = await researchPart(description);
        
        console.log('📊 Research results:', {
          name: research.name,
          images_found: research.image_urls.length,
          models_found: research.model_3d_urls.length,
          has_datasheet: !!research.datasheet_url,
          has_pricing: !!research.current_price_usd,
          confidence: research.confidence
        });

        return { research };

      case 'quick':
        // Quick mode - basic part info for fast entry
        const quickResearch = await researchPart(description);
        
        return {
          research: {
            name: quickResearch.name,
            category: quickResearch.category,
            subcategory: quickResearch.subcategory,
            description: quickResearch.description,
            typical_quantity: quickResearch.typical_quantity,
            estimated_value: quickResearch.estimated_value,
            current_price_usd: quickResearch.current_price_usd,
            confidence: quickResearch.confidence,
            tags: quickResearch.tags,
            specifications: quickResearch.specifications
          }
        };

      default:
        return { error: 'Invalid mode. Use: parse, research, or quick' };
    }
  } catch (error) {
    console.error('AI research error:', error);
    
    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('PERPLEXITY_API_KEY') || error.message.includes('Perplexity')) {
        return { 
          error: 'Perplexity service authentication failed',
          details: 'Invalid or missing Perplexity API key. Please check your API configuration in Settings.'
        };
      }
      if (error.message.includes('API key')) {
        return { 
          error: 'AI service authentication failed',
          details: 'Invalid or missing API key. Please check your API configuration.'
        };
      }
      if (error.message.includes('rate limit')) {
        return { 
          error: 'AI service rate limit exceeded',
          details: 'Too many requests. Please wait a moment and try again.'
        };
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return { 
          error: 'AI service connection failed',
          details: 'Unable to connect to AI service. Please check your internet connection.'
        };
      }
    }
    
    return { 
      error: 'Failed to research part',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});