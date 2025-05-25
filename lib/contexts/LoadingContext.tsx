"use client"

import React, { createContext, useContext, useState } from 'react';

type LoadingState = {
  isLoading: boolean;
  operation: string;
};

type LoadingContextType = {
  loadingState: LoadingState;
  startLoading: (operation: string) => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    operation: '',
  });

  const startLoading = (operation: string) => {
    setLoadingState({ isLoading: true, operation });
  };

  const stopLoading = () => {
    setLoadingState({ isLoading: false, operation: '' });
  };

  return (
    <LoadingContext.Provider value={{ loadingState, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
} 