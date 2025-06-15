import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV, exportParts, exportProjects, exportToJSON } from '../export';

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

global.document = {
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
} as any;

global.URL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
} as any;

global.Blob = vi.fn() as any;

describe('Export utilities', () => {
  const mockLink = {
    setAttribute: vi.fn(),
    click: mockClick,
    download: '',
    style: { visibility: '' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue(mockLink);
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const testData = [
        { name: 'Arduino Nano', category: 'Microcontroller', quantity: 3 },
        { name: 'LED Red', category: 'LED', quantity: 10 },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Quantity' },
      ];

      exportToCSV(testData, columns, 'test.csv');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle empty data', () => {
      expect(() => {
        exportToCSV([], [], 'test.csv');
      }).toThrow('No data to export');
    });

    it('should escape CSV special characters', () => {
      const testData = [
        { name: 'Part with "quotes"', description: 'Has, comma' },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ];

      exportToCSV(testData, columns, 'test.csv');

      // Should not throw and should create blob
      expect(global.Blob).toHaveBeenCalled();
    });

    it('should apply column transformations', () => {
      const testData = [
        { price: 25.50, available: true },
      ];

      const columns = [
        { 
          key: 'price', 
          label: 'Price',
          transform: (value: number) => `$${value.toFixed(2)}`
        },
        { 
          key: 'available', 
          label: 'Available',
          transform: (value: boolean) => value ? 'Yes' : 'No'
        },
      ];

      exportToCSV(testData, columns, 'test.csv');

      expect(global.Blob).toHaveBeenCalled();
      
      // Check that Blob was called with CSV content containing transformed values
      const blobCall = (global.Blob as any).mock.calls[0];
      const csvContent = blobCall[0][0];
      expect(csvContent).toContain('$25.50');
      expect(csvContent).toContain('Yes');
    });
  });

  describe('exportParts', () => {
    it('should export parts with all standard columns', () => {
      const testParts = [
        {
          name: 'Arduino Nano',
          category: 'Microcontroller',
          quantity: 3,
          value_estimate: 25.50,
          is_available: true,
          ai_identified: false,
          tags: ['arduino', 'microcontroller'],
          created_at: '2024-01-15T10:30:00Z',
        },
      ];

      exportParts(testParts);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      
      // Should create a filename with current date
      const setDownloadCall = mockLink.setAttribute.mock.calls.find(
        call => call[0] === 'download'
      );
      expect(setDownloadCall[1]).toMatch(/parts-export-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should handle custom filename', () => {
      const testParts = [{ name: 'Test Part', category: 'Test' }];
      
      exportParts(testParts, { filename: 'custom-parts.csv' });

      const setDownloadCall = mockLink.setAttribute.mock.calls.find(
        call => call[0] === 'download'
      );
      expect(setDownloadCall[1]).toBe('custom-parts.csv');
    });
  });

  describe('exportProjects', () => {
    it('should export projects with correct format', () => {
      const testProjects = [
        {
          name: 'LED Clock',
          status: 'completed',
          difficulty_level: 3,
          ai_generated: true,
          date_started: '2024-01-01T00:00:00Z',
        },
      ];

      exportProjects(testProjects);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportToJSON', () => {
    it('should export data as JSON', () => {
      const testData = { parts: [], projects: [], version: '1.0' };

      exportToJSON(testData, 'backup.json');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'backup.json');
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify(testData, null, 2)],
        { type: 'application/json;charset=utf-8;' }
      );
    });
  });
});