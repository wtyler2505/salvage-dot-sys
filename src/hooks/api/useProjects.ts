import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

// Projects query hooks
export const useProjects = (filters: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => api.getProjects(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  });
};

// Projects mutation hooks
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: api.createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success('Project created successfully');
      return data;
    },
    onError: (err: Error) => {
      error('Failed to create project', err.message);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.updateProject(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      success('Project updated successfully');
      return data;
    },
    onError: (err: Error) => {
      error('Failed to update project', err.message);
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success('Project deleted successfully');
    },
    onError: (err: Error) => {
      error('Failed to delete project', err.message);
    },
  });
};