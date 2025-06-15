import { withAuth, supabaseAdmin } from './utils/auth';
import { validateBuildSession } from './utils/validation';

export const handler = withAuth(async (req) => {
  const { user, body, headers, path } = req;
  const method = headers['x-http-method'] || 'GET';
  
  // Extract session ID from path
  const pathParts = path.split('/').filter(Boolean);
  const sessionId = pathParts.length > 1 && pathParts[pathParts.length - 1] !== 'build-sessions-crud' 
    ? pathParts[pathParts.length - 1] 
    : null;

  console.log('Build Sessions CRUD:', { method, sessionId, userId: user.id });

  try {
    switch (method) {
      case 'GET':
        if (sessionId && sessionId !== 'build-sessions-crud') {
          // Get single session
          const { data: session, error } = await supabaseAdmin
            .from('build_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Get session error:', error);
            return { error: 'Build session not found' };
          }

          return { session };
        } else {
          // Get all sessions with optional filtering
          const { project_id, limit = 50, offset = 0 } = body;
          
          let query = supabaseAdmin
            .from('build_sessions')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (project_id) {
            query = query.eq('project_id', project_id);
          }

          query = query.range(offset, offset + limit - 1);

          const { data: sessions, error, count } = await query;

          if (error) {
            console.error('Get sessions error:', error);
            throw error;
          }

          return { sessions: sessions || [], total: count || 0 };
        }

      case 'POST':
        // Create new session
        const { valid, errors, session: validatedSession } = validateBuildSession(body);
        
        if (!valid) {
          console.error('Session validation failed:', errors);
          return { error: 'Validation failed', details: errors };
        }

        const { data: newSession, error: createError } = await supabaseAdmin
          .from('build_sessions')
          .insert([{ ...validatedSession, user_id: user.id }])
          .select()
          .single();

        if (createError) {
          console.error('Create session error:', createError);
          throw createError;
        }

        return { session: newSession };

      case 'PUT':
        // Update existing session
        if (!sessionId || sessionId === 'build-sessions-crud') {
          return { error: 'Session ID is required for updates' };
        }

        const { valid: updateValid, errors: updateErrors, session: updateData } = validateBuildSession(body);
        
        if (!updateValid) {
          return { error: 'Validation failed', details: updateErrors };
        }

        const { data: updatedSession, error: updateError } = await supabaseAdmin
          .from('build_sessions')
          .update(updateData)
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Update session error:', updateError);
          throw updateError;
        }

        return { session: updatedSession };

      case 'DELETE':
        // Delete session
        if (!sessionId || sessionId === 'build-sessions-crud') {
          return { error: 'Session ID is required for deletion' };
        }

        const { error: deleteError } = await supabaseAdmin
          .from('build_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Delete session error:', deleteError);
          throw deleteError;
        }

        return { success: true };

      default:
        return { error: 'Method not allowed' };
    }
  } catch (error) {
    console.error('Build Sessions CRUD error:', error);
    return { 
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});