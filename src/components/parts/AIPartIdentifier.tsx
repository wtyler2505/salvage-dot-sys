import React, { useState } from 'react';
import { Camera, Brain, Zap, Package, AlertTriangle, ExternalLink, Loader2, Download, Box, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Modal } from '@/components/common/Modal';
import { OptimizedImage, useImagePlaceholder } from '@/components/common/OptimizedImage';
import { useCreatePart } from '@/hooks/api/useParts';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface IdentificationResult {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  manufacturer?: string;
  part_number?: string;
  specifications: Record<string, any>;
  datasheet_url?: string;
  image_urls: string[];
  model_3d_urls: string[];
  model_formats: string[];
  typical_quantity: number;
  estimated_value?: number;
  tags: string[];
  safety_warnings: string[];
  common_uses: string[];
  compatible_parts: string[];
  confidence: number;
  ai_metadata?: any;
}

interface AIPartIdentifierProps {
  isOpen: boolean;
  onClose: () => void;
  onPartAdded?: () => void;
}

export const AIPartIdentifier: React.FC<AIPartIdentifierProps> = ({ 
  isOpen, 
  onClose, 
  onPartAdded 
}) => {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);

  const createPart = useCreatePart();
  const { success, error, warning } = useToast();

  const handleImagesUploaded = async (imageDataUrls: string[]) => {
    console.log('📸 Images uploaded to component:', imageDataUrls.length);
    setUploadedImages(imageDataUrls);
    setIdentificationResult(null);
    setIdentificationError(null);

    // Upload images to Supabase Storage to get public URLs
    setUploadingImages(true);
    try {
      const publicUrls = await uploadImagesToStorage(imageDataUrls);
      setUploadedImageUrls(publicUrls);
      console.log('☁️ Images uploaded to storage:', publicUrls);
    } catch (uploadError) {
      console.error('💥 Image upload failed:', uploadError);
      error('Image upload failed', 'Unable to upload images to storage. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Upload images to Supabase Storage
  const uploadImagesToStorage = async (imageDataUrls: string[]): Promise<string[]> => {
    const publicUrls: string[] = [];

    for (let i = 0; i < imageDataUrls.length; i++) {
      const dataUrl = imageDataUrls[i];
      
      try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fileName = `part-identification/${timestamp}-${randomId}-${i}.jpg`;

        console.log(`📤 Uploading image ${i + 1}/${imageDataUrls.length}: ${fileName}`);

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('salvage-parts')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('salvage-parts')
          .getPublicUrl(fileName);

        publicUrls.push(publicUrl);
        console.log(`✅ Image ${i + 1} uploaded:`, publicUrl);

      } catch (uploadError) {
        console.error(`❌ Failed to upload image ${i + 1}:`, uploadError);
        throw uploadError;
      }
    }

    return publicUrls;
  };

  const handleIdentifyPart = async () => {
    if (uploadedImageUrls.length === 0) {
      error('Upload required', 'Please upload at least one image to identify the part');
      return;
    }

    setIsIdentifying(true);
    setIdentificationResult(null);
    setIdentificationError(null);

    try {
      console.log('🔍 Starting AI identification with images:', uploadedImageUrls);

      // Use the first uploaded image for identification
      const primaryImageUrl = uploadedImageUrls[0];
      
      const response = await api.aiResearchPart({
        description: additionalContext || 'Identify this electronic component from the image',
        mode: 'research',
        imageUrl: primaryImageUrl,
        context: {
          has_image: true,
          image_count: uploadedImageUrls.length,
          additional_context: additionalContext,
          all_image_urls: uploadedImageUrls
        }
      });

      console.log('🎯 AI identification response:', response);

      if (!response.success) {
        if (response.fallback) {
          // Use fallback data but warn user
          setIdentificationResult(response.fallback);
          warning('Partial identification', response.error || 'AI had trouble identifying this part. Please verify the details.');
        } else {
          throw new Error(response.error || 'AI identification failed');
        }
      } else if (response.research) {
        setIdentificationResult(response.research);
        success('Part identified!', `AI identified this as: ${response.research.name}`);
      } else {
        throw new Error('Invalid response format from AI');
      }

    } catch (err) {
      console.error('💥 Part identification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setIdentificationError(errorMessage);
      
      if (errorMessage.includes('DEVELOPMENT ERROR') || errorMessage.includes('Wrong server')) {
        error('Development Server Error', 'Please use http://localhost:3000 and run "npm run dev"');
      } else if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
        error('Configuration Error', 'AI service not configured. Please check your API keys in Settings.');
      } else {
        error('Identification failed', errorMessage);
      }
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!identificationResult) return;

    try {
      await createPart.mutateAsync({
        name: identificationResult.name,
        description: identificationResult.description,
        category: identificationResult.category,
        subcategory: identificationResult.subcategory,
        quantity: identificationResult.typical_quantity || 1,
        specs: identificationResult.specifications,
        tags: identificationResult.tags,
        images: [...uploadedImageUrls, ...identificationResult.image_urls],
        datasheet_url: identificationResult.datasheet_url,
        value_estimate: identificationResult.estimated_value,
        ai_identified: true,
        metadata: {
          manufacturer: identificationResult.manufacturer,
          part_number: identificationResult.part_number,
          confidence: identificationResult.confidence,
          safety_warnings: identificationResult.safety_warnings,
          common_uses: identificationResult.common_uses,
          compatible_parts: identificationResult.compatible_parts,
          identification_images: uploadedImageUrls,
          identification_context: additionalContext,
          model_3d_urls: identificationResult.model_3d_urls,
          model_formats: identificationResult.model_formats,
          ai_metadata: identificationResult.ai_metadata
        }
      });

      onPartAdded?.();
      handleClose();
      
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    setUploadedImages([]);
    setUploadedImageUrls([]);
    setAdditionalContext('');
    setIdentificationResult(null);
    setIdentificationError(null);
    onClose();
  };

  // Generate placeholder for identified part
  const partPlaceholder = identificationResult ? 
    useImagePlaceholder(identificationResult.name, 150, 150) : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Part Identification" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-electric-600 to-purple-600 rounded-lg text-white">
          <Brain className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">AI Part Identification</h3>
            <p className="text-sm opacity-90">
              Upload clear photos of your mystery component and let AI identify it for you
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <h4 className="font-medium text-garage-200 mb-3">Upload Component Photos</h4>
          <ImageUpload
            onImagesUploaded={handleImagesUploaded}
            maxFiles={3}
            maxSizeBytes={5 * 1024 * 1024} // 5MB
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            disabled={isIdentifying || uploadingImages}
          />
          <p className="text-sm text-garage-400 mt-2">
            💡 Tip: Take clear photos from multiple angles, including any markings or part numbers
          </p>
          
          {uploadingImages && (
            <div className="mt-2 p-2 bg-cyber-cyan/20 border border-cyber-cyan rounded-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
                <span className="text-cyber-cyan font-mono text-sm">Uploading images to storage...</span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-garage-300 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g., 'Found in old radio', 'Has 8 pins', 'Marked with 555', 'From Arduino kit'"
            rows={3}
            disabled={isIdentifying || uploadingImages}
            className="block w-full px-3 py-2 bg-garage-800 border border-garage-600 rounded-md text-garage-100 placeholder-garage-400 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-electric-500"
          />
          <p className="text-sm text-garage-500 mt-1">
            Any additional details about where you found it, what it was used for, or visible markings
          </p>
        </div>

        {/* Identify Button */}
        <Button
          onClick={handleIdentifyPart}
          disabled={uploadedImageUrls.length === 0 || isIdentifying || uploadingImages}
          loading={isIdentifying}
          className="w-full"
          icon={isIdentifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        >
          {isIdentifying ? 'Analyzing Component...' : 'Identify Component with AI'}
        </Button>

        {/* Error Display */}
        {identificationError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-200 font-medium mb-1">Identification Failed</h4>
                <p className="text-red-100 text-sm">{identificationError}</p>
                <p className="text-red-200 text-xs mt-2">
                  Try uploading clearer images or adding more context about the component
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Identification Results */}
        {identificationResult && (
          <div className="space-y-4 border-t border-garage-600 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-garage-100">Identification Results</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-garage-400">Confidence:</span>
                <div className="w-20 h-2 bg-garage-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-electric-500 rounded-full transition-all duration-500"
                    style={{ width: `${identificationResult.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-garage-300">
                  {Math.round(identificationResult.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Part Information */}
            <div className="bg-garage-800 border border-garage-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-garage-100">
                    {identificationResult.name}
                  </h4>
                  <p className="text-garage-400">
                    {identificationResult.category}
                    {identificationResult.manufacturer && ` • ${identificationResult.manufacturer}`}
                  </p>
                  {identificationResult.part_number && (
                    <p className="text-sm text-garage-500">
                      Part #: {identificationResult.part_number}
                    </p>
                  )}
                </div>
                
                {identificationResult.estimated_value && (
                  <div className="text-right">
                    <div className="text-lg font-semibold text-garage-100">
                      ${identificationResult.estimated_value.toFixed(2)}
                    </div>
                    <div className="text-sm text-garage-400">Est. value</div>
                  </div>
                )}
              </div>

              <p className="text-garage-300 mb-4">{identificationResult.description}</p>

              {/* Images with proper error handling */}
              {identificationResult.image_urls.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-garage-200 mb-2">Reference Images</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {identificationResult.image_urls.slice(0, 4).map((url, index) => (
                      <OptimizedImage
                        key={index}
                        src={url}
                        alt={`${identificationResult.name} reference ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                        fallback={partPlaceholder || undefined}
                        placeholder={
                          <div className="w-full h-20 bg-garage-700 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-garage-400" />
                          </div>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3D Models Section */}
              {identificationResult.model_3d_urls.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-garage-200 mb-2 flex items-center">
                    <Box className="w-4 h-4 mr-2" />
                    3D Models Available
                  </h5>
                  <div className="bg-garage-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-garage-300">
                        {identificationResult.model_formats.join(', ')} formats
                      </span>
                      <span className="text-xs text-garage-400">
                        {identificationResult.model_3d_urls.length} source{identificationResult.model_3d_urls.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {identificationResult.model_3d_urls.slice(0, 3).map((url, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(url, '_blank')}
                          icon={<Download className="w-3 h-3" />}
                          className="text-xs"
                        >
                          Model {index + 1}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-garage-500 mt-2">
                      💡 Use these for 3D printing enclosures, PCB design, or visualization
                    </p>
                  </div>
                </div>
              )}

              {/* Specifications */}
              {Object.keys(identificationResult.specifications).length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-garage-200 mb-2">Specifications</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(identificationResult.specifications).map(([key, value]) => (
                      <div key={key} className="bg-garage-700 p-2 rounded">
                        <div className="text-xs text-garage-400 uppercase">{key}</div>
                        <div className="text-sm text-garage-200">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Warnings */}
              {identificationResult.safety_warnings.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="font-medium text-red-300">Safety Warnings</span>
                  </div>
                  <ul className="text-sm text-red-200 space-y-1">
                    {identificationResult.safety_warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Uses */}
              {identificationResult.common_uses.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-garage-200 mb-2">Common Uses</h5>
                  <div className="flex flex-wrap gap-2">
                    {identificationResult.common_uses.map((use, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-electric-600/20 border border-electric-600 text-electric-200 text-sm rounded"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {identificationResult.tags.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-garage-200 mb-2">Tags</h5>
                  <div className="flex flex-wrap gap-2">
                    {identificationResult.tags.map((tag, index) => (
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
                  {identificationResult.datasheet_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(identificationResult.datasheet_url, '_blank')}
                      icon={<ExternalLink className="w-3 h-3" />}
                    >
                      Datasheet
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdentificationResult(null)}
                  >
                    Try Again
                  </Button>
                </div>
                
                <Button
                  onClick={handleAddToInventory}
                  loading={createPart.isPending}
                  icon={<Package className="w-4 h-4" />}
                >
                  Add to Inventory
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {!identificationResult && !isIdentifying && (
          <div className="bg-garage-700 p-4 rounded-lg">
            <h4 className="font-medium text-garage-200 mb-2">📸 Photography Tips</h4>
            <ul className="text-sm text-garage-300 space-y-1">
              <li>• Take photos in good lighting</li>
              <li>• Include any text, numbers, or markings</li>
              <li>• Show the overall component and close-ups</li>
              <li>• Include pins, leads, or connectors</li>
              <li>• Add context about where you found it</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};