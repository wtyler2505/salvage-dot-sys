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

// Enhanced check for development environment issues
const checkDevEnvironment = () => {
  // More robust development server detection
  const currentPort = window.location.port;
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;
  const currentUrl = window.location.href;
  
  console.log('🔍 Development Environment Check:', {
    currentUrl,
    currentHost,
    currentPort,
    currentProtocol,
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE
  });

  // Check if we're in development mode
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    // Check if accessing Vite dev server directly (port 5173)
    if (currentPort === '5173') {
      const errorMessage = [
        '🚨 CRITICAL: You are accessing the Vite dev server directly!',
        '',
        '❌ Current URL: ' + currentUrl,
        '✅ Correct URL: http://localhost:3000',
        '',
        '🔧 TO FIX:',
        '1. Stop the current server (Ctrl+C)',
        '2. Run: npm run dev',
        '3. Open: http://localhost:3000',
        '',
        '💡 WHY: API functions only work through Netlify Dev server, not Vite directly.',
        '⚠️  Using port 5173 means no backend functions = 404 errors'
      ].join('\n');
      
      console.error(errorMessage);
      
      // Show prominent error to user
      const userError = 
        'DEVELOPMENT ERROR: Wrong server!\n\n' +
        'You\'re using http://localhost:5173 (Vite only)\n' +
        'You need http://localhost:3000 (Netlify + Vite)\n\n' +
        'Fix: Run "npm run dev" and use localhost:3000';
        
      // Throw error to prevent API calls
      throw new Error(userError);
    }
    
    // Check if using wrong protocol or host
    if (currentHost === 'localhost' && currentPort !== '3000' && currentPort !== '5173') {
      console.warn('⚠️  Unusual development port detected:', currentPort);
    }
    
    // Ensure we're using the right port for API calls
    if (currentPort === '3000') {
      console.log('✅ Correct development server detected (Netlify Dev)');
    }
  }
  
  return true;
};

// Type-safe API client for Netlify functions
class APIClient {
  private makeRequest = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
    try {
      // CRITICAL: Check development environment FIRST
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
      
      // Determine base URL - ensure we're using the right server
      const baseUrl = import.meta.env.DEV 
        ? '/.netlify/functions'
        : '/.netlify/functions';

      const fullUrl = `${baseUrl}/${endpoint}`;
      console.log(`🌐 [${endpoint}] Making API request to: ${fullUrl}`);
      console.log('🔑 [${endpoint}] Using token:', currentToken.substring(0, 20) + '...');

      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'X-Anthropic-Key': apiKeys.anthropic || '',
          'X-Mem0-Key': apiKeys.mem0 || '',
          'X-Perplexity-Key': apiKeys.perplexity || '',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${endpoint}] API Error ${response.status}:`, errorText);
        
        // Enhanced 404 error handling for development
        if (response.status === 404) {
          console.error(`🚨 [${endpoint}] API 404 Error - Enhanced Troubleshooting:`);
          
          if (import.meta.env.DEV) {
            const currentUrl = window.location.href;
            const isWrongServer = window.location.port === '5173';
            
            if (isWrongServer) {
              console.error('💥 ROOT CAUSE: Using wrong development server!');
              console.error('🔧 IMMEDIATE FIX REQUIRED:');
              console.error('  1. Stop current server (Ctrl+C)');
              console.error('  2. Run: npm run dev');
              console.error('  3. Use: http://localhost:3000');
              console.error('');
              console.error('📋 Current (WRONG):', currentUrl);
              console.error('✅ Correct URL: http://localhost:3000');
              
              throw new Error(
                `🚨 CRITICAL DEVELOPMENT ERROR:\n\n` +
                `You are using the WRONG development server!\n\n` +
                `❌ Current: ${currentUrl}\n` +
                `✅ Required: http://localhost:3000\n\n` +
                `The function "${endpoint}" cannot be found because API functions\n` +
                `are only available through the Netlify Dev server.\n\n` +
                `TO FIX:\n` +
                `1. Stop this server (Ctrl+C)\n` +
                `2. Run: npm run dev\n` +
                `3. Open: http://localhost:3000`
              );
            } else {
              console.error(`🔍 [${endpoint}] Development troubleshooting checklist:`);
              console.error('  1. Verify you started with: npm run dev');
              console.error('  2. Check if Netlify Dev server is running');
              console.error('  3. Verify function exists:', `netlify/functions/${endpoint}.ts`);
              console.error('  4. Check Netlify CLI version: netlify --version');
              console.error('  5. Try restarting: npm run dev');
              
              throw new Error(
                `API Function Not Found: "${endpoint}"\n\n` +
                `This usually means:\n` +
                `• Function doesn't exist in netlify/functions/${endpoint}.ts\n` +
                `• Netlify Dev server isn't running properly\n` +
                `• Function failed to compile\n\n` +
                `Try restarting with: npm run dev`
              );
            }
          }
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
          console.error(`❌ [${endpoint}] Received 401 Unauthorized`);
          
          // If this is the first attempt, try to refresh token and retry
          if (retryCount === 0) {
            console.log(`🔄 [${endpoint}] First 401 attempt, trying to refresh token and retry...`);
            
            try {
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !newSession?.access_token) {
                console.error(`❌ [${endpoint}] Token refresh on 401 failed:`, refreshError);
                await this.handleAuthFailure('Token refresh on 401 failed');
                throw new Error('Authentication expired - please login again');
              }
              
              console.log(`🔄 [${endpoint}] Token refreshed on 401, retrying request...`);
              
              // Retry the request with the new token
              return this.makeRequest(endpoint, options, retryCount + 1);
              
            } catch (refreshError) {
              console.error(`❌ [${endpoint}] Error during 401 token refresh:`, refreshError);
              await this.handleAuthFailure('Error during 401 token refresh');
              throw new Error('Authentication expired - please login again');
            }
          } else {
            // This is a retry that still failed, clear auth state
            console.error(`❌ [${endpoint}] Retry also failed with 401, clearing auth state`);
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
      console.log(`✅ [${endpoint}] API response received successfully:`, {
        hasData: !!result,
        dataKeys: result ? Object.keys(result) : [],
        timestamp: new Date().toISOString()
      });
      return result;
      
    } catch (error) {
      console.error(`💥 [${endpoint}] API Request failed:`, error);
      
      // Re-throw development server errors immediately
      if (error instanceof Error && error.message.includes('DEVELOPMENT ERROR')) {
        throw error;
      }
      
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
    imageUrl?: string;
    original_input?: string;
    clarification_answers?: Record<string, string>;
  }) => {
    console.log('🔍 Making AI research request:', { 
      description: body.description?.substring(0, 100), 
      mode: body.mode,
      hasImage: !!body.imageUrl 
    });
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
    console.log('🔍 [API.getParts] Starting request with filters:', filters);
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
    console.log('🚀 [API.createPart] Starting request with part:', {
      name: part.name,
      category: part.category,
      ai_identified: part.ai_identified
    });
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