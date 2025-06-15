import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import { useCreatePart, useParts } from '../../hooks/api/useParts';
import { Loader2, Sparkles, MessageSquare, CheckCircle, Camera, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AIPartIdentifier } from './AIPartIdentifier';

interface QuickAddPartProps {
  onSuccess?: () => void;
}

interface AIResearchResult {
  success: boolean;
  research?: any;
  error?: string;
  details?: string;
  fallback?: any;
}

export const QuickAddPart: React.FC<QuickAddPartProps> = ({ onSuccess }) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAddedPart, setLastAddedPart] = useState<string | null>(null);
  const [showAIIdentifier, setShowAIIdentifier] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  
  const { success, error, warning } = useToast();
  const createPart = useCreatePart();
  const queryClient = useQueryClient();

  const handleNaturalLanguageEntry = async () => {
    if (!naturalLanguageInput.trim()) {
      error('Input required', 'Please describe the part you want to add');
      return;
    }

    setIsProcessing(true);
    setLastAddedPart(null);
    setProcessingStage('Analyzing with AI...');
    
    try {
      console.log('🚀 Starting AI research for:', naturalLanguageInput.trim());
      
      // Call the enhanced AI research API
      const response: AIResearchResult = await api.aiResearchPart({
        description: naturalLanguageInput.trim(),
        mode: 'quick'
      });

      console.log('🎯 AI research response:', response);

      // Handle different response scenarios
      if (!response.success) {
        // AI research failed completely
        if (response.error) {
          console.error('❌ AI research failed:', response.error);
          
          if (response.fallback) {
            // Use fallback data but warn user
            setProcessingStage('AI failed, using fallback data...');
            await createPartFromData(response.fallback, true);
            warning(
              'AI research partially failed', 
              'Created part with basic info. Please review and update details manually.'
            );
          } else {
            // Complete failure - create basic part
            setProcessingStage('Creating basic part entry...');
            await createBasicPart(naturalLanguageInput.trim());
            warning(
              'AI research failed', 
              'Created basic part entry. Please add details manually in the parts section.'
            );
          }
        } else {
          throw new Error('Unknown AI research error');
        }
      } else if (response.research) {
        // AI research succeeded
        setProcessingStage('Creating part from AI data...');
        await createPartFromData(response.research, false);
        success('Part identified and added!', `Successfully added "${response.research.name}" to your inventory`);
      } else {
        throw new Error('Invalid response format from AI research');
      }

    } catch (err) {
      console.error('💥 Natural language entry error:', err);
      
      // Provide helpful error messages
      if (err instanceof Error) {
        if (err.message.includes('DEVELOPMENT ERROR') || err.message.includes('Wrong server')) {
          error('Development Server Error', 'Please use http://localhost:3000 and run "npm run dev"');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          error('Connection Error', 'Unable to connect to AI service. Check your internet connection.');
        } else if (err.message.includes('API key') || err.message.includes('not configured')) {
          error('Configuration Error', 'AI service not configured. Please check your API keys in Settings.');
        } else {
          error('AI processing failed', err.message);
        }
      } else {
        error('AI processing failed', 'An unexpected error occurred. Please try again.');
      }
      
      // Create basic part as final fallback
      try {
        setProcessingStage('Creating basic part as fallback...');
        await createBasicPart(naturalLanguageInput.trim());
        warning('Created basic part', 'AI failed, but created a basic part entry for you to complete manually.');
      } catch (fallbackError) {
        console.error('💥 Even basic part creation failed:', fallbackError);
        error('Failed to create part', 'Unable to create part. Please try again or use the manual form.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Create part from AI research data
  const createPartFromData = async (researchData: any, isPartialData: boolean) => {
    console.log('📦 Creating part from research data:', researchData);

    const partData = {
      name: researchData.name || 'Unknown Component',
      description: researchData.description || '',
      category: researchData.category || null,
      subcategory: researchData.subcategory || null,
      quantity: researchData.typical_quantity || 1,
      location: null,
      source: null,
      tags: researchData.tags || [],
      images: researchData.image_urls || [],
      pinout_diagram: null,
      datasheet_url: researchData.datasheet_url || null,
      value_estimate: researchData.estimated_value || null,
      is_available: true,
      ai_identified: true,
      original_device: null,
      compatible_with: [],
      notes: isPartialData ? 'AI research partially failed - please verify details' : null,
      metadata: {
        specifications: researchData.specifications || {},
        confidence: researchData.confidence || 0.5,
        original_input: naturalLanguageInput.trim(),
        ai_metadata: researchData.ai_metadata || {},
        manufacturer: researchData.manufacturer,
        part_number: researchData.part_number,
        safety_warnings: researchData.safety_warnings || [],
        common_uses: researchData.common_uses || [],
        current_price_usd: researchData.current_price_usd,
        partial_data: isPartialData
      }
    };
    
    console.log('📋 Final part data for creation:', partData);
    
    const result = await createPart.mutateAsync(partData);
    setLastAddedPart(researchData.name);
    setNaturalLanguageInput('');
    
    // Force refresh the parts list
    queryClient.invalidateQueries({ queryKey: ['parts'] });
    queryClient.removeQueries({ queryKey: ['parts'] });
    
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['parts'] });
    }, 200);
    
    onSuccess?.();
    return result;
  };

  // Create basic part when AI completely fails
  const createBasicPart = async (inputText: string) => {
    const basicPartData = {
      name: inputText,
      description: 'Added via natural language input - details need to be filled in',
      category: null,
      subcategory: null,
      quantity: 1,
      location: null,
      source: null,
      tags: ['needs-research'],
      images: [],
      pinout_diagram: null,
      datasheet_url: null,
      value_estimate: null,
      is_available: true,
      ai_identified: false,
      original_device: null,
      compatible_with: [],
      notes: 'AI research failed - please add details manually',
      metadata: {
        original_input: inputText,
        needs_manual_completion: true,
        created_via: 'natural_language_fallback'
      }
    };

    const result = await createPart.mutateAsync(basicPartData);
    setLastAddedPart(inputText);
    setNaturalLanguageInput('');
    
    // Force refresh
    queryClient.invalidateQueries({ queryKey: ['parts'] });
    onSuccess?.();
    return result;
  };

  return (
    <>
      <div className="cyber-card">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyber-cyan" />
          <h3 className="text-lg font-semibold text-text-primary font-mono uppercase tracking-wider">Smart Part Entry</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
            <Sparkles className="w-4 h-4" />
            <span>Describe any part in natural language or identify from photos</span>
          </div>

          {/* Success Message */}
          {lastAddedPart && !isProcessing && (
            <div className="p-3 bg-cyber-green/20 border border-cyber-green rounded-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyber-green" />
                <span className="text-cyber-green font-medium font-mono">
                  Successfully added "{lastAddedPart}" to your inventory!
                </span>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && processingStage && (
            <div className="p-3 bg-cyber-cyan/20 border border-cyber-cyan rounded-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-cyber-cyan animate-spin" />
                <span className="text-cyber-cyan font-medium font-mono">{processingStage}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <textarea
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              placeholder="e.g., 'Arduino Mega 2560 from old robot project' or 'Red LED, 5mm, from broken Christmas lights'"
              className="block w-full px-3 py-2 bg-bg-primary border border-text-muted/30 rounded-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:border-cyber-cyan min-h-[80px] resize-none font-mono"
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleNaturalLanguageEntry();
                }
              }}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleNaturalLanguageEntry}
                disabled={isProcessing || !naturalLanguageInput.trim()}
                className="flex-1"
                glow
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {processingStage || 'PROCESSING...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    ADD PART WITH AI
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowAIIdentifier(true)}
                disabled={isProcessing}
                icon={<Camera className="w-4 h-4" />}
                glow
              >
                IDENTIFY FROM PHOTO
              </Button>
            </div>
            
            <div className="text-xs text-text-muted font-mono">
              Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to submit
            </div>

            {/* Example inputs */}
            <div>
              <p className="text-sm text-text-secondary mb-2 font-mono">TRY THESE EXAMPLES:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Arduino Mega 2560",
                  "Red LED 5mm",
                  "10k resistor",
                  "ESP32 board",
                  "Servo motor SG90"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setNaturalLanguageInput(example)}
                    className="px-3 py-1 text-sm bg-bg-secondary border border-text-muted/30 text-text-secondary rounded-sm hover:bg-bg-tertiary hover:border-cyber-cyan/30 transition-colors font-mono"
                    disabled={isProcessing}
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>

            {/* API Status Warning */}
            <div className="bg-bg-tertiary border border-text-muted/30 rounded-sm p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cyber-orange flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary font-mono">
                  <p className="font-medium text-text-primary mb-1">AI FEATURES REQUIRE API KEYS</p>
                  <p>Configure your Anthropic and Perplexity API keys in Settings for full functionality.</p>
                  <p className="mt-1 text-cyber-cyan">Without keys: Basic part entries will be created for manual completion.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Part Identifier Modal */}
      <AIPartIdentifier
        isOpen={showAIIdentifier}
        onClose={() => setShowAIIdentifier(false)}
        onPartAdded={() => {
          setShowAIIdentifier(false);
          onSuccess?.();
        }}
      />
    </>
  );
};