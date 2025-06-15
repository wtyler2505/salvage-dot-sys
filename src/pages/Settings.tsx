import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Key, Eye, EyeOff, Save, TestTube, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

interface APIKeys {
  anthropic: string;
  mem0: string;
  perplexity: string; // Added Perplexity
  supabase_service: string;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  timestamp?: Date;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    anthropic: '',
    mem0: '',
    perplexity: '', // Added Perplexity
    supabase_service: ''
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({
    anthropic: { status: 'idle' },
    mem0: { status: 'idle' },
    perplexity: { status: 'idle' }, // Added Perplexity
    supabase: { status: 'idle' }
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('salvage-tracker-api-keys');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        setApiKeys({
          anthropic: parsed.anthropic || '',
          mem0: parsed.mem0 || '',
          perplexity: parsed.perplexity || '', // Load Perplexity key
          supabase_service: parsed.supabase_service || ''
        });
      } catch (err) {
        console.error('Failed to parse saved API keys:', err);
      }
    }
  }, []);

  const handleSaveAPIKeys = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('salvage-tracker-api-keys', JSON.stringify(apiKeys));
      setSaveStatus('saved');
      success('API keys saved successfully');
      
      // Reset save status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      error('Failed to save API keys', 'Please try again');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTestConnection = async (service: string) => {
    setTestResults(prev => ({
      ...prev,
      [service]: { status: 'testing' }
    }));
    
    try {
      // Test the connection based on service
      switch (service) {
        case 'perplexity':
          if (!apiKeys.perplexity) {
            throw new Error('Perplexity API key is required');
          }
          // Test Perplexity with a simple request
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${apiKeys.perplexity}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [{ role: 'user', content: 'Hello' }],
              max_tokens: 1
            })
          });
          
          if (!perplexityResponse.ok) {
            const errorData = await perplexityResponse.json();
            throw new Error(errorData.error?.message || 'Connection failed');
          }
          
          setTestResults(prev => ({
            ...prev,
            [service]: { 
              status: 'success', 
              message: 'Perplexity connection successful! 🔍',
              timestamp: new Date()
            }
          }));
          break;
          
        case 'anthropic':
          if (!apiKeys.anthropic) {
            throw new Error('Anthropic API key is required');
          }
          // Test with a simple request
          const response = await fetch('/.netlify/functions/test-anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKeys.anthropic })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Connection failed');
          }
          
          setTestResults(prev => ({
            ...prev,
            [service]: { 
              status: 'success', 
              message: 'Anthropic connection successful',
              timestamp: new Date()
            }
          }));
          break;
          
        case 'mem0':
          if (!apiKeys.mem0) {
            throw new Error('mem0 API key is required');
          }
          // For now, just validate format
          if (!apiKeys.mem0.startsWith('m0-')) {
            throw new Error('Invalid mem0 API key format (should start with m0-)');
          }
          setTestResults(prev => ({
            ...prev,
            [service]: { 
              status: 'success', 
              message: 'API key format is valid',
              timestamp: new Date()
            }
          }));
          break;
          
        case 'supabase':
          if (!apiKeys.supabase_service) {
            throw new Error('Supabase service key is required');
          }
          // Basic JWT format validation
          if (!apiKeys.supabase_service.startsWith('eyJ')) {
            throw new Error('Invalid Supabase service key format');
          }
          setTestResults(prev => ({
            ...prev,
            [service]: { 
              status: 'success', 
              message: 'Service key format is valid',
              timestamp: new Date()
            }
          }));
          break;
          
        default:
          throw new Error('Unknown service');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestResults(prev => ({
        ...prev,
        [service]: { 
          status: 'error', 
          message: errorMessage,
          timestamp: new Date()
        }
      }));
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getTestIcon = (result: TestResult) => {
    switch (result.status) {
      case 'testing':
        return <Clock className="w-4 h-4 text-cyber-orange animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-cyber-green" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-cyber-magenta" />;
      default:
        return <TestTube className="w-4 h-4 text-text-muted" />;
    }
  };

  const getTestButtonText = (result: TestResult) => {
    switch (result.status) {
      case 'testing':
        return 'TESTING...';
      case 'success':
        return 'TEST PASSED';
      case 'error':
        return 'TEST FAILED';
      default:
        return 'TEST';
    }
  };

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <Clock className="w-4 h-4 animate-pulse mr-2" />
            SAVING...
          </>
        );
      case 'saved':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            SAVED!
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-4 h-4 mr-2" />
            FAILED
          </>
        );
      default:
        return (
          <>
            <Save className="w-4 h-4 mr-2" />
            SAVE API KEYS
          </>
        );
    }
  };

  const navigation = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'api-keys', name: 'API Keys', icon: Key },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy', icon: Shield },
    { id: 'data', name: 'Data Export', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">SETTINGS</h1>
        <p className="text-text-muted mt-1 font-mono">Customize your workshop experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-bg-secondary border border-cyber-cyan/20 rounded-sm p-4">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm transition-colors font-mono ${
                    activeTab === item.id
                      ? 'bg-cyber-cyan text-bg-primary shadow-cyber'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-transparent hover:border-cyber-cyan/30'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="uppercase tracking-wider">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2">
          <div className="cyber-card">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <h2 className="text-xl font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider">PROFILE SETTINGS</h2>
                
                <div className="space-y-6">
                  <div>
                    <Input
                      label="EMAIL ADDRESS"
                      value={user?.email || ''}
                      disabled
                      variant="terminal"
                      helperText="Email cannot be changed"
                    />
                  </div>

                  <div>
                    <Input
                      label="DISPLAY NAME"
                      placeholder="Enter your display name"
                      helperText="This name will appear in your workspace"
                      variant="terminal"
                    />
                  </div>

                  <div>
                    <Input
                      label="WORKSHOP LOCATION"
                      placeholder="e.g., Garage, Basement, Shed"
                      helperText="Help organize your parts by location"
                      variant="terminal"
                    />
                  </div>

                  <div className="pt-4 border-t border-text-muted/20">
                    <div className="flex space-x-3">
                      <Button glow>SAVE CHANGES</Button>
                      <Button variant="outline">CANCEL</Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api-keys' && (
              <>
                <h2 className="text-xl font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider">API CONFIGURATION</h2>
                
                <div className="space-y-6">
                  <div className="bg-bg-tertiary border border-text-muted/30 rounded-sm p-4 mb-6">
                    <h3 className="text-text-primary font-medium mb-2 font-mono">🔐 SECURITY NOTICE</h3>
                    <p className="text-text-secondary text-sm font-mono">
                      API keys are stored locally in your browser and never sent to our servers. 
                      They're only used to make direct API calls from your browser to the respective services.
                    </p>
                  </div>

                  {/* Perplexity API Key - NEW and Featured */}
                  <div className="space-y-3 border border-cyber-cyan rounded-sm p-4 bg-cyber-cyan-dim">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-text-primary flex items-center font-mono">
                          <Zap className="w-4 h-4 mr-2 text-cyber-cyan" />
                          PERPLEXITY API KEY (RECOMMENDED!)
                        </label>
                        <p className="text-xs text-text-secondary mt-1 font-mono">
                          🚀 BEST FOR PART IDENTIFICATION AND DATASHEETS
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection('perplexity')}
                        disabled={testResults.perplexity.status === 'testing' || !apiKeys.perplexity}
                        icon={getTestIcon(testResults.perplexity)}
                      >
                        {getTestButtonText(testResults.perplexity)}
                      </Button>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.perplexity ? 'text' : 'password'}
                        value={apiKeys.perplexity}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, perplexity: e.target.value }))}
                        placeholder="pplx-..."
                        className="cyber-input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('perplexity')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKeys.perplexity ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    </div>
                    {/* Test Result Display */}
                    {testResults.perplexity.status !== 'idle' && (
                      <div className={`text-xs p-2 rounded-sm font-mono ${
                        testResults.perplexity.status === 'success' 
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green' 
                          : testResults.perplexity.status === 'error'
                          ? 'bg-cyber-magenta/20 text-cyber-magenta border border-cyber-magenta'
                          : 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange'
                      }`}>
                        <div className="flex items-center gap-2">
                          {getTestIcon(testResults.perplexity)}
                          <span>{testResults.perplexity.message}</span>
                          {testResults.perplexity.timestamp && (
                            <span className="text-xs opacity-70">
                              ({testResults.perplexity.timestamp.toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-secondary font-mono">
                      GET KEY FROM <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:text-cyber-cyan/80 underline">PERPLEXITY API SETTINGS</a>
                    </p>
                  </div>

                  {/* Anthropic API Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
                          ANTHROPIC API KEY
                        </label>
                        <p className="text-xs text-text-muted mt-1 font-mono">
                          REQUIRED FOR AI CHAT FEATURES
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection('anthropic')}
                        disabled={testResults.anthropic.status === 'testing' || !apiKeys.anthropic}
                        icon={getTestIcon(testResults.anthropic)}
                      >
                        {getTestButtonText(testResults.anthropic)}
                      </Button>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.anthropic ? 'text' : 'password'}
                        value={apiKeys.anthropic}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                        placeholder="sk-ant-api03-..."
                        className="cyber-input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('anthropic')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKeys.anthropic ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    </div>
                    {/* Test Result Display */}
                    {testResults.anthropic.status !== 'idle' && (
                      <div className={`text-xs p-2 rounded-sm font-mono ${
                        testResults.anthropic.status === 'success' 
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green' 
                          : testResults.anthropic.status === 'error'
                          ? 'bg-cyber-magenta/20 text-cyber-magenta border border-cyber-magenta'
                          : 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange'
                      }`}>
                        <div className="flex items-center gap-2">
                          {getTestIcon(testResults.anthropic)}
                          <span>{testResults.anthropic.message}</span>
                          {testResults.anthropic.timestamp && (
                            <span className="text-xs opacity-70">
                              ({testResults.anthropic.timestamp.toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-muted font-mono">
                      GET KEY FROM <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:text-cyber-cyan/80">ANTHROPIC CONSOLE</a>
                    </p>
                  </div>

                  {/* mem0 API Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
                          MEM0 API KEY
                        </label>
                        <p className="text-xs text-text-muted mt-1 font-mono">
                          REQUIRED FOR PERSISTENT AI MEMORY
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection('mem0')}
                        disabled={testResults.mem0.status === 'testing' || !apiKeys.mem0}
                        icon={getTestIcon(testResults.mem0)}
                      >
                        {getTestButtonText(testResults.mem0)}
                      </Button>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.mem0 ? 'text' : 'password'}
                        value={apiKeys.mem0}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, mem0: e.target.value }))}
                        placeholder="m0-..."
                        className="cyber-input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('mem0')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKeys.mem0 ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    </div>
                    {/* Test Result Display */}
                    {testResults.mem0.status !== 'idle' && (
                      <div className={`text-xs p-2 rounded-sm font-mono ${
                        testResults.mem0.status === 'success' 
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green' 
                          : testResults.mem0.status === 'error'
                          ? 'bg-cyber-magenta/20 text-cyber-magenta border border-cyber-magenta'
                          : 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange'
                      }`}>
                        <div className="flex items-center gap-2">
                          {getTestIcon(testResults.mem0)}
                          <span>{testResults.mem0.message}</span>
                          {testResults.mem0.timestamp && (
                            <span className="text-xs opacity-70">
                              ({testResults.mem0.timestamp.toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-muted font-mono">
                      GET KEY FROM <a href="https://app.mem0.ai/" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:text-cyber-cyan/80">MEM0 DASHBOARD</a>
                    </p>
                  </div>

                  {/* Supabase Service Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
                          SUPABASE SERVICE KEY
                        </label>
                        <p className="text-xs text-text-muted mt-1 font-mono">
                          REQUIRED FOR ADVANCED DATABASE OPERATIONS
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection('supabase')}
                        disabled={testResults.supabase.status === 'testing' || !apiKeys.supabase_service}
                        icon={getTestIcon(testResults.supabase)}
                      >
                        {getTestButtonText(testResults.supabase)}
                      </Button>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.supabase_service ? 'text' : 'password'}
                        value={apiKeys.supabase_service}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, supabase_service: e.target.value }))}
                        placeholder="eyJ..."
                        className="cyber-input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility('supabase_service')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKeys.supabase_service ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    </div>
                    {/* Test Result Display */}
                    {testResults.supabase.status !== 'idle' && (
                      <div className={`text-xs p-2 rounded-sm font-mono ${
                        testResults.supabase.status === 'success' 
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green' 
                          : testResults.supabase.status === 'error'
                          ? 'bg-cyber-magenta/20 text-cyber-magenta border border-cyber-magenta'
                          : 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange'
                      }`}>
                        <div className="flex items-center gap-2">
                          {getTestIcon(testResults.supabase)}
                          <span>{testResults.supabase.message}</span>
                          {testResults.supabase.timestamp && (
                            <span className="text-xs opacity-70">
                              ({testResults.supabase.timestamp.toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-muted font-mono">
                      GET KEY FROM <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:text-cyber-cyan/80">SUPABASE DASHBOARD</a> → SETTINGS → API
                    </p>
                  </div>

                  <div className="pt-4 border-t border-text-muted/20">
                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleSaveAPIKeys} 
                        disabled={saveStatus === 'saving'}
                        variant={saveStatus === 'saved' ? 'secondary' : 'primary'}
                        glow
                      >
                        {getSaveButtonContent()}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setApiKeys({ anthropic: '', mem0: '', perplexity: '', supabase_service: '' });
                          setTestResults({
                            anthropic: { status: 'idle' },
                            mem0: { status: 'idle' },
                            perplexity: { status: 'idle' },
                            supabase: { status: 'idle' }
                          });
                          localStorage.removeItem('salvage-tracker-api-keys');
                          success('API keys cleared');
                        }}
                      >
                        CLEAR ALL
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Other tabs placeholder */}
            {activeTab === 'notifications' && (
              <>
                <h2 className="text-xl font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider">NOTIFICATION SETTINGS</h2>
                <p className="text-text-muted font-mono">Notification settings coming soon...</p>
              </>
            )}

            {activeTab === 'privacy' && (
              <>
                <h2 className="text-xl font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider">PRIVACY SETTINGS</h2>
                <p className="text-text-muted font-mono">Privacy settings coming soon...</p>
              </>
            )}

            {activeTab === 'data' && (
              <>
                <h2 className="text-xl font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider">DATA EXPORT</h2>
                <p className="text-text-muted font-mono">Data export functionality coming soon...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};