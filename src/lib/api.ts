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
  const currentPort = window.location.port;
  const currentUrl = window.location.href;
  
  console.log('🔍 Development Environment Check:', {
    currentUrl,
    currentPort,
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE
  });

  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    if (currentPort === '5173') {
      const errorMessage = 'DEVELOPMENT ERROR: Wrong server!\n\nYou\'re using http://localhost:5173 (Vite only)\nYou need http://localhost:3000 (Netlify + Vite)\n\nFix: Run "npm run dev" and use localhost:3000';
      throw new Error(errorMessage);
    }
    
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
      checkDevEnvironment();

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

      let currentToken = session.access_token;
      
      try {
        const tokenPayload = JSON.parse(atob(currentToken.split('.')[1]));
        const tokenExp = tokenPayload.exp * 1000;
        const now = Date.now();
        
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
        }
        
      } catch (tokenError) {
        console.error('Token validation error:', tokenError);
        if (tokenError.message?.includes('Invalid') || tokenError.name === 'SyntaxError') {
          console.error('Token appears to be malformed or invalid');
          await this.handleAuthFailure('Invalid token format');
          throw new Error('Invalid authentication token - please login again');
        }
        console.warn('Token validation had issues but continuing with existing token');
      }

      const apiKeys = getStoredAPIKeys();
      const baseUrl = import.meta.env.DEV ? '/.netlify/functions' : '/.netlify/functions';
      const fullUrl = `${baseUrl}/${endpoint}`;
      
      console.log(`🌐 [${endpoint}] Making API request to: ${fullUrl}`);

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
        
        if (response.status === 404) {
          console.error(`🚨 [${endpoint}] API 404 Error - Enhanced Troubleshooting:`);
          
          if (import.meta.env.DEV) {
            const currentUrl = window.location.href;
            const isWrongServer = window.location.port === '5173';
            
            if (isWrongServer) {
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
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { message: errorText };
        }
        
        if (response.status === 401) {
          console.error(`❌ [${endpoint}] Received 401 Unauthorized`);
          
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
              return this.makeRequest(endpoint, options, retryCount + 1);
              
            } catch (refreshError) {
              console.error(`❌ [${endpoint}] Error during 401 token refresh:`, refreshError);
              await this.handleAuthFailure('Error during 401 token refresh');
              throw new Error('Authentication expired - please login again');
            }
          } else {
            console.error(`❌ [${endpoint}] Retry also failed with 401, clearing auth state`);
            await this.handleAuthFailure('Retry failed with 401');
            throw new Error('Authentication expired - please login again');
          }
        }
        
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || `HTTP ${response.status}`);
        } catch (parseError) {
          throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log(`✅ [${endpoint}] API response received successfully`);
      return result;
      
    } catch (error) {
      console.error(`💥 [${endpoint}] API Request failed:`, error);
      
      if (error instanceof Error && error.message.includes('DEVELOPMENT ERROR')) {
        throw error;
      }
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('authentication') || 
            errorMessage.includes('token') || 
            errorMessage.includes('login') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('invalid token') ||
            errorMessage.includes('refresh token') ||
            errorMessage.includes('session expired')) {
          await this.handleAuthFailure('Authentication error in catch block');
          throw error;
        }
        
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          throw new Error('Network error - please check your internet connection and ensure you\'re using the correct development server (localhost:3000)');
        }
      }
      
      throw error;
    }
  }

  private handleAuthFailure = async (reason: string) => {
    console.error('Handling auth failure:', reason);
    
    try {
      await supabase.auth.signOut();
      console.log('Session cleared due to auth failure');
    } catch (signOutError) {
      console.error('Error clearing session:', signOutError);
    }
    
    try {
      localStorage.removeItem('supabase.auth.token');
    } catch (clearError) {
      console.error('Error clearing cached auth data:', clearError);
    }
  }

  // AI Research API
  aiResearchPart = async (body: {
    description: string;
    mode: 'research' | 'quick';
    context?: any;
    imageUrl?: string;
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
      method: 'POST',
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

  createBuildSession = async (session: any) => {
    return this.makeRequest('build-sessions-crud', {
      method: 'POST',
      body: JSON.stringify(session)
    });
  }
}

export const api = new APIClient();