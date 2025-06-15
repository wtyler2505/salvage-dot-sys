import React from 'react';
import { Package, Edit, Trash2, MapPin, Tag, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ContextMenu } from '@/components/common/ContextMenu';
import { OptimizedImage, useImagePlaceholder } from '@/components/common/OptimizedImage';
import { useToast } from '@/hooks/useToast';

interface PartCardProps {
  part: any;
  onEdit: (part: any) => void;
  onDelete: (id: string) => void;
}

export const PartCard: React.FC<PartCardProps> = ({ part, onEdit, onDelete }) => {
  const { success } = useToast();
  
  // Generate placeholder image for this part
  const placeholder = useImagePlaceholder(part.name, 300, 300);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this part?')) {
      onDelete(part.id);
    }
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(part.name);
    success('Part name copied to clipboard');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(part.id);
    success('Part ID copied to clipboard');
  };

  const contextMenuItems = [
    {
      id: 'edit',
      label: 'Edit Part',
      icon: Edit,
      onClick: () => onEdit(part)
    },
    {
      id: 'copy-name',
      label: 'Copy Name',
      icon: Copy,
      onClick: handleCopyName
    },
    {
      id: 'copy-id',
      label: 'Copy ID',
      icon: Copy,
      onClick: handleCopyId
    },
    ...(part.datasheet_url ? [{
      id: 'datasheet',
      label: 'View Datasheet',
      icon: ExternalLink,
      onClick: () => window.open(part.datasheet_url, '_blank')
    }] : []),
    {
      id: 'separator',
      separator: true,
      label: '',
      onClick: () => {}
    },
    {
      id: 'delete',
      label: 'Delete Part',
      icon: Trash2,
      onClick: handleDelete,
      destructive: true
    }
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div className="cyber-card part-card">
        {/* Part Image or Icon */}
        <div className="aspect-square bg-bg-tertiary rounded-sm mb-3 flex items-center justify-center overflow-hidden">
          {part.images && part.images.length > 0 ? (
            <OptimizedImage
              src={part.images[0]}
              alt={part.name}
              className="w-full h-full object-cover rounded-sm"
              fallback={placeholder}
              placeholder={
                <div className="w-full h-full bg-bg-tertiary rounded-sm flex items-center justify-center">
                  <Package className="w-8 h-8 text-text-muted" />
                </div>
              }
            />
          ) : (
            <Package className="w-8 h-8 text-text-muted" />
          )}
        </div>

        {/* Part Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-text-primary font-mono line-clamp-2">{part.name}</h3>
          
          {part.category && (
            <p className="text-sm text-text-muted font-mono">{part.category}</p>
          )}

          {part.description && (
            <p className="text-sm text-text-secondary line-clamp-2">{part.description}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary font-mono">QTY: {part.quantity || 0}</span>
            <span className={`px-2 py-1 rounded-sm text-xs ${
              part.is_available 
                ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green' 
                : 'bg-cyber-magenta/20 text-cyber-magenta border border-cyber-magenta'
            }`}>
              {part.is_available ? 'AVAILABLE' : 'USED'}
            </span>
          </div>

          {/* Location */}
          {part.location && (
            <div className="flex items-center text-sm text-text-muted font-mono">
              <MapPin className="w-3 h-3 mr-1" />
              {part.location}
            </div>
          )}

          {/* Tags */}
          {part.tags && part.tags.length > 0 && (
            <div className="flex items-center text-sm text-text-muted">
              <Tag className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate font-mono">{part.tags.slice(0, 2).join(', ')}</span>
              {part.tags.length > 2 && <span>...</span>}
            </div>
          )}

          {/* Value */}
          {part.value_estimate && (
            <div className="text-sm text-text-secondary font-mono">
              ${parseFloat(part.value_estimate).toFixed(2)}
            </div>
          )}
        </div>

        {/* Actions - Click handlers need stopPropagation to prevent context menu trigger */}
        <div className="mt-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(part);
            }}
            icon={<Edit className="w-3 h-3" />}
            className="flex-1"
          >
            EDIT
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            icon={<Trash2 className="w-3 h-3" />}
          >
            DELETE
          </Button>
        </div>
      </div>
    </ContextMenu>
  );
};