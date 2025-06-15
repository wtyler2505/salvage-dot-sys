import React, { useState } from 'react';
import { Package, Plus, Grid, List, Filter, Search, Upload, Brain, MessageSquare, RefreshCw, Camera } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { LoadingOverlay, SkeletonStats } from '@/components/common/LoadingStates';
import { useUIStore } from '@/stores/uiStore';
import { useParts, useDeletePart } from '@/hooks/api/useParts';
import { PartForm } from '@/components/parts/PartForm';
import { PartCard } from '@/components/parts/PartCard';
import { PartTable } from '@/components/parts/PartTable';
import { QuickAddPart } from '@/components/parts/QuickAddPart';
import { BulkAddParts } from '@/components/parts/BulkAddParts';
import { SmartPartSuggestions } from '@/components/parts/SmartPartSuggestions';
import { AIPartEntry } from '@/components/parts/AIPartEntry';
import { NaturalLanguageEntry } from '@/components/parts/NaturalLanguageEntry';
import { AIPartIdentifier } from '@/components/parts/AIPartIdentifier';
import { useQueryClient } from '@tanstack/react-query';

export const PartsInventory: React.FC = () => {
  const { partsView, setPartsView } = useUIStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showAIEntry, setShowAIEntry] = useState(false);
  const [showNLEntry, setShowNLEntry] = useState(false);
  const [showAIIdentifier, setShowAIIdentifier] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch parts with filters
  const { data: partsData, isLoading, error, refetch } = useParts({
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
    limit: 100
  });

  const deletePart = useDeletePart();

  const parts = partsData?.parts || [];

  const handleAddPart = () => {
    setEditingPart(null);
    setShowForm(true);
  };

  const handleQuickAdd = () => {
    setShowQuickAdd(true);
  };

  const handleBulkAdd = () => {
    setShowBulkAdd(true);
  };

  const handleAIEntry = () => {
    setShowAIEntry(true);
  };

  const handleNLEntry = () => {
    setShowNLEntry(true);
  };

  const handleAIIdentifier = () => {
    setShowAIIdentifier(true);
  };

  const handleEditPart = (part: any) => {
    setEditingPart(part);
    setShowForm(true);
  };

  const handleDeletePart = async (id: string) => {
    await deletePart.mutateAsync(id);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPart(null);
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    queryClient.removeQueries({ queryKey: ['parts'] }); // Clear cache
    refetch();
  };

  const handlePartAdded = () => {
    // Force refresh the parts list immediately
    refetch();
    // Also invalidate cache to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['parts'] });
  };

  // Get unique categories for filter
  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));

  return (
    <LoadingOverlay isLoading={isLoading && parts.length === 0} message="LOADING PARTS DATABASE...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">Parts Inventory</h1>
            <p className="text-text-muted mt-1 font-mono">
              {parts.length} PARTS • {parts.filter(p => p.is_available).length} AVAILABLE
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              REFRESH
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAIIdentifier} 
              icon={<Camera className="w-4 h-4" />}
              glow
            >
              PHOTO ID
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAIEntry} 
              icon={<Brain className="w-4 h-4" />}
              glow
            >
              AI RESEARCH
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBulkAdd} 
              icon={<Upload className="w-4 h-4" />}
            >
              BULK ADD
            </Button>
            <Button 
              variant="outline" 
              icon={<Filter className="w-4 h-4" />}
            >
              FILTERS
            </Button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <Input
              variant="search"
              placeholder="SEARCH PARTS DATABASE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              glow
            />
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="cyber-input font-mono uppercase"
            >
              <option value="">ALL CATEGORIES</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={partsView === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPartsView('grid')}
                icon={<Grid className="w-4 h-4" />}
              />
              <Button
                variant={partsView === 'table' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPartsView('table')}
                icon={<List className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {searchQuery.length >= 2 && (
          <SmartPartSuggestions 
            searchQuery={searchQuery} 
            onPartAdded={() => {
              // Refresh the parts list
              refetch();
              setSearchQuery('');
            }}
          />
        )}

        {/* Quick Add Section - Always Visible */}
        <QuickAddPart onSuccess={handlePartAdded} />

        <div className="cyber-card">
          <div className="p-6">
            {error ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-cyber-orange mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary font-mono mb-2">ERROR LOADING PARTS DATABASE</h3>
                <p className="text-text-secondary mb-4 font-mono">{error instanceof Error ? error.message : 'Please try again later'}</p>
                <Button onClick={handleRefresh} variant="outline" glow>
                  TRY AGAIN
                </Button>
              </div>
            ) : parts.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary font-mono mb-2">NO PARTS FOUND</h3>
                <p className="text-text-muted mb-4 font-mono">
                  {searchQuery || categoryFilter 
                    ? 'Try adjusting your search or filters' 
                    : 'Add your first part to get started'
                  }
                </p>
                {(searchQuery || categoryFilter) && (
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                    }} 
                    variant="outline"
                  >
                    CLEAR FILTERS
                  </Button>
                )}
              </div>
            ) : partsView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {parts.map((part) => (
                  <PartCard
                    key={part.id}
                    part={part}
                    onEdit={handleEditPart}
                    onDelete={handleDeletePart}
                  />
                ))}
              </div>
            ) : (
              <PartTable
                parts={parts}
                onEdit={handleEditPart}
                onDelete={handleDeletePart}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* AI Part Identifier Modal */}
        <AIPartIdentifier
          isOpen={showAIIdentifier}
          onClose={() => setShowAIIdentifier(false)}
          onPartAdded={handlePartAdded}
        />

        {/* Bulk Add Modal */}
        <Modal
          isOpen={showBulkAdd}
          onClose={() => setShowBulkAdd(false)}
          title="BULK ADD PARTS"
          size="lg"
        >
          <BulkAddParts />
        </Modal>

        {/* AI Research Modal */}
        <Modal
          isOpen={showAIEntry}
          onClose={() => setShowAIEntry(false)}
          title="AI PART RESEARCH"
          size="xl"
          variant="terminal"
        >
          <AIPartEntry onSuccess={() => setShowAIEntry(false)} />
        </Modal>

        {/* Natural Language Entry Modal */}
        <Modal
          isOpen={showNLEntry}
          onClose={() => setShowNLEntry(false)}
          title="NATURAL LANGUAGE ENTRY"
          size="lg"
        >
          <NaturalLanguageEntry onSuccess={() => setShowNLEntry(false)} />
        </Modal>
        
        {/* Part Form Modal */}
        <PartForm
          isOpen={showForm}
          onClose={handleCloseForm}
          part={editingPart}
        />
      </div>
    </LoadingOverlay>
  );
};