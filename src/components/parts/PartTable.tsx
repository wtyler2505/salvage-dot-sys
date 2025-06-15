import React from 'react';
import { Edit, Trash2, Package, ExternalLink, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ContextMenu } from '@/components/common/ContextMenu';
import { LoadingOverlay, SkeletonTable } from '@/components/common/LoadingStates';
import { useToast } from '@/hooks/useToast';

interface PartTableProps {
  parts: any[];
  onEdit: (part: any) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const PartTable: React.FC<PartTableProps> = ({ parts, onEdit, onDelete, isLoading = false }) => {
  const { success } = useToast();

  const handleDelete = (part: any) => {
    if (window.confirm(`Are you sure you want to delete "${part.name}"?`)) {
      onDelete(part.id);
    }
  };

  const handleCopyName = (part: any) => {
    navigator.clipboard.writeText(part.name);
    success('Part name copied to clipboard');
  };

  const getContextMenuItems = (part: any) => [
    {
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: () => onEdit(part)
    },
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
      onClick: () => handleCopyName(part)
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
      onClick: () => handleDelete(part),
      destructive: true
    }
  ];

  if (isLoading) {
    return <SkeletonTable rows={8} />;
  }

  if (parts.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary font-mono mb-2">NO PARTS FOUND</h3>
        <p className="text-text-muted font-mono">Add your first part to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="cyber-table w-full">
        <thead>
          <tr className="border-b border-cyber-cyan/30">
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Name</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Category</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Quantity</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Location</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Value</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium font-mono uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <ContextMenu key={part.id} items={getContextMenuItems(part)}>
              <tr className="border-b border-text-muted/20 hover:bg-cyber-cyan-dim cursor-pointer">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-text-primary font-mono">{part.name}</div>
                    {part.description && (
                      <div className="text-sm text-text-muted line-clamp-1">
                        {part.description}
                      </div>
                    )}
                    {part.tags && part.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {part.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs bg-bg-tertiary text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                        {part.tags.length > 3 && (
                          <span className="text-xs text-text-muted">+{part.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  <div className="font-mono">{part.category || '-'}</div>
                  {part.subcategory && (
                    <div className="text-sm text-text-muted">{part.subcategory}</div>
                  )}
                </td>
                <td className="py-3 px-4 text-text-secondary font-mono">{part.quantity || 0}</td>
                <td className="py-3 px-4 text-text-secondary font-mono">{part.location || '-'}</td>
                <td className="py-3 px-4 text-text-secondary font-mono">
                  {part.value_estimate ? `$${parseFloat(part.value_estimate).toFixed(2)}` : '-'}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-mono ${
                    part.is_available 
                      ? 'bg-cyber-green/20 border border-cyber-green text-cyber-green' 
                      : 'bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta'
                  }`}>
                    {part.is_available ? 'AVAILABLE' : 'USED'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    {part.datasheet_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(part.datasheet_url, '_blank');
                        }}
                        icon={<ExternalLink className="w-3 h-3" />}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(part);
                      }}
                      icon={<Edit className="w-3 h-3" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(part);
                      }}
                      icon={<Trash2 className="w-3 h-3" />}
                      className="text-cyber-magenta hover:text-cyber-magenta"
                    />
                  </div>
                </td>
              </tr>
            </ContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
};