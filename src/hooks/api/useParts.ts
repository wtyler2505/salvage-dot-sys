import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

// Parts query hooks
export const useParts = (filters: {
  search?: string;
  category?: string;
  available?: boolean;
  limit?: number;
  offset?: number;
} = {}) => {
  const { success, error } = useToast();
  
  return useQuery({
    queryKey: ['parts', filters],
    queryFn: async () => {
      console.log('🔍 [useParts] Starting query with filters:', filters);
      try {
        const result = await api.getParts(filters);
        console.log('✅ [useParts] Query successful:', {
          partsCount: result.parts?.length || 0,
          total: result.total,
          filters
        });
        return result;
      } catch (queryError) {
        console.error('❌ [useParts] Query failed:', queryError);
        
        // Show user-friendly error based on error type
        if (queryError instanceof Error) {
          if (queryError.message.includes('DEVELOPMENT ERROR')) {
            error('Development Server Error', 'Please use http://localhost:3000 and run "npm run dev"');
          } else if (queryError.message.includes('404') || queryError.message.includes('not found')) {
            error('API Error', 'Parts database unavailable. Check that your dev server is running properly.');
          } else if (queryError.message.includes('auth') || queryError.message.includes('login')) {
            error('Authentication Error', 'Please login again to access your parts');
          } else {
            error('Database Error', queryError.message);
          }
        }
        
        throw queryError;
      }
    },
    staleTime: 0, // Always consider data stale for immediate updates
    cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    retry: (failureCount, error: any) => {
      console.log(`🔄 [useParts] Retry attempt ${failureCount + 1}:`, error?.message);
      // Don't retry on auth errors or development errors
      if (error?.message?.includes('Authentication') || 
          error?.message?.includes('token') || 
          error?.message?.includes('login') ||
          error?.message?.includes('DEVELOPMENT ERROR')) {
        console.log('🚫 [useParts] Not retrying auth/dev error');
        return false;
      }
      return failureCount < 2; // Reduce retry attempts
    },
    onError: (error: any) => {
      console.error('💥 [useParts] Final error after retries:', error);
    },
    onSuccess: (data) => {
      console.log('🎉 [useParts] Query completed successfully:', {
        partsReturned: data.parts?.length || 0,
        totalAvailable: data.total || 0
      });
    }
  });
};

export const usePart = (id: string) => {
  return useQuery({
    queryKey: ['parts', id],
    queryFn: () => api.getPart(id),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Authentication') || 
          error?.message?.includes('token') || 
          error?.message?.includes('login')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Parts mutation hooks
export const useCreatePart = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (partData: any) => {
      console.log('🚀 [useCreatePart] Starting part creation:', {
        name: partData.name,
        category: partData.category,
        aiIdentified: partData.ai_identified
      });
      
      try {
        const result = await api.createPart(partData);
        console.log('✅ [useCreatePart] API call successful:', {
          partId: result.part?.id,
          partName: result.part?.name
        });
        return result;
      } catch (createError) {
        console.error('❌ [useCreatePart] API call failed:', createError);
        throw createError;
      }
    },
    onSuccess: (data) => {
      console.log('🎯 [useCreatePart] Mutation onSuccess triggered:', data);
      
      // Log current cache state
      const currentCache = queryClient.getQueryData(['parts']);
      console.log('📦 [useCreatePart] Current parts cache before invalidation:', currentCache);
      
      // More aggressive cache invalidation with logging
      console.log('🗑️ [useCreatePart] Starting cache invalidation...');
      
      // Remove all parts-related queries
      queryClient.removeQueries({ queryKey: ['parts'] });
      console.log('🗑️ [useCreatePart] Removed parts queries from cache');
      
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      console.log('🔄 [useCreatePart] Invalidated parts queries');
      
      // Force immediate refetch with more aggressive timing
      setTimeout(() => {
        console.log('⚡ [useCreatePart] Forcing refetch...');
        queryClient.refetchQueries({ queryKey: ['parts'] })
          .then((results) => {
            console.log('✅ [useCreatePart] Forced refetch completed:', results);
            
            // Check if the new part is now in the cache
            const updatedCache = queryClient.getQueryData(['parts']);
            console.log('📦 [useCreatePart] Updated cache after refetch:', updatedCache);
          })
          .catch((refetchError) => {
            console.error('❌ [useCreatePart] Forced refetch failed:', refetchError);
          });
      }, 100);
      
      // Additional refetch with different timing
      setTimeout(() => {
        console.log('⚡ [useCreatePart] Second refetch attempt...');
        queryClient.refetchQueries({ queryKey: ['parts'] });
      }, 500);
      
      success('Part added successfully', `${data.part?.name || 'Part'} has been added to your inventory`);
      return data;
    },
    onError: (err: Error) => {
      console.error('💥 [useCreatePart] Mutation failed:', err);
      
      // Provide specific error messages for auth issues
      if (err.message.includes('Authentication') || 
          err.message.includes('token') || 
          err.message.includes('login')) {
        error('Authentication required', 'Please login again to continue');
      } else if (err.message.includes('DEVELOPMENT ERROR')) {
        error('Development Server Error', 'Please use http://localhost:3000 and run "npm run dev"');
      } else {
        error('Failed to add part', err.message);
      }
    },
  });
};

export const useUpdatePart = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.updatePart(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['parts', variables.id] });
      queryClient.refetchQueries({ queryKey: ['parts'] });
      success('Part updated successfully');
      return data;
    },
    onError: (err: Error) => {
      if (err.message.includes('Authentication') || 
          err.message.includes('token') || 
          err.message.includes('login')) {
        error('Authentication required', 'Please login again to continue');
      } else {
        error('Failed to update part', err.message);
      }
    },
  });
};

export const useDeletePart = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: api.deletePart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.refetchQueries({ queryKey: ['parts'] });
      success('Part deleted successfully');
    },
    onError: (err: Error) => {
      if (err.message.includes('Authentication') || 
          err.message.includes('token') || 
          err.message.includes('login')) {
        error('Authentication required', 'Please login again to continue');
      } else {
        error('Failed to delete part', err.message);
      }
    },
  });
};