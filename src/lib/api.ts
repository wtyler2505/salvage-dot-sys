import { supabase } from './supabase';

// Get API keys from localStorage
const getStoredAPIKeys = () => {
  try {
    const stored = localStorage.getItem('salvage-tracker-api-keys');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Check if we're in development mode and using the wrong server
const checkDevEnvironment = () => {
  if (import.meta.env.DEV && window.location.port === '5173') {
    console.error('🚨 DEVELOPMENT ERROR: You are accessing the Vite dev server directly!');
    console.error('📋 TO FIX: Use http://localhost:3000 instead of http://localhost:5173');
    console.error('💡 REASON: API functions are only available through Netlify Dev server');
    console.error('⚡ SOLUTION: Run "npm run dev" and use http://localhost:3000');
    
    // Show user-friendly error in UI
    throw new Error(
      'Development server error: Please use http://localhost:3000 instead of http://localhost:5173. ' +
      'Run "npm run dev" and access the app at localhost:3000 for API functions to work properly.'
    );
  }
};

// Type-safe API client for Netlify functions
class APIClient {
  private makeRequest = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
    try {
      // Check development environment first
      checkDevEnvironment();

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        await this.handleAuthFailure('Session error occurred');
        throw new Error('Authentication session error - please login again');
      }

      if (!session?.access_token) {
        console.error('No session or access token available');
        await this.handleAuthFailure('No session available');
        throw new Error('No authentication token available - please login again');
      }

      // Validate and refresh token if needed
      let currentToken = session.access_token;
      
      try {
        // Parse token payload to check expiration
        const tokenPayload = JSON.parse(atob(currentToken.split('.')[1]));
        const tokenExp = tokenPayload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        console.log('Token expiration check:', {
          tokenExp: new Date(tokenExp).toISOString(),
          now: new Date(now).toISOString(),
          expired: tokenExp <= now,
          expiringSoon: tokenExp - now < 5 * 60 * 1000
        });
        
        // If token is already expired or expiring soon, refresh it
        if (tokenExp <= now || tokenExp - now < 5 * 60 * 1000) {
          console.log(tokenExp <= now ? 'Token already expired, refreshing...' : 'Token expiring soon, refreshing...');
          
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshedSession?.access_token) {
            console.error('Token refresh failed:', refreshError);
            await this.handleAuthFailure('Token refresh failed');
            throw new Error('Token refresh failed - please login again');
          }
          
          currentToken = refreshedSession.access_token;
          console.log('Token refreshed successfully');
          
          // Validate the new token
          try {
            const newTokenPayload = JSON.parse(atob(currentToken.split('.')[1]));
            const newTokenExp = newTokenPayload.exp * 1000;
            if (newTokenExp <= Date.now()) {
              console.error('Refreshed token is also expired');
              await this.handleAuthFailure('Refreshed token is expired');
              throw new Error('Unable to obtain valid token - please login again');
            }
          } catch (newTokenError) {
            console.error('New token validation failed:', newTokenError);
            await this.handleAuthFailure('New token validation failed');
            throw new Error('Token validation failed - please login again');
          }
        }
        
      } catch (tokenError) {
        console.error('Token validation error:', tokenError);
        
        // If we can't parse the token, it's invalid
        if (tokenError.message?.includes('Invalid') || tokenError.name === 'SyntaxError') {
          console.error('Token appears to be malformed or invalid');
          await this.handleAuthFailure('Invalid token format');
          throw new Error('Invalid authentication token - please login again');
        }
        
        // For other errors, try to continue but log the issue
        console.warn('Token validation had issues but continuing with existing token');
      }

      // Get stored API keys
      const apiKeys = getStoredAPIKeys();
      
      const baseUrl = import.meta.env.DEV 
        ? '/.netlify/functions'
        : '/.netlify/functions';

      console.log(`Making API request to: ${baseUrl}/${endpoint}`);
      console.log('Using token:', currentToken.substring(0, 20) + '...');

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'X-Anthropic-Key': apiKeys.anthropic || '',
          'X-Mem0-Key': apiKeys.mem0 || '',
          'X-Perplexity-Key': apiKeys.perplexity || '', // Add Perplexity API key
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        
        // Provide helpful development errors for 404s
        if (response.status === 404 && import.meta.env.DEV) {
          console.error('🚨 API 404 Error - Development Troubleshooting:');
          console.error('1. Are you using the correct URL? Should be http://localhost:3000');
          console.error('2. Did you start with "npm run dev" (not "npm run dev:vite")?');
          console.error('3. Is the Netlify Dev server running properly?');
          console.error('4. Check if the function exists in /netlify/functions/');
          
          throw new Error(
            `API endpoint not found (404). This usually means:\n` +
            `• You're using the wrong development server (use localhost:3000, not 5173)\n` +
            `• You need to run "npm run dev" instead of "npm run dev:vite"\n` +
            `• The Netlify function "${endpoint}" doesn't exist or isn't deployed`
          );
        }
        
        // Parse error response to check for specific error codes
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { message: errorText };
        }
        
        // Handle specific refresh token errors
        if (errorData.code === 'refresh_token_not_found' || 
            errorData.message?.includes('Invalid Refresh Token') ||
            errorData.message?.includes('Refresh Token Not Found')) {
          console.error('Refresh token not found, clearing session');
          await this.handleAuthFailure('Refresh token not found');
          throw new Error('Session expired - please login again');
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          console.error('Received 401 Unauthorized');
          
          // If this is the first attempt, try to refresh token and retry
          if (retryCount === 0) {
            console.log('First 401 attempt, trying to refresh token and retry...');
            
            try {
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !newSession?.access_token) {
                console.error('Token refresh on 401 failed:', refreshError);
                await this.handleAuthFailure('Token refresh on 401 failed');
                throw new Error('Authentication expired - please login again');
              }
              
              console.log('Token refreshed on 401, retrying request...');
              
              // Retry the request with the new token
              return this.makeRequest(endpoint, options, retryCount + 1);
              
            } catch (refreshError) {
              console.error('Error during 401 token refresh:', refreshError);
              await this.handleAuthFailure('Error during 401 token refresh');
              throw new Error('Authentication expired - please login again');
            }
          } else {
            // This is a retry that still failed, clear auth state
            console.error('Retry also failed with 401, clearing auth state');
            await this.handleAuthFailure('Retry failed with 401');
            throw new Error('Authentication expired - please login again');
          }
        }
        
        // Handle other error responses
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || `HTTP ${response.status}`);
        } catch (parseError) {
          throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('API response received successfully');
      return result;
      
    } catch (error) {
      console.error('API Request failed:', error);
      
      // Check if this is an auth-related error
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('authentication') || 
            errorMessage.includes('token') || 
            errorMessage.includes('login') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('invalid token') ||
            errorMessage.includes('refresh token') ||
            errorMessage.includes('session expired')) {
          // This is an auth error, make sure we clear the session
          await this.handleAuthFailure('Authentication error in catch block');
          throw error; // Re-throw auth errors as-is
        }
        
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          throw new Error('Network error - please check your internet connection and ensure you\'re using the correct development server (localhost:3000)');
        }
      }
      
      throw error;
    }
  }

  // Helper method to handle authentication failures
  private handleAuthFailure = async (reason: string) => {
    console.error('Handling auth failure:', reason);
    
    try {
      // Clear the session to force re-authentication
      await supabase.auth.signOut();
      console.log('Session cleared due to auth failure');
    } catch (signOutError) {
      console.error('Error clearing session:', signOutError);
    }
    
    // Clear any cached auth data
    try {
      // Clear any additional auth-related localStorage if needed
      // (we're not storing auth tokens in localStorage, but just in case)
      localStorage.removeItem('supabase.auth.token');
    } catch (clearError) {
      console.error('Error clearing cached auth data:', clearError);
    }
  }

  // Memory API
  addMemory = async (body: {
    content: string;
    category?: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, any>;
  }) => {
    return this.makeRequest('memory-add', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  searchMemories = async (body: {
    query: string;
    limit?: number;
    category?: string;
    entity_type?: string;
  }) => {
    return this.makeRequest('memory-search', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  listMemories = async (body: {
    limit?: number;
    offset?: number;
    category?: string;
    entity_type?: string;
    sync_status?: string;
  } = {}) => {
    return this.makeRequest('memory-list', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  deleteMemory = async (body: {
    memory_id?: string;
    sync_record_id?: string;
  }) => {
    return this.makeRequest('memory-delete', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // AI Research API - now powered by Perplexity
  aiResearchPart = async (body: {
    description: string;
    mode: 'research' | 'quick' | 'parse' | 'clarify';
    context?: any;
    original_input?: string;
    clarification_answers?: Record<string, string>;
  }) => {
    console.log('🔍 Making Perplexity-powered research request:', body.description);
    return this.makeRequest('ai-research-part', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // AI Project Generator
  aiGenerateProject = async (body: {
    selected_parts?: string[];
    preferences?: Record<string, any>;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    project_type?: string;
    time_available?: string;
  }) => {
    return this.makeRequest('ai-generate-project', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // AI Chat API
  aiChat = async (body: {
    message: string;
    conversation_id?: string;
    context?: any;
  }) => {
    return this.makeRequest('ai-chat', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Chat Messages API
  getChatMessages = async (conversationId: string, limit = 50) => {
    return this.makeRequest('chat-messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, limit }),
      headers: { 'x-http-method': 'GET' }
    });
  }

  getConversations = async (limit = 20) => {
    return this.makeRequest('chat-conversations', {
      method: 'POST',
      body: JSON.stringify({ limit }),
      headers: { 'x-http-method': 'GET' }
    });
  }

  // Parts API
  getParts = async (filters: {
    search?: string;
    category?: string;
    available?: boolean;
    limit?: number;
    offset?: number;
  } = {}) => {
    console.log('API: Getting parts with filters:', filters);
    return this.makeRequest('parts-crud', {
      method: 'POST', // Using POST to send filters in body
      body: JSON.stringify(filters),
      headers: { 'x-http-method': 'GET' }
    });
  }

  getPart = async (id: string) => {
    return this.makeRequest(`parts-crud/${id}`, {
      method: 'GET'
    });
  }

  createPart = async (part: any) => {
    console.log('API: Creating part:', part);
    return this.makeRequest('parts-crud', {
      method: 'POST',
      body: JSON.stringify(part)
    });
  }

  updatePart = async (id: string, updates: any) => {
    return this.makeRequest(`parts-crud/${id}`, {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: { 'x-http-method': 'PUT' }
    });
  }

  deletePart = async (id: string) => {
    return this.makeRequest(`parts-crud/${id}`, {
      method: 'POST',
      headers: { 'x-http-method': 'DELETE' }
    });
  }

  // Projects API
  getProjects = async (filters: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    return this.makeRequest('projects-crud', {
      method: 'POST',
      body: JSON.stringify(filters),
      headers: { 'x-http-method': 'GET' }
    });
  }

  getProject = async (id: string) => {
    return this.makeRequest(`projects-crud/${id}`, {
      method: 'GET'
    });
  }

  createProject = async (project: any) => {
    return this.makeRequest('projects-crud', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }

  updateProject = async (id: string, updates: any) => {
    return this.makeRequest(`projects-crud/${id}`, {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: { 'x-http-method': 'PUT' }
    });
  }

  deleteProject = async (id: string) => {
    return this.makeRequest(`projects-crud/${id}`, {
      method: 'POST',
      headers: { 'x-http-method': 'DELETE' }
    });
  }

  // Build Sessions API
  getBuildSessions = async (filters: {
    project_id?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    return this.makeRequest('build-sessions-crud', {
      method: 'POST',
      body: JSON.stringify(filters),
      headers: { 'x-http-method': 'GET' }
    });
  }

  getBuildSession = async (id: string) => {
    return this.makeRequest(`build-sessions-crud/${id}`, {
      method: 'GET'
    });
  }

  createBuildSession = async (session: any) => {
    return this.makeRequest('build-sessions-crud', {
      method: 'POST',
      body: JSON.stringify(session)
    });
  }

  updateBuildSession = async (id: string, updates: any) => {
    return this.makeRequest(`build-sessions-crud/${id}`, {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: { 'x-http-method': 'PUT' }
    });
  }

  deleteBuildSession = async (id: string) => {
    return this.makeRequest(`build-sessions-crud/${id}`, {
      method: 'POST',
      headers: { 'x-http-method': 'DELETE' }
    });
  }
}

export const api = new APIClient();