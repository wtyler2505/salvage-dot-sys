import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useCreatePart } from '@/hooks/api/useParts';

interface SmartPartSuggestionsProps {
  searchQuery: string;
  onPartAdded?: () => void;
}

export const SmartPartSuggestions: React.FC<SmartPartSuggestionsProps> = ({ 
  searchQuery, 
  onPartAdded 
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const createPart = useCreatePart();

  // Smart suggestions based on common electronics parts
  const commonParts = [
    { name: 'Arduino Nano', category: 'Microcontroller', typical_qty: 2 },
    { name: 'Breadboard 400 tie', category: 'Prototyping', typical_qty: 1 },
    { name: 'Jumper Wires M-M', category: 'Wiring', typical_qty: 40 },
    { name: 'LED Red 5mm', category: 'LED', typical_qty: 10 },
    { name: 'LED Blue 5mm', category: 'LED', typical_qty: 10 },
    { name: 'LED Green 5mm', category: 'LED', typical_qty: 10 },
    { name: 'Resistor 220Ω', category: 'Resistor', typical_qty: 20 },
    { name: 'Resistor 1kΩ', category: 'Resistor', typical_qty: 20 },
    { name: 'Resistor 10kΩ', category: 'Resistor', typical_qty: 20 },
    { name: 'Capacitor 100µF', category: 'Capacitor', typical_qty: 5 },
    { name: 'Servo SG90', category: 'Motor', typical_qty: 2 },
    { name: 'Ultrasonic HC-SR04', category: 'Sensor', typical_qty: 1 },
    { name: 'ESP32 DevKit', category: 'Microcontroller', typical_qty: 1 },
    { name: 'ESP8266 NodeMCU', category: 'Microcontroller', typical_qty: 1 },
    { name: 'Raspberry Pi 4', category: 'Computer', typical_qty: 1 },
    { name: 'Potentiometer 10k', category: 'Variable Resistor', typical_qty: 5 },
    { name: 'Push Button', category: 'Switch', typical_qty: 10 },
    { name: 'Buzzer 5V', category: 'Audio', typical_qty: 2 }
  ];

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = commonParts.filter(part =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleAddSuggestion = async (suggestion: any) => {
    try {
      await createPart.mutateAsync({
        name: suggestion.name,
        category: suggestion.category,
        quantity: suggestion.typical_qty,
        is_available: true
      });
      onPartAdded?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-garage-800 border border-garage-700 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Lightbulb className="w-4 h-4 text-electric-400" />
        <span className="text-sm font-medium text-garage-300">Quick Add Suggestions</span>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-garage-700 rounded">
            <div>
              <span className="text-garage-100 font-medium">{suggestion.name}</span>
              <span className="text-garage-400 text-sm ml-2">({suggestion.category})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddSuggestion(suggestion)}
              icon={<Plus className="w-3 h-3" />}
            >
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};