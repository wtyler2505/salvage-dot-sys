// Validation utilities for API endpoints

export interface PartInput {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  quantity?: number;
  location?: string;
  source?: string;
  specs?: Record<string, any>;
  tags?: string[];
  images?: string[];
  pinout_diagram?: string;
  datasheet_url?: string;
  value_estimate?: number;
  is_available?: boolean;
  ai_identified?: boolean;
  original_device?: string;
  compatible_with?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: 'idea' | 'planning' | 'building' | 'completed' | 'failed' | 'abandoned';
  difficulty_level?: number;
  danger_level?: number;
  fun_factor?: number;
  practicality?: number;
  parts_used?: string[];
  parts_consumed?: string[];
  instructions?: string;
  code?: string;
  schematics?: string;
  images?: string[];
  success_photos?: string[];
  fail_photos?: string[];
  time_estimate?: string;
  actual_time?: string;
  date_started?: string;
  date_completed?: string;
  ai_generated?: boolean;
  ai_prompt?: string;
  notes?: string;
  lessons_learned?: string;
  metadata?: Record<string, any>;
}

export interface BuildSessionInput {
  project_id?: string;
  session_number?: number;
  start_time?: string;
  end_time?: string;
  work_description?: string;
  parts_consumed?: string[];
  tools_used?: string[];
  issues_encountered?: string[];
  solutions_found?: string[];
  photos?: string[];
  mood?: 'excited' | 'focused' | 'frustrated' | 'confused' | 'triumphant' | 'defeated' | 'drunk';
  notes?: string;
  metadata?: Record<string, any>;
}

export const validatePart = (data: any): { valid: boolean; errors: string[]; part?: PartInput } => {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity < 0)) {
    errors.push('Quantity must be a non-negative number');
  }
  
  if (data.value_estimate !== undefined && (typeof data.value_estimate !== 'number' || data.value_estimate < 0)) {
    errors.push('Value estimate must be a non-negative number');
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }
  
  if (data.images && !Array.isArray(data.images)) {
    errors.push('Images must be an array');
  }
  
  if (data.compatible_with && !Array.isArray(data.compatible_with)) {
    errors.push('Compatible_with must be an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const part: PartInput = {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    category: data.category?.trim() || null,
    subcategory: data.subcategory?.trim() || null,
    quantity: data.quantity || 1,
    location: data.location?.trim() || null,
    source: data.source?.trim() || null,
    specs: data.specs || {},
    tags: data.tags || [],
    images: data.images || [],
    pinout_diagram: data.pinout_diagram?.trim() || null,
    datasheet_url: data.datasheet_url?.trim() || null,
    value_estimate: data.value_estimate || null,
    is_available: data.is_available !== undefined ? data.is_available : true,
    ai_identified: data.ai_identified || false,
    original_device: data.original_device?.trim() || null,
    compatible_with: data.compatible_with || [],
    notes: data.notes?.trim() || null,
    metadata: data.metadata || {}
  };

  return { valid: true, errors: [], part };
};

export const validateProject = (data: any): { valid: boolean; errors: string[]; project?: ProjectInput } => {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  const validStatuses = ['idea', 'planning', 'building', 'completed', 'failed', 'abandoned'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }
  
  if (data.difficulty_level !== undefined && (typeof data.difficulty_level !== 'number' || data.difficulty_level < 1 || data.difficulty_level > 5)) {
    errors.push('Difficulty level must be a number between 1 and 5');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const project: ProjectInput = {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    status: data.status || 'idea',
    difficulty_level: data.difficulty_level || null,
    danger_level: data.danger_level || null,
    fun_factor: data.fun_factor || null,
    practicality: data.practicality || null,
    parts_used: data.parts_used || [],
    parts_consumed: data.parts_consumed || [],
    instructions: data.instructions?.trim() || null,
    code: data.code?.trim() || null,
    schematics: data.schematics?.trim() || null,
    images: data.images || [],
    success_photos: data.success_photos || [],
    fail_photos: data.fail_photos || [],
    time_estimate: data.time_estimate?.trim() || null,
    actual_time: data.actual_time?.trim() || null,
    date_started: data.date_started || null,
    date_completed: data.date_completed || null,
    ai_generated: data.ai_generated || false,
    ai_prompt: data.ai_prompt?.trim() || null,
    notes: data.notes?.trim() || null,
    lessons_learned: data.lessons_learned?.trim() || null,
    metadata: data.metadata || {}
  };

  return { valid: true, errors: [], project };
};

export const validateBuildSession = (data: any): { valid: boolean; errors: string[]; session?: BuildSessionInput } => {
  const errors: string[] = [];
  
  const validMoods = ['excited', 'focused', 'frustrated', 'confused', 'triumphant', 'defeated', 'drunk'];
  if (data.mood && !validMoods.includes(data.mood)) {
    errors.push(`Mood must be one of: ${validMoods.join(', ')}`);
  }
  
  if (data.parts_consumed && !Array.isArray(data.parts_consumed)) {
    errors.push('Parts consumed must be an array');
  }
  
  if (data.tools_used && !Array.isArray(data.tools_used)) {
    errors.push('Tools used must be an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const session: BuildSessionInput = {
    project_id: data.project_id || null,
    session_number: data.session_number || null,
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    work_description: data.work_description?.trim() || null,
    parts_consumed: data.parts_consumed || [],
    tools_used: data.tools_used || [],
    issues_encountered: data.issues_encountered || [],
    solutions_found: data.solutions_found || [],
    photos: data.photos || [],
    mood: data.mood || null,
    notes: data.notes?.trim() || null,
    metadata: data.metadata || {}
  };

  return { valid: true, errors: [], session };
};