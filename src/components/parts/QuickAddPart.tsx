import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import { useCreatePart, useParts } from '../../hooks/api/useParts';
import { Loader2, Sparkles, MessageSquare, CheckCircle, Camera } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AIPartIdentifier } from './AIPartIdentifier';

interface QuickAddPartProps {
  onSuccess?: () => void;
}

export const QuickAddPart: React.FC<QuickAddPartProps> = ({ onSuccess }) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAddedPart, setLastAddedPart] = useState<string | null>(null);
  const [showAIIdentifier, setShowAIIdentifier] = useState(false);
  const { success, error } = useToast();
  const createPart = useCreatePart();
  const queryClient = useQueryClient();

  const handleNaturalLanguageEntry = async () => {
    if (!naturalLanguageInput.trim()) {
      error('Input required', 'Please describe the part you want to add');
      return;
    }

    setIsProcessing(true);
    setLastAddedPart(null);
    
    try {
      console.log('Starting AI research for:', naturalLanguageInput.trim());
      
      // Use the correct API method
      const response = await api.aiResearchPart({
        description: naturalLanguageInput.trim(),
        mode: 'quick'
      });

      console.log('AI research response:', response);

      const research = response.research;

      if (research) {
        console.log('Creating part with research data:', research);
        
        // Create the part directly with AI-enhanced data
        const partData = {
          name: research.name,
          description: research.description,
          category: research.category,
          subcategory: research.subcategory,
          quantity: research.typical_quantity || 1,
          location: null,
          source: null,
          tags: research.tags || [],
          images: [],
          pinout_diagram: null,
          datasheet_url: null,
          value_estimate: research.estimated_value,
          is_available: true,
          ai_identified: true,
          original_device: null,
          compatible_with: [],
          notes: null,
          metadata: {
            specifications: research.specifications || {},
            confidence: research.confidence,
            original_input: naturalLanguageInput.trim()
          }
        };
        
        console.log('Sending part data to API:', partData);
        
        const result = await createPart.mutateAsync(partData);

        console.log('Part creation result:', result);
        
        setLastAddedPart(research.name);
        setNaturalLanguageInput('');
        
        // Force refresh the parts list
        queryClient.invalidateQueries({ queryKey: ['parts'] });
        queryClient.removeQueries({ queryKey: ['parts'] }); // Clear cache completely
        
        // Force immediate refetch after a short delay
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['parts'] });
        }, 200);
        
        onSuccess?.();
      } else {
        error('Processing failed', 'Unable to process the part description');
      }
    } catch (err) {
      console.error('AI Entry Error:', err);
      
      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          error('Connection Error', 'Unable to connect to AI service. Please check your internet connection and try again.');
        } else if (err.message.includes('API key')) {
          error('Configuration Error', 'AI service is not properly configured. Please check your API keys in Settings.');
        } else {
          error('AI processing failed', err.message);
        }
      } else {
        error('AI processing failed', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
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
                    PROCESSING...
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