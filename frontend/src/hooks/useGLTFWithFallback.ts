import { useState } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * Custom hook that tries to load a glTF with skeleton, 
 * but falls back to a simpler version if it fails
 */
export function useGLTFWithFallback(url: string, fallbackUrl?: string) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [hasError, setHasError] = useState(false);
  
  // Try to load the primary URL first
  let result;
  try {
    result = useGLTF(currentUrl);
    // Reset error state if successful
    if (hasError) {
      setHasError(false);
    }
  } catch (error) {
    console.warn('Failed to load glTF, trying fallback:', error);
    if (!hasError && fallbackUrl && currentUrl !== fallbackUrl) {
      setHasError(true);
      setCurrentUrl(fallbackUrl);
    }
    result = null;
  }
  
  return { result, hasError, currentUrl };
}