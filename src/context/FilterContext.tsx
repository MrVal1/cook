'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type SortOption = 'recent' | 'rating' | 'time' | 'title';

interface FilterContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const router = useRouter();
  const pathname = usePathname();

  const handleSetSearchQuery = (query: string) => {
    setSearchQuery(query);
    if (pathname !== '/' && query.trim()) {
      router.push('/');
    }
  };

  const handleSetSortBy = (sort: SortOption) => {
    setSortBy(sort);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('recent');
    setSelectedCategory('ALL');
  };

  return (
    <FilterContext.Provider
      value={{
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
        sortBy,
        setSortBy: handleSetSortBy,
        selectedCategory,
        setSelectedCategory,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
