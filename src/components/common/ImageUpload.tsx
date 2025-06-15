import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  url?: string;
}

interface ImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesUploaded,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className,
  disabled = false,
  showPreview = true
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image before upload
  const compressImage = useCallback((file: File, maxWidth = 1024, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Simulate upload to Supabase storage
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    // In a real implementation, this would upload to Supabase storage
    // For now, we'll create a data URL for demo purposes
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Simulate network delay
        setTimeout(() => {
          resolve(result);
        }, 1000 + Math.random() * 2000);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not supported. Please use: ${acceptedTypes.join(', ')}`;
    }
    
    if (file.size > maxSizeBytes) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB`;
    }

    return null;
  }, [acceptedTypes, maxSizeBytes]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check if adding these files would exceed the limit
    if (images.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newImages: UploadedImage[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      
      if (error) {
        alert(error);
        continue;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      newImages.push({
        id,
        file,
        preview,
        uploading: false,
        uploaded: false
      });
    }

    if (newImages.length === 0) return;

    // Add images to state
    setImages(prev => [...prev, ...newImages]);

    // Start uploading each image
    for (const image of newImages) {
      try {
        // Mark as uploading
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, uploading: true } : img
        ));

        // Compress image if it's large
        let fileToUpload = image.file;
        if (image.file.size > 1024 * 1024) { // 1MB threshold
          fileToUpload = await compressImage(image.file);
        }

        // Upload image
        const url = await uploadImage(fileToUpload);

        // Mark as uploaded
        setImages(prev => prev.map(img => 
          img.id === image.id ? { 
            ...img, 
            uploading: false, 
            uploaded: true, 
            url 
          } : img
        ));

      } catch (error) {
        console.error('Upload error:', error);
        
        // Mark as error
        setImages(prev => prev.map(img => 
          img.id === image.id ? { 
            ...img, 
            uploading: false, 
            uploaded: false, 
            error: error instanceof Error ? error.message : 'Upload failed'
          } : img
        ));
      }
    }
  }, [images.length, maxFiles, validateFile, compressImage, uploadImage]);

  // Update parent component when uploads complete
  React.useEffect(() => {
    const uploadedUrls = images
      .filter(img => img.uploaded && img.url)
      .map(img => img.url!);
    
    if (uploadedUrls.length > 0) {
      onImagesUploaded(uploadedUrls);
    }
  }, [images, onImagesUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [processFiles]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // Clean up preview URLs
      const removedImage = prev.find(img => img.id === id);
      if (removedImage?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removedImage.preview);
      }
      return newImages;
    });
  }, []);

  const handleClickUpload = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const hasImages = images.length > 0;
  const canAddMore = images.length < maxFiles;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={cn(
          'relative border-2 border-dashed rounded-sm p-6 transition-colors cursor-pointer',
          isDragOver 
            ? 'border-cyber-cyan bg-cyber-cyan/10' 
            : 'border-text-muted/30 hover:border-text-muted/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !canAddMore && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || !canAddMore}
        />

        <div className="text-center">
          <Upload className={cn(
            'w-12 h-12 mx-auto mb-4',
            isDragOver ? 'text-cyber-cyan' : 'text-text-muted'
          )} />
          
          <h3 className="text-lg font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">
            {isDragOver ? 'DROP IMAGES HERE' : 'UPLOAD IMAGES'}
          </h3>
          
          <p className="text-text-muted mb-4 font-mono">
            DRAG AND DROP IMAGES HERE, OR CLICK TO SELECT FILES
          </p>
          
          <div className="text-sm text-text-muted space-y-1 font-mono">
            <p>SUPPORTED: {acceptedTypes.map(t => t.split('/')[1]).join(', ')}</p>
            <p>MAX SIZE: {(maxSizeBytes / 1024 / 1024).toFixed(1)}MB PER FILE</p>
            <p>MAX FILES: {maxFiles} ({images.length} UPLOADED)</p>
          </div>

          {!canAddMore && (
            <p className="text-cyber-orange text-sm mt-2 font-mono">
              MAXIMUM NUMBER OF FILES REACHED
            </p>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {hasImages && showPreview && (
        <div className="space-y-3">
          <h4 className="font-medium text-text-primary font-mono uppercase tracking-wider">
            UPLOADED IMAGES ({images.length})
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative bg-bg-secondary border border-text-muted/30 rounded-sm p-2"
              >
                {/* Image Preview */}
                <div className="aspect-square bg-bg-tertiary rounded-sm mb-2 overflow-hidden">
                  <img
                    src={image.preview}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {image.uploading && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-cyber-cyan" />
                        <span className="text-xs text-cyber-cyan font-mono">UPLOADING...</span>
                      </>
                    )}
                    {image.uploaded && (
                      <>
                        <CheckCircle className="w-3 h-3 text-cyber-green" />
                        <span className="text-xs text-cyber-green font-mono">DONE</span>
                      </>
                    )}
                    {image.error && (
                      <>
                        <AlertCircle className="w-3 h-3 text-cyber-magenta" />
                        <span className="text-xs text-cyber-magenta font-mono">ERROR</span>
                      </>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(image.id);
                    }}
                    icon={<X className="w-3 h-3" />}
                    className="p-1 h-auto text-text-muted hover:text-cyber-magenta"
                  />
                </div>

                {/* Error Message */}
                {image.error && (
                  <p className="text-xs text-cyber-magenta mt-1 truncate font-mono" title={image.error}>
                    {image.error}
                  </p>
                )}

                {/* File Info */}
                <div className="text-xs text-text-muted mt-1 font-mono">
                  <p className="truncate">{image.file.name}</p>
                  <p>{(image.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress Summary */}
      {hasImages && (
        <div className="bg-bg-secondary border border-text-muted/30 rounded-sm p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary font-mono">
              {images.filter(img => img.uploaded).length} / {images.length} UPLOADED
            </span>
            
            {images.some(img => img.uploading) && (
              <div className="flex items-center space-x-2 text-cyber-cyan font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>UPLOADING...</span>
              </div>
            )}
            
            {images.some(img => img.error) && (
              <span className="text-cyber-magenta font-mono">
                {images.filter(img => img.error).length} FAILED
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-2 w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
            <div 
              className="bg-cyber-cyan h-2 rounded-full transition-all duration-300 shadow-cyber"
              style={{ 
                width: `${(images.filter(img => img.uploaded).length / images.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};