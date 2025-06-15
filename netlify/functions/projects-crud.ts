import { withAuth, supabaseAdmin } from './utils/auth';
import { validateProject } from './utils/validation';

export const handler = withAuth(async (req) => {
  const { user, body, headers, path } = req; // Use path from req instead of headers
  const method = headers['x-http-method'] || 'GET';
  const pathParts = path.split('/').filter(Boolean);
  const projectId = pathParts[pathParts.length - 1];

  try {
    switch (method) {
      case 'GET':
        if (projectId && projectId !== 'projects-crud') {
          // Get single project
          const { data: project, error } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            return { error: 'Project not found' };
          }

          return { project };
        } else {
          // Get all projects with optional filtering
          const { search, status, limit = 50, offset = 0 } = body;
          
          let query = supabaseAdmin
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
          }

          if (status) {
            query = query.eq('status', status);
          }

          query = query.range(offset, offset + limit - 1);

          const { data: projects, error, count } = await query;

          if (error) {
            throw error;
          }

          return { projects, total: count };
        }

      case 'POST':
        // Create new project
        const { valid, errors, project: validatedProject } = validateProject(body);
        
        if (!valid) {
          return { error: 'Validation failed', details: errors };
        }

        const { data: newProject, error: createError } = await supabaseAdmin
          .from('projects')
          .insert([{ ...validatedProject, user_id: user.id }])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return { project: newProject };

      case 'PUT':
        // Update existing project
        if (!projectId || projectId === 'projects-crud') {
          return { error: 'Project ID is required for updates' };
        }

        const { valid: updateValid, errors: updateErrors, project: updateData } = validateProject(body);
        
        if (!updateValid) {
          return { error: 'Validation failed', details: updateErrors };
        }

        const { data: updatedProject, error: updateError } = await supabaseAdmin
          .from('projects')
          .update(updateData)
          .eq('id', projectId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return { project: updatedProject };

      case 'DELETE':
        // Delete project
        if (!projectId || projectId === 'projects-crud') {
          return { error: 'Project ID is required for deletion' };
        }

        const { error: deleteError } = await supabaseAdmin
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        return { success: true };

      default:
        return { error: 'Method not allowed' };
    }
  } catch (error) {
    console.error('Projects CRUD error:', error);
    return { error: 'Database operation failed' };
  }
});