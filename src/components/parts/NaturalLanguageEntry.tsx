import React, { useState } from 'react';
import { MessageSquare, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useCreatePart } from '@/hooks/api/useParts';
import { useToast } from '@/hooks/useToast';

interface NaturalLanguageEntryProps {
  onSuccess?: () => void;
}

export const NaturalLanguageEntry: React.FC<NaturalLanguageEntryProps> = ({ onSuccess }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createPart = useCreatePart();
  const { success, error } = useToast();

  const handleNaturalLanguageEntry = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      // First, parse the natural language input
      const parseResponse = await fetch('/.netlify/functions/ai-research-part', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('@/lib/supabase')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          description: input,
          mode: 'parse'
        })
      });

      const parseData = await parseResponse.json();
      
      if (parseData.error) {
        throw new Error(parseData.error);
      }

      const { parsed } = parseData;

      if (parsed.action === 'add_part') {
        // Research the part quickly
        const researchResponse = await fetch('/.netlify/functions/ai-research-part', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await import('@/lib/supabase')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`
          },
          body: JSON.stringify({
            description: parsed.part_description,
            mode: 'quick'
          })
        });

        const researchData = await researchResponse.json();
        
        if (researchData.error) {
          throw new Error(researchData.error);
        }

        const { research } = researchData;

        // Create the part with AI-enhanced data
        await createPart.mutateAsync({
          name: research.name,
          description: research.description,
          category: research.category,
          quantity: parsed.quantity || research.typical_quantity || 1,
          location: parsed.location || null,
          value_estimate: research.estimated_value,
          ai_identified: true,
          metadata: {
            confidence: research.confidence,
            original_input: input,
            parsed_intent: parsed
          }
        });

        success(`Added ${research.name} to inventory!`);
        setInput('');
        onSuccess?.();
      } else {
        // Handle other actions (search, identify) in the future
        error('Action not yet supported', `"${parsed.action}" will be available in future updates`);
      }
    } catch (err) {
      error('Processing failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleInputs = [
    "Add 5 Arduino Nanos to drawer A",
    "I need 10 red LEDs for my project",
    "Add some 220 ohm resistors to parts bin",
    "Put 3 ESP32 boards in the microcontroller section",
    "Add a servo motor SG90 to my inventory"
  ];

  return (
    <div className="bg-garage-800 border border-garage-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-5 h-5 text-electric-400" />
        <h3 className="text-lg font-semibold text-garage-100">Natural Language Entry</h3>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Tell me what part to add: 'Add 5 Arduino Nanos to drawer A'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNaturalLanguageEntry()}
            className="flex-1"
          />
          <Button
            onClick={handleNaturalLanguageEntry}
            loading={isProcessing}
            disabled={!input.trim()}
            icon={<Zap className="w-4 h-4" />}
          >
            Process
          </Button>
        </div>

        {/* Example inputs */}
        <div>
          <p className="text-sm text-garage-400 mb-2">Try these examples:</p>
          <div className="space-y-1">
            {exampleInputs.map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-garage-700 text-garage-300 rounded hover:bg-garage-600 transition-colors"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-garage-500 bg-garage-700 p-3 rounded">
          <strong>Pro tip:</strong> Be specific! Include quantities, locations, and part details. 
          The AI will research the part and fill in specifications, images, and pricing automatically.
        </div>
      </div>
    </div>
  );
};