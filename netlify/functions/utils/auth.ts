import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Use server-side environment variables (without VITE_ prefix for functions)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:', {
    SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_KEY: !!supabaseServiceKey
  });
}

// Server-side Supabase client with service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
  body: any;
  headers: Record<string, string>;
  path: string;
}

// Auth middleware for Netlify functions
export const withAuth = (handler: (req: AuthenticatedRequest) => Promise<any>): Handler => {
  return async (event, context) => {
    try {
      // Get auth token from header
      const authHeader = event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid authorization header');
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Missing or invalid authorization header' })
        };
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        console.error('Token validation failed:', error?.message);
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      // Extract API keys from headers and add to environment
      if (event.headers['x-anthropic-key']) process.env.ANTHROPIC_API_KEY = event.headers['x-anthropic-key'];
      if (event.headers['x-mem0-key']) process.env.MEM0_API_KEY = event.headers['x-mem0-key'];
      if (event.headers['x-perplexity-key']) process.env.PERPLEXITY_API_KEY = event.headers['x-perplexity-key'];

      // Parse request body
      let body = {};
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch (e) {
          // Body might not be JSON, that's ok
        }
      }

      // Call the actual handler with authenticated request
      const result = await handler({
        user: {
          id: user.id,
          email: user.email!
        },
        body,
        headers: event.headers,
        path: event.path
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(result)
      };

    } catch (error) {
      console.error('Auth middleware error:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  };
};