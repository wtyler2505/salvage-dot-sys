import { create } from 'zustand';

interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Modal states
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  
  // View preferences
  partsView: 'grid' | 'table';
  setPartsView: (view: 'grid' | 'table') => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  
  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Modals
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  
  // View preferences
  partsView: 'grid',
  setPartsView: (view) => set({ partsView: view }),
}));