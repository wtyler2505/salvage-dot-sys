import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppShell } from '@/components/layout/AppShell';
import { ToastContainer } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { queryClient } from '@/lib/queryClient';

// Import pages
import { Dashboard } from '@/pages/Dashboard';
import { PartsInventory } from '@/pages/PartsInventory';
import { AIAssistant } from '@/pages/AIAssistant';
import { Projects } from '@/pages/Projects';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="parts" element={<PartsInventory />} />
          <Route path="chat" element={<AIAssistant />} />
          <Route path="projects" element={<Projects />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

const LoginPage = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  return (
    <LoginForm 
      mode={mode} 
      onToggleMode={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
    />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-bg-primary text-text-primary">
            <ProtectedRoute fallback={<LoginPage />}>
              <AuthenticatedApp />
            </ProtectedRoute>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;