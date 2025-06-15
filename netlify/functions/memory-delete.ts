import { withAuth, supabaseAdmin } from './utils/auth';

export const handler = withAuth(async (req) => {
  const { user, body } = req;
  const { memory_id, sync_record_id } = body;

  console.log('Delete Memory Request:', { memory_id, sync_record_id });

  if (!memory_id && !sync_record_id) {
    return { error: 'Either memory_id or sync_record_id is required' };
  }

  try {
    let mem0MemoryId = memory_id;
    let syncRecordToDelete = null;

    // If we only have sync_record_id, get the mem0 memory ID
    if (sync_record_id && !memory_id) {
      const { data: syncRecord, error: syncError } = await supabaseAdmin
        .from('memory_sync')
        .select('mem0_memory_id')
        .eq('id', sync_record_id)
        .eq('user_id', user.id)
        .single();

      if (syncError || !syncRecord) {
        return { error: 'Sync record not found' };
      }

      mem0MemoryId = syncRecord.mem0_memory_id;
      syncRecordToDelete = sync_record_id;
    } else if (memory_id) {
      // Find sync record by mem0 memory ID
      const { data: syncRecord } = await supabaseAdmin
        .from('memory_sync')
        .select('id')
        .eq('mem0_memory_id', memory_id)
        .eq('user_id', user.id)
        .single();

      if (syncRecord) {
        syncRecordToDelete = syncRecord.id;
      }
    }

    // Delete from mem0 if we have the API key and memory ID
    if (mem0MemoryId && process.env.MEM0_API_KEY) {
      try {
        const mem0Response = await fetch(`https://api.mem0.ai/v1/memories/${mem0MemoryId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.MEM0_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!mem0Response.ok && mem0Response.status !== 404) {
          const errorText = await mem0Response.text();
          console.error('mem0 delete error:', errorText);
          // Continue anyway - we'll mark sync record as deleted
        }
      } catch (mem0Error) {
        console.error('mem0 delete error:', mem0Error);
        // Continue anyway - we'll mark sync record as deleted
      }
    }

    // Update sync record status to deleted
    if (syncRecordToDelete) {
      const { error: updateError } = await supabaseAdmin
        .from('memory_sync')
        .update({
          sync_status: 'deleted',
          sync_error: null,
          metadata: {
            ...((await supabaseAdmin
              .from('memory_sync')
              .select('metadata')
              .eq('id', syncRecordToDelete)
              .single()
            ).data?.metadata || {}),
            deleted_at: new Date().toISOString()
          }
        })
        .eq('id', syncRecordToDelete)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update sync record error:', updateError);
        throw updateError;
      }
    }

    return {
      success: true,
      deleted_memory_id: mem0MemoryId,
      deleted_sync_record_id: syncRecordToDelete
    };

  } catch (error) {
    console.error('Delete memory error:', error);
    return { 
      error: 'Failed to delete memory',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});