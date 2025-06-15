import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Brain, 
  Wrench, 
  BarChart3, 
  Settings,
  ChevronLeft,
  Zap
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Parts Inventory', href: '/parts', icon: Package },
  { name: 'AI Assistant', href: '/chat', icon: Brain },
  { name: 'Projects', href: '/projects', icon: Wrench },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div 
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-bg-primary border-r border-cyber-cyan/20 transition-all duration-300 ease-in-out z-30',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-cyber-cyan/20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-cyber-cyan rounded-sm">
            <Zap className="w-5 h-5 text-bg-primary" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-text-primary font-mono uppercase tracking-wider">SALVAGE.SYS</h1>
              <p className="text-xs text-text-muted font-mono">AI-POWERED WORKSHOP</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-sm transition-all duration-200',
                isActive
                  ? 'bg-cyber-cyan text-bg-primary font-mono shadow-cyber'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary hover:shadow-cyber'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-mono uppercase tracking-wider text-sm">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-2 text-text-muted hover:text-cyber-cyan hover:bg-bg-tertiary rounded-sm transition-colors border border-text-muted/20 hover:border-cyber-cyan/50"
        >
          <ChevronLeft 
            className={cn(
              'w-5 h-5 transition-transform',
              !sidebarOpen && 'rotate-180'
            )} 
          />
          {sidebarOpen && <span className="ml-2 text-sm font-mono uppercase">Collapse</span>}
        </button>
      </div>
    </div>
  );
};