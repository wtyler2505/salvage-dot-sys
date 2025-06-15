import React, { useState, useRef, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholder?: React.ReactNode;
  className?: string;
  loadingClassName?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallback,
  placeholder,
  className,
  loadingClassName,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    
    // Try fallback if available and not already tried
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      return;
    }
    
    setHasError(true);
    onError?.(e);
  };

  // Default placeholder component
  const defaultPlaceholder = (
    <div className={cn(
      'flex items-center justify-center bg-garage-700 text-garage-400',
      className
    )}>
      {hasError ? (
        <div className="flex flex-col items-center space-y-1">
          <AlertCircle className="w-6 h-6" />
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-1">
          <Package className="w-6 h-6" />
          <span className="text-xs">Loading...</span>
        </div>
      )}
    </div>
  );

  if (isLoading || hasError) {
    return placeholder || defaultPlaceholder;
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

// Hook for generating better placeholder images
export const useImagePlaceholder = (text: string, width = 300, height = 300) => {
  // Generate a simple colored placeholder using CSS gradients instead of external services
  const generatePlaceholder = (text: string) => {
    // Create a simple hash of the text for consistent colors
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Generate colors from hash
    const hue = Math.abs(hash) % 360;
    const saturation = 50 + (Math.abs(hash) % 30); // 50-80%
    const lightness = 25 + (Math.abs(hash) % 20);  // 25-45% for dark theme
    
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue},${saturation}%,${lightness}%);stop-opacity:1" />
            <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360},${saturation}%,${lightness + 10}%);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${text.substring(0, 20)}
        </text>
      </svg>
    `)}`;
  };

  return generatePlaceholder(text);
};