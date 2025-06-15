import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  global?: boolean; // Whether this shortcut works in input fields
}

export const useKeyboardShortcuts = (
  onOpenCommandPalette: () => void,
  onOpenAddPart?: () => void,
  onOpenAddProject?: () => void,
  onOpenAIIdentifier?: () => void,
  onOpenProjectGenerator?: () => void
) => {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    // Command palette - most important shortcut
    {
      key: 'k',
      metaKey: true,
      action: onOpenCommandPalette,
      description: 'Open command palette',
      global: true
    },
    {
      key: 'k',
      ctrlKey: true,
      action: onOpenCommandPalette,
      description: 'Open command palette (Windows/Linux)',
      global: true
    },

    // Navigation shortcuts (Alt + key for page navigation)
    {
      key: 'h',
      altKey: true,
      action: () => navigate('/'),
      description: 'Go to dashboard'
    },
    {
      key: 'p',
      altKey: true,
      action: () => navigate('/parts'),
      description: 'Go to parts inventory'
    },
    {
      key: 'r',
      altKey: true,
      action: () => navigate('/projects'),
      description: 'Go to projects'
    },
    {
      key: 'a',
      altKey: true,
      action: () => navigate('/chat'),
      description: 'Go to AI assistant'
    },
    {
      key: 'y',
      altKey: true,
      action: () => navigate('/analytics'),
      description: 'Go to analytics'
    },
    {
      key: 's',
      altKey: true,
      action: () => navigate('/settings'),
      description: 'Go to settings'
    },

    // Quick actions (Ctrl + key for actions)
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        if (onOpenAddPart) {
          onOpenAddPart();
        } else {
          navigate('/parts');
        }
      },
      description: 'Add new part'
    },
    {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        if (onOpenAddProject) {
          onOpenAddProject();
        } else {
          navigate('/projects');
        }
      },
      description: 'Add new project'
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => {
        if (onOpenAIIdentifier) {
          onOpenAIIdentifier();
        } else {
          navigate('/parts');
        }
      },
      description: 'Identify part with AI'
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => {
        if (onOpenProjectGenerator) {
          onOpenProjectGenerator();
        } else {
          navigate('/projects');
        }
      },
      description: 'Generate project ideas'
    },

    // Global actions
    {
      key: '/',
      action: () => {
        // Focus search if on parts or projects page
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          onOpenCommandPalette();
        }
      },
      description: 'Focus search or open command palette'
    },

    // Escape for closing modals (handled at component level but documented here)
    {
      key: 'Escape',
      action: () => {
        // This is handled by individual components but documented for completeness
      },
      description: 'Close modals and dialogs'
    }
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field (unless it's a global shortcut)
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

      // Find matching shortcut
      const shortcut = shortcuts.find(s => {
        const keyMatches = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = !!s.ctrlKey === event.ctrlKey;
        const metaMatches = !!s.metaKey === event.metaKey;
        const altMatches = !!s.altKey === event.altKey;
        const shiftMatches = !!s.shiftKey === event.shiftKey;

        return keyMatches && ctrlMatches && metaMatches && altMatches && shiftMatches;
      });

      if (shortcut) {
        // Allow global shortcuts in input fields, skip others
        if (isInputField && !shortcut.global) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        
        try {
          shortcut.action();
        } catch (error) {
          console.error('Keyboard shortcut error:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [shortcuts, navigate, onOpenCommandPalette, onOpenAddPart, onOpenAddProject, onOpenAIIdentifier, onOpenProjectGenerator]);

  // Return shortcuts for documentation/help purposes
  return {
    shortcuts: shortcuts.map(({ action, ...rest }) => rest)
  };
};