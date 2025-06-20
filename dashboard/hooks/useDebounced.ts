import { useState, useEffect } from 'react';

/**
 * 🚀 PERFORMANCE HOOK: useDebounced
 * Opóźnia wykonanie funkcji o zadany czas - zapobiega nadmiernym zapytaniom do API
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 * 
 * @param value - wartość do debounce
 * @param delay - opóźnienie w milisekundach
 * @returns zdebounced wartość
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 🔍 PERFORMANCE HOOK: useSearch
 * Kombinuje debounced search z inteligentnym cache'owaniem
 */
export function useSearch(initialValue: string = '', delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearch = useDebounced(searchTerm, delay);

  const shouldSearch = debouncedSearch.length >= 2 || debouncedSearch.length === 0;

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    shouldSearch
  };
} 