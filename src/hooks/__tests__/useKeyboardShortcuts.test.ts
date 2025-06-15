import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('useKeyboardShortcuts', () => {
  const mockCallbacks = {
    onOpenCommandPalette: vi.fn(),
    onOpenAddPart: vi.fn(),
    onOpenAddProject: vi.fn(),
    onOpenAIIdentifier: vi.fn(),
    onOpenProjectGenerator: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener('keydown', expect.any(Function));
  });

  it('should register keyboard shortcuts', () => {
    const { result } = renderHook(() => 
      useKeyboardShortcuts(
        mockCallbacks.onOpenCommandPalette,
        mockCallbacks.onOpenAddPart,
        mockCallbacks.onOpenAddProject,
        mockCallbacks.onOpenAIIdentifier,
        mockCallbacks.onOpenProjectGenerator
      )
    );

    expect(result.current.shortcuts).toBeDefined();
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it('should trigger command palette on Ctrl+K', () => {
    renderHook(() => 
      useKeyboardShortcuts(mockCallbacks.onOpenCommandPalette)
    );

    // Simulate Ctrl+K
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    
    document.dispatchEvent(event);

    expect(mockCallbacks.onOpenCommandPalette).toHaveBeenCalled();
  });

  it('should trigger command palette on Meta+K (Mac)', () => {
    renderHook(() => 
      useKeyboardShortcuts(mockCallbacks.onOpenCommandPalette)
    );

    // Simulate Cmd+K (Mac)
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    });
    
    document.dispatchEvent(event);

    expect(mockCallbacks.onOpenCommandPalette).toHaveBeenCalled();
  });

  it('should navigate to dashboard on Alt+H', () => {
    renderHook(() => 
      useKeyboardShortcuts(mockCallbacks.onOpenCommandPalette)
    );

    // Simulate Alt+H
    const event = new KeyboardEvent('keydown', {
      key: 'h',
      altKey: true,
    });
    
    document.dispatchEvent(event);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should trigger add part on Ctrl+N', () => {
    renderHook(() => 
      useKeyboardShortcuts(
        mockCallbacks.onOpenCommandPalette,
        mockCallbacks.onOpenAddPart
      )
    );

    // Simulate Ctrl+N
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });
    
    document.dispatchEvent(event);

    expect(mockCallbacks.onOpenAddPart).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input fields', () => {
    renderHook(() => 
      useKeyboardShortcuts(mockCallbacks.onOpenCommandPalette)
    );

    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Simulate Alt+H while input is focused
    const event = new KeyboardEvent('keydown', {
      key: 'h',
      altKey: true,
      target: input,
    } as any);
    
    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true
    });
    
    document.dispatchEvent(event);

    // Should not navigate because we're in an input field
    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should allow global shortcuts in input fields', () => {
    renderHook(() => 
      useKeyboardShortcuts(mockCallbacks.onOpenCommandPalette)
    );

    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Simulate Ctrl+K (global shortcut) while input is focused
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      target: input,
    } as any);
    
    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true
    });
    
    document.dispatchEvent(event);

    // Should still work because command palette is a global shortcut
    expect(mockCallbacks.onOpenCommandPalette).toHaveBeenCalled();

    document.body.removeChild(input);
  });
});