import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { query, limit = 10, category, entity_type } = body;

  console.log('Search Memory Request:', { query, limit, category, entity_type });

  // Check for required API key
  if (!process.env.MEM0_API_KEY) {
    console.error('Missing MEM0_API_KEY environment variable');
    return { 
      error: 'Memory service not configured', 
      details: 'mem0 API key is missing. Please check your environment configuration.' 
    };
  }

  if (!query || typeof query !== 'string') {
    return { error: 'Search query is required' };
  }

  try {
    // Search memories in mem0
    const mem0Response = await fetch(`https://api.mem0.ai/v1/memories/search/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MEM0_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        user_id: user.id,
        limit: limit
      })
    });

    if (!mem0Response.ok) {
      const errorText = await mem0Response.text();
      console.error('mem0 search API error:', errorText);
      throw new Error(`mem0 API error: ${mem0Response.status} - ${errorText}`);
    }

    const mem0Data = await mem0Response.json();
    console.log('mem0 search response:', mem0Data);

    // Get our sync records for additional context
    let dbQuery = supabaseAdmin
      .from('memory_sync')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_status', 'synced')
      .order('last_sync_at', { ascending: false });

    if (category) {
      dbQuery = dbQuery.eq('metadata->category', category);
    }

    if (entity_type) {
      dbQuery = dbQuery.eq('entity_type', entity_type);
    }

    const { data: syncRecords, error: syncError } = await dbQuery.limit(50);

    if (syncError) {
      console.error('Sync records query error:', syncError);
    }

    // Combine mem0 results with our metadata
    const enrichedResults = (mem0Data.results || mem0Data.memories || []).map((memory: any) => {
      const syncRecord = syncRecords?.find(sr => 
        sr.mem0_memory_id === memory.id || sr.mem0_memory_id === memory.memory_id
      );

      return {
        id: memory.id || memory.memory_id,
        content: memory.memory || memory.content,
        score: memory.score || memory.relevance,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
        metadata: memory.metadata || {},
        category: syncRecord?.metadata?.category || 'general',
        entity_type: syncRecord?.entity_type || 'general',
        entity_id: syncRecord?.entity_id
      };
    });

    return {
      results: enrichedResults,
      total: mem0Data.total || enrichedResults.length,
      query: query,
      metadata: {
        searched_at: new Date().toISOString(),
        mem0_response_type: typeof mem0Data,
        sync_records_found: syncRecords?.length || 0
      }
    };

  } catch (error) {
    console.error('Search memory error:', error);
    
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
      error: 'Failed to search memories',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});