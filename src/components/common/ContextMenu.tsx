import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault(); // Prevent default IMMEDIATELY
    e.stopPropagation();
    e.stopImmediatePropagation(); // Stop ALL other event handlers
    
    console.log('🖱️ Context menu triggered!', { x: e.clientX, y: e.clientY });
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Menu dimensions (approximate)
    const menuWidth = 200;
    const menuHeight = items.length * 40;
    
    // Calculate position with boundary checks
    let x = e.clientX;
    let y = e.clientY;
    
    // Keep menu on screen
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // Minimum distance from edges
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setPosition({ x, y });
    setIsOpen(true);
    
    return false; // Additional prevention
  };

  const handleClick = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Set up event listeners on the container element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add context menu listener directly to DOM element
    container.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [items]); // Re-setup when items change

  // Handle clicks outside to close menu
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);
      }, 50);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && !item.separator) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cn('select-none', className)}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        // Prevent context menu on React level too
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
      
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[99999] min-w-48 bg-bg-secondary border border-cyber-cyan/30 rounded-sm shadow-cyber py-1 animate-in"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            animation: 'fade-in 0.15s ease-out'
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {item.separator ? (
                <div className="h-px bg-text-muted/20 my-1" />
              ) : (
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 text-sm text-left transition-colors focus:outline-none font-mono uppercase',
                    item.disabled
                      ? 'text-text-muted cursor-not-allowed'
                      : item.destructive
                      ? 'text-cyber-magenta hover:bg-cyber-magenta-dim focus:bg-cyber-magenta-dim'
                      : 'text-text-secondary hover:bg-bg-tertiary focus:bg-bg-tertiary hover:text-text-primary'
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};