import React, { useState } from 'react';
import { Upload, FileText, Download, AlertTriangle, CheckCircle, X, Loader2, Eye, Database } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useCreatePart } from '@/hooks/api/useParts';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

interface BulkAddResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  successfulParts: Array<{ name: string; category: string; id?: string }>;
  rawApiResponses: Array<any>;
  debugInfo: {
    totalRows: number;
    processingTime: number;
    cacheCleared: boolean;
    refetchTriggered: boolean;
  };
}

export const BulkAddParts: React.FC = () => {
  const [csvData, setCsvData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BulkAddResult | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  
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
      console.log('📄 [BulkAdd] CSV file loaded:', { 
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
    console.log(`🔄 [BulkAdd] Mapping row ${rowNumber}:`, { headers, values });
    
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
        import_timestamp: new Date().toISOString(),
        csv_headers: headers,
        csv_values: values
      }
    };

    // Enhanced field mapping with more variations
    const fieldMapping: Record<string, string> = {
      'item name': 'name',
      'name': 'name',
      'part name': 'name',
      'component': 'name',
      'component name': 'name',
      
      'category': 'category',
      'type': 'category',
      'component type': 'category',
      'part type': 'category',
      
      'subcategory': 'subcategory',
      'subtype': 'subcategory',
      'sub-category': 'subcategory',
      
      'description': 'description',
      'desc': 'description',
      'details': 'description',
      
      'quantity': 'quantity',
      'qty': 'quantity',
      'count': 'quantity',
      'amount': 'quantity',
      
      'location': 'location',
      'storage location': 'location',
      'storage': 'location',
      'bin': 'location',
      'shelf': 'location',
      
      'source': 'source',
      'source/origin': 'source',
      'origin': 'source',
      'from': 'source',
      
      'notes': 'notes',
      'note': 'notes',
      'comments': 'notes',
      'comment': 'notes',
      
      'new value': 'value_estimate',
      'value': 'value_estimate',
      'price': 'value_estimate',
      'cost': 'value_estimate',
      'salvage value': 'value_estimate',
      
      'condition': 'condition'
    };

    let mappedFields = 0;
    
    // Process each CSV column with enhanced logging
    for (let i = 0; i < headers.length && i < values.length; i++) {
      const header = headers[i].toLowerCase().trim();
      const value = values[i].trim();
      
      if (!value) {
        console.log(`⚠️ [BulkAdd] Row ${rowNumber}, col ${i}: Empty value for "${header}"`);
        continue; // Skip empty values
      }
      
      const mappedField = fieldMapping[header];
      
      if (mappedField) {
        mappedFields++;
        console.log(`✅ [BulkAdd] Row ${rowNumber}: Mapping "${header}" → "${mappedField}" = "${value}"`);
        
        switch (mappedField) {
          case 'quantity':
            const qty = parseInt(value);
            part.quantity = isNaN(qty) ? 1 : Math.max(0, qty);
            console.log(`📊 [BulkAdd] Row ${rowNumber}: Parsed quantity: ${value} → ${part.quantity}`);
            break;
            
          case 'value_estimate':
            // Extract numeric value from currency strings like "$15-25" or "25.50"
            const priceMatch = value.match(/[\d.]+/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[0]);
              part.value_estimate = isNaN(price) ? null : price;
              console.log(`💰 [BulkAdd] Row ${rowNumber}: Parsed value: "${value}" → ${part.value_estimate}`);
            }
            break;
            
          case 'condition':
            // Set availability based on condition
            const condition = value.toLowerCase();
            part.is_available = !condition.includes('used') && !condition.includes('broken') && !condition.includes('damaged');
            if (!part.notes) part.notes = '';
            part.notes += (part.notes ? '; ' : '') + `Condition: ${value}`;
            console.log(`🔧 [BulkAdd] Row ${rowNumber}: Condition "${value}" → available: ${part.is_available}`);
            break;
            
          default:
            part[mappedField] = value;
            console.log(`📝 [BulkAdd] Row ${rowNumber}: Set ${mappedField} = "${value}"`);
        }
      } else {
        // Store unmapped fields in metadata
        part.metadata[header] = value;
        console.log(`📦 [BulkAdd] Row ${rowNumber}: Stored unmapped "${header}" in metadata: "${value}"`);
      }
    }

    console.log(`📋 [BulkAdd] Row ${rowNumber}: Mapped ${mappedFields} fields out of ${headers.length} columns`);

    // Validation with detailed logging
    if (!part.name) {
      console.error(`❌ [BulkAdd] Row ${rowNumber}: CRITICAL - No name found!`, { headers, values, part });
      throw new Error('Part name is required');
    }

    // Process special metadata fields
    if (part.metadata['key specs']) {
      part.metadata.specifications = part.metadata['key specs'];
      console.log(`🔧 [BulkAdd] Row ${rowNumber}: Added specifications from "key specs"`);
    }
    
    if (part.metadata['main applications']) {
      const apps = part.metadata['main applications'].split(';').map((t: string) => t.trim()).filter(Boolean);
      part.tags.push(...apps);
      console.log(`🏷️ [BulkAdd] Row ${rowNumber}: Added ${apps.length} tags from applications`);
    }
    
    if (part.metadata['project ideas']) {
      if (!part.notes) part.notes = '';
      part.notes += (part.notes ? '\n\nProject Ideas: ' : 'Project Ideas: ') + part.metadata['project ideas'];
      console.log(`💡 [BulkAdd] Row ${rowNumber}: Added project ideas to notes`);
    }

    console.log(`✅ [BulkAdd] Row ${rowNumber}: Final part object:`, {
      name: part.name,
      category: part.category,
      quantity: part.quantity,
      location: part.location,
      value_estimate: part.value_estimate,
      is_available: part.is_available,
      metadata_keys: Object.keys(part.metadata)
    });

    return part;
  };

  const processBulkAdd = async () => {
    if (!csvData.trim()) {
      error('No data to process', 'Please upload a CSV file first');
      return;
    }

    const startTime = Date.now();
    setIsProcessing(true);
    setResults(null);
    
    const result: BulkAddResult = {
      success: 0,
      failed: 0,
      errors: [],
      successfulParts: [],
      rawApiResponses: [],
      debugInfo: {
        totalRows: 0,
        processingTime: 0,
        cacheCleared: false,
        refetchTriggered: false
      }
    };

    try {
      console.log('🚀 [BulkAdd] ===== STARTING BULK IMPORT PROCESS =====');
      
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = parseCSVRow(lines[0]);
      console.log('📋 [BulkAdd] CSV headers detected:', headers);

      const dataRows = lines.slice(1).filter(line => line.trim()); // Remove empty lines
      result.debugInfo.totalRows = dataRows.length;
      setProcessingProgress({ current: 0, total: dataRows.length });

      console.log(`📊 [BulkAdd] Processing ${dataRows.length} data rows`);

      // Check current cache state before starting
      const currentCache = queryClient.getQueryData(['parts']);
      console.log('📦 [BulkAdd] Current parts cache before bulk add:', currentCache);

      // Process each row with detailed logging
      for (let i = 0; i < dataRows.length; i++) {
        const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-based
        setProcessingProgress({ current: i + 1, total: dataRows.length });

        try {
          console.log(`\n🔄 [BulkAdd] ===== PROCESSING ROW ${rowNumber}/${dataRows.length + 1} =====`);
          
          const values = parseCSVRow(dataRows[i]);
          console.log(`📝 [BulkAdd] Row ${rowNumber} raw values:`, values);

          const partData = mapCSVToPart(headers, values, rowNumber);
          console.log(`📦 [BulkAdd] Row ${rowNumber} mapped part data:`, partData);

          // Create the part with detailed API logging
          console.log(`🚀 [BulkAdd] Row ${rowNumber}: Calling createPart API...`);
          const createResult = await createPart.mutateAsync(partData);
          console.log(`✅ [BulkAdd] Row ${rowNumber}: API SUCCESS:`, createResult);

          result.success++;
          result.rawApiResponses.push(createResult);
          result.successfulParts.push({
            name: partData.name,
            category: partData.category || 'Unknown',
            id: createResult.part?.id
          });

          console.log(`🎯 [BulkAdd] Row ${rowNumber}: SUCCESS SUMMARY:`, {
            name: partData.name,
            createdId: createResult.part?.id,
            totalSuccess: result.success
          });

        } catch (partError) {
          console.error(`❌ [BulkAdd] Row ${rowNumber}: FAILED:`, partError);
          
          result.failed++;
          result.errors.push({
            row: rowNumber,
            name: parseCSVRow(dataRows[i])[0] || `Row ${rowNumber}`,
            error: partError instanceof Error ? partError.message : 'Unknown error'
          });

          console.error(`💥 [BulkAdd] Row ${rowNumber}: ERROR DETAILS:`, {
            error: partError,
            rawRow: dataRows[i],
            totalFailed: result.failed
          });
        }

        // Small delay to prevent API overwhelming
        if (i < dataRows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      result.debugInfo.processingTime = Date.now() - startTime;
      console.log(`🏁 [BulkAdd] ===== BULK IMPORT COMPLETED =====`);
      console.log(`📊 [BulkAdd] FINAL RESULTS:`, result);

      // CRITICAL: Force refresh the parts cache with extensive logging
      console.log('🗑️ [BulkAdd] ===== STARTING CACHE REFRESH =====');
      
      const cacheBeforeRemove = queryClient.getQueryData(['parts']);
      console.log('📦 [BulkAdd] Cache state before removal:', cacheBeforeRemove);
      
      queryClient.removeQueries({ queryKey: ['parts'] });
      result.debugInfo.cacheCleared = true;
      console.log('🗑️ [BulkAdd] Cache cleared');
      
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      console.log('🔄 [BulkAdd] Cache invalidated');
      
      // Force immediate refetch with multiple attempts
      console.log('⚡ [BulkAdd] Starting forced refetch...');
      
      setTimeout(async () => {
        console.log('⚡ [BulkAdd] Attempt 1: Force refetch...');
        try {
          const refetchResult = await queryClient.refetchQueries({ queryKey: ['parts'] });
          console.log('✅ [BulkAdd] Refetch attempt 1 result:', refetchResult);
          result.debugInfo.refetchTriggered = true;
        } catch (refetchError) {
          console.error('❌ [BulkAdd] Refetch attempt 1 failed:', refetchError);
        }
      }, 200);
      
      setTimeout(async () => {
        console.log('⚡ [BulkAdd] Attempt 2: Second refetch...');
        try {
          await queryClient.refetchQueries({ queryKey: ['parts'] });
          console.log('✅ [BulkAdd] Refetch attempt 2 completed');
        } catch (refetchError) {
          console.error('❌ [BulkAdd] Refetch attempt 2 failed:', refetchError);
        }
      }, 1000);

      setTimeout(() => {
        const cacheAfterRefresh = queryClient.getQueryData(['parts']);
        console.log('📦 [BulkAdd] Cache state after refresh attempts:', cacheAfterRefresh);
      }, 2000);

      setResults(result);

      // Show results with detailed feedback
      if (result.success > 0 && result.failed === 0) {
        success(
          'Bulk import successful!', 
          `Added ${result.success} parts to your inventory. Check the parts list!`
        );
      } else if (result.success > 0 && result.failed > 0) {
        warning(
          'Partial success', 
          `Added ${result.success} parts, but ${result.failed} failed. Check details below.`
        );
      } else {
        error(
          'Import failed', 
          `All ${result.failed} parts failed to import. Check debug details below.`
        );
      }

    } catch (globalError) {
      console.error('💥 [BulkAdd] GLOBAL ERROR:', globalError);
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

  const forceDataRefresh = async () => {
    console.log('🔄 [BulkAdd] Manual force refresh triggered');
    queryClient.clear(); // Clear ALL cache
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['parts'] });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary font-mono uppercase tracking-wider">
          BULK ADD PARTS FROM CSV
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
            className={debugMode ? 'text-cyber-orange border-cyber-orange' : ''}
          >
            🐛 DEBUG: {debugMode ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            icon={<Download className="w-3 h-3" />}
          >
            DOWNLOAD TEMPLATE
          </Button>
        </div>
      </div>

      {/* Debug Mode Info */}
      {debugMode && (
        <div className="bg-cyber-orange/20 border border-cyber-orange rounded-sm p-4">
          <h4 className="font-medium text-cyber-orange mb-2 font-mono">🐛 DEBUG MODE ACTIVE</h4>
          <div className="text-sm text-text-secondary font-mono space-y-1">
            <p>• All API calls and data mapping will be logged to browser console</p>
            <p>• Check browser console (F12) for detailed processing logs</p>
            <p>• Cache operations will be logged for troubleshooting</p>
            <p>• Use this to diagnose why parts aren't appearing in inventory</p>
          </div>
        </div>
      )}

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
            {debugMode && (
              <p className="text-xs text-cyber-cyan mt-2 font-mono">
                🐛 Check browser console for detailed processing logs
              </p>
            )}
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={forceDataRefresh}
                    icon={<Database className="w-3 h-3" />}
                    className="text-cyber-cyan border-cyber-cyan"
                  >
                    FORCE REFRESH
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearResults}
                    icon={<X className="w-3 h-3" />}
                  >
                    CLEAR
                  </Button>
                </div>
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

              {/* Debug Info */}
              {debugMode && (
                <div className="mb-4 bg-cyber-orange/10 border border-cyber-orange rounded-sm p-3">
                  <h5 className="font-medium text-cyber-orange mb-2 font-mono">🐛 DEBUG INFORMATION:</h5>
                  <div className="text-xs text-text-secondary font-mono space-y-1">
                    <div>• Processing time: {results.debugInfo.processingTime}ms</div>
                    <div>• Cache cleared: {results.debugInfo.cacheCleared ? '✅' : '❌'}</div>
                    <div>• Refetch triggered: {results.debugInfo.refetchTriggered ? '✅' : '❌'}</div>
                    <div>• API responses: {results.rawApiResponses.length}</div>
                  </div>
                  {results.rawApiResponses.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-cyber-orange font-mono">View Raw API Responses</summary>
                      <pre className="text-xs bg-bg-primary p-2 rounded mt-2 overflow-auto max-h-32">
                        {JSON.stringify(results.rawApiResponses, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Successful Parts */}
              {results.successfulParts.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-cyber-green mb-2 font-mono">SUCCESSFULLY ADDED:</h5>
                  <div className="max-h-32 overflow-y-auto bg-bg-primary rounded-sm p-2">
                    {results.successfulParts.map((part, index) => (
                      <div key={index} className="text-sm text-text-secondary font-mono">
                        • {part.name} {part.category && `(${part.category})`} {part.id && `[ID: ${part.id.substring(0, 8)}...]`}
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
          <div>• <span className="text-text-primary">Location / Storage Location</span></div>
          <div>• <span className="text-text-primary">Source/Origin</span></div>
          <div>• <span className="text-text-primary">Value/Price/New Value/Salvage Value</span></div>
          <div>• <span className="text-text-primary">Notes/Comments</span></div>
          <div>• <span className="text-text-primary">Condition</span></div>
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono">
          💡 Column names are case-insensitive. Your CSV has great column names and should map perfectly!
        </p>
      </div>

      {/* Troubleshooting Section */}
      <div className="bg-cyber-orange/10 border border-cyber-orange rounded-sm p-4">
        <h4 className="font-medium text-cyber-orange mb-2 font-mono uppercase tracking-wider">
          🚨 TROUBLESHOOTING: PARTS NOT SHOWING?
        </h4>
        <div className="text-sm text-text-secondary font-mono space-y-2">
          <p>1. <strong>Enable DEBUG MODE</strong> (button above) and try again</p>
          <p>2. Check browser console (F12) for detailed logs during import</p>
          <p>3. Try the <strong>FORCE REFRESH</strong> button after import</p>
          <p>4. Try the <strong>🐛 DEBUG REFRESH</strong> button on the main parts page</p>
          <p>5. Make sure you're using <strong>http://localhost:3000</strong> not 5173</p>
          <p>6. If problems persist, check that parts-crud function is working properly</p>
        </div>
      </div>
    </div>
  );
};