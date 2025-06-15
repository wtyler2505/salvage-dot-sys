import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Wrench, Brain, Settings, Plus, Zap, Home, BarChart3, Camera, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParts } from '@/hooks/api/useParts';
import { useProjects } from '@/hooks/api/useProjects';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'parts' | 'projects' | 'actions' | 'ai';
  keywords: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddPart?: () => void;
  onOpenAIIdentifier?: () => void;
  onOpenProjectGenerator?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  onOpenAddPart,
  onOpenAIIdentifier,
  onOpenProjectGenerator
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: partsData } = useParts({ limit: 10 });
  const { data: projectsData } = useProjects({ limit: 10 });

  const parts = partsData?.parts || [];
  const projects = projectsData?.projects || [];

  // Static commands with keyboard shortcuts
  const staticCommands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Go to dashboard overview',
      icon: Home,
      action: () => navigate('/'),
      category: 'navigation',
      keywords: ['dashboard', 'home', 'overview', 'stats'],
      shortcut: 'Alt+H'
    },
    {
      id: 'nav-parts',
      title: 'Parts Inventory',
      subtitle: 'Manage your parts collection',
      icon: Package,
      action: () => navigate('/parts'),
      category: 'navigation',
      keywords: ['parts', 'inventory', 'components', 'catalog'],
      shortcut: 'Alt+P'
    },
    {
      id: 'nav-projects',
      title: 'Projects',
      subtitle: 'View and manage your projects',
      icon: Wrench,
      action: () => navigate('/projects'),
      category: 'navigation',
      keywords: ['projects', 'builds', 'work', 'construction'],
      shortcut: 'Alt+R'
    },
    {
      id: 'nav-ai',
      title: 'AI Assistant',
      subtitle: 'Chat with your garage buddy',
      icon: Brain,
      action: () => navigate('/chat'),
      category: 'navigation',
      keywords: ['ai', 'assistant', 'chat', 'help', 'garage', 'buddy'],
      shortcut: 'Alt+A'
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      subtitle: 'View usage statistics',
      icon: BarChart3,
      action: () => navigate('/analytics'),
      category: 'navigation',
      keywords: ['analytics', 'stats', 'reports', 'data'],
      shortcut: 'Alt+Y'
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      subtitle: 'Configure your workspace',
      icon: Settings,
      action: () => navigate('/settings'),
      category: 'navigation',
      keywords: ['settings', 'config', 'preferences', 'api', 'keys'],
      shortcut: 'Alt+S'
    },

    // Quick Actions
    {
      id: 'action-add-part',
      title: 'Add New Part',
      subtitle: 'Add a component to your inventory',
      icon: Plus,
      action: () => {
        onOpenAddPart?.();
        navigate('/parts');
      },
      category: 'actions',
      keywords: ['add', 'new', 'part', 'create', 'component'],
      shortcut: 'Ctrl+N'
    },
    {
      id: 'action-bulk-add',
      title: 'Bulk Add Parts',
      subtitle: 'Import multiple parts from CSV',
      icon: Upload,
      action: () => navigate('/parts?bulk=true'),
      category: 'actions',
      keywords: ['bulk', 'import', 'csv', 'multiple', 'batch']
    },

    // AI Actions
    {
      id: 'ai-identify',
      title: 'Identify Part with AI',
      subtitle: 'Upload photo to identify component',
      icon: Camera,
      action: () => {
        onOpenAIIdentifier?.();
        navigate('/parts');
      },
      category: 'ai',
      keywords: ['identify', 'ai', 'photo', 'camera', 'unknown', 'mystery'],
      shortcut: 'Ctrl+I'
    },
    {
      id: 'ai-generate-project',
      title: 'Generate Project Ideas',
      subtitle: 'AI-powered project suggestions',
      icon: Zap,
      action: () => {
        onOpenProjectGenerator?.();
        navigate('/projects');
      },
      category: 'ai',
      keywords: ['generate', 'ai', 'project', 'ideas', 'suggestions'],
      shortcut: 'Ctrl+G'
    },
    {
      id: 'ai-chat',
      title: 'Ask Garage Buddy',
      subtitle: 'Get help from your AI assistant',
      icon: Brain,
      action: () => navigate('/chat'),
      category: 'ai',
      keywords: ['chat', 'ask', 'help', 'question', 'buddy', 'assistant']
    }
  ];

  // Dynamic commands from parts
  const partCommands: Command[] = parts.map(part => ({
    id: `part-${part.id}`,
    title: part.name,
    subtitle: `${part.category || 'Part'} • Qty: ${part.quantity || 0} • ${part.is_available ? 'Available' : 'Used'}`,
    icon: Package,
    action: () => {
      navigate('/parts');
      // TODO: Could highlight or focus the specific part
    },
    category: 'parts',
    keywords: [
      part.name.toLowerCase(), 
      part.category?.toLowerCase() || '', 
      ...(part.tags || []).map(t => t.toLowerCase()),
      part.location?.toLowerCase() || '',
      part.manufacturer?.toLowerCase() || ''
    ]
  }));

  // Dynamic commands from projects
  const projectCommands: Command[] = projects.map(project => ({
    id: `project-${project.id}`,
    title: project.name,
    subtitle: `Project • ${project.status || 'Unknown status'} • ${project.difficulty_level ? `Level ${project.difficulty_level}` : ''}`,
    icon: Wrench,
    action: () => {
      navigate('/projects');
      // TODO: Could highlight or focus the specific project
    },
    category: 'projects',
    keywords: [
      project.name.toLowerCase(), 
      project.status?.toLowerCase() || '',
      project.description?.toLowerCase() || ''
    ]
  }));

  const allCommands = [...staticCommands, ...partCommands, ...projectCommands];

  // Filter commands based on query
  const filteredCommands = query.trim() === '' 
    ? allCommands.slice(0, 15) // Show top 15 when no query
    : allCommands.filter(command => {
        const searchText = query.toLowerCase();
        return command.title.toLowerCase().includes(searchText) ||
               command.subtitle?.toLowerCase().includes(searchText) ||
               command.keywords.some(keyword => keyword.includes(searchText));
      }).slice(0, 10); // Show top 10 results

  // Group commands by category for display
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) acc[command.category] = [];
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  // Category display names and order
  const categoryOrder = ['navigation', 'ai', 'actions', 'parts', 'projects'];
  const categoryLabels = {
    navigation: 'NAVIGATION',
    ai: 'AI FEATURES',
    actions: 'QUICK ACTIONS',
    parts: 'PARTS',
    projects: 'PROJECTS'
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Focus input when opened and reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div 
          className="relative w-full max-w-2xl bg-bg-secondary border border-cyber-cyan/30 rounded-sm shadow-cyber animate-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-text-muted/20">
            <Search className="w-5 h-5 text-text-muted mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="SEARCH COMMANDS, PARTS, PROJECTS..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-lg font-mono"
            />
            <div className="flex items-center space-x-2 text-xs text-text-muted font-mono">
              <kbd className="px-2 py-1 bg-bg-tertiary rounded-sm border border-text-muted/30">↑↓</kbd>
              <span>NAVIGATE</span>
              <kbd className="px-2 py-1 bg-bg-tertiary rounded-sm border border-text-muted/30">↵</kbd>
              <span>SELECT</span>
              <kbd className="px-2 py-1 bg-bg-tertiary rounded-sm border border-text-muted/30">ESC</kbd>
              <span>CLOSE</span>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-mono">NO COMMANDS FOUND FOR "{query}"</p>
                <p className="text-sm mt-1 font-mono">TRY "add part", "ai identify", or "dashboard"</p>
              </div>
            ) : (
              <div className="p-2">
                {categoryOrder.map(categoryKey => {
                  const commands = groupedCommands[categoryKey];
                  if (!commands || commands.length === 0) return null;

                  return (
                    <div key={categoryKey} className="mb-4 last:mb-0">
                      <div className="px-2 py-1 text-xs font-medium text-text-muted uppercase tracking-wide font-mono">
                        {categoryLabels[categoryKey as keyof typeof categoryLabels]}
                      </div>
                      <div className="space-y-1">
                        {commands.map((command) => {
                          const globalIndex = filteredCommands.indexOf(command);
                          return (
                            <button
                              key={command.id}
                              onClick={() => {
                                command.action();
                                onClose();
                              }}
                              className={cn(
                                'w-full flex items-center space-x-3 px-3 py-3 rounded-sm text-left transition-colors group',
                                globalIndex === selectedIndex
                                  ? 'bg-cyber-cyan text-bg-primary'
                                  : 'text-text-primary hover:bg-bg-tertiary border border-transparent hover:border-cyber-cyan/30'
                              )}
                            >
                              <command.icon className={cn(
                                'w-5 h-5 flex-shrink-0',
                                globalIndex === selectedIndex ? 'text-bg-primary' : 'text-text-muted group-hover:text-text-secondary'
                              )} />
                              <div className="flex-1 min-w-0 font-mono">
                                <div className="font-medium truncate">{command.title}</div>
                                {command.subtitle && (
                                  <div className={cn(
                                    'text-sm opacity-75 truncate',
                                    globalIndex === selectedIndex ? 'text-bg-primary' : 'text-text-muted'
                                  )}>
                                    {command.subtitle}
                                  </div>
                                )}
                              </div>
                              {command.shortcut && (
                                <div className={cn(
                                  'text-xs px-2 py-1 rounded-sm font-mono',
                                  globalIndex === selectedIndex 
                                    ? 'bg-bg-primary/20 text-bg-primary border border-bg-primary/40' 
                                    : 'bg-bg-tertiary text-text-muted border border-text-muted/30'
                                )}>
                                  {command.shortcut}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-text-muted/20 px-4 py-2 text-xs text-text-muted font-mono">
            <div className="flex items-center justify-between">
              <span>
                {filteredCommands.length > 0 
                  ? `${filteredCommands.length} RESULT${filteredCommands.length === 1 ? '' : 'S'}`
                  : 'NO RESULTS'
                }
              </span>
              <span>PRESS <kbd className="px-1 py-0.5 bg-bg-tertiary rounded-sm border border-text-muted/30">CTRL+K</kbd> TO OPEN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};