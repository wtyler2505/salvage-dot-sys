import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { message, conversation_id, context = {} } = body;

  console.log('AI Chat Request:', { message, conversation_id, context });

  // Check for required API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY environment variable');
    return { 
      error: 'AI service not configured', 
      details: 'Anthropic API key is missing. Please check your environment configuration.' 
    };
  }

  if (!message || typeof message !== 'string') {
    return { error: 'Message is required' };
  }

  try {
    // Import Anthropic
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Get recent parts and projects for context
    const { data: recentParts } = await supabaseAdmin
      .from('parts')
      .select('name, category, description, quantity, is_available')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentProjects } = await supabaseAdmin
      .from('projects')
      .select('name, status, description')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get conversation history if conversation_id provided
    let conversationHistory = [];
    if (conversation_id) {
      const { data: history } = await supabaseAdmin
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);
      
      conversationHistory = history || [];
    }

    // System prompt for the garage buddy personality
    const systemPrompt = `You are the user's AI garage buddy - a helpful, knowledgeable electronics expert with a casual, friendly personality. You help with salvaged parts, project ideas, and electronics knowledge.

PERSONALITY:
- Casual and enthusiastic about electronics projects
- Use light profanity when appropriate (damn, shit, hell - keep it workshop-appropriate)
- Genuinely excited about weird and creative projects
- Practical knowledge with a "let's try it" attitude
- Safety conscious but not preachy
- Remember past conversations and learn preferences

CURRENT USER CONTEXT:
Recent Parts (${recentParts?.length || 0} total):
${recentParts?.map(p => `- ${p.name} (${p.category}) - Qty: ${p.quantity} - ${p.is_available ? 'Available' : 'Used'}`).join('\n') || 'No parts added yet'}

Recent Projects (${recentProjects?.length || 0} total):
${recentProjects?.map(p => `- ${p.name} (${p.status}) - ${p.description || 'No description'}`).join('\n') || 'No projects started yet'}

GUIDELINES:
- Always consider what parts the user actually has
- Suggest projects based on available components
- Provide practical, actionable advice
- Ask follow-up questions to understand their goals
- Be encouraging about learning and experimentation
- Share safety tips when working with dangerous components

Respond as their enthusiastic garage buddy who knows their inventory and project history.`;

    // Build messages array for Claude
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Get response from Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const assistantResponse = assistantMessage.text;

    // Save messages to database
    let finalConversationId = conversation_id;
    
    if (!finalConversationId) {
      // Create new conversation
      finalConversationId = crypto.randomUUID();
    }

    // Save user message
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        user_id: user.id,
        role: 'user',
        content: message,
        metadata: context
      });

    // Save assistant response
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        user_id: user.id,
        role: 'assistant',
        content: assistantResponse,
        metadata: {
          model: 'claude-3-sonnet',
          parts_context: recentParts?.length || 0,
          projects_context: recentProjects?.length || 0
        }
      });

    return {
      message: assistantResponse,
      conversation_id: finalConversationId,
      context: {
        parts_referenced: recentParts?.length || 0,
        projects_referenced: recentProjects?.length || 0
      }
    };

  } catch (error) {
    console.error('AI chat error:', error);
    
    // Provide more specific error messages based on error type
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
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return { 
          error: 'AI service connection failed',
          details: 'Unable to connect to AI service. Please check your internet connection.'
        };
      }
    }
    
    return { 
      error: 'Failed to get AI response',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});