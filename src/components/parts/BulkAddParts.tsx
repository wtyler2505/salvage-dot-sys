import React, { useState } from 'react';
import { Upload, FileText, Download, AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useCreatePart } from '@/hooks/api/useParts';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

interface BulkAddResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  successfulParts: Array<{ name: string; category: string }>;
}

export const BulkAddParts: React.FC = () => {
  const [csvData, setCsvData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BulkAddResult | null>(null);
  
  const createPart = useCreatePart();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      error('Invalid file type', 'Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
      setResults(null);
      console.log('📄 CSV file loaded:', { 
        size: content.length, 
        lines: content.split('\n').length 
      });
    };
    reader.onerror = () => {
      error('File read failed', 'Unable to read the CSV file');
    };
    reader.readAsText(file);
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const mapCSVToPart = (headers: string[], values: string[], rowNumber: number): any => {
    const part: any = {
      name: '',
      description: '',
      category: null,
      subcategory: null,
      quantity: 1,
      location: null,
      source: null,
      tags: [],
      images: [],
      value_estimate: null,
      is_available: true,
      ai_identified: false,
      notes: null,
      metadata: {
        bulk_imported: true,
        import_row: rowNumber,
        import_timestamp: new Date().toISOString()
      }
    };

    // Map CSV columns to part fields (case-insensitive)
    const fieldMapping: Record<string, string> = {
      'item name': 'name',
      'name': 'name',
      'part name': 'name',
      'component': 'name',
      
      'category': 'category',
      'type': 'category',
      'component type': 'category',
      
      'subcategory': 'subcategory',
      'subtype': 'subcategory',
      
      'description': 'description',
      'desc': 'description',
      'details': 'description',
      
      'quantity': 'quantity',
      'qty': 'quantity',
      'count': 'quantity',
      
      'location': 'location',
      'storage location': 'location',
      'bin': 'location',
      
      'source': 'source',
      'source/origin': 'source',
      'origin': 'source',
      
      'notes': 'notes',
      'note': 'notes',
      'comments': 'notes',
      
      'new value': 'value_estimate',
      'value': 'value_estimate',
      'price': 'value_estimate',
      'cost': 'value_estimate',
      
      'condition': 'condition'
    };

    // Process each CSV column
    for (let i = 0; i < headers.length && i < values.length; i++) {
      const header = headers[i].toLowerCase().trim();
      const value = values[i].trim();
      
      if (!value) continue; // Skip empty values
      
      const mappedField = fieldMapping[header];
      
      if (mappedField) {
        switch (mappedField) {
          case 'quantity':
            const qty = parseInt(value);
            part.quantity = isNaN(qty) ? 1 : Math.max(0, qty);
            break;
            
          case 'value_estimate':
            // Extract numeric value from currency strings like "$15-25" or "25.50"
            const priceMatch = value.match(/[\d.]+/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[0]);
              part.value_estimate = isNaN(price) ? null : price;
            }
            break;
            
          case 'condition':
            // Set availability based on condition
            const condition = value.toLowerCase();
            part.is_available = !condition.includes('used') && !condition.includes('broken') && !condition.includes('damaged');
            if (!part.notes) part.notes = '';
            part.notes += (part.notes ? '; ' : '') + `Condition: ${value}`;
            break;
            
          default:
            part[mappedField] = value;
        }
      } else {
        // Store unmapped fields in metadata
        part.metadata[header] = value;
      }
    }

    // Validation
    if (!part.name) {
      throw new Error('Part name is required');
    }

    // Process special fields
    if (part.metadata['key specs']) {
      part.metadata.specifications = part.metadata['key specs'];
    }
    
    if (part.metadata['main applications']) {
      part.tags.push(...part.metadata['main applications'].split(';').map((t: string) => t.trim()));
    }
    
    if (part.metadata['project ideas']) {
      if (!part.notes) part.notes = '';
      part.notes += (part.notes ? '\n\nProject Ideas: ' : 'Project Ideas: ') + part.metadata['project ideas'];
    }

    return part;
  };

  const processBulkAdd = async () => {
    if (!csvData.trim()) {
      error('No data to process', 'Please upload a CSV file first');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    
    const result: BulkAddResult = {
      success: 0,
      failed: 0,
      errors: [],
      successfulParts: []
    };

    try {
      console.log('🚀 [BulkAdd] Starting bulk import process');
      
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = parseCSVRow(lines[0]);
      console.log('📋 [BulkAdd] CSV headers:', headers);

      const dataRows = lines.slice(1).filter(line => line.trim()); // Remove empty lines
      setProcessingProgress({ current: 0, total: dataRows.length });

      console.log(`📊 [BulkAdd] Processing ${dataRows.length} rows`);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-based
        setProcessingProgress({ current: i + 1, total: dataRows.length });

        try {
          const values = parseCSVRow(dataRows[i]);
          console.log(`🔄 [BulkAdd] Processing row ${rowNumber}:`, values[0]); // Log first column (usually name)

          const partData = mapCSVToPart(headers, values, rowNumber);
          console.log(`📦 [BulkAdd] Mapped part data for row ${rowNumber}:`, {
            name: partData.name,
            category: partData.category,
            quantity: partData.quantity
          });

          // Create the part
          const createResult = await createPart.mutateAsync(partData);
          console.log(`✅ [BulkAdd] Row ${rowNumber} created successfully:`, createResult.part?.id);

          result.success++;
          result.successfulParts.push({
            name: partData.name,
            category: partData.category || 'Unknown'
          });

        } catch (partError) {
          console.error(`❌ [BulkAdd] Row ${rowNumber} failed:`, partError);
          
          result.failed++;
          result.errors.push({
            row: rowNumber,
            name: parseCSVRow(dataRows[i])[0] || `Row ${rowNumber}`,
            error: partError instanceof Error ? partError.message : 'Unknown error'
          });
        }

        // Small delay to prevent overwhelming the API
        if (i < dataRows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('🎯 [BulkAdd] Bulk import completed:', result);
      setResults(result);

      // Force refresh the parts list
      console.log('🔄 [BulkAdd] Refreshing parts cache...');
      queryClient.removeQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['parts'] });
      }, 500);

      // Show results
      if (result.success > 0 && result.failed === 0) {
        success('Bulk import successful!', `Added ${result.success} parts to your inventory`);
      } else if (result.success > 0 && result.failed > 0) {
        warning('Partial success', `Added ${result.success} parts, but ${result.failed} failed. Check details below.`);
      } else {
        error('Import failed', `All ${result.failed} parts failed to import. Check details below.`);
      }

    } catch (globalError) {
      console.error('💥 [BulkAdd] Global error:', globalError);
      error('Bulk import failed', globalError instanceof Error ? globalError.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  const downloadTemplate = () => {
    const template = `Item Name,Category,Subcategory,Description,Quantity,Location,Source,Value,Notes
Arduino Nano,Microcontroller,Development Board,Arduino-compatible development board,3,Drawer A-1,Electronics kit,$15,
LED Red 5mm,LED,Indicator,Standard 5mm red LED,10,Parts Bin B,Salvaged from old project,$0.50,
Resistor 220 Ohm,Resistor,Carbon Film,1/4W 5% carbon film resistor,20,Component organizer,Fresh purchase,$0.02,each
ESP32 Board,Microcontroller,WiFi Module,ESP32 development board with WiFi/Bluetooth,2,Shelf C,Amazon order,$25,Includes antenna`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parts-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults(null);
    setCsvData('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary font-mono uppercase tracking-wider">
          BULK ADD PARTS FROM CSV
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          icon={<Download className="w-3 h-3" />}
        >
          DOWNLOAD TEMPLATE
        </Button>
      </div>

      {/* CSV Upload */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">
            UPLOAD CSV FILE
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isProcessing}
              className="block text-sm text-text-secondary font-mono
                file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 
                file:text-sm file:font-medium file:bg-cyber-cyan file:text-bg-primary 
                hover:file:bg-cyber-cyan/90 file:font-mono file:uppercase"
            />
            {csvData && (
              <div className="text-sm text-cyber-green font-mono">
                ✅ {csvData.split('\n').length - 1} rows loaded
              </div>
            )}
          </div>
        </div>

        {/* CSV Preview */}
        {csvData && !isProcessing && !results && (
          <div>
            <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">
              CSV PREVIEW (FIRST 5 ROWS)
            </label>
            <div className="bg-bg-secondary border border-text-muted/30 rounded-sm p-3 max-h-40 overflow-auto">
              <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
                {csvData.split('\n').slice(0, 6).join('\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="bg-cyber-cyan/20 border border-cyber-cyan rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyber-cyan font-medium font-mono">PROCESSING PARTS...</span>
              <span className="text-cyber-cyan font-mono">
                {processingProgress.current} / {processingProgress.total}
              </span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
              <div 
                className="bg-cyber-cyan h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${processingProgress.total > 0 ? (processingProgress.current / processingProgress.total) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="bg-bg-secondary border border-text-muted/30 rounded-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-text-primary font-mono uppercase tracking-wider">
                  IMPORT RESULTS
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearResults}
                  icon={<X className="w-3 h-3" />}
                >
                  CLEAR
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-cyber-green/20 border border-cyber-green rounded-sm p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyber-green" />
                    <span className="text-cyber-green font-medium font-mono">
                      {results.success} SUCCESSFUL
                    </span>
                  </div>
                </div>
                <div className="bg-cyber-magenta/20 border border-cyber-magenta rounded-sm p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-cyber-magenta" />
                    <span className="text-cyber-magenta font-medium font-mono">
                      {results.failed} FAILED
                    </span>
                  </div>
                </div>
              </div>

              {/* Successful Parts */}
              {results.successfulParts.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-cyber-green mb-2 font-mono">SUCCESSFULLY ADDED:</h5>
                  <div className="max-h-32 overflow-y-auto bg-bg-primary rounded-sm p-2">
                    {results.successfulParts.map((part, index) => (
                      <div key={index} className="text-sm text-text-secondary font-mono">
                        • {part.name} {part.category && `(${part.category})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.errors.length > 0 && (
                <div>
                  <h5 className="font-medium text-cyber-magenta mb-2 font-mono">ERRORS:</h5>
                  <div className="max-h-32 overflow-y-auto bg-bg-primary rounded-sm p-2">
                    {results.errors.map((err, index) => (
                      <div key={index} className="text-sm text-cyber-magenta font-mono mb-1">
                        Row {err.row} ({err.name}): {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Button */}
        <Button
          onClick={processBulkAdd}
          disabled={!csvData.trim() || isProcessing}
          loading={isProcessing}
          className="w-full"
          icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          glow
        >
          {isProcessing ? `PROCESSING ${processingProgress.current}/${processingProgress.total}...` : 'IMPORT ALL PARTS'}
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-bg-tertiary border border-text-muted/30 rounded-sm p-4">
        <h4 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">
          SUPPORTED CSV COLUMNS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-secondary font-mono">
          <div>• <span className="text-cyber-cyan">Item Name</span> (required)</div>
          <div>• <span className="text-text-primary">Category</span></div>
          <div>• <span className="text-text-primary">Subcategory</span></div>
          <div>• <span className="text-text-primary">Description</span></div>
          <div>• <span className="text-text-primary">Quantity</span></div>
          <div>• <span className="text-text-primary">Location</span></div>
          <div>• <span className="text-text-primary">Source/Origin</span></div>
          <div>• <span className="text-text-primary">Value/Price</span></div>
          <div>• <span className="text-text-primary">Notes</span></div>
          <div>• <span className="text-text-primary">Condition</span></div>
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono">
          💡 Column names are case-insensitive. Unmapped columns will be stored in metadata.
        </p>
      </div>
    </div>
  );
};