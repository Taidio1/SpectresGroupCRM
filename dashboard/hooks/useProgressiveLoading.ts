import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 🚀 PROGRESSIVE LOADING HOOKS
 * 
 * System hooks do progresywnego ładowania komponentów i danych
 * Poprawia perceived performance i user experience
 */

interface UseProgressiveDataOptions<T> {
  batchSize?: number;
  delay?: number;
  onBatchLoad?: (batch: T[], batchIndex: number) => void;
  onComplete?: (allData: T[]) => void;
}

/**
 * Hook do progresywnego ładowania danych w batches
 */
export function useProgressiveData<T>(
  data: T[], 
  options: UseProgressiveDataOptions<T> = {}
) {
  const {
    batchSize = 10,
    delay = 50,
    onBatchLoad,
    onComplete
  } = options;

  const [loadedData, setLoadedData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    if (data.length === 0) {
      setLoadedData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadedData([]);
    setCurrentBatch(0);

    const loadBatch = (batchIndex: number) => {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, data.length);
      const batch = data.slice(startIdx, endIdx);

      if (batch.length > 0) {
        setLoadedData(prev => {
          const newData = [...prev, ...batch];
          onBatchLoad?.(batch, batchIndex);
          return newData;
        });

        setCurrentBatch(batchIndex);

        // Sprawdź czy to ostatni batch
        if (endIdx >= data.length) {
          setIsLoading(false);
          onComplete?.(data);
        } else {
          // Załaduj następny batch po delay
          timeoutRef.current = setTimeout(() => {
            loadBatch(batchIndex + 1);
          }, delay);
        }
      } else {
        setIsLoading(false);
        onComplete?.(data);
      }
    };

    loadBatch(0);
  }, [data, batchSize, delay, onBatchLoad, onComplete]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-start loading when data changes
  useEffect(() => {
    startLoading();
  }, [startLoading]);

  const totalBatches = Math.ceil(data.length / batchSize);
  const progress = data.length > 0 ? (loadedData.length / data.length) * 100 : 0;

  return {
    loadedData,
    isLoading,
    progress,
    currentBatch,
    totalBatches,
    startLoading
  };
}

/**
 * Hook do progresywnego ładowania komponentów z intersection observer
 */
export function useProgressiveComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before component is visible
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasLoaded]);

  return {
    elementRef,
    isVisible,
    hasLoaded
  };
}

/**
 * Hook do skeleton loading state
 */
export function useSkeletonState(
  isLoading: boolean, 
  minDisplayTime: number = 500
) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      // Ensure skeleton shows for minimum time for smooth UX
      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(false);
      }, minDisplayTime);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDisplayTime]);

  return showSkeleton;
}

/**
 * Hook do progressive image loading
 */
export function useProgressiveImage(src: string, placeholder?: string) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      setError(false);
    };

    img.onerror = () => {
      setError(true);
      setImageLoaded(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return {
    src: imageSrc,
    isLoaded: imageLoaded,
    hasError: error
  };
}

/**
 * Hook do batch operations z progress tracking
 */
export function useBatchOperation<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  batchSize: number = 5
) {
  const [results, setResults] = useState<R[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const processBatch = useCallback(async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setProgress(0);
    setCurrentIndex(0);

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));
      
      const batchPromises = batch.map((item, idx) => 
        operation(item, i + idx)
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        
        setResults(prev => [...prev, ...batchResults]);
        setCurrentIndex(i + batch.length);
        setProgress(((i + batch.length) / items.length) * 100);

        // Small delay between batches to prevent UI blocking
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        console.error(`Błąd w batch ${Math.floor(i / batchSize)}:`, error);
      }
    }

    setIsProcessing(false);
  }, [items, operation, batchSize]);

  return {
    results,
    isProcessing,
    progress,
    currentIndex,
    totalItems: items.length,
    processBatch
  };
} 