import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

// Chat query hooks
export const useChatMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: () => api.getChatMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 0, // Always fresh for chat
    refetchOnWindowFocus: false, // Don't refetch on focus for chat
  });
};

export const useConversations = () => {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Chat mutation hooks
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { error } = useToast();

  return useMutation({
    mutationFn: api.aiChat,
    onSuccess: (data) => {
      // Invalidate conversations list to show new conversation
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // If we have a conversation_id, invalidate its messages
      if (data.conversation_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['chat-messages', data.conversation_id] 
        });
      }
      
      return data;
    },
    onError: (err: Error) => {
      console.error('Send message error:', err);
      
      if (err.message.includes('Authentication') || 
          err.message.includes('token') || 
          err.message.includes('login')) {
        error('Authentication required', 'Please login again to continue');
      } else if (err.message.includes('AI service not configured')) {
        error('AI service not configured', 'Please add your Anthropic API key in Settings');
      } else {
        error('Failed to send message', err.message);
      }
    },
  });
};