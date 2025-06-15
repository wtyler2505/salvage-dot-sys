import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { content, category = 'general', entity_type, entity_id, metadata = {} } = body;

  console.log('Add Memory Request:', { content, category, entity_type, entity_id });

  // Check for required API key
  if (!process.env.MEM0_API_KEY) {
    console.error('Missing MEM0_API_KEY environment variable');
    return { 
      error: 'Memory service not configured', 
      details: 'mem0 API key is missing. Please check your environment configuration.' 
    };
  }

  if (!content || typeof content !== 'string') {
    return { error: 'Memory content is required' };
  }

  try {
    // Add memory to mem0
    const mem0Response = await fetch('https://api.mem0.ai/v1/memories/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MEM0_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        user_id: user.id,
        metadata: {
          category,
          entity_type,
          entity_id,
          ...metadata
        }
      })
    });

    if (!mem0Response.ok) {
      const errorText = await mem0Response.text();
      console.error('mem0 API error:', errorText);
      throw new Error(`mem0 API error: ${mem0Response.status} - ${errorText}`);
    }

    const mem0Data = await mem0Response.json();
    console.log('mem0 response:', mem0Data);

    // Save memory sync record to our database
    const { data: syncRecord, error: syncError } = await supabaseAdmin
      .from('memory_sync')
      .insert({
        user_id: user.id,
        entity_type: entity_type || 'general',
        entity_id: entity_id || user.id,
        mem0_memory_id: mem0Data.id || mem0Data.memory_id,
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        metadata: {
          category,
          content_preview: content.substring(0, 100),
          mem0_data: mem0Data
        }
      })
      .select()
      .single();

    if (syncError) {
      console.error('Sync record error:', syncError);
      // Continue anyway - memory was saved to mem0
    }

    return {
      success: true,
      memory_id: mem0Data.id || mem0Data.memory_id,
      sync_record: syncRecord
    };

  } catch (error) {
    console.error('Add memory error:', error);
    
    // Save failed sync record
    try {
      await supabaseAdmin
        .from('memory_sync')
        .insert({
          user_id: user.id,
          entity_type: entity_type || 'general',
          entity_id: entity_id || user.id,
          sync_status: 'failed',
          sync_error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            category,
            content_preview: content.substring(0, 100),
            attempted_at: new Date().toISOString()
          }
        });
    } catch (syncError) {
      console.error('Failed to save error sync record:', syncError);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return { 
          error: 'Memory service authentication failed',
          details: 'Invalid or missing mem0 API key. Please check your configuration.'
        };
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return { 
          error: 'Memory service rate limit exceeded',
          details: 'Too many requests. Please wait a moment and try again.'
        };
      }
    }
    
    return { 
      error: 'Failed to add memory',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});