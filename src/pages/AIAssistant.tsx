import React, { useState } from 'react';
import { Brain, MessageSquare, Lightbulb, Camera, Zap, Package, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { useNavigate } from 'react-router-dom';

export const AIAssistant: React.FC = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const navigate = useNavigate();

  const handleNewConversation = () => {
    setCurrentConversationId(undefined);
  };

  const quickActions = [
    {
      title: "Identify Mystery Part",
      description: "Upload a photo to identify unknown components",
      icon: Camera,
      action: () => navigate('/parts'),
      color: "bg-cyber-magenta/20 border-cyber-magenta text-cyber-magenta"
    },
    {
      title: "Generate Project Ideas",
      description: "Get creative project suggestions from your parts",
      icon: Lightbulb,
      action: () => navigate('/projects'),
      color: "bg-cyber-orange/20 border-cyber-orange text-cyber-orange"
    },
    {
      title: "Add New Part",
      description: "Quickly add a component to your inventory",
      icon: Plus,
      action: () => navigate('/parts'),
      color: "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan"
    },
    {
      title: "Browse Parts",
      description: "View and manage your parts inventory",
      icon: Package,
      action: () => navigate('/parts'),
      color: "bg-cyber-green/20 border-cyber-green text-cyber-green"
    }
  ];

  const commonQuestions = [
    "What voltage should I use for this LED?",
    "How do I calculate the right resistor value?",
    "What's the difference between NPN and PNP transistors?",
    "Can you help me understand this circuit diagram?",
    "What safety precautions should I take with this component?",
    "How do I test if this component is working?"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">AI ASSISTANT</h1>
          <p className="text-text-muted mt-1 font-mono">Your intelligent garage buddy is here to help</p>
        </div>
        <Button
          variant="outline"
          onClick={handleNewConversation}
          icon={<MessageSquare className="w-4 h-4" />}
          glow
        >
          NEW CHAT
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2">
          <ChatInterface 
            conversationId={currentConversationId}
            onConversationStart={setCurrentConversationId}
          />
        </div>

        {/* Sidebar with Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="cyber-card">
            <h3 className="font-medium text-text-primary mb-4 flex items-center font-mono uppercase tracking-wider">
              <Zap className="w-4 h-4 mr-2 text-cyber-cyan" />
              QUICK ACTIONS
            </h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-start space-x-3 p-3 text-left bg-bg-secondary hover:bg-bg-tertiary rounded-sm transition-colors group border hover:shadow-cyber border-text-muted/20 hover:border-cyber-cyan/50"
                >
                  <div className={`p-2 rounded-sm ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary text-sm font-mono">{action.title}</h4>
                    <p className="text-xs text-text-muted mt-1">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Common Questions */}
          <div className="cyber-card">
            <h3 className="font-medium text-text-primary mb-4 flex items-center font-mono uppercase tracking-wider">
              <Brain className="w-4 h-4 mr-2 text-cyber-cyan" />
              COMMON QUESTIONS
            </h3>
            <div className="space-y-2">
              {commonQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // This would set the message in the chat interface
                    // For now, just scroll to chat
                    document.querySelector('textarea')?.focus();
                  }}
                  className="w-full text-left p-2 text-sm text-text-secondary hover:bg-bg-tertiary rounded-sm transition-colors font-mono border border-transparent hover:border-cyber-cyan/30"
                >
                  "{question}"
                </button>
              ))}
            </div>
          </div>

          {/* AI Features Info */}
          <div className="bg-gradient-to-br from-cyber-cyan/20 to-cyber-magenta/20 border border-cyber-cyan/50 rounded-sm p-4 text-text-primary scanning">
            <h3 className="font-medium mb-2 font-mono text-glow-cyan">🤖 AI CAPABILITIES</h3>
            <ul className="text-sm space-y-1 font-mono text-text-secondary">
              <li>• Part identification from photos</li>
              <li>• Project idea generation</li>
              <li>• Circuit troubleshooting help</li>
              <li>• Safety guidance</li>
              <li>• Component specifications</li>
              <li>• Learning and remembering preferences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};