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
  return useQuery({
    queryKey: ['parts', filters],
    queryFn: () => api.getParts(filters),
    staleTime: 0, // Always consider data stale for immediate updates
    cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Authentication') || 
          error?.message?.includes('token') || 
          error?.message?.includes('login')) {
        return false;
      }
      return failureCount < 2; // Reduce retry attempts
    },
    onError: (error: any) => {
      console.error('Parts query error:', error);
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
    mutationFn: api.createPart,
    onSuccess: (data) => {
      console.log('Part created successfully:', data);
      
      // More aggressive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.removeQueries({ queryKey: ['parts'] }); // Remove cached data
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['parts'] });
      }, 100);
      
      success('Part added successfully', `${data.part?.name || 'Part'} has been added to your inventory`);
      return data;
    },
    onError: (err: Error) => {
      console.error('Create part error:', err);
      
      // Provide specific error messages for auth issues
      if (err.message.includes('Authentication') || 
          err.message.includes('token') || 
          err.message.includes('login')) {
        error('Authentication required', 'Please login again to continue');
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