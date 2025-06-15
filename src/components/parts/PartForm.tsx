import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useCreatePart, useUpdatePart } from '@/hooks/api/useParts';

interface PartFormProps {
  isOpen: boolean;
  onClose: () => void;
  part?: any; // For editing existing parts
}

export const PartForm: React.FC<PartFormProps> = ({ isOpen, onClose, part }) => {
  const [formData, setFormData] = useState({
    name: part?.name || '',
    description: part?.description || '',
    category: part?.category || '',
    subcategory: part?.subcategory || '',
    quantity: part?.quantity || 1,
    location: part?.location || '',
    source: part?.source || '',
    tags: part?.tags?.join(', ') || '',
    pinout_diagram: part?.pinout_diagram || '',
    datasheet_url: part?.datasheet_url || '',
    value_estimate: part?.value_estimate || '',
    is_available: part?.is_available !== undefined ? part.is_available : true,
    notes: part?.notes || ''
  });

  const createPart = useCreatePart();
  const updatePart = useUpdatePart();

  const isEditing = !!part;
  const isLoading = createPart.isPending || updatePart.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const partData = {
      ...formData,
      quantity: parseInt(formData.quantity.toString()) || 1,
      value_estimate: formData.value_estimate ? parseFloat(formData.value_estimate.toString()) : null,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    };

    try {
      if (isEditing) {
        await updatePart.mutateAsync({ id: part.id, updates: partData });
      } else {
        await createPart.mutateAsync(partData);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'EDIT PART' : 'ADD NEW PART'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="PART NAME"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="e.g., Arduino Nano Clone"
            glow
          />
          
          <Input
            label="CATEGORY"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder="e.g., Microcontroller"
          />
          
          <Input
            label="SUBCATEGORY"
            value={formData.subcategory}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            placeholder="e.g., Development Board"
          />
          
          <Input
            label="QUANTITY"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            min="0"
          />
          
          <Input
            label="LOCATION"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g., Drawer A-1"
          />
          
          <Input
            label="SOURCE"
            value={formData.source}
            onChange={(e) => handleChange('source', e.target.value)}
            placeholder="e.g., Old printer"
          />
          
          <Input
            label="VALUE ESTIMATE ($)"
            type="number"
            step="0.01"
            value={formData.value_estimate}
            onChange={(e) => handleChange('value_estimate', e.target.value)}
            placeholder="0.00"
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => handleChange('is_available', e.target.checked)}
              className="w-4 h-4 text-cyber-cyan bg-bg-secondary border-text-muted/30 rounded focus:ring-cyber-cyan"
            />
            <label htmlFor="is_available" className="text-sm text-text-secondary font-mono uppercase tracking-wider">
              Available for use
            </label>
          </div>
        </div>

        <Input
          label="DESCRIPTION"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of the part..."
        />

        <Input
          label="TAGS"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          placeholder="arduino, 5v, usb (comma separated)"
          helperText="Separate tags with commas"
        />

        <Input
          label="DATASHEET URL"
          type="url"
          value={formData.datasheet_url}
          onChange={(e) => handleChange('datasheet_url', e.target.value)}
          placeholder="https://..."
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-1">
            NOTES
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 bg-bg-primary border border-text-muted/30 rounded-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:border-cyber-cyan font-mono"
            placeholder="Additional notes about this part..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-text-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            CANCEL
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            glow
          >
            {isEditing ? 'UPDATE PART' : 'ADD PART'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};