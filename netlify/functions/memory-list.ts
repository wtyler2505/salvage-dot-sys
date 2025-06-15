import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { limit = 50, offset = 0, category, entity_type, sync_status = 'synced' } = body;

  console.log('List Memory Request:', { limit, offset, category, entity_type, sync_status });

  try {
    // Get memories from our sync table for UI display
    let query = supabaseAdmin
      .from('memory_sync')
      .select('*')
      .eq('user_id', user.id)
      .order('last_sync_at', { ascending: false });

    if (category) {
      query = query.eq('metadata->category', category);
    }

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }

    if (sync_status) {
      query = query.eq('sync_status', sync_status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: memories, error, count } = await query;

    if (error) {
      console.error('List memories error:', error);
      throw error;
    }

    // Get category counts for overview
    const { data: categoryCounts } = await supabaseAdmin
      .from('memory_sync')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('sync_status', 'synced');

    const categories = categoryCounts?.reduce((acc: Record<string, number>, item) => {
      const category = item.metadata?.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      memories: memories || [],
      total: count || 0,
      categories: categories,
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    };

  } catch (error) {
    console.error('List memories error:', error);
    return { 
      error: 'Failed to list memories',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});