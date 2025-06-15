import { withAuth, supabaseAdmin } from './utils/auth';
import { validatePart } from './utils/validation';

export const handler = withAuth(async (req) => {
  const { user, body, headers, path } = req;
  const method = headers['x-http-method'] || 'GET';
  
  // Extract part ID from path - handle both /parts-crud and /parts-crud/id formats
  const pathParts = path.split('/').filter(Boolean);
  const partId = pathParts.length > 1 && pathParts[pathParts.length - 1] !== 'parts-crud' 
    ? pathParts[pathParts.length - 1] 
    : null;

  console.log('Parts CRUD:', { method, partId, userId: user.id, bodyKeys: Object.keys(body) });

  try {
    switch (method) {
      case 'GET':
        if (partId && partId !== 'parts-crud') {
          // Get single part
          const { data: part, error } = await supabaseAdmin
            .from('parts')
            .select('*')
            .eq('id', partId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Get part error:', error);
            return { error: 'Part not found' };
          }

          return { part };
        } else {
          // Get all parts with optional filtering
          const { search, category, available, limit = 50, offset = 0 } = body;
          
          let query = supabaseAdmin
            .from('parts')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
          }

          if (category) {
            query = query.eq('category', category);
          }

          if (available !== undefined) {
            query = query.eq('is_available', available);
          }

          query = query.range(offset, offset + limit - 1);

          const { data: parts, error, count } = await query;

          if (error) {
            console.error('Get parts error:', error);
            throw error;
          }

          console.log(`Retrieved ${parts?.length || 0} parts for user ${user.id}`);
          return { parts: parts || [], total: count || 0 };
        }

      case 'POST':
        // Create new part
        console.log('Creating part with data:', body);
        
        const { valid, errors, part: validatedPart } = validatePart(body);
        
        if (!valid) {
          console.error('Validation failed:', errors);
          return { error: 'Validation failed', details: errors };
        }

        console.log('Validated part data:', validatedPart);

        const { data: newPart, error: createError } = await supabaseAdmin
          .from('parts')
          .insert([{ ...validatedPart, user_id: user.id }])
          .select()
          .single();

        if (createError) {
          console.error('Create part error:', createError);
          console.error('Create part error details:', {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code
          });
          throw createError;
        }

        console.log('Successfully created part:', newPart);
        return { part: newPart };

      case 'PUT':
        // Update existing part
        if (!partId || partId === 'parts-crud') {
          return { error: 'Part ID is required for updates' };
        }

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
          console.error('Update part error:', updateError);
          throw updateError;
        }

        return { part: updatedPart };

      case 'DELETE':
        // Delete part
        if (!partId || partId === 'parts-crud') {
          return { error: 'Part ID is required for deletion' };
        }

        const { error: deleteError } = await supabaseAdmin
          .from('parts')
          .delete()
          .eq('id', partId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Delete part error:', deleteError);
          throw deleteError;
        }

        return { success: true };

      default:
        return { error: 'Method not allowed' };
    }
  } catch (error) {
    console.error('Parts CRUD error:', error);
    return { 
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});