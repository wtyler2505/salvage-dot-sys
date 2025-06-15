import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

interface LoginFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = mode === 'signin' 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-cyber-cyan rounded-sm mx-auto mb-4">
            <LogIn className="w-8 h-8 text-bg-primary" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">
            {mode === 'signin' ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'}
          </h2>
          <p className="mt-2 text-text-muted font-mono">
            {mode === 'signin' 
              ? 'Sign in to salvage tracker database' 
              : 'Initialize your salvage management system'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta px-4 py-3 rounded-sm font-mono">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input mt-1 block w-full"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input block w-full pr-10"
                  placeholder="Enter secure password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-text-muted hover:text-text-secondary" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-muted hover:text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="cyber-button cyber-button--primary w-full group relative flex justify-center py-2 px-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? (
                    <LogIn className="w-5 h-5 mr-2" />
                  ) : (
                    <UserPlus className="w-5 h-5 mr-2" />
                  )}
                  {mode === 'signin' ? 'SYSTEM LOGIN' : 'INITIALIZE ACCOUNT'}
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-cyber-cyan hover:text-cyber-cyan/80 text-sm font-mono"
            >
              {mode === 'signin' 
                ? "NO ACCOUNT? REGISTER NOW" 
                : 'EXISTING ACCOUNT? LOGIN'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};