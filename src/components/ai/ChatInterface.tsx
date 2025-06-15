import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, Lightbulb, HelpCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useSendMessage } from '@/hooks/api/useChat';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationStart?: (id: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  conversationId, 
  onConversationStart 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const sendMessage = useSendMessage();

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Add initial welcome message if no conversation
  useEffect(() => {
    if (!conversationId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hey there! I'm your AI garage buddy. I can help you identify mystery components, suggest projects based on your parts, and answer any electronics questions you've got. What's on your workbench today?",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [conversationId, messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || sendMessage.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Add loading message
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    const messageContent = message;
    setMessage('');

    try {
      const response = await sendMessage.mutateAsync({
        message: messageContent,
        conversation_id: currentConversationId,
        context: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });

      // Remove loading message and add actual response
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      const assistantMessage: Message = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation ID if this is a new conversation
      if (response.conversation_id && response.conversation_id !== currentConversationId) {
        setCurrentConversationId(response.conversation_id);
        onConversationStart?.(response.conversation_id);
      }

    } catch (error) {
      // Remove loading message and show error
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Make sure your Anthropic API key is set up in Settings, or try again in a moment.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    {
      icon: HelpCircle,
      text: "What's this component?",
      prompt: "I found this component but I'm not sure what it is. Can you help me identify it?"
    },
    {
      icon: Lightbulb,
      text: "Project ideas",
      prompt: "I want to build something cool with the parts I have. Can you suggest some project ideas?"
    },
    {
      icon: Zap,
      text: "Safety check",
      prompt: "I'm working with high voltage components. What safety precautions should I take?"
    },
    {
      icon: Wrench,
      text: "Troubleshooting help",
      prompt: "My circuit isn't working as expected. Can you help me troubleshoot the issue?"
    }
  ];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-bg-primary border border-cyber-cyan/30 rounded-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyber-cyan rounded-sm flex items-center justify-center">
            <Bot className="w-5 h-5 text-bg-primary" />
          </div>
          <div>
            <h3 className="font-medium text-text-primary font-mono uppercase">GARAGE BUDDY</h3>
            <p className="text-sm text-text-muted font-mono">Your AI electronics assistant</p>
          </div>
        </div>
        {sendMessage.isPending && (
          <div className="flex items-center space-x-2 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">PROCESSING...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex items-start space-x-3',
              msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0',
              msg.role === 'user' 
                ? 'bg-bg-tertiary border border-text-muted/30' 
                : 'bg-cyber-cyan'
            )}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-text-muted" />
              ) : (
                <Bot className="w-4 h-4 text-bg-primary" />
              )}
            </div>

            {/* Message Content */}
            <div className={cn(
              'flex-1 max-w-md',
              msg.role === 'user' ? 'text-right' : ''
            )}>
              <div className={cn(
                'inline-block p-3 rounded-sm',
                msg.role === 'user'
                  ? 'bg-cyber-cyan/20 border border-cyber-cyan text-text-primary'
                  : 'bg-bg-tertiary text-text-primary border border-cyber-green/30'
              )}>
                {msg.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-mono">THINKING...</span>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap font-mono">{msg.content}</p>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts (show when conversation is new) */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-cyber-cyan/20">
          <p className="text-sm text-text-muted mb-2 font-mono">QUICK PROMPTS:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setMessage(prompt.prompt)}
                className="flex items-center space-x-2 p-2 text-sm text-text-secondary bg-bg-secondary rounded-sm hover:bg-bg-tertiary transition-colors border border-text-muted/20 hover:border-cyber-cyan/40 font-mono"
              >
                <prompt.icon className="w-4 h-4 text-cyber-cyan" />
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-cyber-cyan/20">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your parts, get project ideas, or just chat..."
              className="cyber-terminal w-full max-h-32 px-3 py-2 resize-none"
              rows={1}
              disabled={sendMessage.isPending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessage.isPending}
            icon={sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            glow
          >
            SEND
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};