import { withAuth, supabaseAdmin } from './utils/auth';
import { validatePart } from './utils/validation';

export const handler = withAuth(async (req) => {
  const { user, body, headers, path } = req;
  const method = headers['x-http-method'] || 'GET';
  
  // Extract part ID from path
  const pathParts = path.split('/').filter(Boolean);
  const partId = pathParts.length > 1 && pathParts[pathParts.length - 1] !== 'parts-crud' 
    ? pathParts[pathParts.length - 1] 
    : null;

  console.log('🔧 [Parts-CRUD] Request:', { 
    method, 
    partId, 
    userId: user.id, 
    bodyKeys: Object.keys(body || {}),
    timestamp: new Date().toISOString()
  });

  try {
    switch (method) {
      case 'GET':
        if (partId && partId !== 'parts-crud') {
          // Get single part
          console.log(`🔍 [Parts-CRUD] Getting single part: ${partId}`);
          const { data: part, error } = await supabaseAdmin
            .from('parts')
            .select('*')
            .eq('id', partId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error(`❌ [Parts-CRUD] Get part error:`, error);
            return { error: 'Part not found' };
          }

          console.log(`✅ [Parts-CRUD] Single part retrieved:`, { id: part.id, name: part.name });
          return { part };
        } else {
          // Get all parts with optional filtering
          const { search, category, available, limit = 50, offset = 0 } = body || {};
          
          console.log(`🔍 [Parts-CRUD] Getting parts list:`, { 
            search, 
            category, 
            available, 
            limit, 
            offset,
            userId: user.id 
          });

          let query = supabaseAdmin
            .from('parts')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
            console.log(`🔍 [Parts-CRUD] Added search filter: "${search}"`);
          }

          if (category) {
            query = query.eq('category', category);
            console.log(`🏷️ [Parts-CRUD] Added category filter: "${category}"`);
          }

          if (available !== undefined) {
            query = query.eq('is_available', available);
            console.log(`✅ [Parts-CRUD] Added availability filter: ${available}`);
          }

          query = query.range(offset, offset + limit - 1);

          const startTime = Date.now();
          const { data: parts, error, count } = await query;
          const queryTime = Date.now() - startTime;

          if (error) {
            console.error(`❌ [Parts-CRUD] Get parts error:`, error);
            throw error;
          }

          console.log(`✅ [Parts-CRUD] Parts query completed:`, {
            resultsCount: parts?.length || 0,
            totalCount: count || 0,
            queryTimeMs: queryTime,
            userId: user.id,
            filters: { search, category, available }
          });

          // Additional debugging for empty results
          if (!parts || parts.length === 0) {
            console.log(`⚠️ [Parts-CRUD] No parts found - checking database state...`);
            
            // Check if user has ANY parts at all
            const { data: allUserParts, error: allPartsError } = await supabaseAdmin
              .from('parts')
              .select('id, name, created_at')
              .eq('user_id', user.id)
              .limit(5);

            if (allPartsError) {
              console.error(`❌ [Parts-CRUD] Error checking all user parts:`, allPartsError);
            } else {
              console.log(`📊 [Parts-CRUD] User's total parts in database:`, {
                count: allUserParts?.length || 0,
                samples: allUserParts?.map(p => ({ id: p.id, name: p.name, created: p.created_at })) || []
              });
            }
          }

          return { parts: parts || [], total: count || 0 };
        }

      case 'POST':
        // Create new part
        console.log(`🚀 [Parts-CRUD] Creating new part for user ${user.id}:`, {
          name: body?.name,
          category: body?.category,
          quantity: body?.quantity,
          ai_identified: body?.ai_identified
        });
        
        const { valid, errors, part: validatedPart } = validatePart(body);
        
        if (!valid) {
          console.error(`❌ [Parts-CRUD] Validation failed:`, errors);
          return { error: 'Validation failed', details: errors };
        }

        console.log(`✅ [Parts-CRUD] Validation passed, inserting part:`, {
          name: validatedPart.name,
          category: validatedPart.category,
          user_id: user.id
        });

        const insertStartTime = Date.now();
        const { data: newPart, error: createError } = await supabaseAdmin
          .from('parts')
          .insert([{ ...validatedPart, user_id: user.id }])
          .select()
          .single();
        const insertTime = Date.now() - insertStartTime;

        if (createError) {
          console.error(`❌ [Parts-CRUD] Create part error:`, createError);
          console.error(`❌ [Parts-CRUD] Create part error details:`, {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code
          });
          throw createError;
        }

        console.log(`✅ [Parts-CRUD] Part created successfully:`, {
          id: newPart.id,
          name: newPart.name,
          category: newPart.category,
          insertTimeMs: insertTime,
          created_at: newPart.created_at
        });

        // Verify the part was actually saved by reading it back
        const { data: verifyPart, error: verifyError } = await supabaseAdmin
          .from('parts')
          .select('id, name, category, created_at')
          .eq('id', newPart.id)
          .eq('user_id', user.id)
          .single();

        if (verifyError) {
          console.error(`❌ [Parts-CRUD] Verification read failed:`, verifyError);
        } else {
          console.log(`✅ [Parts-CRUD] Part verified in database:`, verifyPart);
        }

        return { part: newPart };

      case 'PUT':
        // Update existing part
        if (!partId || partId === 'parts-crud') {
          return { error: 'Part ID is required for updates' };
        }

        console.log(`🔄 [Parts-CRUD] Updating part ${partId}:`, body);

        const { valid: updateValid, errors: updateErrors, part: updateData } = validatePart(body);
        
        if (!updateValid) {
          return { error: 'Validation failed', details: updateErrors };
        }

        const { data: updatedPart, error: updateError } = await supabaseAdmin
          .from('parts')
          .update(updateData)
          .eq('id', partId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ [Parts-CRUD] Update part error:`, updateError);
          throw updateError;
        }

        console.log(`✅ [Parts-CRUD] Part updated successfully:`, { id: updatedPart.id, name: updatedPart.name });
        return { part: updatedPart };

      case 'DELETE':
        // Delete part
        if (!partId || partId === 'parts-crud') {
          return { error: 'Part ID is required for deletion' };
        }

        console.log(`🗑️ [Parts-CRUD] Deleting part ${partId}`);

        const { error: deleteError } = await supabaseAdmin
          .from('parts')
          .delete()
          .eq('id', partId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error(`❌ [Parts-CRUD] Delete part error:`, deleteError);
          throw deleteError;
        }

        console.log(`✅ [Parts-CRUD] Part deleted successfully: ${partId}`);
        return { success: true };

      default:
        console.error(`❌ [Parts-CRUD] Method not allowed: ${method}`);
        return { error: 'Method not allowed' };
    }
  } catch (error) {
    console.error(`💥 [Parts-CRUD] Unexpected error:`, error);
    return { 
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});