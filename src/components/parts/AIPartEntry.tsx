import React, { useState } from 'react';
import { Brain, Mic, Search, Zap, Package, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useCreatePart } from '@/hooks/api/useParts';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';

interface AIPartEntryProps {
  onSuccess?: () => void;
}

interface ResearchResult {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  manufacturer?: string;
  part_number?: string;
  specifications: Record<string, any>;
  datasheet_url?: string;
  image_urls: string[];
  typical_quantity: number;
  estimated_value?: number;
  tags: string[];
  safety_warnings: string[];
  common_uses: string[];
  compatible_parts: string[];
  confidence: number;
}

export const AIPartEntry: React.FC<AIPartEntryProps> = ({ onSuccess }) => {
  const [input, setInput] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  
  const createPart = useCreatePart();
  const { success, error } = useToast();

  const handleResearch = async () => {
    if (!input.trim()) return;

    setIsResearching(true);
    try {
      const data = await api.aiResearchPart({
        description: input,
        mode: 'research'
      });

      setResearch(data.research);
      success('Part research completed!');
    } catch (err) {
      error('Research failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsResearching(false);
    }
  };

  const handleAddPart = async () => {
    if (!research) return;

    try {
      await createPart.mutateAsync({
        name: research.name,
        description: research.description,
        category: research.category,
        subcategory: research.subcategory,
        quantity: research.typical_quantity,
        specs: research.specifications,
        tags: research.tags,
        images: research.image_urls,
        datasheet_url: research.datasheet_url,
        value_estimate: research.estimated_value,
        ai_identified: true,
        metadata: {
          manufacturer: research.manufacturer,
          part_number: research.part_number,
          confidence: research.confidence,
          safety_warnings: research.safety_warnings,
          common_uses: research.common_uses,
          compatible_parts: research.compatible_parts
        }
      });

      setInput('');
      setResearch(null);
      onSuccess?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onerror = () => {
        error('Voice recognition failed', 'Please try again or use text input');
      };

      recognition.start();
    } else {
      error('Voice input not supported', 'Please use text input instead');
    }
  };

  return (
    <div className="bg-garage-800 border border-garage-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-electric-400" />
          <h3 className="text-lg font-semibold text-garage-100">AI Part Research</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={mode === 'text' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('text')}
          >
            Text
          </Button>
          <Button
            variant={mode === 'voice' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('voice')}
            icon={<Mic className="w-3 h-3" />}
          >
            Voice
          </Button>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Describe the part: 'Arduino Nano microcontroller' or 'Small 8-pin IC with 555 marking'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
            className="flex-1"
          />
          {mode === 'voice' && (
            <Button
              variant="outline"
              onClick={handleVoiceInput}
              icon={<Mic className="w-4 h-4" />}
            />
          )}
          <Button
            onClick={handleResearch}
            loading={isResearching}
            disabled={!input.trim()}
            icon={<Search className="w-4 h-4" />}
          >
            Research
          </Button>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2">
          {[
            "Arduino Nano clone",
            "555 timer IC",
            "Red LED 5mm",
            "10kΩ resistor",
            "ESP32 development board"
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="px-3 py-1 text-sm bg-garage-700 text-garage-300 rounded hover:bg-garage-600 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Research Results */}
      {research && (
        <div className="mt-6 space-y-4">
          <div className="border-t border-garage-600 pt-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-xl font-semibold text-garage-100">{research.name}</h4>
                <p className="text-garage-400">{research.category} • {research.manufacturer}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-garage-500">Confidence: </span>
                  <div className="w-20 h-2 bg-garage-700 rounded-full ml-2">
                    <div 
                      className="h-full bg-electric-500 rounded-full"
                      style={{ width: `${research.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-garage-400 ml-2">
                    {Math.round(research.confidence * 100)}%
                  </span>
                </div>
              </div>
              
              {research.estimated_value && (
                <div className="text-right">
                  <div className="text-lg font-semibold text-garage-100">
                    ${research.estimated_value.toFixed(2)}
                  </div>
                  <div className="text-sm text-garage-400">Estimated value</div>
                </div>
              )}
            </div>

            {/* Images */}
            {research.image_urls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {research.image_urls.slice(0, 4).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${research.name} ${index + 1}`}
                    className="w-full h-20 object-cover rounded bg-garage-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/150x150/1e293b/60a5fa?text=${encodeURIComponent(research.name)}`;
                    }}
                  />
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-garage-300 mb-4">{research.description}</p>

            {/* Specifications */}
            {Object.keys(research.specifications).length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-garage-200 mb-2">Specifications</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(research.specifications).map(([key, value]) => (
                    <div key={key} className="bg-garage-700 p-2 rounded">
                      <div className="text-xs text-garage-400 uppercase">{key}</div>
                      <div className="text-sm text-garage-200">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Warnings */}
            {research.safety_warnings.length > 0 && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-red-300">Safety Warnings</span>
                </div>
                <ul className="text-sm text-red-200 space-y-1">
                  {research.safety_warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {research.tags.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-garage-200 mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {research.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-garage-700 text-garage-300 text-sm rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-garage-600">
              <div className="flex space-x-2">
                {research.datasheet_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(research.datasheet_url, '_blank')}
                    icon={<ExternalLink className="w-3 h-3" />}
                  >
                    Datasheet
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResearch(null)}
                >
                  Research Again
                </Button>
              </div>
              
              <Button
                onClick={handleAddPart}
                loading={createPart.isPending}
                icon={<Package className="w-4 h-4" />}
              >
                Add to Inventory
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};