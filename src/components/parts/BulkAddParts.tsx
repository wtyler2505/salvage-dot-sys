import React, { useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useCreatePart } from '@/hooks/api/useParts';

export const BulkAddParts: React.FC = () => {
  const [csvData, setCsvData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createPart = useCreatePart();

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const processBulkAdd = async () => {
    if (!csvData.trim()) return;

    setIsProcessing(true);
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find required columns
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const categoryIndex = headers.findIndex(h => h.includes('category'));
    const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
    const locationIndex = headers.findIndex(h => h.includes('location'));

    if (nameIndex === -1) {
      alert('CSV must have a "name" column');
      setIsProcessing(false);
      return;
    }

    try {
      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values[nameIndex]) {
          await createPart.mutateAsync({
            name: values[nameIndex],
            category: categoryIndex >= 0 ? values[categoryIndex] || null : null,
            quantity: quantityIndex >= 0 ? parseInt(values[quantityIndex]) || 1 : 1,
            location: locationIndex >= 0 ? values[locationIndex] || null : null,
            is_available: true
          });
        }
      }
      
      setCsvData('');
      alert(`Successfully added ${lines.length - 1} parts!`);
    } catch (error) {
      alert('Error processing CSV. Check format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'name,category,quantity,location\nArduino Nano,Microcontroller,3,Drawer A-1\nLED Red 5mm,LED,10,Parts Bin B\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-garage-800 border border-garage-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-garage-100">Bulk Add Parts</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          icon={<Download className="w-3 h-3" />}
        >
          Download Template
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-garage-300 mb-2">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="block w-full text-sm text-garage-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-electric-600 file:text-white hover:file:bg-electric-700"
          />
        </div>

        {csvData && (
          <div>
            <label className="block text-sm font-medium text-garage-300 mb-2">
              CSV Preview
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={6}
              className="block w-full px-3 py-2 bg-garage-700 border border-garage-600 rounded-md text-garage-100 text-sm font-mono"
              placeholder="name,category,quantity,location&#10;Arduino Nano,Microcontroller,3,Drawer A-1"
            />
          </div>
        )}

        <Button
          onClick={processBulkAdd}
          disabled={!csvData.trim() || isProcessing}
          loading={isProcessing}
          className="w-full"
          icon={<Upload className="w-4 h-4" />}
        >
          {isProcessing ? 'Processing...' : 'Add All Parts'}
        </Button>
      </div>
    </div>
  );
};