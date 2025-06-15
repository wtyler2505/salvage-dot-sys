import React from 'react';
import { Search, Menu, Bell, Settings, User, Command, Terminal, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette }) => {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-bg-primary border-b border-cyber-cyan/30 h-16 flex items-center px-4 sticky top-0 z-40">
      <div className="flex items-center space-x-4 flex-1">
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          icon={<Menu className="w-5 h-5" />}
        />

        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-cyber-cyan rounded-sm flex items-center justify-center">
            <Terminal className="w-5 h-5 text-bg-primary" />
          </div>
          <span className="font-mono font-bold text-text-primary uppercase tracking-wider hidden sm:block text-glow-cyan">
            SALVAGE.SYS
          </span>
        </div>

        {/* Global Search / Command Palette Trigger */}
        <div className="flex-1 max-w-md">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center space-x-3 px-3 py-2 bg-bg-primary border border-cyber-cyan/50 rounded-sm text-left hover:bg-bg-tertiary hover:border-cyber-cyan hover:shadow-cyber transition-all duration-200"
          >
            <Search className="w-4 h-4 text-text-muted" />
            <span className="text-text-muted flex-1 font-mono text-sm">SEARCH COMMANDS, PARTS, PROJECTS...</span>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-bg-tertiary text-text-muted text-xs rounded font-mono">⌘</kbd>
              <kbd className="px-2 py-1 bg-bg-tertiary text-text-muted text-xs rounded font-mono">K</kbd>
            </div>
          </button>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-2">
        {/* Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-cyber-green/20 border border-cyber-green rounded-sm status-online">
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse" />
          <span className="text-cyber-green font-mono text-xs uppercase text-glow-green">ONLINE</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-2 pl-2 border-l border-cyber-cyan/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-cyber-cyan/20 border border-cyber-cyan rounded-sm flex items-center justify-center">
              <User className="w-4 h-4 text-cyber-cyan" />
            </div>
            <span className="text-sm text-text-secondary hidden sm:block font-mono uppercase">
              {user?.email?.split('@')[0]}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-text-muted hover:text-cyber-orange"
          >
            LOGOUT
          </Button>
        </div>
      </div>
    </header>
  );
};