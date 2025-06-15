import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/common/CommandPalette';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

export const AppShell: React.FC = () => {
  const { sidebarOpen } = useUIStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [aiIdentifierOpen, setAIIdentifierOpen] = useState(false);
  const [projectGeneratorOpen, setProjectGeneratorOpen] = useState(false);

  // Setup keyboard shortcuts with all the modal handlers
  useKeyboardShortcuts(
    () => setCommandPaletteOpen(true),
    () => setAddPartModalOpen(true),
    () => setAddProjectModalOpen(true),
    () => setAIIdentifierOpen(true),
    () => setProjectGeneratorOpen(true)
  );

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      
      <div className="flex">
        <Sidebar />
        
        <main 
          className={cn(
            'flex-1 transition-all duration-300 ease-in-out',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          <div className="p-6">
            <Outlet context={{
              onOpenAddPart: () => setAddPartModalOpen(true),
              onOpenAddProject: () => setAddProjectModalOpen(true),
              onOpenAIIdentifier: () => setAIIdentifierOpen(true),
              onOpenProjectGenerator: () => setProjectGeneratorOpen(true)
            }} />
          </div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenAddPart={() => {
          setCommandPaletteOpen(false);
          setAddPartModalOpen(true);
        }}
        onOpenAIIdentifier={() => {
          setCommandPaletteOpen(false);
          setAIIdentifierOpen(true);
        }}
        onOpenProjectGenerator={() => {
          setCommandPaletteOpen(false);
          setProjectGeneratorOpen(true);
        }}
      />

      {/* Global modals would go here if needed */}
      {/* For now, let individual pages handle their own modals */}
    </div>
  );
};